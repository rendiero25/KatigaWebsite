# Shipping Courier Live Catalog (Biteship sync)

**Date:** 2026-06-18
**Scope:** Replace hardcoded courier list with live Biteship `/v1/couriers` fetch
**Follow-up to:** `docs/superpowers/specs/2026-06-18-shipping-courier-management-design.md`, which explicitly listed "Sync penuh courier/service catalog dari Biteship ke database" as Out of Scope for v1. This spec implements that deferred increment.

## Problem

`config/shippingCouriers.js` hardcodes exactly 5 couriers (`jne, jnt, sicepat, anteraja, pos`). Biteship actually integrates 30+ couriers, and a merchant activates/deactivates couriers in their own Biteship dashboard. Because the hardcoded list is the sole source of truth for both the admin "Pengaturan Pengiriman" checklist and the `couriers` param sent to Biteship's rate-check call, any courier activated in Biteship beyond those 5 is structurally invisible to this app — it can't be toggled on in admin, and it's never even requested from Biteship for checkout rates.

## Solution

Fetch the courier catalog live from Biteship's `GET /v1/couriers` on every admin settings page load/save (no DB cache for the catalog — same "no cache" philosophy the original spec already chose for `ShippingSettings`, for the same reasons: small scope, no stale-config risk, easier debug).

### Biteship `/v1/couriers` response shape (confirmed via official docs + cross-checked against an unofficial client's struct defs)

```json
{
  "success": true,
  "object": "courier",
  "couriers": [
    { "courier_code": "jne", "courier_name": "JNE", "courier_service_code": "reg", "courier_service_name": "Reguler", "...": "..." }
  ]
}
```

One row per courier+service combination — must dedupe by `courier_code` to get company-level `{code, label}` matching the existing `ShippingCourierOption` shape.

## Backend

### `services/biteshipService.js`

Add:
```js
async function getCouriers() {
  const res = await axios.get(`${BASE_URL}/v1/couriers`, { headers: headers() });
  const couriers = res.data.couriers ?? [];
  const seen = new Map();
  for (const c of couriers) {
    if (!seen.has(c.courier_code)) {
      seen.set(c.courier_code, { code: c.courier_code, label: c.courier_name });
    }
  }
  return [...seen.values()];
}
```

Change `getRates({ destinationAreaId, items, courierCodes })` — accepts the courier code list as a parameter (`couriers: courierCodes.join(',')`) instead of reading `SUPPORTED_COURIER_CODES` internally. Drop `require('../config/shippingCouriers')`. Export `getCouriers`.

### `services/shippingSettingsService.js`

- Drop the hardcoded `SUPPORTED_COURIERS`/`SUPPORTED_COURIER_CODES` import.
- `getOrCreateShippingSettings()` — no parameter. On first insert, `enabledCouriers` defaults to `[]` (not "all supported"), since there's no live list available at this layer and no network call belongs here. Remove the existing auto-normalize-and-save-on-every-read side effect entirely — with a live/dynamic supported list, a transient Biteship hiccup must never silently overwrite an admin's saved preference in the DB. Normalization now only happens at PUT-time and at response-shaping time (display only, never persisted from a GET).
- `normalizeEnabledCouriers(codes, supportedCodes)` — `supportedCodes` becomes a required second parameter instead of reading the static import.
- `toShippingSettingsResponse(settings, supportedCouriers)` — `supportedCouriers` becomes a required second parameter (the live-fetched list), used both for the `supportedCouriers` field and to normalize `enabledCouriers` for display.

### `routes/shippingSettingsRoutes.js`

Both `GET` and `PUT` call `biteshipService.getCouriers()` first, then pass the result through to `getOrCreateShippingSettings`/`normalizeEnabledCouriers`/`toShippingSettingsResponse`. If `getCouriers()` throws (key missing, Biteship down), the route 500s — the admin page's existing `hasInitialLoadError` UI (with retry button) already handles this, unchanged.

### `routes/shippingRoutes.js` and `routes/orderRoutes.js`

Both currently: fetch rates from Biteship via `getRates({destinationAreaId, items})` (implicitly capped to the old hardcoded 5), then post-filter with a locally-duplicated `filterRatesByEnabledCouriers(rates, enabledCouriers)` helper.

Change both call sites to pass `courierCodes: settings.enabledCouriers` into `getRates()` directly — Biteship is now only ever asked about couriers the admin actually wants offered, which is more correct than asking-then-filtering. If `settings.enabledCouriers.length === 0`, skip the Biteship call entirely and return the existing `filtered_out` / `Metode pengiriman tidak tersedia` response immediately. `filterRatesByEnabledCouriers` becomes dead code in both files once this lands — remove it from both.

### `config/shippingCouriers.js`

Delete — no longer referenced anywhere after the above changes.

## Frontend

**No changes.** `client/src/pages/admin/ShippingSettings.tsx`, `useShippingSettings()`, and `api.ts`'s `getShippingSettings`/`updateShippingSettings` are already fully generic over `supportedCouriers` — they render however many entries come back, with no assumption about count or which codes exist.

## Manual Verification

No automated test suite in this repo. Verify manually:

1. Hit `GET /api/shipping-settings` with an admin token — confirm `supportedCouriers` now reflects Biteship's real account list (more than 5 entries, assuming the account has more activated), not the old hardcoded 5.
2. Toggle a courier that wasn't in the old hardcoded list, save, confirm it persists (`PUT` then `GET` again shows it enabled).
3. Disable all couriers, confirm checkout (`POST /api/shipping/rates`) returns `filtered_out` with the admin's configured empty-state message, and that no Biteship API call is made in that case (no network log entry).
4. Place a test order end-to-end with a courier that's enabled, confirm `routes/orderRoutes.js`'s shipping re-validation still matches correctly.

## Out of Scope

- Service-level on/off (still courier-company-level only, matching the original spec's v1 decision)
- DB-side caching of the live courier catalog
- A manual "sync" button (always live-fetch instead, per brainstorm decision)
- Any change to `ShippingSelector.tsx` or other frontend shipping UI

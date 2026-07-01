# Manual Biteship Sync — Design Spec

**Date:** 2026-07-01
**Status:** Approved

## Summary

Add a manual "Sync Biteship" action on the admin order detail page as a backup for when the automatic Biteship AWB/tracking-code sync fails. Covers both failure modes: a missing `biteshipOrderId` (Biteship order was never created) and an existing `biteshipOrderId` with no tracking code yet (AWB not assigned or the auto-fetch attempt failed).

---

## Current State

- `biteshipOrderId` is set automatically when payment is confirmed (Midtrans webhook / `verify-payment`), via `biteshipService.createOrder(order)`. If that call throws, the error is only logged (`console.error`) — `biteshipOrderId` stays empty and there is no retry path.
- When admin opens the "Serahkan ke Kurir" modal ([OrderDetail.tsx:105-120](../../../client/src/pages/admin/OrderDetail.tsx)), a `useEffect` tries to pre-fill the resi field via `api.getAdminOrderTracking(id)`. Failures are silently swallowed — admin falls back to typing the resi manually.
- The "Koreksi Manual" panel lets admin override `biteshipTrackingCode` as free text, but this does not create a real Biteship order or enable live tracking — it only overrides the displayed/stored value.
- `biteshipService.js` already exports `createOrder` and `getOrderTracking`, both reused as-is.

---

## Backend

### New endpoint: `POST /api/orders/:id/sync-biteship` (auth-protected)

1. Load order by id; 404 if not found.
2. Reject (400) if `orderStatus` is `awaiting_payment` or `cancelled` — a Biteship order isn't expected to exist yet (or anymore) in those states.
3. If `order.biteshipOrderId` is empty:
   - Call `biteshipService.createOrder(order)` (same call used by the payment webhook).
   - Set `biteshipOrderId`, `biteshipTrackingCode`, `biteshipWaybillId` from the response.
4. If `order.biteshipOrderId` is already set:
   - Call `biteshipService.getOrderTracking(order.biteshipOrderId)`.
   - Update `biteshipTrackingCode`/`biteshipWaybillId` if the response now has them (courier may assign AWB only close to pickup).
5. Save order, return the updated order document.
6. On Biteship API failure, respond 502 with a generic message and `console.error` the details — same pattern as the existing `GET /:id/tracking` endpoint.

No changes to `biteshipService.js`.

---

## Admin — `client/src/pages/admin/OrderDetail.tsx`

### "Sync Biteship" button

- Location: **Pengiriman** (Shipping) card, below the existing `biteshipOrderId`/resi display.
- Visible when `orderStatus` is one of `processing`, `packing`, `shipped`, `delivered`.
- Helper text: explains it's a backup for when resi/AWB doesn't sync automatically.
- On click: calls `api.syncBiteshipOrder(id)`.
  - Success with a tracking code present → message: `Resi tersinkron: {code}`.
  - Success but tracking code still empty → message: `Sinkron berhasil, resi belum tersedia dari kurir.`
  - Failure → message from the thrown error (server's `message`, or a generic fallback).
- Local `syncing`/`syncMsg` state, following the same pattern as the existing `saving`/`saveMsg` state in this component.
- On success, `setOrder(data)` — this also feeds the existing tracking-timeline `useEffect` (keyed on `order.biteshipOrderId`/`order.orderStatus`), so the timeline picks up automatically if a `biteshipOrderId` was just created.

### No changes to

- "Serahkan ke Kurir" modal and its auto-fetch behavior.
- "Koreksi Manual" panel — kept as-is for free-text overrides.
- Tracking timeline rendering logic.

---

## API additions

| Layer | Addition |
|---|---|
| `api.ts` | `syncBiteshipOrder(id): Promise<Order>` → `POST /orders/:id/sync-biteship`, throws on non-ok response with server message (same pattern as `acceptOrder`/`shipOrder`) |

No new hook needed — `OrderDetail.tsx` calls `api.*` methods directly for order actions, matching the existing `handleAccept`/`handleShip`/`handleDeliver` pattern in this file (per project convention, hooks in `useApi.ts` wrap read/list fetches; one-off admin mutations in this file call `api.*` directly, as accept/ship/deliver already do).

---

## Out of Scope

- Automatic retry/polling (this is a manual, admin-triggered action only).
- Changing when the initial Biteship order is created (still happens at payment confirmation).
- Signature verification or other Biteship webhook hardening (unrelated to this feature).

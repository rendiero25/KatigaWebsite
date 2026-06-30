# Shipping Tracking Feature — Design Spec

**Date:** 2026-06-30
**Status:** Approved

## Summary

Add shipping tracking for packed orders, connected to Biteship API. Admin gets a dedicated "Serahkan ke Kurir" button with auto-fetched resi. Biteship webhook auto-updates status to `delivered`. Admin and customer both see the Biteship tracking timeline. Scope: minimal (Approach A).

---

## Current State

- `orderStatus` enum: `awaiting_payment → processing → packing → shipped → delivered → cancelled`
- `biteshipOrderId` is set on payment confirmation (auto-created via Biteship)
- `biteshipTrackingCode` and `biteshipWaybillId` fields exist on Order model
- Admin currently changes status to `shipped` via manual dropdown — no dedicated action
- Customer tracking timeline already exists in `PesananDetail.tsx` (shows when status is `packing/shipped/delivered`)
- `biteshipService.getOrderTracking(biteshipOrderId)` already available

---

## Backend

### New endpoint: `PUT /api/orders/:id/ship` (auth-protected)

1. Verify order exists and current status is `packing`
2. Call `biteshipService.getOrderTracking(biteshipOrderId)` to fetch waybill from Biteship
3. If Biteship returns `waybill_id`, use it; otherwise fallback to `trackingCode` from request body (manual input)
4. Update order: `orderStatus → shipped`, `biteshipTrackingCode → waybill`
5. Return updated order

Request body (optional override):
```json
{ "trackingCode": "JNE1234567" }
```

### New endpoint: `POST /api/webhook/biteship` (public)

1. Parse Biteship event payload — listen for `order.status_update`
2. If `data.status === 'delivered'`: find order by `biteshipOrderId`, update `orderStatus → delivered`
3. Idempotent — if order is already `delivered`, return 200 without changes
4. Return 200 on success

**Development note:** Biteship cannot reach `localhost`. Test webhook delivery manually via admin "Tandai Delivered" fallback button. In production (deployed), webhook fires normally.

No changes to `biteshipService.js` — existing `getOrderTracking` is sufficient.

---

## Admin — `client/src/pages/admin/OrderDetail.tsx`

### "Serahkan ke Kurir" button

- Visible when `orderStatus === 'packing'`
- On click: open confirmation modal; modal's `useEffect` calls `api.getOrderTracking(orderId)` to pre-populate resi field from Biteship
- If Biteship returns waybill → field pre-filled; if not → field empty, admin types manually
- Admin edits resi field if needed; on confirm: single call to `PUT /orders/:id/ship` with `{ trackingCode }` body (always sends the current field value)
- On success: status updates to `shipped`, UI refreshes

### Tracking timeline

- Visible when `orderStatus` is `shipped` or `delivered`
- Fetch via existing `api.getOrderTracking(orderId)` (same as customer)
- Display `biteshipTrackingCode` (resi number) prominently as header of the section
- Show Biteship timeline events below

### "Tandai Delivered" button (manual fallback)

- Visible when `orderStatus === 'shipped'`
- Calls existing `PUT /orders/:id/status` with `{ orderStatus: 'delivered' }`
- Labeled clearly: for use when courier has confirmed delivery but webhook hasn't fired
- No new endpoint needed

### No changes to

- Existing manual correction panel (status dropdown + tracking code input) — kept as escape hatch

---

## Customer — `client/src/pages/PesananDetail.tsx`

- Add explicit resi number display above the tracking timeline
- Label: "No. Resi" + value (copyable text)
- Visible when `biteshipTrackingCode` is set and status is `shipped` or `delivered`
- No auto-refresh (Approach A — manual reload)
- No other changes to tracking logic or section visibility rules

---

## API / Hook additions

| Layer | Addition |
|---|---|
| `api.ts` | `shipOrder(id, trackingCode?)` → `PUT /orders/:id/ship` |
| `api.ts` | Webhook endpoint is backend-only, no frontend call needed |
| `useApi.ts` | `useShipOrder` hook wrapping `api.shipOrder` |

---

## Out of Scope (Approach A)

- Auto-refresh polling on customer tracking page
- Shared tracking component between admin and customer
- Biteship webhook signature verification (add in future for security hardening)
- Push notification to customer on status change

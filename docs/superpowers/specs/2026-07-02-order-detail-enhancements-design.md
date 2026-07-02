# Order Detail Page Enhancements — Design Spec

**Date:** 2026-07-02
**Status:** Approved

## Summary

Five related enhancements to the user-facing order detail page ([PesananDetail.tsx](../../../client/src/pages/PesananDetail.tsx)):

1. Explicit info text about the 3-day complaint deadline (review/complaint buttons already exist and are already gated correctly).
2. A real return (retur) workflow — approve → customer ships back → admin confirms receipt → refund/replace — built by extending the existing `Complaint` model, not a new collection.
3. Show the courier's `driver_photo_url` in the tracking timeline when Biteship returns one.
4. Two-column layout: shipping/status info on the left, items/cost/payment actions on the right.
5. Show a human-readable payment method label in the cost summary.

---

## Current State

- **Order status enum** ([models/Order.js:67](../../../models/Order.js)): `awaiting_payment | processing | packing | shipped | delivered | cancelled`. No separate "completed" status — `delivered` is terminal (short of cancellation).
- **Complaint window**: 3 days from `order.updatedAt` (the delivery timestamp), enforced both server-side ([routes/complaints.js:33-37](../../../routes/complaints.js)) and client-side ([PesananDetail.tsx:318-322](../../../client/src/pages/PesananDetail.tsx)). The "Buka Komplain / Retur" button ([PesananDetail.tsx:599-609](../../../client/src/pages/PesananDetail.tsx)) already appears/disappears correctly based on this window — there is just no explanatory text.
- **Complaint model** ([models/Complaint.js](../../../models/Complaint.js)): `order`, `customer`, `customerSnapshot{name,email}`, `type: 'complaint'|'return'`, `reason`, `photos[]`, `status: 'open'|'processing'|'resolved'|'rejected'`, `adminNote`, `resolvedAt`. No return-specific fields exist yet.
- **Complaint routes** ([routes/complaints.js](../../../routes/complaints.js)): creation (customer), `GET /my`, `GET /my/order/:orderId`, admin `GET /`, `GET /:id`, `PUT /:id`. The `PUT /:id` handler (lines 128-143) accepts any `status` string with no validation and always overwrites `adminNote`.
- **Admin complaint UI** ([client/src/pages/admin/Complaints.tsx](../../../client/src/pages/admin/Complaints.tsx)): detail modal (lines 177-255) shows reason, photos, an admin-note textarea, and a grid of "all other statuses" as buttons (lines 237-252) — any-to-any transition, no guided flow.
- **Biteship tracking**: `services/biteshipService.js` `getOrderTracking()` passes through the raw Biteship response unchanged. The `BiteshipTracking` type ([client/src/types/ecommerce.ts:321-337](../../../client/src/types/ecommerce.ts)) only declares `company`, `name`, `phone`, `tracking_id`, `waybill_id`, `history[]` — it omits `driver_photo_url`, which Biteship's public API does return (confirmed against Biteship's official API docs). This field is typically populated only for instant/same-day couriers (GoSend/GrabExpress), not standard couriers (JNE/J&T/SiCepat/AnterAja); it is `null` otherwise. Biteship's API has **no** proof-of-delivery package photo field.
- **Layout**: single column, `max-w-2xl` ([PesananDetail.tsx:281](../../../client/src/pages/PesananDetail.tsx)), sections render top-to-bottom: header → countdown → stepper → complaint status card → Info Pengiriman (+ tracking) → Daftar Item → Ringkasan Biaya → action buttons (Bayar Sekarang / Download Invoice / Buka Komplain-Retur / Batalkan).
- **Payment method**: `order.midtransPaymentType` is captured from the Midtrans webhook/verify-payment response ([routes/orderRoutes.js:125](../../../routes/orderRoutes.js), [routes/orderRoutes.js:549](../../../routes/orderRoutes.js)) and stored, but never rendered anywhere (not on the order detail page, not on the invoice PDF).

---

## Feature 1 — Complaint Deadline Info

Purely additive, no backend change. In [PesananDetail.tsx](../../../client/src/pages/PesananDetail.tsx), near the "Buka Komplain / Retur" button:

- While `canComplain === true`: small text below the button — `Anda dapat mengajukan komplain hingga {deliveredAt + 3 hari, formatted}`.
- When the order is `delivered`, the window has expired, and no complaint exists yet (`complaint === null`): small text — `Batas waktu komplain untuk pesanan ini sudah berakhir`.
- When a complaint already exists: no deadline text (the complaint status card already communicates state).

Date formatting follows the existing `toLocaleString('id-ID', ...)` convention used for tracking timestamps (line 481).

---

## Feature 2 — Return Flow

### Data model ([models/Complaint.js](../../../models/Complaint.js))

- `status` enum extended: `open | processing | awaiting_return_shipment | return_shipped | return_received | resolved | rejected`.
  - The three new mid-pipeline values (`awaiting_return_shipment`, `return_shipped`, `return_received`) are only ever set on complaints where `type === 'return'`. A `type === 'complaint'` document continues to use exactly `open | processing | resolved | rejected`, unchanged from today.
- New field `returnShipment`: `{ courier: String, trackingNumber: String, shippedAt: Date }`, default `undefined`. Set once, by the customer, when they confirm they've shipped the item back.
- New field `resolution`: `{ type: 'refund' | 'replace', note: String }`, default `undefined`. Set once, by admin, when resolving a return.

### Customer flow ([PesananDetail.tsx](../../../client/src/pages/PesananDetail.tsx))

Extends the existing complaint status card (lines 384-405):

- `status === 'awaiting_return_shipment'`: render an inline form (courier text input + tracking number input) with a "Saya Sudah Mengirim Barang" submit button, calling the new `PUT /api/complaints/:id/ship-return` endpoint. On success, refresh the complaint in local state (status becomes `return_shipped`).
- `status === 'return_shipped'` or `'return_received'`: show the submitted `returnShipment.courier` / `trackingNumber` read-only, with a short "Menunggu verifikasi admin" note.
- `status === 'resolved'` and `resolution` is present: show `resolution.type === 'refund' ? 'Dana Dikembalikan' : 'Barang Diganti'` plus `resolution.note`.
- Status label map extended for the return-specific values (`awaiting_return_shipment` → "Retur Disetujui — Kirim Barang", `return_shipped` → "Barang Dalam Perjalanan Retur", `return_received` → "Barang Diterima — Menunggu Resolusi").

### Admin flow ([client/src/pages/admin/Complaints.tsx](../../../client/src/pages/admin/Complaints.tsx))

Replace the current "all other statuses" button grid (lines 237-252) with guided, status- and type-aware actions:

| Current status | `type: complaint` | `type: return` |
|---|---|---|
| `open` | Diproses / Selesai / Tolak (unchanged) | Tandai Diproses / **Setujui Retur** / Tolak |
| `processing` | Selesai / Tolak (unchanged) | **Setujui Retur** / Tolak |
| `awaiting_return_shipment` | — | Read-only: "Menunggu customer kirim barang" |
| `return_shipped` | — | Show `returnShipment.courier`/`trackingNumber`; button **Tandai Barang Diterima** |
| `return_received` | — | Form: select Refund / Ganti Barang + note → **Simpan Resolusi** |
| `resolved` / `rejected` | Read-only (unchanged) | Read-only, shows `resolution` if present |

"Setujui Retur" sets `status: 'awaiting_return_shipment'`. "Tandai Barang Diterima" sets `status: 'return_received'`. "Simpan Resolusi" sends `{ status: 'resolved', resolution: { type, note } }`.

### API changes ([routes/complaints.js](../../../routes/complaints.js))

- `PUT /api/complaints/:id` (existing, admin): accept an optional `resolution` field in the body in addition to `status`/`adminNote`. When `status` is being set to `'resolved'` and `complaint.type === 'return'`, require `resolution.type` to be `'refund'` or `'replace'` (400 if missing/invalid). Store `resolution` if provided.
- `PUT /api/complaints/:id/ship-return` (new, `customerAuth`): only the owning customer may call this, only when `complaint.type === 'return'` and `complaint.status === 'awaiting_return_shipment'`. Body: `{ courier, trackingNumber }`, both required non-empty strings (400 otherwise). Sets `returnShipment = { courier, trackingNumber, shippedAt: new Date() }` and `status = 'return_shipped'`. On success, notify admin via the existing `notifyAdmin` util (same pattern as complaint creation, lines 53-63), linking to `/admin/complaints/{id}`.
- Both the existing admin `PUT /:id` and the new ship-return endpoint additionally call `notifyCustomer` (already available in [utils/notify.js](../../../utils/notify.js), currently unused by this route file) whenever `status` changes, so the customer gets notified at each stage — matching typical e-commerce return UX. Uses the order's customer id and links to `/pesanan/{orderId}`.
- No new status-transition validation is added to `PUT /:id` beyond the `resolution` requirement above (e.g. nothing stops an admin from setting `awaiting_return_shipment` on a `type: complaint` document via a raw API call). This matches today's `PUT /:id`, which already has no FSM enforcement — the guided, type-aware flow lives entirely in the admin UI's button set, not in the backend.

No changes to `routes/complaints.js` creation, list, or `my` endpoints. No changes to Midtrans, Biteship, or refund automation — refunds stay manual (admin transfers money outside the app; `resolution.note` is where they record how/when).

---

## Feature 3 — Courier Photo in Tracking

- [client/src/types/ecommerce.ts:321-337](../../../client/src/types/ecommerce.ts): add `driver_photo_url: string | null` to the `courier` object in `BiteshipTracking`.
- [PesananDetail.tsx:464-490](../../../client/src/pages/PesananDetail.tsx): in the tracking history header (next to `{tracking.courier?.company} — {tracking.courier?.tracking_id}`), render a small circular avatar (`size-8 rounded-full object-cover`) from `tracking.courier?.driver_photo_url` **only when that value is truthy**. No placeholder/fallback image when it's `null` — for the standard couriers Katiga uses, it usually will be.
- No backend change — `services/biteshipService.js#getOrderTracking` already forwards the raw Biteship response, so the field is present whenever Biteship sends it.

---

## Feature 4 — Two-Column Layout

- Container width: `max-w-2xl` → `max-w-6xl` ([PesananDetail.tsx:281](../../../client/src/pages/PesananDetail.tsx)).
- Full-width, above the columns (unchanged): page header, payment countdown banner, status stepper.
- `lg:grid lg:grid-cols-2 lg:gap-6` wrapper below that, ~50/50 split:
  - **Left column**: complaint/return status card (lines 384-405) → Info Pengiriman + tracking (lines 407-496) → "Buka Komplain / Retur" button + Feature 1's deadline text → "Batalkan Pesanan" button.
  - **Right column**: Daftar Item (lines 498-545) → Ringkasan Biaya incl. payment method (Feature 5) → "Bayar Sekarang" button → "Download Invoice" link.
- Implementation: two wrapper `<div>`s (left, right), each holding its own stacked sections (`space-y-4`) as direct grid children — not individual sections placed directly as grid items. This way, collapsing `lg:grid-cols-2` to a single column below `lg` naturally stacks the left wrapper's sections above the right wrapper's, with no extra mobile-specific ordering code needed.

---

## Feature 5 — Payment Method Display

New row in Ringkasan Biaya ([PesananDetail.tsx:547-573](../../../client/src/pages/PesananDetail.tsx)), above "Total": "Metode Pembayaran" → label from a new formatting helper over `order.midtransPaymentType`:

| `midtransPaymentType` | Label |
|---|---|
| `bank_transfer` | Transfer Bank |
| `gopay` | GoPay |
| `qris` | QRIS |
| `credit_card` | Kartu Kredit |
| `cstore` | Gerai Retail (Alfamart/Indomaret) |
| `shopeepay` | ShopeePay |
| other non-empty value | the raw value, unformatted |
| empty/undefined | row is omitted entirely |

No backend change — the field is already populated whenever a Midtrans transaction has occurred.

---

## API additions summary

| Layer | Addition |
|---|---|
| `routes/complaints.js` | `PUT /api/complaints/:id/ship-return` (new, customer) |
| `routes/complaints.js` | `PUT /api/complaints/:id` (existing) — accepts optional `resolution`, validates it when resolving a return, notifies customer on status change |
| `client/src/services/api.ts` | `shipReturnComplaint(id, { courier, trackingNumber })` → `PUT /complaints/:id/ship-return` |
| `client/src/services/api.ts` | `updateComplaint` (existing) — extend accepted payload to include `resolution` |

## Data model changes summary

| Model | Change |
|---|---|
| `models/Complaint.js` | `status` enum gains `awaiting_return_shipment`, `return_shipped`, `return_received`; new `returnShipment` and `resolution` subdocuments |
| `models/Order.js` | none |

---

## Out of Scope

- Automatic refund processing (Midtrans Refund API) — refunds stay manual, tracked only via `resolution.note`.
- Biteship reverse-pickup (auto-created return shipping order) — customer arranges and pays for return shipping themselves, self-reports courier + tracking number.
- Any change to how/when `driver_photo_url` is populated by Biteship — this is entirely Biteship/courier-side; the app only displays it when present.
- Editing or retracting a submitted return shipment / resolution once set.
- Notification UI changes beyond reusing the existing `notifyAdmin`/`notifyCustomer` mechanisms already in place for other order events.

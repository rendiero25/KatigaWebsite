# Order Detail Page Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 enhancements to the user order detail page: an explicit complaint-deadline message, a real return (retur) workflow, courier photo in tracking, a two-column layout, and a payment-method row.

**Architecture:** Extend the existing `Complaint` model/routes with return-workflow status values and two new subdocuments (`returnShipment`, `resolution`) instead of a new collection. Restructure `PesananDetail.tsx` into a two-column layout first, then layer each feature's UI into the correct column. Extend `admin/Complaints.tsx` with guided, status-aware action buttons for the return flow.

**Tech Stack:** Express + Mongoose (backend), React + TypeScript + Tailwind (frontend). No test framework exists in this project — every task is verified via `tsc -b` + `npm run lint` (frontend) and manual browser/curl checks (per `CLAUDE.md`), never via new test files.

---

## Before You Start

- Read [docs/superpowers/specs/2026-07-02-order-detail-enhancements-design.md](../specs/2026-07-02-order-detail-enhancements-design.md) — this plan implements that spec exactly.
- Run `npm run dev` from the repo root once to confirm both servers (Express on :8000, Vite on :5173) start cleanly before making any changes — this is your baseline.
- This project has **no test suite**. Do not create `*.test.*` files. "Write a failing test" steps in other plans do not apply here — each task below is verified by type-check/lint and, where relevant, manual exercise through the browser.

---

### Task 1: Extend `Complaint` model with return-workflow fields

**Files:**
- Modify: `models/Complaint.js`

- [ ] **Step 1: Replace the schema definition**

Replace the entire contents of `models/Complaint.js` with:

```js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
  },
  type: { type: String, enum: ['complaint', 'return'], required: true },
  reason: { type: String, required: true },
  photos: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'processing', 'awaiting_return_shipment', 'return_shipped', 'return_received', 'resolved', 'rejected'],
    default: 'open',
  },
  adminNote: { type: String, default: '' },
  resolvedAt: { type: Date },
  returnShipment: {
    courier: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    shippedAt: { type: Date },
  },
  resolution: {
    type: { type: String, enum: ['refund', 'replace'] },
    note: { type: String, default: '' },
  },
}, { timestamps: true });

complaintSchema.index({ customer: 1 });
complaintSchema.index({ order: 1 });
complaintSchema.index({ status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
```

Note on `resolution: { type: { type: String, enum: [...] }, note: {...} }` — nesting a field literally named `type` inside a subdocument is a known Mongoose gotcha. This exact double-nested form (`type: { type: String, enum: [...] }`) is the correct, Mongoose-documented way to do it — verified empirically (see Step 2) rather than assumed.

- [ ] **Step 2: Verify the schema compiles and validates correctly**

Run (from repo root):

```bash
node -e "
const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
console.log('status enum:', Complaint.schema.path('status').enumValues);
console.log('resolution.type enum:', Complaint.schema.path('resolution.type').enumValues);
const ok = new Complaint({ order: new mongoose.Types.ObjectId(), customer: new mongoose.Types.ObjectId(), type: 'return', reason: 'test reason here', status: 'return_received', resolution: { type: 'refund', note: 'ok' } });
console.log('valid doc error:', ok.validateSync());
const bad = new Complaint({ order: new mongoose.Types.ObjectId(), customer: new mongoose.Types.ObjectId(), type: 'return', reason: 'test reason here', resolution: { type: 'bogus' } });
console.log('invalid resolution.type error:', bad.validateSync()?.message);
"
```

Expected output: both enum arrays print with the new values, `valid doc error: undefined`, and `invalid resolution.type error:` prints a message containing `resolution.type`.

- [ ] **Step 3: Commit**

```bash
git add models/Complaint.js
git commit -m "feat: extend Complaint model with return workflow fields"
```

---

### Task 2: Fix `Notification` model enum for complaint types

**Files:**
- Modify: `models/Notification.js:6-13`

The existing `type` enum on `Notification` is missing `'complaint_new'` — which `routes/complaints.js` already sends today, silently failing validation every time (caught and logged, never surfaced). This task fixes that pre-existing gap and adds `'complaint_update'`, which Task 3 needs for return-status notifications to actually persist.

- [ ] **Step 1: Extend the enum**

In `models/Notification.js`, replace:

```js
  type: {
    type: String,
    enum: [
      'order_new', 'payment_paid', 'payment_failed', 'review_new', 'contact_new', 'promo_expiring',
      'payment_confirmed', 'promo_new',
    ],
    required: true,
  },
```

with:

```js
  type: {
    type: String,
    enum: [
      'order_new', 'payment_paid', 'payment_failed', 'review_new', 'contact_new', 'promo_expiring',
      'payment_confirmed', 'promo_new', 'complaint_new', 'complaint_update',
    ],
    required: true,
  },
```

- [ ] **Step 2: Verify**

```bash
node -e "
const Notification = require('./models/Notification');
const mongoose = require('mongoose');
const doc = new Notification({ recipientType: 'admin', type: 'complaint_update', title: 't', message: 'm' });
console.log('complaint_update error:', doc.validateSync());
const bad = new Notification({ recipientType: 'admin', type: 'not_a_real_type', title: 't', message: 'm' });
console.log('invalid type error:', bad.validateSync()?.message);
"
```

Expected: `complaint_update error: undefined`, and `invalid type error:` prints an enum validation message.

- [ ] **Step 3: Commit**

```bash
git add models/Notification.js
git commit -m "fix: add missing complaint notification types to Notification enum"
```

---

### Task 3: Add return-workflow endpoints to `routes/complaints.js`

**Files:**
- Modify: `routes/complaints.js`

- [ ] **Step 1: Import `notifyCustomer` and add a status-label map**

Replace line 8:

```js
const { notifyAdmin } = require('../utils/notify');
```

with:

```js
const { notifyAdmin, notifyCustomer } = require('../utils/notify');
```

Then, right after line 10 (`const COMPLAINT_WINDOW_DAYS = 3;`), add:

```js

const STATUS_LABEL_ID = {
  open: 'Menunggu',
  processing: 'Diproses',
  awaiting_return_shipment: 'Retur disetujui, menunggu kamu kirim barang',
  return_shipped: 'Barang retur dalam perjalanan',
  return_received: 'Barang retur diterima, menunggu resolusi',
  resolved: 'Selesai',
  rejected: 'Ditolak',
};
```

- [ ] **Step 2: Add the `ship-return` endpoint**

Insert this new route directly after the `GET /api/complaints/my/order/:orderId` handler (after its closing `});` — i.e. right before the `// ─── GET /api/complaints — admin: all complaints ───` comment):

```js
// ─── PUT /api/complaints/:id/ship-return — customer: confirm return shipment ───
router.put('/:id/ship-return', customerAuth, async (req, res) => {
  try {
    const { courier, trackingNumber } = req.body;
    if (!courier?.trim() || !trackingNumber?.trim()) {
      return res.status(400).json({ message: 'Kurir dan nomor resi wajib diisi' });
    }

    const complaint = await Complaint.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });
    if (complaint.type !== 'return') {
      return res.status(400).json({ message: 'Hanya retur yang bisa mengirim resi kembali' });
    }
    if (complaint.status !== 'awaiting_return_shipment') {
      return res.status(400).json({ message: 'Retur ini belum disetujui atau resi sudah dikirim' });
    }

    complaint.returnShipment = {
      courier: courier.trim(),
      trackingNumber: trackingNumber.trim(),
      shippedAt: new Date(),
    };
    complaint.status = 'return_shipped';
    await complaint.save();

    try {
      await notifyAdmin({
        type: 'complaint_new',
        title: 'Resi retur dikirim customer',
        message: `${req.customer.name} mengirim resi retur: ${courier.trim()} - ${trackingNumber.trim()}`,
        link: `/admin/complaints/${complaint._id}`,
        relatedId: complaint._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] ship-return notify failed:', notifyErr.message);
    }

    res.json(complaint);
  } catch (err) {
    console.error('[Complaint Ship-Return]', err);
    res.status(500).json({ message: 'Gagal mengirim data resi retur' });
  }
});

```

- [ ] **Step 3: Extend `PUT /api/complaints/:id` to accept `resolution` and notify the customer**

Replace the existing handler (originally lines 127-143):

```js
// ─── PUT /api/complaints/:id — admin: update status/note ───
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });

    if (status) complaint.status = status;
    if (adminNote !== undefined) complaint.adminNote = adminNote;
    if (status === 'resolved' || status === 'rejected') complaint.resolvedAt = new Date();

    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

with:

```js
// ─── PUT /api/complaints/:id — admin: update status/note/resolution ───
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, adminNote, resolution } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Komplain tidak ditemukan' });

    if (status === 'resolved' && complaint.type === 'return') {
      if (!resolution || !['refund', 'replace'].includes(resolution.type)) {
        return res.status(400).json({ message: 'Pilih jenis resolusi: refund atau ganti barang' });
      }
      complaint.resolution = { type: resolution.type, note: resolution.note || '' };
    }

    const previousStatus = complaint.status;
    if (status) complaint.status = status;
    if (adminNote !== undefined) complaint.adminNote = adminNote;
    if (status === 'resolved' || status === 'rejected') complaint.resolvedAt = new Date();

    await complaint.save();

    if (status && status !== previousStatus) {
      try {
        await notifyCustomer({
          customerId: complaint.customer,
          type: 'complaint_update',
          title: complaint.type === 'return' ? 'Update status retur' : 'Update status komplain',
          message: `Status ${complaint.type === 'return' ? 'retur' : 'komplain'} kamu: ${STATUS_LABEL_ID[status] ?? status}`,
          link: `/pesanan/${complaint.order}`,
          relatedId: complaint._id,
        });
      } catch (notifyErr) {
        console.error('[Notify] complaint status notify failed:', notifyErr.message);
      }
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

No additional status-transition validation is added here beyond the `resolution` requirement — this matches today's behavior (no FSM enforcement on this endpoint). The guided, type-aware flow lives entirely in the admin UI (Task 10).

- [ ] **Step 4: Smoke-test the new route is wired up**

Start the dev server: `npm run dev` (from repo root). Confirm the console prints `Server running on port 8000` with no errors.

Then, in another terminal:

```bash
curl -i -X PUT http://localhost:8000/api/complaints/000000000000000000000000/ship-return \
  -H "Content-Type: application/json" \
  -d '{"courier":"JNE","trackingNumber":"123"}'
```

Expected: `HTTP/1.1 401` with body `{"message":"No token, authorization denied"}` — this confirms the route exists and `customerAuth` guards it. Full functional verification of the approve → ship → receive → resolve flow happens end-to-end in Task 11, once the customer- and admin-facing UI exist to drive it through the browser with real data.

- [ ] **Step 5: Commit**

```bash
git add routes/complaints.js
git commit -m "feat: add return-shipment endpoint and resolution support to complaints API"
```

---

### Task 4: Update frontend types

**Files:**
- Modify: `client/src/types/ecommerce.ts`

- [ ] **Step 1: Extend the `Complaint` interface**

Replace (originally lines 339-352):

```ts
export interface Complaint {
  _id: string;
  order: string | { _id: string; midtransOrderId: string; total: number };
  customer: string;
  customerSnapshot: { name: string; email: string };
  type: 'complaint' | 'return';
  reason: string;
  photos: string[];
  status: 'open' | 'processing' | 'resolved' | 'rejected';
  adminNote: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

with:

```ts
export interface Complaint {
  _id: string;
  order: string | { _id: string; midtransOrderId: string; total: number };
  customer: string;
  customerSnapshot: { name: string; email: string };
  type: 'complaint' | 'return';
  reason: string;
  photos: string[];
  status: 'open' | 'processing' | 'awaiting_return_shipment' | 'return_shipped' | 'return_received' | 'resolved' | 'rejected';
  adminNote: string;
  resolvedAt?: string;
  returnShipment?: { courier: string; trackingNumber: string; shippedAt: string };
  resolution?: { type: 'refund' | 'replace'; note: string };
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add `driver_photo_url` to `BiteshipTracking`**

Replace (originally lines 327-337):

```ts
export interface BiteshipTracking {
  id: string;
  courier: {
    company: string;
    name: string | null;
    phone: string | null;
    tracking_id: string;
    waybill_id: string;
    history: BiteshipTrackingHistory[];
  };
}
```

with:

```ts
export interface BiteshipTracking {
  id: string;
  courier: {
    company: string;
    name: string | null;
    phone: string | null;
    tracking_id: string;
    waybill_id: string;
    driver_photo_url: string | null;
    history: BiteshipTrackingHistory[];
  };
}
```

- [ ] **Step 3: Add `'complaint_update'` to the notification type union**

Replace (originally lines 365-367):

```ts
  type:
    | 'order_new' | 'payment_paid' | 'payment_failed' | 'review_new' | 'contact_new' | 'promo_expiring'
    | 'payment_confirmed' | 'promo_new' | 'order_cancelled' | 'order_packing' | 'complaint_new';
```

with:

```ts
  type:
    | 'order_new' | 'payment_paid' | 'payment_failed' | 'review_new' | 'contact_new' | 'promo_expiring'
    | 'payment_confirmed' | 'promo_new' | 'order_cancelled' | 'order_packing' | 'complaint_new' | 'complaint_update';
```

- [ ] **Step 4: Verify**

```bash
cd client && npx tsc -b
```

Expected: no errors (this task only widens unions and adds optional fields — nothing downstream narrows on the old literal set exhaustively, so no new errors should appear).

- [ ] **Step 5: Commit**

```bash
cd .. && git add client/src/types/ecommerce.ts
git commit -m "feat: add return workflow and driver photo fields to frontend types"
```

---

### Task 5: Add `shipReturnComplaint` API method and extend `updateComplaint`

**Files:**
- Modify: `client/src/services/api.ts:562-612`

- [ ] **Step 1: Add `shipReturnComplaint` after `getMyComplaintByOrder`**

Insert this new method right after the `getMyComplaintByOrder` method (after its closing `},`, before the `// Complaints — admin` comment):

```ts
  shipReturnComplaint: async (id: string, data: { courier: string; trackingNumber: string }) => {
    const token = localStorage.getItem('customerToken');
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/ship-return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal mengirim data resi retur');
    }
    return res.json();
  },

```

- [ ] **Step 2: Widen `updateComplaint`'s payload type**

Replace:

```ts
  updateComplaint: async (id: string, data: { status?: string; adminNote?: string }) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal update komplain');
    }
    return res.json();
  },
```

with:

```ts
  updateComplaint: async (id: string, data: { status?: string; adminNote?: string; resolution?: { type: 'refund' | 'replace'; note: string } }) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal update komplain');
    }
    return res.json();
  },
```

- [ ] **Step 3: Verify**

```bash
cd client && npx tsc -b && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd .. && git add client/src/services/api.ts
git commit -m "feat: add shipReturnComplaint API method"
```

---

### Task 6: Restructure `PesananDetail.tsx` into a two-column layout

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

Pure structural move — no new features yet. Every condition, handler, and prop below is copied verbatim from the current file; only the wrapping container/columns and now-redundant `mb-4` spacing change.

- [ ] **Step 1: Widen the loading-skeleton container**

Replace:

```tsx
    <UserLayout title="Detail Pesanan">
      <div className="max-w-2xl space-y-4">
```

with:

```tsx
    <UserLayout title="Detail Pesanan">
      <div className="max-w-6xl mx-auto space-y-4">
```

- [ ] **Step 2: Replace the entire `return (...)` JSX block**

Find the `return (` that starts the main render (right after the `if (!order) return (...)` block) and replace everything through its matching `)` — i.e. replace this whole block:

```tsx
  return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full">
        <Link to="/pesanan" className="text-xs text-[#9A9A9A] hover:text-[#4A4A4A] mb-4 block transition-colors">
          ← Semua Pesanan
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-[#9A9A9A] font-mono">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-lg font-semibold text-[#1F1F1F]">Detail Pesanan</p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
        </div>

        {/* Countdown timer */}
        {countdown && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700">Selesaikan pembayaran sebelum waktu habis</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Pesanan akan otomatis dibatalkan jika melewati batas waktu</p>
            </div>
            <p className="text-xl font-mono font-bold text-amber-700 shrink-0 ml-4">{countdown}</p>
          </div>
        )}

        {/* Status stepper */}
        {order.orderStatus !== 'cancelled' ? (
          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4 mb-4">
            <div className="flex items-end">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-end flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center mb-1 text-xs font-medium ${
                        i <= currentStep
                          ? 'bg-[#1F1F1F] text-white'
                          : 'border border-[#E8E8E5] text-[#9A9A9A]'
                      }`}
                    >
                      {i < currentStep ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span className="text-[10px] text-center leading-tight w-14 text-[#4A4A4A]">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-5 ${i < currentStep ? 'bg-[#1F1F1F]' : 'bg-[#E8E8E5]'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm font-medium text-red-700 text-center">
            Pesanan Dibatalkan
          </div>
        )}

        {/* Complaint status (if exists) */}
        {complaint && complaint._id && (
          <div className="rounded-lg border border-[#E8E8E5] bg-white px-4 py-3 mb-4 flex items-center gap-3">
            <MessageSquare className="size-4 text-[#4A4A4A] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1F1F1F]">
                {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
              </p>
              <p className="text-xs text-[#9A9A9A] truncate">{complaint.reason}</p>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
              complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
              complaint.status === 'rejected' ? 'bg-red-100 text-red-700' :
              complaint.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {complaint.status === 'open' ? 'Menunggu' :
               complaint.status === 'processing' ? 'Diproses' :
               complaint.status === 'resolved' ? 'Selesai' : 'Ditolak'}
            </span>
          </div>
        )}

        {/* Shipping info */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Info Pengiriman</p>
          </div>
          <div className="px-4 pb-4 pt-3 space-y-1">
            <p className="text-sm text-[#1F1F1F] font-medium">{order.shippingAddress.recipientName}</p>
            <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.phone}</p>
            <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.street}</p>
            <p className="text-sm text-[#4A4A4A]">
              {order.shippingAddress.areaName}{order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
            </p>
            <div className="pt-2 border-t border-[#F0F0EC] mt-2">
              <p className="text-sm text-[#4A4A4A]">
                <span className="font-medium text-[#1F1F1F]">{order.shippingCourier.toUpperCase()}</span>
                {' — '}{order.shippingServiceName}
                {order.estimatedDays ? ` (${order.estimatedDays})` : ''}
              </p>
              {order.biteshipTrackingCode && ['shipped', 'delivered'].includes(order.orderStatus) && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-[#F5F5F3] rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide">No. Resi</p>
                    <p className="text-sm font-medium text-[#1F1F1F] font-mono truncate">{order.biteshipTrackingCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(order.biteshipTrackingCode ?? '')}
                    className="text-xs text-[#4A4A4A] border border-[#E8E8E5] px-2 py-1 rounded-md hover:bg-white transition-colors shrink-0"
                  >
                    Salin
                  </button>
                </div>
              )}
            </div>
            {/* Tracking button */}
            {order.biteshipOrderId && ['packing', 'shipped', 'delivered'].includes(order.orderStatus) && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={showTracking ? () => setShowTracking(false) : handleLoadTracking}
                  className="flex items-center gap-1.5"
                >
                  {trackingLoading
                    ? <><RefreshCw className="size-3 animate-spin" /> Memuat...</>
                    : <><Truck className="size-3" /> {showTracking ? 'Sembunyikan Tracking' : 'Cek Status Pengiriman'}</>
                  }
                </Button>
                {showTracking && (
                  <div className="mt-3 border border-[#E8E8E5] rounded-lg p-3">
                    {trackingLoading && (
                      <p className="text-xs text-[#9A9A9A]">Mengambil data tracking...</p>
                    )}
                    {trackingError && (
                      <p className="text-xs text-red-600">{trackingError}</p>
                    )}
                    {!trackingLoading && !trackingError && tracking && (
                      <div>
                        <p className="text-xs font-semibold text-[#1F1F1F] mb-2">
                          {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                        </p>
                        <div className="space-y-2">
                          {(tracking.courier?.history ?? []).slice().reverse().map((h, i) => (
                            <div key={i} className="flex gap-2 text-xs">
                              <div className="flex flex-col items-center mt-0.5">
                                <div className={`size-2 rounded-full ${i === 0 ? 'bg-[#1F1F1F]' : 'bg-[#C8C8C4]'}`} />
                                {i < (tracking.courier?.history?.length ?? 0) - 1 && (
                                  <div className="w-px flex-1 bg-[#E8E8E5] my-1" />
                                )}
                              </div>
                              <div className="pb-2">
                                <p className="text-[#1F1F1F] font-medium leading-tight">{h.note}</p>
                                <p className="text-[#9A9A9A] mt-0.5">
                                  {new Date(h.updated_at).toLocaleString('id-ID', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Daftar Item</p>
          </div>
          <div>
            {order.items.map((item, i) => {
              const key = item.product ? `${order._id}-${item.product}` : null
              const status = key ? reviewStatuses[key] : null
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0EC] last:border-0"
                >
                  <img
                    src={api.getImageUrl(item.image)}
                    alt={item.name}
                    className="size-10 rounded-md object-cover bg-[#F7F7F5] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1F1F1F] truncate">{item.name}</p>
                    {item.variantName && (
                      <p className="text-xs text-[#9A9A9A]">{item.variantName}</p>
                    )}
                    <p className="text-xs text-[#9A9A9A]">{item.quantity} × {fmt(item.priceNumeric)}</p>
                    {order.orderStatus === 'delivered' && status?.canReview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewFormItem({ productId: item.product, orderId: order._id, productName: item.name })}
                        className="mt-1.5"
                      >
                        Tulis Ulasan
                      </Button>
                    )}
                    {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
                      <span className="mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Sudah Diulas
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#1F1F1F] shrink-0 ml-auto">{fmt(item.subtotal)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cost summary */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Ringkasan Biaya</p>
          </div>
          <div className="py-1">
            <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
              <span>Subtotal produk</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
              <span>Ongkos kirim</span>
              <span>{fmt(order.shippingCost)}</span>
            </div>
            {(order.voucherDiscount ?? 0) > 0 && (
              <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                <span className="text-emerald-700">-{fmt(order.voucherDiscount ?? 0)}</span>
              </div>
            )}
            <div className="border-t border-[#F0F0EC] my-1" />
            <div className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold text-[#1F1F1F]">
              <span>Total</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {canRepay && (
            <Button
              onClick={handleRepay}
              disabled={paying}
              className="w-full"
            >
              {paying ? 'Memproses...' : 'Bayar Sekarang'}
            </Button>
          )}

          {canDownloadInvoice && (
            <a
              href={api.getOrderInvoiceUrl(order._id)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border border-[#E8E8E5] text-[#4A4A4A] text-sm font-medium rounded-md px-4 py-2.5 hover:bg-[#F7F7F5] transition-colors"
            >
              <FileText className="size-4" />
              Download Invoice
            </a>
          )}

          {canComplain && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowComplaintForm(true)}
              className="w-full"
            >
              <MessageSquare className="size-4" />
              Buka Komplain / Retur
            </Button>
          )}

          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full"
            >
              <XCircle className="size-4" />
              {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
            </Button>
          )}
        </div>
      </div>

      {showComplaintForm && order && (
        <ComplaintForm
          orderId={order._id}
          onSuccess={(c) => {
            setComplaint(c)
            setShowComplaintForm(false)
          }}
          onClose={() => setShowComplaintForm(false)}
        />
      )}

      <ReviewForm
        open={!!reviewFormItem}
        onClose={() => setReviewFormItem(null)}
        onSuccess={() => {
          if (!order || !reviewFormItem) return
          const key = `${reviewFormItem.orderId}-${reviewFormItem.productId}`
          setReviewStatuses((prev) => ({
            ...prev,
            [key]: { canReview: false, alreadyReviewed: true },
          }))
          setReviewFormItem(null)
        }}
        productId={reviewFormItem?.productId ?? ''}
        orderId={reviewFormItem?.orderId ?? ''}
        productName={reviewFormItem?.productName ?? ''}
      />
    </UserLayout>
  )
}
```

with:

```tsx
  return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full max-w-6xl mx-auto">
        <Link to="/pesanan" className="text-xs text-[#9A9A9A] hover:text-[#4A4A4A] mb-4 block transition-colors">
          ← Semua Pesanan
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-[#9A9A9A] font-mono">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-lg font-semibold text-[#1F1F1F]">Detail Pesanan</p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
        </div>

        {/* Countdown timer */}
        {countdown && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700">Selesaikan pembayaran sebelum waktu habis</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Pesanan akan otomatis dibatalkan jika melewati batas waktu</p>
            </div>
            <p className="text-xl font-mono font-bold text-amber-700 shrink-0 ml-4">{countdown}</p>
          </div>
        )}

        {/* Status stepper */}
        {order.orderStatus !== 'cancelled' ? (
          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4 mb-4">
            <div className="flex items-end">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-end flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center mb-1 text-xs font-medium ${
                        i <= currentStep
                          ? 'bg-[#1F1F1F] text-white'
                          : 'border border-[#E8E8E5] text-[#9A9A9A]'
                      }`}
                    >
                      {i < currentStep ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span className="text-[10px] text-center leading-tight w-14 text-[#4A4A4A]">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-5 ${i < currentStep ? 'bg-[#1F1F1F]' : 'bg-[#E8E8E5]'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm font-medium text-red-700 text-center">
            Pesanan Dibatalkan
          </div>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left column: status & shipping */}
          <div className="space-y-4">
            {/* Complaint status (if exists) */}
            {complaint && complaint._id && (
              <div className="rounded-lg border border-[#E8E8E5] bg-white px-4 py-3 flex items-center gap-3">
                <MessageSquare className="size-4 text-[#4A4A4A] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F1F1F]">
                    {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
                  </p>
                  <p className="text-xs text-[#9A9A9A] truncate">{complaint.reason}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                  complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                  complaint.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  complaint.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {complaint.status === 'open' ? 'Menunggu' :
                   complaint.status === 'processing' ? 'Diproses' :
                   complaint.status === 'resolved' ? 'Selesai' : 'Ditolak'}
                </span>
              </div>
            )}

            {/* Shipping info */}
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
                <p className="text-[15px] font-semibold text-[#1F1F1F]">Info Pengiriman</p>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-1">
                <p className="text-sm text-[#1F1F1F] font-medium">{order.shippingAddress.recipientName}</p>
                <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.phone}</p>
                <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.street}</p>
                <p className="text-sm text-[#4A4A4A]">
                  {order.shippingAddress.areaName}{order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
                </p>
                <div className="pt-2 border-t border-[#F0F0EC] mt-2">
                  <p className="text-sm text-[#4A4A4A]">
                    <span className="font-medium text-[#1F1F1F]">{order.shippingCourier.toUpperCase()}</span>
                    {' — '}{order.shippingServiceName}
                    {order.estimatedDays ? ` (${order.estimatedDays})` : ''}
                  </p>
                  {order.biteshipTrackingCode && ['shipped', 'delivered'].includes(order.orderStatus) && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-[#F5F5F3] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide">No. Resi</p>
                        <p className="text-sm font-medium text-[#1F1F1F] font-mono truncate">{order.biteshipTrackingCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(order.biteshipTrackingCode ?? '')}
                        className="text-xs text-[#4A4A4A] border border-[#E8E8E5] px-2 py-1 rounded-md hover:bg-white transition-colors shrink-0"
                      >
                        Salin
                      </button>
                    </div>
                  )}
                </div>
                {/* Tracking button */}
                {order.biteshipOrderId && ['packing', 'shipped', 'delivered'].includes(order.orderStatus) && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={showTracking ? () => setShowTracking(false) : handleLoadTracking}
                      className="flex items-center gap-1.5"
                    >
                      {trackingLoading
                        ? <><RefreshCw className="size-3 animate-spin" /> Memuat...</>
                        : <><Truck className="size-3" /> {showTracking ? 'Sembunyikan Tracking' : 'Cek Status Pengiriman'}</>
                      }
                    </Button>
                    {showTracking && (
                      <div className="mt-3 border border-[#E8E8E5] rounded-lg p-3">
                        {trackingLoading && (
                          <p className="text-xs text-[#9A9A9A]">Mengambil data tracking...</p>
                        )}
                        {trackingError && (
                          <p className="text-xs text-red-600">{trackingError}</p>
                        )}
                        {!trackingLoading && !trackingError && tracking && (
                          <div>
                            <p className="text-xs font-semibold text-[#1F1F1F] mb-2">
                              {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                            </p>
                            <div className="space-y-2">
                              {(tracking.courier?.history ?? []).slice().reverse().map((h, i) => (
                                <div key={i} className="flex gap-2 text-xs">
                                  <div className="flex flex-col items-center mt-0.5">
                                    <div className={`size-2 rounded-full ${i === 0 ? 'bg-[#1F1F1F]' : 'bg-[#C8C8C4]'}`} />
                                    {i < (tracking.courier?.history?.length ?? 0) - 1 && (
                                      <div className="w-px flex-1 bg-[#E8E8E5] my-1" />
                                    )}
                                  </div>
                                  <div className="pb-2">
                                    <p className="text-[#1F1F1F] font-medium leading-tight">{h.note}</p>
                                    <p className="text-[#9A9A9A] mt-0.5">
                                      {new Date(h.updated_at).toLocaleString('id-ID', {
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {canComplain && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowComplaintForm(true)}
                className="w-full"
              >
                <MessageSquare className="size-4" />
                Buka Komplain / Retur
              </Button>
            )}

            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full"
              >
                <XCircle className="size-4" />
                {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
              </Button>
            )}
          </div>

          {/* Right column: items & cost */}
          <div className="space-y-4">
            {/* Items */}
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
                <p className="text-[15px] font-semibold text-[#1F1F1F]">Daftar Item</p>
              </div>
              <div>
                {order.items.map((item, i) => {
                  const key = item.product ? `${order._id}-${item.product}` : null
                  const status = key ? reviewStatuses[key] : null
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0EC] last:border-0"
                    >
                      <img
                        src={api.getImageUrl(item.image)}
                        alt={item.name}
                        className="size-10 rounded-md object-cover bg-[#F7F7F5] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1F1F1F] truncate">{item.name}</p>
                        {item.variantName && (
                          <p className="text-xs text-[#9A9A9A]">{item.variantName}</p>
                        )}
                        <p className="text-xs text-[#9A9A9A]">{item.quantity} × {fmt(item.priceNumeric)}</p>
                        {order.orderStatus === 'delivered' && status?.canReview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewFormItem({ productId: item.product, orderId: order._id, productName: item.name })}
                            className="mt-1.5"
                          >
                            Tulis Ulasan
                          </Button>
                        )}
                        {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
                          <span className="mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            Sudah Diulas
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#1F1F1F] shrink-0 ml-auto">{fmt(item.subtotal)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cost summary */}
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
                <p className="text-[15px] font-semibold text-[#1F1F1F]">Ringkasan Biaya</p>
              </div>
              <div className="py-1">
                <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                  <span>Subtotal produk</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                  <span>Ongkos kirim</span>
                  <span>{fmt(order.shippingCost)}</span>
                </div>
                {(order.voucherDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                    <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                    <span className="text-emerald-700">-{fmt(order.voucherDiscount ?? 0)}</span>
                  </div>
                )}
                <div className="border-t border-[#F0F0EC] my-1" />
                <div className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold text-[#1F1F1F]">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {canRepay && (
              <Button
                onClick={handleRepay}
                disabled={paying}
                className="w-full"
              >
                {paying ? 'Memproses...' : 'Bayar Sekarang'}
              </Button>
            )}

            {canDownloadInvoice && (
              <a
                href={api.getOrderInvoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-[#E8E8E5] text-[#4A4A4A] text-sm font-medium rounded-md px-4 py-2.5 hover:bg-[#F7F7F5] transition-colors"
              >
                <FileText className="size-4" />
                Download Invoice
              </a>
            )}
          </div>
        </div>
      </div>

      {showComplaintForm && order && (
        <ComplaintForm
          orderId={order._id}
          onSuccess={(c) => {
            setComplaint(c)
            setShowComplaintForm(false)
          }}
          onClose={() => setShowComplaintForm(false)}
        />
      )}

      <ReviewForm
        open={!!reviewFormItem}
        onClose={() => setReviewFormItem(null)}
        onSuccess={() => {
          if (!order || !reviewFormItem) return
          const key = `${reviewFormItem.orderId}-${reviewFormItem.productId}`
          setReviewStatuses((prev) => ({
            ...prev,
            [key]: { canReview: false, alreadyReviewed: true },
          }))
          setReviewFormItem(null)
        }}
        productId={reviewFormItem?.productId ?? ''}
        orderId={reviewFormItem?.orderId ?? ''}
        productName={reviewFormItem?.productName ?? ''}
      />
    </UserLayout>
  )
}
```

- [ ] **Step 3: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Verify visually in the browser**

Start the dev servers (`npm run dev` from repo root), log in as a customer with at least one order, open `/pesanan/<id>` for an order in `delivered` status. Confirm: on a desktop-width window, Info Pengiriman is on the left and Daftar Item + Ringkasan Biaya are on the right; on a narrow/mobile window, everything stacks back into one column in the same order as before (left column content, then right column content). Confirm every button (Bayar Sekarang, Download Invoice, Buka Komplain/Retur, Batalkan Pesanan, Cek Status Pengiriman, Tulis Ulasan) still works exactly as before.

- [ ] **Step 5: Commit**

```bash
cd .. && git add client/src/pages/PesananDetail.tsx
git commit -m "refactor: restructure order detail page into two-column layout"
```

---

### Task 7: Complaint-deadline info text

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

- [ ] **Step 1: Add a derived deadline label**

Find this line (in the block of derived `const`s right before the main `return`):

```tsx
  const canComplain = order.orderStatus === 'delivered' && !complaintWindowExpired && complaint === null
```

Add directly after it:

```tsx
  const complaintDeadlineLabel = deliveredAt
    ? new Date(deliveredAt + COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null
```

- [ ] **Step 2: Add the info text under the complaint button**

Find (in the left column, added in Task 6):

```tsx
            {canComplain && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowComplaintForm(true)}
                className="w-full"
              >
                <MessageSquare className="size-4" />
                Buka Komplain / Retur
              </Button>
            )}

            {canCancel && (
```

Replace with:

```tsx
            {canComplain && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowComplaintForm(true)}
                className="w-full"
              >
                <MessageSquare className="size-4" />
                Buka Komplain / Retur
              </Button>
            )}
            {canComplain && complaintDeadlineLabel && (
              <p className="text-[11px] text-[#9A9A9A] text-center">
                Anda dapat mengajukan komplain hingga {complaintDeadlineLabel}
              </p>
            )}
            {order.orderStatus === 'delivered' && complaintWindowExpired && complaint === null && (
              <p className="text-[11px] text-[#9A9A9A] text-center">
                Batas waktu komplain untuk pesanan ini sudah berakhir
              </p>
            )}

            {canCancel && (
```

- [ ] **Step 3: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

- [ ] **Step 4: Verify in the browser**

Open an order detail page for a `delivered` order with no complaint filed yet — confirm the deadline text shows under the button with the correct date (3 days after `updatedAt`). If you have (or can create via MongoDB) a `delivered` order older than 3 days with no complaint, confirm the "batas waktu sudah berakhir" text shows and the button is absent.

- [ ] **Step 5: Commit**

```bash
cd .. && git add client/src/pages/PesananDetail.tsx
git commit -m "feat: show complaint deadline info on order detail page"
```

---

### Task 8: Courier photo in tracking history

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

- [ ] **Step 1: Show `driver_photo_url` next to the courier name**

Find:

```tsx
                        <p className="text-xs font-semibold text-[#1F1F1F] mb-2">
                          {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                        </p>
```

Replace with:

```tsx
                        <div className="flex items-center gap-2 mb-2">
                          {tracking.courier?.driver_photo_url && (
                            <img
                              src={tracking.courier.driver_photo_url}
                              alt="Foto kurir"
                              className="size-8 rounded-full object-cover shrink-0"
                            />
                          )}
                          <p className="text-xs font-semibold text-[#1F1F1F]">
                            {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                          </p>
                        </div>
```

- [ ] **Step 2: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

- [ ] **Step 3: Verify in the browser**

Open an order with `packing`/`shipped`/`delivered` status and a real `biteshipOrderId`, click "Cek Status Pengiriman". For most couriers `driver_photo_url` will be `null` (JNE/J&T/SiCepat etc.) — confirm no broken image or empty circle renders in that case. If the courier used happens to be an instant courier with a photo, confirm the avatar renders next to the courier name.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/PesananDetail.tsx
git commit -m "feat: show courier photo in shipment tracking when available"
```

---

### Task 9: Payment method in cost summary

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

- [ ] **Step 1: Add the label map**

Find (near the top of the file, after `fmt`):

```tsx
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
```

Add directly after it:

```tsx

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer Bank',
  gopay: 'GoPay',
  qris: 'QRIS',
  credit_card: 'Kartu Kredit',
  cstore: 'Gerai Retail (Alfamart/Indomaret)',
  shopeepay: 'ShopeePay',
}
```

- [ ] **Step 2: Add the row to Ringkasan Biaya**

Find (inside the Ringkasan Biaya card, right column):

```tsx
                {(order.voucherDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                    <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                    <span className="text-emerald-700">-{fmt(order.voucherDiscount ?? 0)}</span>
                  </div>
                )}
                <div className="border-t border-[#F0F0EC] my-1" />
```

Replace with:

```tsx
                {(order.voucherDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                    <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                    <span className="text-emerald-700">-{fmt(order.voucherDiscount ?? 0)}</span>
                  </div>
                )}
                {order.midtransPaymentType && (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                    <span>Metode Pembayaran</span>
                    <span className="text-[#1F1F1F] font-medium">
                      {PAYMENT_METHOD_LABEL[order.midtransPaymentType] ?? order.midtransPaymentType}
                    </span>
                  </div>
                )}
                <div className="border-t border-[#F0F0EC] my-1" />
```

- [ ] **Step 3: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

- [ ] **Step 4: Verify in the browser**

Open an order that has been paid (any `paymentStatus: 'paid'` order) and confirm "Metode Pembayaran" shows a readable label (e.g. "Transfer Bank", "GoPay") above Total. Open an `awaiting_payment` order and confirm the row is absent (no `midtransPaymentType` set yet).

- [ ] **Step 5: Commit**

```bash
cd .. && git add client/src/pages/PesananDetail.tsx
git commit -m "feat: show payment method in order cost summary"
```

---

### Task 10: Admin — guided return actions and resolution form

**Files:**
- Modify: `client/src/pages/admin/Complaints.tsx`

- [ ] **Step 1: Extend the status label/color/filter maps**

Replace (lines 8-34):

```tsx
const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'open', label: 'Menunggu' },
  { value: 'processing', label: 'Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'complaint', label: 'Komplain' },
  { value: 'return', label: 'Retur' },
];

const STATUS_COLOR: Record<string, string> = {
  open:       'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  resolved:   'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  open:       'Menunggu',
  processing: 'Diproses',
  resolved:   'Selesai',
  rejected:   'Ditolak',
};
```

with:

```tsx
const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'open', label: 'Menunggu' },
  { value: 'processing', label: 'Diproses' },
  { value: 'awaiting_return_shipment', label: 'Retur Disetujui' },
  { value: 'return_shipped', label: 'Barang Dikirim' },
  { value: 'return_received', label: 'Barang Diterima' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'complaint', label: 'Komplain' },
  { value: 'return', label: 'Retur' },
];

const STATUS_COLOR: Record<string, string> = {
  open:                     'bg-amber-100 text-amber-700',
  processing:               'bg-blue-100 text-blue-700',
  awaiting_return_shipment: 'bg-purple-100 text-purple-700',
  return_shipped:           'bg-indigo-100 text-indigo-700',
  return_received:          'bg-cyan-100 text-cyan-700',
  resolved:                 'bg-green-100 text-green-700',
  rejected:                 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  open:                     'Menunggu',
  processing:               'Diproses',
  awaiting_return_shipment: 'Retur Disetujui',
  return_shipped:           'Barang Dikirim',
  return_received:          'Barang Diterima',
  resolved:                 'Selesai',
  rejected:                 'Ditolak',
};
```

- [ ] **Step 2: Add resolution-type state and reset it on open**

Replace:

```tsx
  const [selected, setSelected] = useState<ComplaintWithOrder | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
```

with:

```tsx
  const [selected, setSelected] = useState<ComplaintWithOrder | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [resolutionType, setResolutionType] = useState<'refund' | 'replace' | ''>('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
```

Replace:

```tsx
  const openDetail = (c: ComplaintWithOrder) => {
    setSelected(c);
    setAdminNote(c.adminNote ?? '');
    setUpdateMsg('');
  };
```

with:

```tsx
  const openDetail = (c: ComplaintWithOrder) => {
    setSelected(c);
    setAdminNote(c.adminNote ?? '');
    setResolutionType('');
    setUpdateMsg('');
  };
```

- [ ] **Step 3: Let `handleUpdate` pass an optional resolution**

Replace:

```tsx
  const handleUpdate = async (status: string) => {
    if (!selected) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const updated = await api.updateComplaint(selected._id, { status, adminNote });
      setComplaints((prev) => prev.map((c) => c._id === updated._id ? { ...c, ...updated } : c));
      setSelected({ ...selected, ...updated });
      setUpdateMsg('Disimpan.');
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : 'Gagal update');
    } finally {
      setUpdating(false);
    }
  };
```

with:

```tsx
  const handleUpdate = async (status: string, resolution?: { type: 'refund' | 'replace'; note: string }) => {
    if (!selected) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const updated = await api.updateComplaint(selected._id, { status, adminNote, ...(resolution ? { resolution } : {}) });
      setComplaints((prev) => prev.map((c) => c._id === updated._id ? { ...c, ...updated } : c));
      setSelected({ ...selected, ...updated });
      setUpdateMsg('Disimpan.');
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : 'Gagal update');
    } finally {
      setUpdating(false);
    }
  };
```

- [ ] **Step 4: Replace the status-button grid with a guided, type-aware flow**

Replace (originally lines 237-252):

```tsx
            <div className="grid grid-cols-2 gap-2">
              {['open', 'processing', 'resolved', 'rejected']
                .filter((s) => s !== selected.status)
                .map((s) => (
                  <Button
                    key={s}
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdate(s)}
                    variant={s === 'rejected' ? 'destructive' : 'outline'}
                    className={s === 'resolved' ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}
                  >
                    → {STATUS_LABEL[s] ?? s}
                  </Button>
                ))}
            </div>
```

with:

```tsx
            {selected.type === 'return' ? (
              <div className="space-y-3">
                {['open', 'processing'].includes(selected.status) && (
                  <div className="grid grid-cols-2 gap-2">
                    {selected.status === 'open' && (
                      <Button
                        type="button"
                        disabled={updating}
                        onClick={() => handleUpdate('processing')}
                        variant="outline"
                      >
                        → Tandai Diproses
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdate('awaiting_return_shipment')}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      → Setujui Retur
                    </Button>
                    <Button
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdate('rejected')}
                      variant="destructive"
                    >
                      → Tolak
                    </Button>
                  </div>
                )}

                {selected.status === 'awaiting_return_shipment' && (
                  <p className="text-sm text-gray-500">Menunggu customer mengirim barang retur.</p>
                )}

                {(selected.status === 'return_shipped' || selected.status === 'return_received') && selected.returnShipment && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-xs font-medium text-gray-500 mb-1">Resi Kirim Balik</p>
                    <p className="text-gray-800">{selected.returnShipment.courier} — {selected.returnShipment.trackingNumber}</p>
                  </div>
                )}

                {selected.status === 'return_shipped' && (
                  <Button
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdate('return_received')}
                    variant="outline"
                    className="w-full border-green-300 text-green-700 hover:bg-green-50"
                  >
                    → Tandai Barang Diterima
                  </Button>
                )}

                {selected.status === 'return_received' && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">Resolusi</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['refund', 'replace'] as const).map((rt) => (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setResolutionType(rt)}
                          className={`py-2 text-sm rounded-lg border transition-colors ${
                            resolutionType === rt
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {rt === 'refund' ? 'Refund' : 'Ganti Barang'}
                        </button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      disabled={updating || !resolutionType}
                      onClick={() => resolutionType && handleUpdate('resolved', { type: resolutionType, note: adminNote })}
                      className="w-full"
                    >
                      Simpan Resolusi
                    </Button>
                  </div>
                )}

                {(selected.status === 'resolved' || selected.status === 'rejected') && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    {selected.status === 'resolved' && selected.resolution?.type
                      ? `Resolusi: ${selected.resolution.type === 'refund' ? 'Refund' : 'Ganti Barang'}`
                      : 'Retur ditolak.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {['open', 'processing', 'resolved', 'rejected']
                  .filter((s) => s !== selected.status)
                  .map((s) => (
                    <Button
                      key={s}
                      type="button"
                      disabled={updating}
                      onClick={() => handleUpdate(s)}
                      variant={s === 'rejected' ? 'destructive' : 'outline'}
                      className={s === 'resolved' ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}
                    >
                      → {STATUS_LABEL[s] ?? s}
                    </Button>
                  ))}
              </div>
            )}
```

- [ ] **Step 5: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

- [ ] **Step 6: Verify in the browser**

Log into `/admin`, go to Komplain & Retur. Open a `type: return` complaint in `open` status (create one from the customer site first if none exist) and confirm you see "Tandai Diproses" / "Setujui Retur" / "Tolak". Click "Setujui Retur", confirm status becomes "Retur Disetujui" and the panel now shows the "menunggu customer" message. (The rest of the flow — return_shipped → return_received → resolved — is verified end-to-end in Task 11, once the customer can submit a return shipment.) Also open a `type: complaint` (non-return) item and confirm its button grid is unchanged from before this task.

- [ ] **Step 7: Commit**

```bash
cd .. && git add client/src/pages/admin/Complaints.tsx
git commit -m "feat: add guided return workflow actions to admin complaints panel"
```

---

### Task 11: Customer — return shipment form and resolution display

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx`

- [ ] **Step 1: Add status label/color maps for the complaint card**

Find (near `COMPLAINT_WINDOW_DAYS`):

```tsx
const COMPLAINT_WINDOW_DAYS = 3
```

Add directly after it:

```tsx

const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  open: 'Menunggu',
  processing: 'Diproses',
  awaiting_return_shipment: 'Retur Disetujui',
  return_shipped: 'Barang Dikirim',
  return_received: 'Barang Diterima',
  resolved: 'Selesai',
  rejected: 'Ditolak',
}

const COMPLAINT_STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  awaiting_return_shipment: 'bg-purple-100 text-purple-700',
  return_shipped: 'bg-indigo-100 text-indigo-700',
  return_received: 'bg-cyan-100 text-cyan-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}
```

- [ ] **Step 2: Add ship-return form state and handler**

Find:

```tsx
  const [complaint, setComplaint] = useState<Complaint | null | undefined>(undefined)
  const [showComplaintForm, setShowComplaintForm] = useState(false)
```

Replace with:

```tsx
  const [complaint, setComplaint] = useState<Complaint | null | undefined>(undefined)
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [shipCourier, setShipCourier] = useState('')
  const [shipTrackingNumber, setShipTrackingNumber] = useState('')
  const [shipSubmitting, setShipSubmitting] = useState(false)
```

Find:

```tsx
  const handleLoadTracking = useCallback(async () => {
```

Add directly before it:

```tsx
  const handleShipReturn = async () => {
    if (!complaint || !shipCourier.trim() || !shipTrackingNumber.trim()) return
    setShipSubmitting(true)
    try {
      const updated = await api.shipReturnComplaint(complaint._id, {
        courier: shipCourier.trim(),
        trackingNumber: shipTrackingNumber.trim(),
      })
      setComplaint(updated)
      toast.success('Data resi retur berhasil dikirim')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim data resi retur')
    } finally {
      setShipSubmitting(false)
    }
  }

```

- [ ] **Step 3: Replace the complaint status card**

Find (in the left column):

```tsx
            {complaint && complaint._id && (
              <div className="rounded-lg border border-[#E8E8E5] bg-white px-4 py-3 flex items-center gap-3">
                <MessageSquare className="size-4 text-[#4A4A4A] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F1F1F]">
                    {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
                  </p>
                  <p className="text-xs text-[#9A9A9A] truncate">{complaint.reason}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                  complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                  complaint.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  complaint.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {complaint.status === 'open' ? 'Menunggu' :
                   complaint.status === 'processing' ? 'Diproses' :
                   complaint.status === 'resolved' ? 'Selesai' : 'Ditolak'}
                </span>
              </div>
            )}
```

with:

```tsx
            {complaint && complaint._id && (
              <div className="rounded-lg border border-[#E8E8E5] bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="size-4 text-[#4A4A4A] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F1F1F]">
                      {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
                    </p>
                    <p className="text-xs text-[#9A9A9A] truncate">{complaint.reason}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                    COMPLAINT_STATUS_COLOR[complaint.status] ?? 'bg-amber-100 text-amber-700'
                  }`}>
                    {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
                  </span>
                </div>

                {complaint.type === 'return' && complaint.status === 'awaiting_return_shipment' && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC] space-y-2">
                    <p className="text-xs text-[#4A4A4A]">Retur disetujui. Kirim barang balik lalu isi data resi di bawah ini.</p>
                    <input
                      type="text"
                      value={shipCourier}
                      onChange={(e) => setShipCourier(e.target.value)}
                      placeholder="Nama kurir (mis. JNE)"
                      className="w-full border border-[#E8E8E5] rounded-lg px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F]"
                    />
                    <input
                      type="text"
                      value={shipTrackingNumber}
                      onChange={(e) => setShipTrackingNumber(e.target.value)}
                      placeholder="Nomor resi"
                      className="w-full border border-[#E8E8E5] rounded-lg px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F]"
                    />
                    <Button
                      type="button"
                      onClick={handleShipReturn}
                      disabled={shipSubmitting || !shipCourier.trim() || !shipTrackingNumber.trim()}
                      className="w-full"
                    >
                      {shipSubmitting ? 'Mengirim...' : 'Saya Sudah Mengirim Barang'}
                    </Button>
                  </div>
                )}

                {complaint.type === 'return' && ['return_shipped', 'return_received'].includes(complaint.status) && complaint.returnShipment && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC]">
                    <p className="text-xs text-[#9A9A9A]">
                      Resi: {complaint.returnShipment.courier} — {complaint.returnShipment.trackingNumber}
                    </p>
                    <p className="text-xs text-[#9A9A9A] mt-0.5">Menunggu verifikasi admin.</p>
                  </div>
                )}

                {complaint.status === 'resolved' && complaint.resolution?.type && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC]">
                    <p className="text-sm font-medium text-[#1F1F1F]">
                      {complaint.resolution.type === 'refund' ? 'Dana Dikembalikan' : 'Barang Diganti'}
                    </p>
                    {complaint.resolution.note && (
                      <p className="text-xs text-[#9A9A9A] mt-0.5">{complaint.resolution.note}</p>
                    )}
                  </div>
                )}
              </div>
            )}
```

- [ ] **Step 4: Type-check and lint**

```bash
cd client && npx tsc -b && npm run lint
```

- [ ] **Step 5: Full end-to-end browser verification of the return flow**

This is the capstone check for Feature 2 — walk the whole path live:

1. As a customer, open a `delivered` order within its 3-day complaint window and submit a retur (type "Retur Barang") via the existing "Buka Komplain / Retur" button.
2. As admin (`/admin/komplain`), open that complaint, click "Setujui Retur". Confirm status badge changes to "Retur Disetujui".
3. Back on the customer's order detail page (reload), confirm the complaint card now shows the courier/resi input form. Fill it in and submit "Saya Sudah Mengirim Barang".
4. As admin, reload the complaint detail — confirm the resi/courier now displays read-only and status is "Barang Dikirim", with a "Tandai Barang Diterima" button.
5. Click it — status becomes "Barang Diterima", and a Refund/Ganti Barang selector + "Simpan Resolusi" button appears.
6. Pick "Refund", add a note, click "Simpan Resolusi". Confirm status becomes "Selesai".
7. Back on the customer's order detail page (reload), confirm the complaint card shows "Dana Dikembalikan" with the admin's note.

If any step fails, fix the specific piece (backend validation, admin UI, or customer UI) before committing — this is the only point in the whole plan that exercises the full backend+frontend path together.

- [ ] **Step 6: Commit**

```bash
cd .. && git add client/src/pages/PesananDetail.tsx
git commit -m "feat: add customer-facing return shipment form and resolution display"
```

---

## Out of Scope (unchanged from the spec)

- Automatic refund processing (Midtrans Refund API) — refunds stay manual.
- Biteship reverse-pickup — customer self-arranges and self-reports return shipping.
- Editing/retracting a submitted return shipment or resolution once set.
- Fixing the pre-existing `order_cancelled`/`order_packing` notification-enum gap discovered in Task 2 — unrelated to this feature, flagged separately, not fixed here.

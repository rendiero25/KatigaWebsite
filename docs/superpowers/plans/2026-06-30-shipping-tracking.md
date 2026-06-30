# Shipping Tracking Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Serahkan ke Kurir" action for admin with auto-fetch resi from Biteship, Biteship webhook for auto-delivered status, tracking timeline in admin OrderDetail, and copyable resi display for customers.

**Architecture:** Two new endpoints in `routes/orderRoutes.js` (`PUT /:id/ship` + `GET /:id/tracking` admin), a Biteship webhook handler registered in `server.js`, two new `api.ts` methods, and UI additions to `admin/OrderDetail.tsx` and `PesananDetail.tsx`.

**Tech Stack:** Express/MongoDB, React + TypeScript, Biteship API, shadcn Button

## Global Constraints

- No TypeScript `any` — use proper types from `../types/ecommerce` or `unknown`
- All styling via Tailwind `className` only — no inline `style={{}}`
- No `console.log` in committed code — `console.error` on error paths is fine
- `import type` for type-only imports (`verbatimModuleSyntax` is on)
- `cd client && npx tsc -b && npm run lint` must pass before final commit
- No new npm packages

---

### Task 1: Backend — ship endpoint, admin tracking endpoint, Biteship webhook

**Files:**
- Modify: `routes/orderRoutes.js` (add 3 new route handlers + export `biteshipWebhookHandler`)
- Modify: `server.js` (register Biteship webhook before `app.use('/api/orders', ...)`)

**Interfaces:**
- Produces: `PUT /api/orders/:id/ship` — requires auth, body `{ trackingCode?: string }`, returns updated Order doc
- Produces: `GET /api/orders/:id/tracking` — requires auth, returns Biteship tracking object
- Produces: `POST /api/orders/webhook/biteship` — public, called by Biteship, returns `{ message: 'OK' }`

---

- [ ] **Step 1: Add `PUT /:id/ship` to `routes/orderRoutes.js`**

Add the following block at the end of the file, just before the `module.exports` lines:

```js
// ─── PUT /api/orders/:id/ship — admin: mark as shipped ───
router.put('/:id/ship', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.orderStatus !== 'packing') {
      return res.status(400).json({ message: 'Hanya pesanan berstatus "Dikemas" yang dapat dikirim' });
    }
    const { trackingCode } = req.body;
    order.orderStatus = 'shipped';
    if (trackingCode) order.biteshipTrackingCode = trackingCode;
    await order.save();
    try {
      await notifyCustomer({
        customerId: order.customer,
        type: 'order_shipped',
        title: 'Pesanan sedang dikirim',
        message: `Pesananmu sedang dalam perjalanan${trackingCode ? ` — resi: ${trackingCode}` : ''}`,
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] ship notify failed:', notifyErr.message);
    }
    res.json(order);
  } catch (err) {
    console.error('[Ship Order]', err);
    res.status(500).json({ message: err.message });
  }
});
```

- [ ] **Step 2: Add `GET /:id/tracking` (admin) to `routes/orderRoutes.js`**

Add immediately after the `PUT /:id/ship` block (still before `module.exports`):

```js
// ─── GET /api/orders/:id/tracking — admin: Biteship live tracking ───
router.get('/:id/tracking', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (!order.biteshipOrderId) return res.status(400).json({ message: 'Pesanan belum memiliki data pengiriman' });
    const tracking = await getOrderTracking(order.biteshipOrderId);
    res.json(tracking);
  } catch (err) {
    console.error('[Admin Tracking]', err.message);
    res.status(502).json({ message: 'Gagal mengambil data tracking' });
  }
});
```

- [ ] **Step 3: Add `biteshipWebhookHandler` and export it from `routes/orderRoutes.js`**

Add the handler function before the `module.exports` lines:

```js
// ─── Biteship webhook (registered in server.js before express-json routes) ───
const biteshipWebhookHandler = async (req, res) => {
  try {
    const { event, data } = req.body ?? {};
    if (event !== 'order.status_update' || !data?.id) {
      return res.status(200).json({ message: 'OK' });
    }
    if (data.status === 'delivered') {
      const order = await Order.findOne({ biteshipOrderId: data.id });
      if (order && order.orderStatus !== 'delivered') {
        order.orderStatus = 'delivered';
        await order.save();
        try {
          await notifyCustomer({
            customerId: order.customer,
            type: 'order_delivered',
            title: 'Pesanan telah sampai',
            message: 'Pesananmu telah berhasil diterima',
            link: `/pesanan/${order._id}`,
            relatedId: order._id,
          });
        } catch (notifyErr) {
          console.error('[Notify] delivered notify failed:', notifyErr.message);
        }
      }
    }
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Biteship Webhook]', err.message);
    res.status(200).json({ message: 'OK' }); // Always 200 to prevent Biteship retries
  }
};
```

Then update the existing `module.exports` block at the very end of the file — it currently reads:
```js
module.exports = router;
module.exports.webhookHandler = webhookHandler;
```
Change it to:
```js
module.exports = router;
module.exports.webhookHandler = webhookHandler;
module.exports.biteshipWebhookHandler = biteshipWebhookHandler;
```

- [ ] **Step 4: Register Biteship webhook in `server.js`**

In `server.js`, find the existing midtrans webhook registration (line 48):
```js
app.post('/api/orders/webhook/midtrans', express.raw({ type: '*/*' }), require('./routes/orderRoutes').webhookHandler);
```

Add the Biteship webhook IMMEDIATELY AFTER that line (it uses express.json which loads at line 50, so it gets parsed correctly):
```js
app.post('/api/orders/webhook/biteship', require('./routes/orderRoutes').biteshipWebhookHandler);
```

- [ ] **Step 5: Verify backend manually**

Restart the backend: `nodemon server.js` (or restart the running nodemon process).

Open a terminal and run:
```bash
curl -X PUT http://localhost:8000/api/orders/fake-id/ship \
  -H "Content-Type: application/json" \
  -d '{"trackingCode":"TEST123"}'
```
Expected: `{"message":"Order tidak ditemukan"}` (404 — confirms route is registered and auth middleware fires — you'll get a 401 without a token, or 404 with a valid token but fake ID)

Also verify:
```bash
curl -X POST http://localhost:8000/api/orders/webhook/biteship \
  -H "Content-Type: application/json" \
  -d '{"event":"order.status_update","data":{"id":"nonexistent","status":"delivered"}}'
```
Expected: `{"message":"OK"}`

- [ ] **Step 6: Commit**

```bash
git add routes/orderRoutes.js server.js
git commit -m "feat: add ship endpoint, admin tracking endpoint, and Biteship webhook"
```

---

### Task 2: Frontend — api.ts new methods

**Files:**
- Modify: `client/src/services/api.ts` (add `shipOrder` and `getAdminOrderTracking`)

**Interfaces:**
- Consumes: `PUT /api/orders/:id/ship` (from Task 1)
- Consumes: `GET /api/orders/:id/tracking` admin (from Task 1)
- Produces: `api.shipOrder(id: string, trackingCode?: string): Promise<Order>`
- Produces: `api.getAdminOrderTracking(id: string): Promise<BiteshipTracking>`

---

- [ ] **Step 1: Add `shipOrder` to `api.ts`**

In `client/src/services/api.ts`, find the `acceptOrder` method (around line 483). Add `shipOrder` immediately after it:

```ts
  shipOrder: async (id: string, trackingCode?: string): Promise<Order> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/ship`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(trackingCode ? { trackingCode } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal mengubah status pengiriman');
    }
    return res.json() as Promise<Order>;
  },
```

Note: `Order` is already imported at the top of the file from the types — verify the import exists. If not, add `import type { Order } from '../types/ecommerce';` to the imports at the top.

- [ ] **Step 2: Add `getAdminOrderTracking` to `api.ts`**

Add immediately after `shipOrder`:

```ts
  getAdminOrderTracking: async (id: string): Promise<BiteshipTracking> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/tracking`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal mengambil data tracking');
    }
    return res.json() as Promise<BiteshipTracking>;
  },
```

- [ ] **Step 3: Add `BiteshipTracking` and `Order` to the import in `api.ts`**

Line 1 of `api.ts` currently imports many types but NOT `Order` or `BiteshipTracking`. Find the existing `import type { ... } from '../types/ecommerce';` line and add the two missing types to it — do not remove any existing imports, just append:

```ts
import type { WishlistProduct, Review, ReviewsResponse, CanReviewResponse, MyReviewsResponse, SavedAddress, VoucherValidation, CreateOrderPayload, ReportsSummary, ReportsRange, ShippingSettings, ShippingRatesResponse, ProductsReport, CustomersReport, PromotionsReport, NotificationRole, AppNotification, NotificationsResponse, Order, BiteshipTracking } from '../types/ecommerce';
```

- [ ] **Step 4: Run typecheck**

```bash
cd client && npx tsc -b
```

Expected: no errors. If `Order` or `BiteshipTracking` type errors appear, verify the import in step 3.

- [ ] **Step 5: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add shipOrder and getAdminOrderTracking to api.ts"
```

---

### Task 3: Frontend — Admin OrderDetail UI

**Files:**
- Modify: `client/src/pages/admin/OrderDetail.tsx`

**Interfaces:**
- Consumes: `api.shipOrder` (from Task 2)
- Consumes: `api.getAdminOrderTracking` (from Task 2)

Changes:
1. New state: `shipModal`, `shipResi`, `shipLoading`, `fetchingResi`, `tracking`, `trackingLoading`, `trackingError`, `delivering`
2. New import: `BiteshipTracking` type
3. `useEffect` to auto-load tracking when order is shipped/delivered
4. `useEffect` to fetch resi from Biteship when ship modal opens
5. `handleShip` function
6. `handleDeliver` function
7. "Serahkan ke Kurir" card (visible when status=packing)
8. Tracking timeline panel (visible when status=shipped/delivered) — placed in the left column
9. "Tandai Delivered" card (visible when status=shipped)
10. Ship confirmation modal overlay

---

- [ ] **Step 1: Add new imports to `OrderDetail.tsx`**

Find the existing import line:
```ts
import api, { API_BASE_URL } from '../../services/api';
import type { Order } from '../../types/ecommerce';
```

Change to:
```ts
import api, { API_BASE_URL } from '../../services/api';
import type { Order, BiteshipTracking } from '../../types/ecommerce';
```

- [ ] **Step 2: Add new state declarations inside the component**

Find the existing state declarations block (after `const token = ...`). Add the new states after `const [accepting, setAccepting] = useState(false);`:

```ts
  const [shipModal, setShipModal] = useState(false);
  const [shipResi, setShipResi] = useState('');
  const [shipLoading, setShipLoading] = useState(false);
  const [fetchingResi, setFetchingResi] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [tracking, setTracking] = useState<BiteshipTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
```

- [ ] **Step 3: Add `useEffect` for auto-loading tracking when status is shipped/delivered**

Add this after the existing `useEffect` (that fetches the order on mount):

```ts
  useEffect(() => {
    if (!id || !order?.biteshipOrderId) return;
    if (!['shipped', 'delivered'].includes(order.orderStatus)) return;
    setTrackingLoading(true);
    setTrackingError('');
    api.getAdminOrderTracking(id)
      .then((t) => setTracking(t))
      .catch((err: unknown) => setTrackingError(err instanceof Error ? err.message : 'Gagal memuat tracking'))
      .finally(() => setTrackingLoading(false));
  }, [id, order?.orderStatus]);
```

- [ ] **Step 4: Add `useEffect` for pre-populating resi when ship modal opens**

Add after the tracking useEffect:

```ts
  useEffect(() => {
    if (!shipModal || !id || !order?.biteshipOrderId) return;
    setFetchingResi(true);
    api.getAdminOrderTracking(id)
      .then((t) => {
        const code = t.courier?.tracking_id || t.waybill_id || '';
        if (code) setShipResi(code);
      })
      .catch(() => {}) // Silent — admin can input manually
      .finally(() => setFetchingResi(false));
  }, [shipModal, id, order?.biteshipOrderId]);
```

- [ ] **Step 5: Add `handleShip` function**

Add after `handleSave`:

```ts
  const handleShip = async () => {
    if (!id) return;
    setShipLoading(true);
    try {
      const data = await api.shipOrder(id, shipResi || undefined);
      setOrder(data);
      setForm((f) => ({ ...f, orderStatus: data.orderStatus }));
      setShipModal(false);
      setShipResi('');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Gagal mengirim pesanan');
      setShipModal(false);
    } finally {
      setShipLoading(false);
    }
  };
```

- [ ] **Step 6: Add `handleDeliver` function**

Add after `handleShip`:

```ts
  const handleDeliver = async () => {
    if (!id) return;
    setDelivering(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: 'delivered' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setForm((f) => ({ ...f, orderStatus: data.orderStatus }));
      } else {
        setSaveMsg(data.message || 'Gagal mengubah status');
      }
    } catch {
      setSaveMsg('Gagal mengubah status');
    } finally {
      setDelivering(false);
    }
  };
```

- [ ] **Step 7: Add tracking timeline to left column (xl:col-span-2)**

In the JSX, find the `{/* Shipping */}` card (the one that shows `order.shippingAddress`). After the closing `</div>` of that card, add the tracking timeline card:

```tsx
          {/* Tracking timeline — visible when shipped or delivered */}
          {['shipped', 'delivered'].includes(order.orderStatus) && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">Status Pengiriman</h2>
                {order.biteshipTrackingCode && (
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 select-all">
                    {order.biteshipTrackingCode}
                  </span>
                )}
              </div>
              {trackingLoading && <p className="text-xs text-gray-400">Memuat tracking...</p>}
              {trackingError && <p className="text-xs text-red-500">{trackingError}</p>}
              {!trackingLoading && !trackingError && tracking && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                  </p>
                  <div className="space-y-2">
                    {tracking.courier.history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <div className="flex flex-col items-center mt-0.5">
                          <div className={`size-2 rounded-full ${i === 0 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                          {i < tracking.courier.history.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 my-1" />
                          )}
                        </div>
                        <div className="pb-2">
                          <p className="text-gray-800 font-medium leading-tight">{h.note}</p>
                          <p className="text-gray-400 mt-0.5">
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
              {!trackingLoading && !trackingError && !tracking && (
                <p className="text-xs text-gray-400">Data tracking belum tersedia.</p>
              )}
            </div>
          )}
```

- [ ] **Step 8: Add "Serahkan ke Kurir" card to right column**

Find the existing "Tindakan Cepat" card block:
```tsx
          {order.orderStatus === 'processing' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Tindakan Cepat</h2>
              ...
            </div>
          )}
```

Add the packing action card AFTER the processing action card:

```tsx
          {/* Ship action — visible when packing */}
          {order.orderStatus === 'packing' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Tindakan Cepat</h2>
              <p className="text-xs text-gray-500 mb-3">
                Konfirmasi paket diserahkan ke kurir. Nomor resi akan diambil otomatis dari Biteship jika tersedia.
              </p>
              <Button
                onClick={() => setShipModal(true)}
                disabled={shipLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                Serahkan ke Kurir
              </Button>
            </div>
          )}
```

- [ ] **Step 9: Add "Tandai Delivered" card to right column**

Add after the "Serahkan ke Kurir" card (step 8):

```tsx
          {/* Deliver action — visible when shipped, as webhook fallback */}
          {order.orderStatus === 'shipped' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Konfirmasi Penerimaan</h2>
              <p className="text-xs text-gray-500 mb-3">
                Gunakan jika kurir sudah konfirmasi paket diterima namun status belum diperbarui otomatis.
              </p>
              <Button
                variant="outline"
                onClick={handleDeliver}
                disabled={delivering}
                className="w-full text-sm font-medium"
              >
                {delivering ? 'Memproses...' : '✓ Tandai Diterima'}
              </Button>
            </div>
          )}
```

- [ ] **Step 10: Add ship confirmation modal**

At the very end of the JSX return (just before the closing `</AdminLayout>` tag), add the modal overlay:

```tsx
      {/* Ship confirmation modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Konfirmasi Pengiriman</h3>
            <p className="text-xs text-gray-500 mb-4">
              Masukkan nomor resi. Jika sudah terdaftar di Biteship akan diisi otomatis.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">No. Resi</label>
            <input
              type="text"
              value={shipResi}
              onChange={(e) => setShipResi(e.target.value)}
              placeholder={fetchingResi ? 'Mengambil dari Biteship...' : 'Contoh: JNE1234567'}
              disabled={fetchingResi}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShipModal(false); setShipResi(''); }}
                disabled={shipLoading}
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleShip}
                disabled={shipLoading || fetchingResi}
              >
                {shipLoading ? 'Memproses...' : 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 11: Run typecheck and lint**

```bash
cd client && npx tsc -b && npm run lint
```

Expected: no errors. Common issues to watch for:
- `err instanceof Error` pattern used correctly in catch blocks
- `data as Order` cast needs to match (or use `unknown` + assertion)
- `setOrder(data)` — `data` must be typed as `Order`

Fix any errors before proceeding.

- [ ] **Step 12: Manual verification in browser**

Start dev server (`npm run dev`). Navigate to an order with status `packing` in admin:
- Confirm "Serahkan ke Kurir" card appears in right sidebar
- Click it → modal opens, resi field attempts auto-fetch (may be empty in sandbox)
- Type a resi manually → click Konfirmasi → order status changes to `shipped`
- "Serahkan ke Kurir" card disappears, "Tandai Diterima" card appears
- Tracking timeline section appears in left column (may show "belum tersedia" if Biteship sandbox has no data)

- [ ] **Step 13: Commit**

```bash
git add client/src/pages/admin/OrderDetail.tsx
git commit -m "feat: add ship modal, tracking timeline, and delivered fallback to admin OrderDetail"
```

---

### Task 4: Frontend — Customer PesananDetail resi display + final verification

**Files:**
- Modify: `client/src/pages/PesananDetail.tsx` (improve resi display)

**Interfaces:**
- No new API calls — renders existing `order.biteshipTrackingCode`

---

- [ ] **Step 1: Update resi display in `PesananDetail.tsx`**

Find the existing resi display block inside the "Info Pengiriman" section (around line 425):

```tsx
              {order.biteshipTrackingCode && (
                <p className="text-sm text-[#4A4A4A] mt-1">
                  No. Resi:{' '}
                  <span className="font-medium text-[#1F1F1F] font-mono">{order.biteshipTrackingCode}</span>
                </p>
              )}
```

Replace it with the following (adds status filter + copy button):

```tsx
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
```

Note: Using a native `<button>` here (not shadcn) because this is a compact inline copy action in a tight layout — the native element is simpler and avoids over-engineering. This is an acceptable exception per CLAUDE.md (complex overlay patterns).

- [ ] **Step 2: Run final typecheck and lint**

```bash
cd client && npx tsc -b && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Manual verification in browser**

Navigate to a customer order with status `shipped` (or manually update one via admin). Confirm:
- Resi card appears between courier name and tracking button in "Info Pengiriman"
- "Salin" button copies the resi to clipboard
- Resi card does NOT appear when order status is `packing` or `processing`

- [ ] **Step 4: Final commit**

```bash
git add client/src/pages/PesananDetail.tsx
git commit -m "feat: add copyable resi display to customer PesananDetail"
```

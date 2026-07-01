# Manual Biteship Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual "Sync Biteship" backup action on the admin order detail page that retries creating the Biteship order (if missing) or re-fetches the tracking code/waybill (if the Biteship order already exists but has no AWB yet).

**Architecture:** One new admin-protected backend endpoint (`POST /api/orders/:id/sync-biteship`) that reuses the existing `biteshipService.createOrder`/`getOrderTracking` functions, one new `api.ts` client method, and one new button + handler in `OrderDetail.tsx`.

**Tech Stack:** Express (CommonJS) backend, React + TypeScript (Vite) frontend, Tailwind for styling. No test suite in this project — verification is via `tsc -b`/`lint` for type/style correctness and manual exercising of the running dev server for behavior (per `CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-07-01-sync-biteship-manual-design.md`

---

### Task 1: Backend — `POST /api/orders/:id/sync-biteship` endpoint

**Files:**
- Modify: `routes/orderRoutes.js:979-990` (insert new route immediately after the existing `GET /:id/tracking` admin route, before the `Biteship webhook` section comment)

- [ ] **Step 1: Add the route**

In `routes/orderRoutes.js`, insert this new route right after the closing `});` of the existing `GET /:id/tracking` route (currently ending at line 990) and before the `// ─── Biteship webhook ───` comment (line 992):

```js
// ─── POST /api/orders/:id/sync-biteship — admin: manual retry AWB/tracking sync ───
router.post('/:id/sync-biteship', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (['awaiting_payment', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Sinkronisasi hanya untuk pesanan yang sudah diproses' });
    }

    if (!order.biteshipOrderId) {
      const biteshipResult = await biteshipCreateOrder(order);
      order.biteshipOrderId = biteshipResult.id ?? '';
      order.biteshipTrackingCode = biteshipResult.courier?.tracking_id ?? '';
      order.biteshipWaybillId = biteshipResult.courier?.waybill_id ?? '';
    } else {
      const tracking = await getOrderTracking(order.biteshipOrderId);
      if (tracking.courier?.tracking_id) order.biteshipTrackingCode = tracking.courier.tracking_id;
      if (tracking.waybill_id) order.biteshipWaybillId = tracking.waybill_id;
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error('[Sync Biteship]', err.message);
    res.status(502).json({ message: 'Gagal sinkronisasi dengan Biteship' });
  }
});
```

Both `biteshipCreateOrder` (aliased import of `createOrder`) and `getOrderTracking` are already imported at the top of `routes/orderRoutes.js` (lines 11-16) — no import changes needed.

- [ ] **Step 2: Verify the backend server starts without errors**

Run: `cd "G:\WebsiteDevelopment\KatigaWebsite" && node -e "require('./routes/orderRoutes')" `
Expected: no output, no thrown error (confirms the file still parses/loads cleanly — nodemon will pick up the change automatically if the dev server is already running).

- [ ] **Step 3: Manually exercise the endpoint against the running dev server**

With the backend dev server running on port 8000 (`npm run dev` at the project root, or already running), get an admin token and a real order id, then call the new endpoint:

```bash
# 1. Log in (use your real admin credentials; the seed default is admin@kumakuma.com / admin123 if unchanged)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kumakuma.com","password":"admin123"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

# 2. Grab an order id that is NOT awaiting_payment/cancelled (pick one from the list)
curl -s "http://localhost:8000/api/orders?page=1&limit=5" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.map(o=>({id:o._id,status:o.orderStatus,biteshipOrderId:o.biteshipOrderId}))))"

# 3. Call sync on that order id (replace ORDER_ID)
curl -s -X POST "http://localhost:8000/api/orders/ORDER_ID/sync-biteship" -H "Authorization: Bearer $TOKEN"
```

Expected: JSON response is the updated order document (200), OR a `{"message": "..."}` 400/502 if the order is in `awaiting_payment`/`cancelled` or Biteship rejects the request. Confirm the 400 guard by trying an order whose `orderStatus` is `awaiting_payment`.

- [ ] **Step 4: Commit**

```bash
git add routes/orderRoutes.js
git commit -m "feat: add manual biteship sync endpoint for admin orders"
```

---

### Task 2: Frontend — `api.syncBiteshipOrder` client method

**Files:**
- Modify: `client/src/services/api.ts:510-520` (insert immediately after the existing `getAdminOrderTracking` method)

- [ ] **Step 1: Add the method**

In `client/src/services/api.ts`, insert this new method right after the closing `},` of `getAdminOrderTracking` (currently ending at line 520):

```ts
  syncBiteshipOrder: async (id: string): Promise<Order> => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/orders/${id}/sync-biteship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message || 'Gagal sinkronisasi dengan Biteship');
    }
    return res.json() as Promise<Order>;
  },
```

This follows the exact pattern of the neighboring `acceptOrder`/`shipOrder`/`getAdminOrderTracking` methods in the same file. `Order` is already imported at the top of `api.ts` (used by `shipOrder`'s return type) — no new import needed.

- [ ] **Step 2: Type-check**

Run: `cd "G:\WebsiteDevelopment\KatigaWebsite\client" && npx tsc -b`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add syncBiteshipOrder client method"
```

---

### Task 3: Frontend — "Sync Biteship" button in `OrderDetail.tsx`

**Files:**
- Modify: `client/src/pages/admin/OrderDetail.tsx`
  - State: near line 60 (after `trackingError` state)
  - Handler: near line 196 (after `handleDeliver`)
  - UI: inside the "Pengiriman" card, after line 282 (the `biteshipOrderId` paragraph), before the card's closing `</div>` on line 283

- [ ] **Step 1: Add state**

In `client/src/pages/admin/OrderDetail.tsx`, add these two lines right after the existing `const [trackingError, setTrackingError] = useState('');` (line 60):

```ts
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
```

- [ ] **Step 2: Add the handler**

Add this function right after `handleDeliver` (which currently ends at line 196, just before the `if (loading) return ...` line):

```ts
  const handleSyncBiteship = async () => {
    if (!id) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const data = await api.syncBiteshipOrder(id);
      setOrder(data);
      setSyncMsg(
        data.biteshipTrackingCode
          ? `Resi tersinkron: ${data.biteshipTrackingCode}`
          : 'Sinkron berhasil, resi belum tersedia dari kurir.'
      );
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Gagal sinkronisasi dengan Biteship');
    } finally {
      setSyncing(false);
    }
  };
```

- [ ] **Step 3: Add the button to the "Pengiriman" card**

In the "Pengiriman" card, the current end of the card (lines 280-283) looks like this:

```tsx
            {order.biteshipOrderId && (
              <p className="text-xs text-gray-400 mt-1">Biteship Order ID: {order.biteshipOrderId}</p>
            )}
          </div>
```

Replace it with:

```tsx
            {order.biteshipOrderId && (
              <p className="text-xs text-gray-400 mt-1">Biteship Order ID: {order.biteshipOrderId}</p>
            )}
            {['processing', 'packing', 'shipped', 'delivered'].includes(order.orderStatus) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={handleSyncBiteship}
                  disabled={syncing}
                  className="w-full text-sm font-medium"
                >
                  {syncing ? 'Sinkronisasi...' : 'Sync Biteship (Ambil Resi)'}
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  Gunakan jika resi/AWB tidak otomatis tersinkron dari Biteship.
                </p>
                {syncMsg && (
                  <p className={`text-xs text-center mt-2 ${syncMsg.startsWith('Gagal') ? 'text-red-600' : 'text-green-600'}`}>
                    {syncMsg}
                  </p>
                )}
              </div>
            )}
          </div>
```

- [ ] **Step 4: Type-check and lint**

Run: `cd "G:\WebsiteDevelopment\KatigaWebsite\client" && npx tsc -b && npm run lint`
Expected: no errors from either command.

- [ ] **Step 5: Manually verify in the browser**

With both dev servers running (`npm run dev` at the project root, or the `Backend (Express)`/`Frontend (Vite)` preview servers):

1. Log in to `/admin/login` (or reuse an existing admin session).
2. Open an order in `/admin/orders/:id` whose status is `processing`, `packing`, `shipped`, or `delivered`.
3. Confirm the "Sync Biteship (Ambil Resi)" button appears in the "Pengiriman" card below the Biteship Order ID line, with the helper text underneath.
4. Click it — confirm the button shows "Sinkronisasi..." while in flight, then shows either a green "Resi tersinkron: ..." / "Sinkron berhasil..." message, or a red error message.
5. Open an order still `awaiting_payment` or `cancelled` — confirm the button does NOT appear.
6. Check the browser network tab / console for the `POST .../sync-biteship` request and confirm no unrelated console errors were introduced.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/OrderDetail.tsx
git commit -m "feat: add sync biteship button to admin order detail"
```

---

### Task 4: Final full verification

**Files:** none (verification only)

- [ ] **Step 1: Run full frontend verification**

Run: `cd "G:\WebsiteDevelopment\KatigaWebsite\client" && npx tsc -b && npm run lint`
Expected: both commands exit 0 with no errors.

- [ ] **Step 2: Confirm backend still boots cleanly**

Run: `cd "G:\WebsiteDevelopment\KatigaWebsite" && node -e "require('./server.js')" ` (or check the already-running `npm run dev` backend log for the nodemon restart after Task 1's edit)
Expected: no `MODULE_NOT_FOUND` or syntax errors; if run standalone this will hang listening on port 8000 — kill it with Ctrl+C, or skip this step if the dev server is already confirmed running with the change picked up (nodemon auto-restart log is sufficient evidence).

- [ ] **Step 3: Re-read the spec once more and confirm every section has a corresponding change**

Check off against `docs/superpowers/specs/2026-07-01-sync-biteship-manual-design.md`:
- Backend endpoint with both branches (create vs. re-fetch) — Task 1
- 400 guard for `awaiting_payment`/`cancelled` — Task 1
- `api.ts` addition — Task 2
- Button placement, visibility, messaging — Task 3
- No changes to "Serahkan ke Kurir" modal, "Koreksi Manual" panel, or tracking timeline — confirm nothing outside Task 3's diff touched those blocks

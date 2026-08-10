# Migrasi Payment Gateway Midtrans → Mayar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti Midtrans Snap dengan Mayar sebagai satu-satunya payment gateway, dari popup menjadi redirect, dengan refund manual dan satu jalur logika status.

**Architecture:** Semua HTTP ke Mayar lewat `services/mayarService.js`. Status pembayaran ditentukan satu fungsi `syncPaymentStatus(order)` yang selalu bertanya ke `GET /transactions/{id}` — payload webhook tidak pernah dipercaya. Tiga jalur memanggil fungsi itu: webhook, polling saat customer kembali, dan sapuan terjadwal.

**Tech Stack:** Express + Mongoose (CommonJS, root), React + Vite + TypeScript (`client/`), Mayar Headless API v2, MCP server Mayar.

**Spec:** [docs/superpowers/specs/2026-08-10-midtrans-to-mayar-design.md](../specs/2026-08-10-midtrans-to-mayar-design.md)

## Global Constraints

- **Tidak ada test suite di proyek ini.** `CLAUDE.md` melarang menambah file test kecuali diminta. Siklus verifikasi tiap task = `cd client && npx tsc -b`, lalu `cd client && npm run lint`, lalu pemeriksaan manual di browser lewat dev server. Instruksi TDD dari skill digantikan siklus ini.
- Type-check **wajib** `npx tsc -b` (build mode). `tsc --noEmit` tidak memeriksa apa pun di repo ini karena `client/tsconfig.json` bergaya solution.
- TypeScript strict. Dilarang `any`, dilarang `@ts-ignore` tanpa alasan upstream, `import type` untuk impor tipe, `interface` untuk bentuk objek, tanpa `enum`.
- Dilarang `console.log` tersisa di kode yang di-commit. `console.error` untuk jalur error boleh — itu pola yang sudah dipakai `routes/orderRoutes.js`.
- Styling hanya lewat `className` Tailwind. Dilarang file `.css` per komponen, dilarang `style={{}}` kecuali nilai dinamis.
- Halaman publik memakai design system baru (kotak, uppercase, `#4F68AF`); halaman admin **tidak** — jangan bawa token publik ke `client/src/pages/admin/`.
- Format commit: `<type>: <ringkasan imperatif>`, ≤72 karakter, tanpa titik.
- Branch kerja: `feat/mayar-payment-gateway` (sudah dibuat, spec sudah di-commit di sana).
- Base URL Mayar hanya dari env `MAYAR_API_URL`. Dilarang hardcode URL Mayar di luar `services/mayarService.js`.
- Nilai env yang dipakai plan ini: `MAYAR_API_URL`, `MAYAR_API_KEY`, `MAYAR_PAYMENT_EXPIRY_HOURS`, `FRONTEND_URL`.

## Struktur file

| File | Tanggung jawab | Status |
|---|---|---|
| `services/mayarService.js` | satu-satunya klien HTTP Mayar; buka envelope v2; normalisasi status | baru |
| `scripts/migrate-order-payment-fields.js` | `$rename`/`$unset` field pembayaran + drop index lama | baru |
| `models/Order.js` | skema order + field pembayaran baru | ubah |
| `routes/orderRoutes.js` | `syncPaymentStatus`, webhook, create order, verify, cancel | ubah |
| `server.js` | mount webhook Mayar, sapuan terjadwal | ubah |
| `routes/complaints.js` | `populate` nama field baru | ubah |
| `client/src/pages/Checkout.tsx` | redirect ke Mayar, bukan popup | ubah |
| `client/src/pages/PesananDetail.tsx` | lanjutkan pembayaran via redirect, label metode | ubah |
| `client/src/pages/admin/OrderDetail.tsx` | info pembayaran + tombol tandai refunded | ubah |

## Urutan dan ketergantungan API key

Task 1 tidak butuh API key Mayar dan bisa dikerjakan sekarang. Task 2 ke atas butuh key sandbox di `.env`.

---

### Task 1: Rename field pembayaran yang maknanya tidak berubah

Merename tiga field yang artinya sama sebelum dan sesudah migrasi gateway, terpisah dari perubahan perilaku apa pun. Setelah task ini aplikasi **masih memakai Midtrans dan masih berfungsi penuh** — hanya nama field yang berubah. `midtransToken` sengaja **tidak** disentuh di sini karena isinya memang snap token Midtrans; ia baru dihapus di Task 4 saat digantikan `paymentLink`.

**Files:**
- Create: `scripts/migrate-order-payment-fields.js`
- Modify: `models/Order.js:60-63`
- Modify: `routes/orderRoutes.js` (semua kemunculan `midtransOrderId`, `midtransPaymentType`)
- Modify: `routes/complaints.js:87,163`
- Modify: `client/src/types/ecommerce.ts:127,129,342`
- Modify: `client/src/pages/Pesanan.tsx:120`
- Modify: `client/src/pages/PesananSelesai.tsx:95`
- Modify: `client/src/pages/PesananDetail.tsx:732-736`
- Modify: `client/src/pages/admin/Complaints.tsx:46,170,175`
- Modify: `client/src/pages/admin/OrderDetail.tsx:372-376`

**Interfaces:**
- Produces: field `Order.orderCode` (String, unique sparse), `Order.paymentMethod` (String, default `''`). Field `Order.midtransFraudStatus` tidak ada lagi. Tipe TS `Order.orderCode: string`, `Order.paymentMethod?: string`, dan `Complaint.order` sebagai `string | { _id: string; orderCode: string; total: number }`.

- [ ] **Step 1: Ubah skema Order**

Di `models/Order.js`, ganti blok baris 60-63:

```js
  orderCode:     { type: String, unique: true, sparse: true },
  paymentMethod: { type: String, default: '' },
```

`midtransToken` tetap ada, tidak diubah. `midtransFraudStatus` dihapus seluruhnya — tidak ada kode yang menulis atau membacanya.

- [ ] **Step 2: Tulis script migrasi**

Buat `scripts/migrate-order-payment-fields.js`:

```js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const orders = mongoose.connection.collection('orders');

  const renamed = await orders.updateMany({}, {
    $rename: {
      midtransOrderId: 'orderCode',
      midtransPaymentType: 'paymentMethod',
    },
  });
  console.error(`[Migrate] renamed on ${renamed.modifiedCount} orders`);

  const unset = await orders.updateMany(
    { midtransFraudStatus: { $exists: true } },
    { $unset: { midtransFraudStatus: '' } }
  );
  console.error(`[Migrate] dropped midtransFraudStatus on ${unset.modifiedCount} orders`);

  try {
    await orders.dropIndex('midtransOrderId_1');
    console.error('[Migrate] dropped index midtransOrderId_1');
  } catch (err) {
    console.error(`[Migrate] dropIndex skipped: ${err.message}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[Migrate] failed:', err);
  process.exit(1);
});
```

Index `orderCode_1` dibuat sendiri oleh Mongoose saat server berikutnya start — tidak perlu dibuat manual di sini.

- [ ] **Step 3: Rename di backend**

Di `routes/orderRoutes.js` ganti setiap `midtransOrderId` → `orderCode` dan `midtransPaymentType` → `paymentMethod`. Titik yang terdampak: baris 122, 125, 188, 205, 427, 549, 580, 614, 779.

Di `routes/complaints.js` baris 87 dan 163, ubah `populate` menjadi:

```js
      .populate('order', '_id orderCode total');
```

- [ ] **Step 4: Rename di tipe frontend**

Di `client/src/types/ecommerce.ts`, ganti baris 127 dan 129:

```ts
  orderCode: string;
  midtransToken: string;
  paymentMethod?: string;
```

dan baris 342:

```ts
  order: string | { _id: string; orderCode: string; total: number };
```

- [ ] **Step 5: Rename di halaman frontend**

`Pesanan.tsx:120` dan `PesananSelesai.tsx:95` — ganti `order.midtransOrderId` → `order.orderCode`.

`PesananDetail.tsx:732-736` — ganti `order.midtransPaymentType` → `order.paymentMethod` (tiga kemunculan: kondisi, lookup `PAYMENT_METHOD_LABEL`, dan fallback).

`admin/Complaints.tsx:46,170,175` — ganti `midtransOrderId` → `orderCode` di interface dan dua pemakaian.

`admin/OrderDetail.tsx:372-376` — ganti komentar `{/* Midtrans */}` jadi `{/* Pembayaran */}`, dan:

```tsx
            {order.orderCode && <p className="text-sm text-gray-600">Kode Pesanan: <span className="font-mono">{order.orderCode}</span></p>}
            {order.paymentMethod && <p className="text-sm text-gray-600">Metode: {order.paymentMethod}</p>}
```

- [ ] **Step 6: Pastikan tidak ada sisa**

Run: `rg -i "midtransOrderId|midtransPaymentType|midtransFraudStatus" --glob '!docs/**'`
Expected: nol hasil.

- [ ] **Step 7: Type-check dan lint**

Run: `cd client && npx tsc -b`
Expected: keluar tanpa error.

Run: `cd client && npm run lint`
Expected: keluar tanpa error.

- [ ] **Step 8: Jalankan migrasi ke database lokal**

Run: `node scripts/migrate-order-payment-fields.js`
Expected: tiga baris log `[Migrate] …` tanpa error. Baris `dropIndex skipped` wajar bila database lokal belum pernah punya index itu.

- [ ] **Step 9: Verifikasi manual**

Jalankan `npm run dev`. Buka `/admin/orders` — pencarian pesanan masih menemukan order lama. Buka salah satu order di `/admin/orders/:id` — Kode Pesanan tampil. Buka `/pesanan` sebagai customer — nomor pesanan tampil, bukan kosong.

- [ ] **Step 10: Commit**

```bash
git add models/Order.js scripts/migrate-order-payment-fields.js routes/orderRoutes.js routes/complaints.js client/src
git commit -m "refactor: rename midtrans order fields to gateway-neutral names"
```

---

### Task 2: Pasang MCP Mayar dan jalankan empat verifikasi

**Butuh `MAYAR_API_KEY` sandbox di `.env`.** Tidak ada kode produksi ditulis di task ini — keluarannya adalah fakta yang menentukan bentuk Task 3 dan 5.

**Files:**
- Modify: `.env` (tambah `MAYAR_*`), `.env.example` bila ada
- Modify: `docs/superpowers/specs/2026-08-10-midtrans-to-mayar-design.md` (catat hasil verifikasi)

**Interfaces:**
- Produces: keputusan v1-vs-v2 untuk `createPayment`, daftar nilai `status` transaksi, nama field pembawa `transactionId` di payload webhook, base URL sandbox yang benar.

- [ ] **Step 1: Isi env**

Tambahkan ke `.env`:

```
MAYAR_API_URL=https://api.mayar.io/hl/v2
MAYAR_API_KEY=<key sandbox dari web.mayar.io/api-keys atau web.mayar.club/api-keys>
MAYAR_PAYMENT_EXPIRY_HOURS=24
```

- [ ] **Step 2: Pasang MCP server Mayar**

Tambahkan ke konfigurasi MCP:

```json
{
  "mcpServers": {
    "mayar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.mayar.id/sse", "--header", "Authorization:${API_KEY}"],
      "env": { "API_KEY": "Bearer <MAYAR_API_KEY>" }
    }
  }
}
```

Expected: server `mayar` terhubung, tools terlihat.

- [ ] **Step 3: Verifikasi #4 — base URL sandbox mana yang hidup**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $MAYAR_API_KEY" https://api.mayar.io/hl/v2/transactions
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $MAYAR_API_KEY" https://api.mayar.club/hl/v2/transactions
```
Expected: satu di antaranya `200`. Yang menjawab `200` menjadi nilai `MAYAR_API_URL`; perbarui `.env`.

- [ ] **Step 4: Verifikasi #1 — apakah v2 menerima `redirectUrl`**

Run:
```bash
curl -s -X POST "$MAYAR_API_URL/payments/create" \
  -H "Authorization: Bearer $MAYAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Uji redirect","amount":10000,"email":"uji@example.com","mobile":"081234567890","description":"uji","redirectUrl":"https://katiga.id/uji"}'
```
Expected: `200` dengan `data.link`.

Buka `data.link`, selesaikan pembayaran sandbox, amati apakah browser dikembalikan ke `https://katiga.id/uji`.

- Jika **ya** → pakai v2 `POST /payments/create` di Task 3.
- Jika **tidak** (200 tapi tidak redirect, atau 400 menolak field) → pakai v1 `POST /hl/v1/payment/create` dengan `redirectURL`, dan `MAYAR_API_URL` berakhiran `/hl/v1`. Ini mengubah Task 3: `extraData` tidak tersedia, sehingga pemetaan order **hanya** lewat `paymentRef`.

- [ ] **Step 5: Verifikasi #2 — nilai status transaksi**

Ambil `transactionId` dari respons Step 4. Panggil `GET $MAYAR_API_URL/transactions/{transactionId}` tiga kali: sebelum bayar, setelah bayar, dan pada transaksi lain yang dibiarkan kedaluwarsa. Catat nilai `data.status` persis di tiap tahap.

Expected: tercakup oleh `paid`, `unpaid`, `created`, `expired`. Nilai lain yang muncul harus ditambahkan ke tabel pemetaan di Task 5.

- [ ] **Step 6: Verifikasi #3 — bentuk payload webhook**

Daftarkan endpoint penampung sementara (tunnel publik ke dev server, atau layanan penerima webhook), lalu:

```bash
curl -s -X POST "$MAYAR_API_URL/webhooks/update" \
  -H "Authorization: Bearer $MAYAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urlHook":"<url penampung>"}'

curl -s -X POST "$MAYAR_API_URL/webhooks/test" \
  -H "Authorization: Bearer $MAYAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urlHook":"<url penampung>"}'
```

Catat payload utuh yang diterima. Yang harus dipastikan: nama field yang memuat `transactionId`, dan apakah ada header `Authorization` yang ikut dikirim.

- [ ] **Step 7: Catat hasil ke spec**

Tambahkan bagian `## Hasil verifikasi (2026-08-10)` di spec, berisi jawaban keempat verifikasi beserta contoh payload webhook yang diterima. Bila salah satu hasil berbeda dari asumsi spec, perbarui juga bagian yang terdampak.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-midtrans-to-mayar-design.md
git commit -m "docs: record mayar sandbox verification results"
```

`.env` tidak di-commit.

---

### Task 3: Modul `services/mayarService.js`

**Files:**
- Create: `services/mayarService.js`

**Interfaces:**
- Consumes: `MAYAR_API_URL`, `MAYAR_API_KEY` dari env; keputusan v1/v2 dari Task 2.
- Produces:
  - `createPayment({ name, amount, email, mobile, description, expiredAt, redirectUrl, extraData }) → Promise<{ id, transactionId, link }>`
  - `getTransaction(transactionId) → Promise<{ status, paymentMethod, amount }>`
  - `MayarError` — `Error` dengan properti `status` (number) dan `body` (unknown), dilempar untuk respons non-2xx.

- [ ] **Step 1: Tulis modul**

Buat `services/mayarService.js`, mengikuti gaya `services/biteshipService.js`:

```js
const BASE_URL = process.env.MAYAR_API_URL;
const API_KEY = process.env.MAYAR_API_KEY;

class MayarError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'MayarError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  if (!BASE_URL || !API_KEY) {
    throw new MayarError('MAYAR_API_URL / MAYAR_API_KEY belum diset', 0, null);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = body?.messages ?? `Mayar ${path} gagal (${res.status})`;
    throw new MayarError(message, res.status, body);
  }

  return body?.data ?? body;
}

async function createPayment({ name, amount, email, mobile, description, expiredAt, redirectUrl, extraData }) {
  const data = await request('/payments/create', {
    method: 'POST',
    body: JSON.stringify({
      name,
      amount,
      email,
      mobile,
      description,
      expiredAt,
      redirectUrl,
      extraData,
    }),
  });

  return {
    id: data.id,
    transactionId: data.transactionId,
    link: data.link,
  };
}

async function getTransaction(transactionId) {
  const data = await request(`/transactions/${transactionId}`, { method: 'GET' });

  return {
    status: data.status,
    paymentMethod: data.paymentMethod ?? '',
    amount: data.amount,
  };
}

module.exports = { createPayment, getTransaction, MayarError };
```

Bila Verifikasi #1 memilih v1: ubah path menjadi `/payment/create`, ganti nama field `redirectUrl` → `redirectURL`, hapus `extraData` dari body, dan sesuaikan pembacaan `data` karena v1 tidak memakai envelope `{ statusCode, messages, data }` — `request()` sudah menangani ini lewat `body?.data ?? body`.

- [ ] **Step 2: Uji modul terhadap sandbox**

Run:
```bash
node -e "require('dotenv').config(); const m=require('./services/mayarService'); m.createPayment({name:'Uji modul',amount:10000,email:'uji@example.com',mobile:'081234567890',description:'uji',expiredAt:new Date(Date.now()+864e5).toISOString(),redirectUrl:'https://katiga.id/uji',extraData:{orderId:'uji'}}).then(r=>console.error(r)).catch(e=>console.error(e.status,e.message))"
```
Expected: mencetak objek berisi `id`, `transactionId`, dan `link` yang bisa dibuka.

- [ ] **Step 3: Uji jalur error**

Run:
```bash
node -e "require('dotenv').config(); const m=require('./services/mayarService'); m.getTransaction('00000000-0000-0000-0000-000000000000').then(r=>console.error(r)).catch(e=>console.error(e.name,e.status))"
```
Expected: mencetak `MayarError 404` — bukan crash, bukan `undefined`.

- [ ] **Step 4: Commit**

```bash
git add services/mayarService.js
git commit -m "feat: add mayar payment gateway service module"
```

---

### Task 4: Buat pembayaran Mayar dan redirect dari frontend

Setelah task ini customer bisa sampai ke halaman bayar Mayar. Penyelesaian status belum jalan — itu Task 5.

**Files:**
- Modify: `models/Order.js` (field pembayaran baru)
- Modify: `routes/orderRoutes.js:229-499` (route `POST /`)
- Modify: `client/index.html:12`
- Modify: `client/src/vite-env.d.ts:6,13-21`
- Modify: `client/src/types/ecommerce.ts:124,128`
- Modify: `client/src/pages/Checkout.tsx:139-197`
- Modify: `client/src/pages/PesananDetail.tsx:285-298,383`
- Modify: `client/src/services/api.ts` (tipe kembalian `createOrder`)

**Interfaces:**
- Consumes: `createPayment` dari Task 3.
- Produces: `Order.paymentRef` (String, unique sparse), `Order.paymentLink` (String, default `''`), `Order.paymentExpiredAt` (Date). `POST /api/orders` mengembalikan `{ orderId: string, paymentLink: string }` — **bukan** `snapToken` lagi.

- [ ] **Step 1: Tambah field pembayaran di skema**

Di `models/Order.js`, ganti `midtransToken` dengan tiga field ini dan tambahkan `refund_pending` ke enum `paymentStatus`:

```js
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'expired', 'refunded', 'refund_pending'],
    default: 'pending',
  },
  orderCode:        { type: String, unique: true, sparse: true },
  paymentRef:       { type: String, unique: true, sparse: true },
  paymentLink:      { type: String, default: '' },
  paymentExpiredAt: { type: Date },
  paymentMethod:    { type: String, default: '' },
```

- [ ] **Step 2: Ganti pembuatan transaksi di route**

Di `routes/orderRoutes.js`, hapus `const midtransClient = require('midtrans-client')` dan blok `const snap = new midtransClient.Snap({...})` di baris 5 dan 21-25. Ganti dengan:

```js
const { createPayment, getTransaction, MayarError } = require('../services/mayarService');
```

Ganti blok baris 429-483 (dari `const snapTransaction = await snap.createTransaction({` sampai `res.status(201).json(...)`) dengan:

```js
    const expiryHours = Number(process.env.MAYAR_PAYMENT_EXPIRY_HOURS) || 24;
    const paymentExpiredAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const payment = await createPayment({
      name: `Pesanan ${order.orderCode}`,
      amount: total,
      email: req.customer.email,
      mobile: req.customer.phone,
      description: `Pembayaran pesanan ${order.orderCode} di katiga.id`,
      expiredAt: paymentExpiredAt.toISOString(),
      redirectUrl: `${process.env.FRONTEND_URL}/pesanan/${order._id}/selesai?verify=1`,
      extraData: { orderId: order._id.toString() },
    });

    order.paymentRef = payment.transactionId;
    order.paymentLink = payment.link;
    order.paymentExpiredAt = paymentExpiredAt;
    await order.save();

    try {
      await notifyAdmin({
        type: 'order_new',
        title: 'Pesanan baru',
        message: `Pesanan baru dari ${req.customer.name} senilai Rp${total.toLocaleString('id-ID')}`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] order_new failed:', notifyErr.message);
    }

    res.status(201).json({ orderId: order._id, paymentLink: payment.link });
```

`createPayment` dipanggil sebelum `order.save()` yang pertama, jadi kegagalan Mayar tidak meninggalkan order yatim — blok `catch` di baris 484-498 sudah melepas reservasi voucher.

Rincian item, ongkir, dan diskon **tidak** dikirim ke Mayar. Keputusan #3 di spec: satu angka `amount = total`.

- [ ] **Step 3: Tangani 429 dan 409 dari Mayar**

Docs Mayar mengembalikan `429` dengan pesan `Duplicate request detected. Please wait 1 minute before trying again` dan `409` untuk payment request kembar. Keduanya terjadi saat customer menekan Bayar dua kali cepat. Tanpa penanganan khusus, customer melihat "Gagal membuat pesanan" yang menyesatkan.

Di `routes/orderRoutes.js`, di dalam blok `catch` route `POST /` (baris 484-498), tambahkan di paling atas sebelum `console.error`:

```js
    if (err instanceof MayarError && [409, 429].includes(err.status)) {
      console.error(`[Create Order] Mayar menolak duplikat (${err.status})`);
      return res.status(429).json({
        message: 'Permintaan pembayaran sebelumnya masih diproses. Tunggu satu menit lalu coba lagi.',
      });
    }
```

Pelepasan reservasi voucher di awal blok `catch` tetap berjalan lebih dulu, jadi voucher tidak tertahan.

Sisi frontend sudah aman: `setPaying(true)` di awal `handlePay` (`Checkout.tsx:141`) menonaktifkan tombol sepanjang permintaan berlangsung.

- [ ] **Step 4: Copot snap.js dari frontend**

Hapus baris 12 di `client/index.html` seluruhnya (tag `<script src="https://app.sandbox.midtrans.com/snap/snap.js" …>`).

Di `client/src/vite-env.d.ts`, hapus baris 6 (`VITE_MIDTRANS_CLIENT_KEY`) dan seluruh blok `snap?: { … }` di baris 14-21. Sisakan `google` di dalam `interface Window`.

- [ ] **Step 5: Perbarui tipe Order**

Di `client/src/types/ecommerce.ts` baris 124, tambahkan nilai enum, dan ganti baris 128:

```ts
  paymentStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded' | 'refund_pending';
```

```ts
  paymentLink: string;
  paymentExpiredAt?: string;
```

Di `client/src/services/api.ts`, tipe kembalian `createOrder` harus `{ orderId: string; paymentLink: string; message?: string }`.

- [ ] **Step 6: Ganti popup jadi redirect di Checkout**

Di `client/src/pages/Checkout.tsx`, ganti isi `handlePay` dari baris 159 sampai 192 dengan:

```tsx
      if (!result.paymentLink) {
        toast.error(result.message ?? 'Gagal membuat pesanan');
        setPaying(false);
        return;
      }

      removeManyFromCart(effectiveCart.map((item) => item.cartItemId));
      sessionStorage.removeItem(CHECKOUT_SELECTED_IDS_KEY);
      sessionStorage.removeItem(BUY_NOW_ITEM_KEY);

      window.location.href = result.paymentLink;
```

Keranjang dikosongkan **sebelum** redirect karena tidak ada callback hasil — alasannya ada di spec, edge case #4. Order sudah tercipta dan `paymentLink` tersimpan, jadi pemulihannya lewat halaman pesanan.

- [ ] **Step 7: Ganti popup jadi redirect di Lanjutkan Pembayaran**

Di `client/src/pages/PesananDetail.tsx`, ganti `handleRepay` di baris 285-298 dengan:

```tsx
  const handleRepay = () => {
    if (!order?.paymentLink) return
    setPaying(true)
    window.location.href = order.paymentLink
  }
```

Ganti kondisi `canRepay` di baris 383:

```tsx
  const canRepay = order.paymentStatus === 'pending'
    && order.orderStatus === 'awaiting_payment'
    && Boolean(order.paymentLink)
    && (!order.paymentExpiredAt || new Date(order.paymentExpiredAt) > new Date())
```

- [ ] **Step 8: Pastikan tidak ada sisa snap**

Run: `rg -i "snap|VITE_MIDTRANS" client/src client/index.html`
Expected: nol hasil.

- [ ] **Step 9: Type-check dan lint**

Run: `cd client && npx tsc -b`
Expected: keluar tanpa error.

Run: `cd client && npm run lint`
Expected: keluar tanpa error.

- [ ] **Step 10: Verifikasi manual**

`npm run dev`. Checkout satu produk sampai tekan Bayar Sekarang. Expected: browser berpindah ke halaman bayar Mayar, dan di database order baru punya `paymentRef`, `paymentLink`, `paymentExpiredAt` terisi. Kembali ke `/pesanan/:id` — tombol Lanjutkan Pembayaran membuka link yang sama.

- [ ] **Step 11: Commit**

```bash
git add models/Order.js routes/orderRoutes.js client/index.html client/src
git commit -m "feat: create mayar payment and redirect from checkout"
```

---

### Task 5: Satu fungsi status, dipakai webhook dan verify-payment

Menyatukan dua salinan logika yang sudah menyimpang: versi webhook menangani rilis voucher saat gagal, versi verify-payment tidak.

**Files:**
- Modify: `routes/orderRoutes.js:102-227` (webhook), `:522-602` (verify-payment)
- Modify: `server.js:55-57`

**Interfaces:**
- Consumes: `getTransaction` dari Task 3; `Order.paymentRef` dari Task 4.
- Produces: `syncPaymentStatus(order) → Promise<Order>` — idempoten, aman dipanggil bersamaan dari beberapa jalur. Diekspor dari `routes/orderRoutes.js` sebagai properti modul agar `server.js` bisa memakainya di Task 6.

- [ ] **Step 1: Tulis `syncPaymentStatus`**

Di `routes/orderRoutes.js`, ganti seluruh `webhookHandler` (baris 102-227) dengan fungsi berikut, lalu webhook baru di Step 2:

```js
const MAYAR_STATUS_MAP = {
  paid: 'paid',
  created: 'pending',
  unpaid: 'pending',
  expired: 'expired',
};

// Satu-satunya tempat status pembayaran berubah. Dipanggil webhook, verify-payment,
// dan sapuan terjadwal — karena itu wajib idempoten.
const syncPaymentStatus = async (order) => {
  if (!order.paymentRef) return order;

  let transaction;
  try {
    transaction = await getTransaction(order.paymentRef);
  } catch (err) {
    if (err instanceof MayarError && err.status === 404) {
      console.error(`[Mayar] transaksi ${order.paymentRef} tidak ditemukan untuk order ${order._id}`);
      return order;
    }
    throw err;
  }

  const newPaymentStatus = MAYAR_STATUS_MAP[transaction.status];
  if (!newPaymentStatus) {
    console.error(`[Mayar] status tidak dikenal "${transaction.status}" untuk order ${order._id}`);
    return order;
  }

  const previousPaymentStatus = order.paymentStatus;
  if (newPaymentStatus === previousPaymentStatus) return order;

  order.paymentStatus = newPaymentStatus;
  order.paymentMethod = transaction.paymentMethod ?? '';

  if (newPaymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      order.voucherReserved = false;
      order.voucherConsumed = true;
    } else if (order.voucherCode && !order.voucherConsumed) {
      order.voucherConsumed = true;
    }

    if (order.orderStatus === 'awaiting_payment') {
      order.orderStatus = 'processing';
      try {
        const biteshipResult = await biteshipCreateOrder(order);
        order.biteshipOrderId = biteshipResult.id ?? '';
        order.biteshipTrackingCode = biteshipResult.courier?.tracking_id ?? '';
        order.biteshipWaybillId = biteshipResult.courier?.waybill_id ?? '';
      } catch (bErr) {
        console.error('[Biteship] Auto-create order failed:', bErr.message);
      }
    }
  }

  if (newPaymentStatus === 'expired') {
    if (order.voucherCode && order.voucherReserved && !order.voucherConsumed) {
      try {
        const released = await Voucher.findOneAndUpdate(
          { code: order.voucherCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
        if (!released) {
          console.error(`[Voucher] Voucher ${order.voucherCode} tidak ditemukan saat release order ${order._id}`);
        }
      } catch (voucherErr) {
        console.error('[Voucher] Release on expired payment failed:', voucherErr.message);
      }
      order.voucherReserved = false;
    }
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
  }

  await order.save();

  try {
    if (newPaymentStatus === 'paid') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.quantity, stock: -item.quantity } });
      }
      await notifyAdmin({
        type: 'payment_paid',
        title: 'Pembayaran diterima',
        message: `Pesanan ${order.orderCode} telah dibayar`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
      await notifyCustomer({
        customerId: order.customer,
        type: 'payment_confirmed',
        title: 'Pembayaran dikonfirmasi',
        message: 'Pembayaran untuk pesanan kamu telah dikonfirmasi',
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    } else if (newPaymentStatus === 'expired') {
      await notifyAdmin({
        type: 'payment_failed',
        title: 'Pembayaran kedaluwarsa',
        message: `Pembayaran pesanan ${order.orderCode} kedaluwarsa`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
      await notifyCustomer({
        customerId: order.customer,
        type: 'payment_failed',
        title: 'Pembayaran kedaluwarsa',
        message: 'Pembayaran untuk pesanan kamu kedaluwarsa',
        link: `/pesanan/${order._id}`,
        relatedId: order._id,
      });
    }
  } catch (notifyErr) {
    console.error('[Notify] syncPaymentStatus notify failed:', notifyErr.message);
  }

  return order;
};
```

Status `failed` tidak pernah ditulis — Mayar tidak punya padanannya. Nilai enum dipertahankan hanya agar baris lama tetap valid.

- [ ] **Step 2: Tulis webhook Mayar**

Tepat di bawah `syncPaymentStatus`:

```js
// Payload webhook tidak diverifikasi — docs Mayar tidak mendokumentasikan signature apa pun.
// Karena itu payload hanya dipakai untuk mengetahui transaksi MANA yang berubah; status
// sebenarnya selalu diambil ulang dari API Mayar memakai API key kita.
const webhookHandler = async (req, res) => {
  try {
    const payload = req.body ?? {};
    const transactionId =
      payload.transactionId ??
      payload.data?.transactionId ??
      payload.id ??
      payload.data?.id ??
      null;

    if (!transactionId) {
      console.error('[Webhook] payload tanpa transactionId');
      return res.status(200).json({ message: 'OK' });
    }

    const order = await Order.findOne({ paymentRef: transactionId });
    if (!order) {
      console.error(`[Webhook] order untuk paymentRef ${transactionId} tidak ditemukan`);
      return res.status(200).json({ message: 'OK' });
    }

    await syncPaymentStatus(order);
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(200).json({ message: 'OK' });
  }
};
```

Selalu 200, termasuk saat order tidak ditemukan — 404 mengundang retry berulang dari Mayar.

Nama field pada rantai `??` harus disesuaikan dengan payload nyata yang tercatat di Verifikasi #3. Bila payload nyata memakai satu nama saja, sederhanakan menjadi nama itu.

- [ ] **Step 3: Sederhanakan verify-payment**

Ganti seluruh isi route `POST /my/:id/verify-payment` (baris 522-602) dengan:

```js
// ─── POST /api/orders/my/:id/verify-payment — tarik status terbaru dari Mayar ───
router.post('/my/:id/verify-payment', customerAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
    if (!order) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (order.paymentStatus === 'paid') return res.json(order);

    await syncPaymentStatus(order);
    res.json(order);
  } catch (err) {
    console.error('[Verify Payment]', err);
    res.status(500).json({ message: err.message });
  }
});
```

- [ ] **Step 4: Ekspor untuk server.js**

Pastikan bagian ekspor di akhir `routes/orderRoutes.js` menyertakan `syncPaymentStatus` di samping `webhookHandler` dan `biteshipWebhookHandler` yang sudah ada.

- [ ] **Step 5: Pindahkan mount webhook**

Di `server.js`, ganti baris 55-57:

```js
// Webhook Mayar tidak perlu raw body — tidak ada signature untuk dihitung; keaslian
// dipastikan dengan menanyakan ulang status ke API Mayar (routes/orderRoutes.js).
app.post('/api/orders/webhook/mayar', express.json(), require('./routes/orderRoutes').webhookHandler);
app.post('/api/orders/webhook/biteship', express.json(), require('./routes/orderRoutes').biteshipWebhookHandler);
```

- [ ] **Step 6: Daftarkan URL webhook ke Mayar**

Run:
```bash
curl -s -X POST "$MAYAR_API_URL/webhooks/update" \
  -H "Authorization: Bearer $MAYAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urlHook":"<url publik>/api/orders/webhook/mayar"}'
```
Expected: `{"statusCode":200,"messages":"success"}`.

- [ ] **Step 7: Verifikasi manual — jalur webhook**

Buat pesanan, bayar di sandbox, lalu **tutup tab sebelum redirect selesai**. Expected: dalam beberapa detik order berubah `paid` + `processing`, stok berkurang, order Biteship terbuat, notifikasi admin dan customer masuk.

- [ ] **Step 8: Verifikasi manual — jalur polling**

Buat pesanan kedua. Blokir webhook (hapus pendaftaran, atau matikan tunnel). Bayar, lalu biarkan redirect membawa ke `/pesanan/:id/selesai?verify=1`. Expected: halaman polling menaikkan status jadi `paid` tanpa bantuan webhook.

- [ ] **Step 9: Verifikasi idempoten**

Pada pesanan yang sudah `paid`, panggil ulang webhook dengan payload sama. Expected: `soldCount` dan `stock` produk **tidak** berubah lagi, tidak ada notifikasi ganda.

- [ ] **Step 10: Commit**

```bash
git add routes/orderRoutes.js server.js
git commit -m "feat: unify payment status sync for mayar webhook and polling"
```

---

### Task 6: Sapuan terjadwal untuk pembayaran yang tidak terlaporkan

Jaring pengaman ketiga. Dengan popup Midtrans customer selalu kembali; dengan redirect belum tentu, dan webhook bisa gagal diam-diam.

**Files:**
- Modify: `server.js:184-220`

**Interfaces:**
- Consumes: `syncPaymentStatus` dari Task 5.

- [ ] **Step 1: Tulis fungsi sapuan**

Di `server.js`, tepat di bawah `syncBiteshipDeliveries` (setelah baris 207), tambahkan:

```js
// ─── Scheduled check: reconcile awaiting_payment orders with Mayar ───
// Backstop for the Mayar webhook, which can silently fail to arrive. Without this an
// order can sit in awaiting_payment while the money has already been received.
async function syncPendingPayments() {
  try {
    const Order = require('./models/Order');
    const { syncPaymentStatus } = require('./routes/orderRoutes');

    const orders = await Order.find({
      orderStatus: 'awaiting_payment',
      paymentRef: { $exists: true, $ne: '' },
      paymentExpiredAt: { $gt: new Date() },
    });

    for (const order of orders) {
      try {
        await syncPaymentStatus(order);
      } catch (err) {
        console.error(`[Payment Sync] order ${order._id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Payment Sync] syncPendingPayments failed:', err.message);
  }
}
```

- [ ] **Step 2: Jadwalkan**

Di blok start server (baris 210-220), tambahkan dua baris mengikuti pola yang sudah ada:

```js
  mongoose.connection.once('connected', syncPendingPayments);
```

```js
  setInterval(syncPendingPayments, 15 * 60 * 1000);
```

- [ ] **Step 3: Verifikasi manual**

Buat pesanan, bayar di sandbox, tapi pastikan webhook tidak terdaftar dan jangan buka halaman `/selesai`. Restart server. Expected: saat koneksi Mongo terbentuk, log menunjukkan order berubah `paid` tanpa interaksi apa pun dari browser.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add scheduled sweep for unreported mayar payments"
```

---

### Task 7: Pembatalan pesanan dan refund manual

**Files:**
- Modify: `routes/orderRoutes.js:711-792` (route cancel)
- Modify: `routes/orderRoutes.js` (route admin update status — tambah izin `refund_pending` → `refunded`)
- Modify: `client/src/pages/admin/OrderDetail.tsx`
- Modify: `client/src/pages/PesananDetail.tsx:732-736` (`PAYMENT_METHOD_LABEL`)

**Interfaces:**
- Produces: `paymentStatus: 'refund_pending'` dihasilkan route cancel saat order sudah `paid`; hanya admin yang boleh memindahkannya ke `refunded`.

- [ ] **Step 1: Ganti blok refund Midtrans**

Di `routes/orderRoutes.js`, ganti baris 722-749 (pembuatan `coreApi` sampai penutup blok `else if`) dengan:

```js
    if (order.paymentStatus === 'paid') {
      // Mayar tidak menyediakan endpoint refund — dana dikembalikan manual oleh admin,
      // lalu ditandai 'refunded' dari panel admin.
      order.paymentStatus = 'refund_pending';
    } else if (order.paymentStatus === 'pending') {
      order.paymentStatus = 'expired';
    }
```

Blok pembatalan Biteship di baris 763-769 **tetap** — justru itu alasan tombol batal dipertahankan setelah pembayaran.

- [ ] **Step 2: Sesuaikan notifikasi pembatalan**

Ganti blok `notifyAdmin` di baris 775-785 supaya admin tahu ada kewajiban transfer:

```js
    try {
      await notifyAdmin({
        type: 'order_cancelled',
        title: 'Pesanan dibatalkan',
        message: order.paymentStatus === 'refund_pending'
          ? `Pesanan ${order.orderCode} dibatalkan — wajib transfer refund Rp${order.total.toLocaleString('id-ID')}`
          : `Pesanan ${order.orderCode} dibatalkan oleh customer`,
        link: `/admin/orders/${order._id}`,
        relatedId: order._id,
      });
    } catch (notifyErr) {
      console.error('[Notify] cancel notify failed:', notifyErr.message);
    }
```

- [ ] **Step 3: Tombol tandai refunded di admin**

Di `client/src/pages/admin/OrderDetail.tsx`, di dalam blok informasi pembayaran yang sudah diubah di Task 1, tambahkan:

```tsx
            {order.paymentStatus === 'refund_pending' && (
              <button
                onClick={handleMarkRefunded}
                className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Tandai sudah direfund
              </button>
            )}
```

Handler-nya memakai method admin update status yang sudah ada di `api.ts`:

```tsx
  const handleMarkRefunded = async () => {
    if (!id) return
    const confirmed = window.confirm('Konfirmasi bahwa dana sudah ditransfer ke customer?')
    if (!confirmed) return
    const updated = await api.updateOrderStatus(id, { paymentStatus: 'refunded' })
    setOrder(updated)
  }
```

Kelas Tailwind di sini memakai gaya admin (`rounded-md`, `bg-indigo-600`) — **bukan** design system publik. Itu disengaja; `admin-shell` mengisolasi keduanya.

`api.updateOrderStatus(id, data)` sudah ada di `client/src/services/api.ts:450` dan menembak `PUT /api/orders/:id/status`. Sebelum melanjutkan, pastikan route itu di `routes/orderRoutes.js` benar-benar menerima `paymentStatus: 'refunded'` — route tersebut sudah memproses nilai `paid`, `failed`, dan `expired` untuk keperluan notifikasi. Bila ada daftar nilai yang diizinkan, tambahkan `refunded` dan `refund_pending`.

- [ ] **Step 4: Petakan ulang label metode pembayaran**

Di `client/src/pages/PesananDetail.tsx`, ganti isi `PAYMENT_METHOD_LABEL` dari kode Midtrans (`bank_transfer`, `gopay`, …) ke nilai Mayar yang tercatat pada Verifikasi #2. Nilai yang tidak ada di peta sudah ditangani fallback `?? order.paymentMethod` yang ada di baris 736.

- [ ] **Step 5: Type-check dan lint**

Run: `cd client && npx tsc -b`
Expected: keluar tanpa error.

Run: `cd client && npm run lint`
Expected: keluar tanpa error.

- [ ] **Step 6: Verifikasi manual**

Batalkan pesanan yang belum dibayar. Expected: `expired`, `cancelled`, voucher kembali.

Batalkan pesanan yang sudah dibayar. Expected: `refund_pending`, `cancelled`, order Biteship ikut dibatalkan, notifikasi admin menyebut nominal transfer. Lalu dari `/admin/orders/:id` tekan Tandai sudah direfund. Expected: `refunded`.

- [ ] **Step 7: Commit**

```bash
git add routes/orderRoutes.js client/src
git commit -m "feat: replace auto refund with manual refund_pending flow"
```

---

### Task 8: Teks yang menyebut Midtrans

Dua di antaranya menjanjikan refund otomatis — janji itu sudah tidak benar dan harus ditulis ulang, bukan sekadar diganti nama.

**Files:**
- Modify: `client/src/pages/SyaratKetentuan.tsx:68,72,99,139`
- Modify: `client/src/pages/KebijakanPengembalian.tsx:83`
- Modify: `client/src/pages/KebijakanPrivasi.tsx:65`
- Modify: `client/src/pages/FAQ.tsx:82`
- Modify: `client/src/pages/ProductDetail.tsx:558`
- Modify: `client/src/pages/Checkout.tsx:303`

- [ ] **Step 1: Tulis ulang dua janji refund**

`SyaratKetentuan.tsx:99` — ganti kalimat "dikembalikan secara otomatis melalui Midtrans ke metode pembayaran asal Anda" menjadi:

```
dikembalikan melalui transfer bank ke rekening yang Anda konfirmasikan kepada tim kami,
paling lambat 7 hari kerja setelah pembatalan disetujui.
```

`KebijakanPengembalian.tsx:83` — ganti "pengembalian dana (refund) penuh melalui Midtrans ke metode pembayaran asal Anda" menjadi:

```
pengembalian dana (refund) penuh melalui transfer bank ke rekening yang Anda konfirmasikan
kepada tim kami
```

Tenggat 7 hari kerja adalah usulan. **Angka final harus disetujui pemilik sebelum di-commit** — ini halaman yang mengikat secara hukum.

- [ ] **Step 2: Ganti penyebutan nama**

`SyaratKetentuan.tsx:68,72,139`, `KebijakanPrivasi.tsx:65` — ganti `Midtrans` → `Mayar`.

- [ ] **Step 3: Cocokkan daftar metode pembayaran**

`FAQ.tsx:82` dan `ProductDetail.tsx:558` menyebut daftar metode. Sesuaikan dengan metode yang benar-benar aktif di dashboard Mayar, bukan disalin dari teks Midtrans lama. Bila belum dipastikan, tulis umum: "kartu kredit/debit, transfer bank/Virtual Account, e-wallet, dan QRIS" hanya bila keempatnya memang aktif.

- [ ] **Step 4: Perbaiki kalimat popup di checkout**

`Checkout.tsx:303` — kalimat sekarang menyebut jendela Midtrans akan terbuka. Sekarang alurnya redirect:

```
Semua transaksi diproses dengan aman lewat Mayar. Setelah menekan Bayar Sekarang,
Anda akan diarahkan ke halaman pembayaran Mayar.
```

- [ ] **Step 5: Pastikan tidak ada sisa**

Run: `rg -i "midtrans" client/src`
Expected: nol hasil.

- [ ] **Step 6: Type-check dan lint**

Run: `cd client && npx tsc -b`
Expected: keluar tanpa error.

Run: `cd client && npm run lint`
Expected: keluar tanpa error.

- [ ] **Step 7: Commit**

```bash
git add client/src
git commit -m "docs: update payment copy from midtrans to mayar"
```

---

### Task 9: Cabut sisa Midtrans dan verifikasi menyeluruh

**Files:**
- Modify: `package.json`
- Modify: `.env`, `.env.example` bila ada
- Modify: `CLAUDE.md` bila menyebut Midtrans

- [ ] **Step 1: Copot dependency**

Run: `npm uninstall midtrans-client`
Expected: `package.json` dan `package-lock.json` tidak lagi memuat `midtrans-client`.

- [ ] **Step 2: Bersihkan env**

Hapus `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` dari `.env`, dan `VITE_MIDTRANS_CLIENT_KEY` dari `client/.env`.

- [ ] **Step 3: Perbarui CLAUDE.md bila perlu**

Run: `rg -i "midtrans" CLAUDE.md`
Jika ada hasil, perbarui menjadi Mayar beserta env yang benar.

- [ ] **Step 4: Sapu seluruh repo**

Run: `rg -i "midtrans" --glob '!docs/**' --glob '!package-lock.json'`
Expected: nol hasil. Referensi di `docs/superpowers/` sengaja dibiarkan — itu catatan sejarah keputusan.

- [ ] **Step 5: Type-check dan lint**

Run: `cd client && npx tsc -b`
Expected: keluar tanpa error.

Run: `cd client && npm run lint`
Expected: keluar tanpa error.

- [ ] **Step 6: Uji manual menyeluruh**

Jalankan sepuluh langkah uji dari bagian Pengujian di spec, berurutan, terhadap sandbox:

1. keempat verifikasi Task 2 masih benar
2. bayar sukses → `paid`, stok berkurang, Biteship terbuat, notifikasi masuk
3. tutup tab sebelum redirect → webhook menyelesaikan
4. webhook diblokir → redirect + polling menyelesaikan
5. tinggalkan pembayaran → Lanjutkan Pembayaran memakai link yang sama, bukan link baru
6. biarkan kedaluwarsa → `expired`, voucher kembali
7. batal sebelum bayar → `expired`
8. batal sesudah bayar → `refund_pending` + Biteship batal
9. admin tandai sudah direfund → `refunded`
10. pesanan lama masih muncul di pencarian admin, Komplain lama masih menampilkan kode order

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json CLAUDE.md
git commit -m "chore: remove midtrans dependency and env vars"
```

---

## Sebelum produksi

Bukan bagian dari task mana pun — dikerjakan saat siap rilis:

1. Ganti `MAYAR_API_URL` ke `https://api.mayar.id/hl/v2` dan `MAYAR_API_KEY` ke key produksi.
2. Daftarkan ulang URL webhook produksi lewat `POST /webhooks/update`.
3. Jalankan `node scripts/migrate-order-payment-fields.js` terhadap database produksi — sesudah dipastikan berhasil di lokal.
4. Aktifkan metode pembayaran yang diinginkan di dashboard Mayar, lalu cocokkan teks FAQ dan ProductDetail dari Task 8.

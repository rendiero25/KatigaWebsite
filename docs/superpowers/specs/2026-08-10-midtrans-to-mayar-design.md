# Migrasi Payment Gateway: Midtrans → Mayar

Tanggal: 2026-08-10
Cakupan: seluruh jalur pembayaran — checkout, webhook, verifikasi status, pembatalan, refund, halaman kebijakan
Referensi resmi: [docs.mayar.id](https://docs.mayar.id/), [api-reference-v2](https://docs.mayar.id/api-reference-v2/introduction.md), [integration/webhook](https://docs.mayar.id/integration/webhook.md), [integration/MCP](https://docs.mayar.id/integration/MCP.md)

## Ringkasan

Midtrans Snap dicopot total dan diganti Mayar. Perbedaan mendasar yang menggerakkan seluruh desain ini: **Snap adalah popup di dalam site kita, Mayar adalah redirect keluar site.** Semua callback `onSuccess`/`onPending`/`onClose` hilang dan digantikan kombinasi webhook + polling saat customer kembali.

Perbedaan kedua yang sama pentingnya: **Mayar tidak punya endpoint refund.** Seluruh daftar endpoint di `llms.txt` hanya menyediakan `close`/`reopen` untuk invoice dan payment request. Refund otomatis yang sekarang jalan di route pembatalan customer harus diganti proses manual.

## Temuan API Mayar (dari docs resmi)

| Hal | Nilai |
|---|---|
| Base URL produksi | `https://api.mayar.id/hl/v2` |
| Base URL sandbox | `https://api.mayar.io/hl/v2` — **konflik**, lihat Verifikasi #4 |
| Autentikasi | `Authorization: Bearer <API_KEY>` |
| Buat pembayaran | `POST /payments/create` → `{ id, transactionId, link }` |
| Cek status | `GET /transactions/{id}` → `paid \| unpaid \| created \| expired` |
| Daftar webhook | `POST /webhooks/update` (field `urlHook`) |
| Tes webhook | `POST /webhooks/test` |
| Event webhook | `payment.received`, `payment.reminder`, `shipper.status`, + event membership |
| Refund | **tidak ada** |
| Envelope respons v2 | `{ statusCode, messages, data }` |
| MCP server | `https://mcp.mayar.id/sse`, SSE via `mcp-remote`, Bearer API key, 65 tools |

`POST /payments/create` (v2) punya `extraData` (metadata bebas) tapi **tidak mencantumkan `redirectURL`** di tabel parameternya. Sebaliknya `POST /hl/v1/payment/create` (v1) mencantumkan `redirectURL` sebagai field **wajib**, tapi tidak punya `extraData`. Ketidakcocokan ini diselesaikan lewat Verifikasi #1.

## Keputusan

1. **v2 `POST /payments/create`**, dengan `redirectUrl` diuji dulu di sandbox. Kalau v2 menolaknya, turun ke v1 `POST /hl/v1/payment/create` yang mendukungnya secara resmi.
2. **Batal-mandiri setelah bayar tetap ada, tapi refund manual.** Order Biteship dibatalkan otomatis; `paymentStatus` jadi `refund_pending`; admin transfer manual lalu menandainya `refunded`.
3. **Satu angka, bukan rincian.** Pakai `/payments/create` dengan `amount = total`, bukan `/invoices/create`. Alasan: API invoice v2 tidak punya field diskon, sehingga voucher harus diselundupkan sebagai item ber-`rate` negatif yang tidak didukung dokumentasi. Rincian sudah tampil di checkout dan halaman pesanan kita.
4. **Webhook tidak dipercaya sebagai sumber kebenaran.** Payload hanya diambil `transactionId`-nya; status sebenarnya diambil dari `GET /transactions/{id}` memakai API key kita. Docs Mayar tidak mendokumentasikan signature apa pun, jadi payload webhook tidak bisa diverifikasi keasliannya.
5. **Field `midtrans*` di-rename jadi netral** lewat script migrasi `$rename` sekali jalan. `orderCode` tetap berisi ObjectId mentah — format tidak diubah.
6. **Putus total, bukan berdampingan.** Tidak ada feature flag, tidak ada jalur Midtrans read-only.

## Arsitektur

### Modul baru `services/mayarService.js`

Meniru pola `services/biteshipService.js`. Satu-satunya tempat yang bicara HTTP ke Mayar.

```
createPayment({ name, amount, email, mobile, description, expiredAt, redirectUrl, extraData })
  → POST {MAYAR_API_URL}/payments/create
  → { id, transactionId, link }

getTransaction(transactionId)
  → GET {MAYAR_API_URL}/transactions/{id}
  → { status, paymentMethod, amount }
```

Envelope v2 (`{ statusCode, messages, data }`) dibuka di dalam modul ini; pemanggil menerima objek yang sudah dinormalisasi. Sandbox vs produksi hanya beda nilai `MAYAR_API_URL` — tidak ada boolean `isProduction` seperti Midtrans.

### Fungsi status tunggal `syncPaymentStatus(order)`

Logika "pembayaran jadi lunas" saat ini ditulis dua kali — di webhook (`routes/orderRoutes.js:127-217`) dan di verify-payment (`routes/orderRoutes.js:538-595`) — dan dua salinan itu **sudah menyimpang**: versi webhook menangani status `refund` dan melepas voucher saat gagal, versi verify-payment tidak. Migrasi ini menyatukannya.

```
syncPaymentStatus(order)
  1. getTransaction(order.paymentRef)
  2. petakan status Mayar → paymentStatus kita
  3. transisi ke 'paid' (dari selain 'paid'):
       potong stok, kunci voucher, buat order Biteship, notif admin + customer
  4. transisi ke 'expired':
       lepas voucher, orderStatus → cancelled
  5. simpan
```

Idempoten lewat perbandingan `previousPaymentStatus`, sehingga webhook dan polling boleh berjalan bersamaan tanpa dobel potong stok.

Dipakai oleh tiga pemanggil: webhook, `verify-payment`, dan sapuan terjadwal.

### Alur

```
Checkout → POST /api/orders
             ├─ hitung + verifikasi total server-side (tidak berubah)
             ├─ mayarService.createPayment({
             │      extraData: { orderId },
             │      redirectUrl: {FRONTEND_URL}/pesanan/<id>/selesai?verify=1
             │  })
             ├─ simpan paymentRef, paymentLink, paymentExpiredAt
             └─ balikkan { orderId, paymentLink }

Frontend  → window.location.href = paymentLink

Customer bayar di halaman Mayar

Jalur 1 (utama)     Mayar → POST /api/orders/webhook/mayar
                            ambil transactionId, buang sisanya
                            cari Order by paymentRef → syncPaymentStatus() → selalu 200

Jalur 2 (cadangan)  redirect → /pesanan/<id>/selesai?verify=1
                            polling POST verify-payment → syncPaymentStatus()

Jalur 3 (jaring)    sapuan terjadwal → syncPaymentStatus() untuk order
                            awaiting_payment yang punya paymentRef dan belum kedaluwarsa
```

Jalur 3 wajib ada. Dengan popup Midtrans customer selalu kembali ke site; dengan redirect belum tentu. Tanpa jaring ini, uang bisa masuk sementara pesanan diam di `awaiting_payment`.

Implementasinya mengikuti pola penjadwalan yang sudah dipakai di `server.js:214-219` — `setInterval` 15 menit ditambah satu kali jalan saat koneksi Mongo terbentuk. Kandidatnya: order `orderStatus: 'awaiting_payment'` yang punya `paymentRef` dan `paymentExpiredAt` belum lewat.

### Yang dicopot

- `midtrans-client` dari `package.json` dan `require` di `routes/orderRoutes.js`
- `snap.js` dari `client/index.html:12`, plus deklarasi `window.snap` di `vite-env.d.ts`
- `express.raw` di `server.js:56` — raw body hanya dibutuhkan untuk menghitung signature Midtrans; webhook Mayar pakai `express.json()` biasa
- seluruh env `MIDTRANS_*`, termasuk `VITE_MIDTRANS_CLIENT_KEY`

## Model data

### Perubahan `models/Order.js`

| Lama | Baru | Isi |
|---|---|---|
| `midtransOrderId` | `orderCode` | tetap `order._id.toString()`, unique sparse |
| `midtransToken` | `paymentLink` | URL halaman bayar Mayar |
| `midtransPaymentType` | `paymentMethod` | nilai dari `GET /transactions/{id}` |
| `midtransFraudStatus` | *dihapus* | Mayar tidak punya konsep fraud status |
| — | `paymentRef` **(baru)** | `transactionId` Mayar, unique sparse — kunci pencarian dari webhook |
| — | `paymentExpiredAt` **(baru)** | `Date`; menentukan tombol Lanjutkan Pembayaran masih tampil |

`paymentStatus` enum: `pending | paid | failed | expired | refunded | refund_pending`.

Catatan penting: `midtransOrderId` selama ini **bukan** id dari Midtrans — isinya salinan `order._id` (`routes/orderRoutes.js:427`). Fungsinya kode pesanan untuk dicari admin dan ditampilkan di notifikasi, bukan referensi gateway. Karena itu ia jadi `orderCode`, bukan `paymentRef`.

### Pemetaan status

| Mayar | Kita |
|---|---|
| `paid` | `paid` |
| `created` | `pending` |
| `unpaid` | `pending` |
| `expired` | `expired` |

`refunded` dan `refund_pending` hanya diset route pembatalan dan admin — tidak pernah berasal dari gateway.

`failed` **tidak akan pernah ditulis lagi.** Midtrans punya `deny`/`cancel`/`failure`; Mayar tidak — transaksi yang tak dibayar hanya diam di `unpaid` sampai `expired`. Konsekuensinya notifikasi "Pembayaran gagal" praktis mati dan yang tersisa hanya "Pembayaran kedaluwarsa". Nilai enum `failed` dipertahankan agar baris lama tetap valid.

### Script migrasi

File baru `scripts/migrate-order-payment-fields.js`, sekali jalan:

1. `$rename` tiga field sesuai tabel di atas
2. `$unset` `midtransFraudStatus`
3. `dropIndex('midtransOrderId_1')` — index unik lama tidak ikut hilang saat field-nya di-rename; Mongoose akan membuat `orderCode_1` sendiri

Tidak menghapus dokumen dan tidak menyentuh koleksi lain. Terpisah dari `seeds/seedData.js` karena seed menghapus koleksi sebelum insert.

Dijalankan ke database lokal dulu, diperiksa, baru produksi.

### Konfigurasi

```
MAYAR_API_URL=https://api.mayar.io/hl/v2      # sandbox; produksi → https://api.mayar.id/hl/v2
MAYAR_API_KEY=...
MAYAR_PAYMENT_EXPIRY_HOURS=24
```

`extraData: { orderId }` dikirim di setiap `createPayment` sebagai jalur pencarian cadangan bila `paymentRef` gagal tersimpan.

## Verifikasi wajib sebelum menulis kode produksi

Empat hal ini tidak dinyatakan docs Mayar dan tidak boleh ditebak. Semuanya diverifikasi di sandbox lebih dulu; MCP server Mayar dipasang sebelum langkah ini agar endpoint bisa dipanggil langsung.

| # | Yang tidak jelas | Cara verifikasi | Kalau negatif |
|---|---|---|---|
| 1 | Apakah `/hl/v2/payments/create` menerima `redirectUrl`. Tidak ada di tabel parameter v2, tapi wajib di v1. | satu POST ke sandbox | turun ke v1 `POST /hl/v1/payment/create` |
| 2 | Daftar lengkap nilai `status` transaksi. Docs menyebut `paid/unpaid/created/expired` dalam prosa, bukan tabel resmi. | bayar satu transaksi sandbox, amati tiap tahap | tambahkan nilai ke tabel pemetaan |
| 3 | Bentuk persis payload webhook `payment.received` — field mana yang memuat `transactionId`. Docs tidak memberi contoh JSON sama sekali. | `POST /hl/v2/webhooks/test` ke endpoint kita, log payload | sesuaikan ekstraksi id |
| 4 | Base URL sandbox: docs v2 menyebut `api.mayar.io`, CLI resmi Mayar menyebut `api.mayar.club`. | `GET /transactions` ke keduanya dengan key sandbox | pakai yang menjawab 200 |

Hasil keempatnya dicatat kembali ke spec ini sebelum implementasi lanjut.

## Penanganan error

| Error | Kapan | Tindakan |
|---|---|---|
| **429** `Duplicate request detected. Please wait 1 minute before trying again` | customer klik Bayar dua kali | jangan buat payment baru — bila order sudah punya `paymentLink` dan belum lewat `paymentExpiredAt`, kembalikan link yang ada |
| **409** duplicate payment request | sama | sama |
| **404** dari `GET /transactions/{id}` | `paymentRef` tidak dikenal Mayar | log, status order tidak diubah, kembalikan order apa adanya — jangan lempar 500 ke customer |
| Mayar tidak merespons saat `createPayment` | gateway down | order tidak disimpan; reservasi voucher dilepas oleh blok catch yang sudah ada (`routes/orderRoutes.js:485`) |

Urutan di `POST /api/orders` diubah: `createPayment` dipanggil **sebelum** `order.save()`, agar kegagalan gateway tidak meninggalkan order yatim.

Webhook **selalu membalas 200**, termasuk saat `paymentRef` tidak ditemukan. Kode sekarang membalas 404 untuk order tak dikenal (`routes/orderRoutes.js:123`), yang mengundang retry berulang dari sisi Mayar.

## Edge case

1. **Bayar sukses, webhook tidak datang, customer tidak kembali** → ditangani sapuan terjadwal (Jalur 3), meniru `syncBiteshipDeliveries` di `server.js:187`.
2. **Link kedaluwarsa** → tombol Lanjutkan Pembayaran hilang, order jadi `expired`, voucher dilepas.
3. **Bayar dua kali** → dicegah aturan idempoten pada error 429/409; tidak pernah ada dua link aktif untuk satu order.
4. **Keranjang** → dikosongkan tepat sebelum redirect, bukan sesudah bayar, karena tidak ada callback hasil. Customer yang batal di halaman Mayar kehilangan isi keranjang; pemulihannya lewat order yang sudah tercipta (`awaiting_payment` + `paymentLink` tersimpan), bukan lewat keranjang. Mengosongkan saat customer kembali ditolak: bila ia tak pernah kembali, keranjang masih penuh sementara ordernya sudah ada, sehingga ia checkout lagi dan tercipta dua pesanan.
5. **`refund_pending`** → butuh tombol baru di admin OrderDetail: "Tandai sudah direfund" → `paymentStatus: refunded`.

## Perubahan pembatalan pesanan

`POST /api/orders/my/:id/cancel` (`routes/orderRoutes.js:712`):

| Kondisi | Sekarang | Sesudah |
|---|---|---|
| `paymentStatus: pending` | `coreApi.transaction.cancel()` → `expired` | tidak ada panggilan gateway → `expired` |
| `paymentStatus: paid` | `coreApi.transaction.refund()` → `refunded` | order Biteship dibatalkan (kode sudah ada, `routes/orderRoutes.js:765`), `paymentStatus: refund_pending`, notif admin "wajib transfer Rp X" |

Alasan tetap mengizinkan batal-mandiri setelah bayar: order Biteship dibuat otomatis begitu pembayaran lunas (`routes/orderRoutes.js:169`). Kalau tombol batal dihapus dan customer diarahkan ke sistem Komplain, ada jendela di mana kurir sudah pickup sebelum admin membaca komplain — paket terlanjur jalan, dan ongkos dua arah jatuh ke admin.

Sistem Komplain yang ada (`models/Complaint.js`, `resolution.type: 'refund'`) memang sudah manual sejak awal — tidak pernah memanggil API refund — jadi tidak ada perubahan di sana.

## File yang tersentuh

**Backend** — `services/mayarService.js` *(baru)*, `scripts/migrate-order-payment-fields.js` *(baru)*, `routes/orderRoutes.js`, `routes/complaints.js`, `models/Order.js`, `server.js`, `package.json`

**Frontend** — `client/index.html`, `Checkout.tsx`, `PesananDetail.tsx`, `PesananSelesai.tsx`, `Pesanan.tsx`, `admin/Orders.tsx`, `admin/OrderDetail.tsx`, `admin/Complaints.tsx`, `types/ecommerce.ts`, `vite-env.d.ts`, `services/api.ts`, `hooks/useApi.ts`

Tombol Lanjutkan Pembayaran **sudah ada** di `PesananDetail.tsx:286` (`snap.pay(order.midtransToken)`, syarat `canRepay` di baris 383) — hanya diubah dari popup menjadi `window.location.href = paymentLink`.

`PAYMENT_METHOD_LABEL` di `PesananDetail.tsx:732` memetakan kode Midtrans (`bank_transfer`, `gopay`, …) dan harus dipetakan ulang ke nilai Mayar. Nilai persisnya baru diketahui setelah Verifikasi #2.

## Teks yang menyebut Midtrans

Dua di antaranya menjadi **tidak benar** bila hanya diganti nama, karena refund tidak lagi otomatis:

| Lokasi | Isi sekarang | Tindakan |
|---|---|---|
| `SyaratKetentuan.tsx:99` | "dikembalikan secara otomatis melalui Midtrans ke metode pembayaran asal Anda" | tulis ulang — refund manual via transfer |
| `KebijakanPengembalian.tsx:83` | "refund penuh melalui Midtrans ke metode pembayaran asal" | tulis ulang |
| `SyaratKetentuan.tsx:68,72,139` | penyebutan nama | ganti nama |
| `KebijakanPrivasi.tsx:65` | penyebutan nama sebagai penerima data | ganti nama |
| `FAQ.tsx:82` | daftar metode pembayaran | ganti nama + cocokkan dengan metode yang aktif di dashboard Mayar |
| `ProductDetail.tsx:558` | daftar metode pembayaran | sama |
| `Checkout.tsx:303` | "jendela Midtrans akan terbuka" | tulis ulang — sekarang redirect, bukan popup |

Halaman kebijakan mengikat secara hukum. Draf ditulis, **teks final disetujui pemilik**, bukan diputuskan sendiri.

## Pengujian

Proyek tidak punya test suite (sesuai `CLAUDE.md`). Verifikasi manual di sandbox, berurutan:

1. Empat verifikasi di bagian "Verifikasi wajib" — sebelum kode produksi ditulis
2. Bayar sukses → `paid`, stok berkurang, order Biteship terbuat, notifikasi masuk
3. Tutup tab sebelum redirect → webhook saja yang menyelesaikan
4. Webhook diblokir → redirect + polling saja yang menyelesaikan
5. Tinggalkan pembayaran, lalu Lanjutkan Pembayaran → link yang sama, bukan link baru
6. Biarkan kedaluwarsa → `expired`, voucher kembali
7. Batal sebelum bayar → `expired`
8. Batal sesudah bayar → `refund_pending` + order Biteship batal
9. Admin tandai sudah direfund → `refunded`
10. Setelah migrasi: order lama masih muncul di pencarian admin, Komplain lama masih menampilkan kode order

Ditutup dengan `cd client && npx tsc -b && npm run lint`.

## Prasyarat

- Akun sandbox Mayar + API key sandbox, diisi ke `.env`
- MCP server Mayar terpasang (`https://mcp.mayar.id/sse`, Bearer API key)
- URL webhook terdaftar via `POST /hl/v2/webhooks/update`; untuk pengujian lokal butuh tunnel publik

## Hasil verifikasi (2026-08-13)

Dijalankan dengan curl terhadap akun sandbox `katigasandbox`. MCP server Mayar tidak dipasang — tidak diperlukan untuk keempat verifikasi ini.

### Verifikasi #4 — base URL sandbox

`api.mayar.io` (yang tertulis di docs Mayar) tidak reachable: connection timeout. Sandbox yang hidup adalah **`api.mayar.club`**, dashboard **`web.mayar.club`**.

| Base URL | Key sandbox | Key produksi |
|---|---|---|
| `https://api.mayar.club/hl/v2` | 200 | 401 |
| `https://api.mayar.id/hl/v2` | 401 | 200 |
| `https://api.mayar.io/hl/v2` | timeout | timeout |

Key terikat ke satu environment; tidak ada toggle. Satu alamat email bisa dipakai untuk akun produksi dan sandbox sekaligus (`accountId` berbeda).

Nilai env: `MAYAR_API_URL=https://api.mayar.club/hl/v2` (sandbox), `https://api.mayar.id/hl/v2` (produksi).

### Verifikasi #1 — v2 menerima `redirectUrl`

**Ya.** `POST /hl/v2/payments/create` mengembalikan 200 dengan `data.link`, dan menerima `redirectUrl`, `expiredAt`, serta `extraData`. Tidak perlu turun ke v1 `POST /hl/v1/payment/create`; pemetaan order lewat `extraData.orderId` tetap tersedia di samping `paymentRef`.

Respons: `data.id` (= `paymentLinkId`), `data.transactionId`, `data.link`, `data.status` (`unpaid`), `data.extraData` (object).

Redirect kembali ke `redirectUrl` sesudah bayar belum diamati — menunggu satu pembayaran sandbox diselesaikan.

### Verifikasi #2 — nilai status transaksi

Ini menyimpang dari asumsi spec dan mengubah Task 5.

`GET /transactions/{id}` punya **dua** field status yang bergerak sendiri-sendiri:

| Tahap | `data.status` | `data.paymentLink.status` |
|---|---|---|
| Sebelum bayar | `created` | `unpaid` |
| Sesudah kedaluwarsa | `created` | `closed` |
| Sesudah bayar | belum diamati | belum diamati |

**`data.status` tidak pernah menjadi `expired`.** Kedaluwarsa hanya terbaca dari `paymentLink.status === 'closed'`. `MAYAR_STATUS_MAP` yang hanya membaca `data.status` akan membiarkan pesanan kedaluwarsa selamanya `pending`, sehingga sapuan Task 6 tidak pernah menutupnya dan voucher tidak pernah dilepas.

Konsekuensi untuk Task 3 dan 5: `getTransaction` wajib mengembalikan `paymentLink.status` juga, dan pemetaan disimpulkan dari kedua nilai — `paid` dari `data.status`, `expired` dari `linkStatus === 'closed'` saat belum `paid`, sisanya `pending`.

Catatan bentuk respons lain:
- `data.extraData` kembali sebagai **string JSON**, bukan object seperti pada respons create. Wajib `JSON.parse`.
- `data.expirationDate` selalu `null`; kedaluwarsa sebenarnya di `data.paymentLink.expiredAt` (epoch ms).
- `data.paymentMethod` `null` sebelum dibayar.
- `data.createdAt` / `updatedAt` epoch ms, bukan ISO string.

### Verifikasi #3 — payload webhook

Belum dijalankan; butuh URL penampung publik.

### Metode pembayaran aktif di sandbox

QRIS, Transfer Bank (VA), E-Wallet, Mini Market.

### Tambahan temuan (2026-08-13, lanjutan)

**`paymentMethod` terisi sebelum lunas.** Begitu pembeli memilih kanal (mis. VA Mandiri), `data.paymentMethod` berubah jadi `va/MANDIRI` padahal `status` masih `created` dan dana belum masuk. `paymentMethod` tidak boleh dipakai sebagai penanda lunas.

**Daftar transaksi terbelah dua.** `GET /transactions` hanya memuat transaksi yang sudah dibayar — inilah sebabnya dashboard sandbox tampak kosong. Yang belum dibayar ada di `GET /transactions/unpaid`, dan di sana status memakai kosakata ketiga: `active`, dengan `type: "payment_request"`. Jadi satu objek yang sama dilaporkan sebagai `created` (detail transaksi), `unpaid`/`closed` (paymentLink), atau `active` (daftar unpaid), tergantung endpoint.

**Tidak ada endpoint hapus.** Seluruh API Mayar hanya mengenal `close`/`reopen` untuk product, invoice, dan payment request. Transaksi permanen. Yang terdekat dengan "membatalkan" adalah menutup payment request:

```
POST /payments/{paymentLinkId}/close   → {"statusCode":200,"messages":"success"}
efek: paymentLink.status unpaid → closed; data.status transaksi tetap created
```

Diverifikasi di sandbox. Konsekuensi untuk Task 7: `close` memakai **`paymentLinkId`**, bukan `transactionId`, sedangkan `paymentLinkId` sebelumnya dibuang saat membuat order. Sudah ditambahkan sebagai kolom `paymentLinkId` di `models/Order.js` dan diisi dari `payment.id`.

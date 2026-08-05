# Redesign Checkout → Selesai Bayar

Tanggal: 2026-08-05
Halaman: `/checkout`, `/pesanan/:id/selesai` (baru)
Referensi: littlepalmerhaus.com (cart theme + checkout Shopify), design system di `CLAUDE.md`

## Hasil inspeksi LPH

**Cart page (theme LPH sendiri)** — sejalan dgn design system kita:
`h1 CART` uppercase 26px, weight 400, letter-spacing 1.3px, warna `#6F6F71`; header tabel `PRODUCT / QUANTITY / TOTAL` 12px uppercase; tombol `CHECKOUT` 13px, tracking 2.34px, radius 0, border 1px; baris `Total:` + catatan "Taxes and shipping calculated at checkout".

**Checkout page** — checkout bawaan Shopify (font sistem, radius 12px, tombol warna tan). Visualnya **tidak** diikuti; yang diambil hanya strukturnya:

- Kolom kiri berurutan: `Contact` → `Delivery` (alamat) → `Shipping method` → `Payment` → `Billing address` → `Add discount`.
- Kolom kanan sticky `Order summary`: daftar item (thumbnail + badge qty), field kode diskon, lalu `Subtotal / Shipping / Total`.
- Pembayaran lewat redirect gateway (Xendit di LPH; Midtrans Snap di kita).
- Tidak ada penomoran step.

## Keputusan

1. Struktur form ikut LPH/Shopify — section tanpa badge angka.
2. Kode voucher pindah dari kolom kiri ke ringkasan kanan sebagai "Kode Diskon".
3. Setelah Snap sukses/pending → halaman sukses baru, bukan langsung ke detail pesanan.
4. Gaya visual tetap design system Katiga (radius 0, uppercase, `#4F68AF`), bukan gaya checkout Shopify.

## `/checkout`

Kolom kiri (`flex-1`), tiap section dipisah `border-b border-[#E9E9EA] pb-8`, heading `uppercase text-[13px] tracking-[0.12em]`:

| Section | Isi |
|---|---|
| Kontak | Nama, email, telepon dari `useCustomerProfile()`; tautan "Ubah data kontak" → `/profil/pengaturan` |
| Alamat Pengiriman | `AddressSelector` (heading milik komponen itu sendiri — jangan tambah heading kedua) |
| Metode Pengiriman | `ShippingSelector`; sebelum alamat dipilih tampil kalimat pengarah, bukan section tersembunyi |
| Pembayaran | Blok informasi metode + catatan bahwa jendela Midtrans akan terbuka |

Kolom kanan `lg:w-96`, `sticky top-24`, `border border-[#E9E9EA] p-5`:
item → Kode Diskon (`VoucherInput`) → Subtotal / Diskon / Ongkir → Total (`text-lg`) → tombol `Bayar Sekarang` (`py-4`).

Catatan "Ongkir dihitung setelah metode pengiriman dipilih" hanya tampil selama kurir belum dipilih.

## `/pesanan/:id/selesai`

Route baru, memakai `Header`/`Footer` publik (bukan `UserLayout`).

- Pita atas: nomor pesanan (`midtransOrderId`), judul + catatan yang dipetakan dari `paymentStatus` (`paid` / `pending` / `failed` / `expired` / `refunded`).
- Kiri: "Rincian Pesanan" — blok Kontak, Alamat Pengiriman, Metode Pengiriman, Pembayaran; lalu tombol `Lihat Detail Pesanan` (primary) + `Lanjut Belanja` (outline).
- Kanan: ringkasan pesanan (item, subtotal, diskon voucher, ongkir, total `text-lg`) dalam kotak `border`.
- Query `?verify=1` memicu `api.verifyOrderPayment` lewat hook sebelum render — dipakai saat datang dari Snap.
- State kosong: "Pesanan Tidak Ditemukan" + tautan ke riwayat. Loading: skeleton `animate-pulse` tanpa radius.

Snap callback: `onSuccess` dan `onPending` → `/pesanan/:id/selesai?verify=1`; `onClose` tetap ke `/pesanan/:id`.

## Hook baru (`hooks/useApi.ts`)

- `useCustomerProfile()` — profil pelanggan untuk section Kontak.
- `useMyOrder(id, verifyPayment)` — ambil pesanan, opsional verifikasi pembayaran dulu; pakai `latestRequestIdRef` sesuai konvensi.

## `/keranjang`

Mengikuti tabel cart LPH (`PRODUCT / QUANTITY / TOTAL`), tetap mempertahankan pilih-sebagian yang sudah ada:

- Baris kepala kolom `border-b`: checkbox "Pilih Semua" (kolom produk) + `JUMLAH` (`w-28`, center) + `TOTAL` (`w-28`, kanan), semuanya `uppercase tracking-[0.12em] text-[12px] text-[#6F6F71]`. Di mobile hanya "Pilih Semua" + jumlah produk.
- `CartItemCard` memakai kolom yang sama sehingga stepper dan total baris lurus dengan kepala kolomnya. Ikon tong sampah diganti tautan teks `HAPUS` (`text-[11px]`, underline) di bawah harga satuan — sama seperti cart drawer.
- Ringkasan kanan disamakan dgn checkout: `lg:w-96`, kotak `border`, Subtotal `text-lg`, catatan "Ongkos kirim dihitung saat checkout.", tombol `CHECKOUT (n)` `py-4`.

## `/pesanan` (riwayat)

Tetap di `UserLayout`, daftar diubah jadi baris bergaya tabel:

- Kepala kolom `hidden md:flex`: `PESANAN` (flex-1) · `TANGGAL` (`w-40`) · `TOTAL` (`w-32`, kanan) · `STATUS` (`w-44`, kanan).
- Tiap baris: nomor pesanan pakai `midtransOrderId` (fallback potongan `_id`) + jumlah item, tanggal, total, badge status. Di mobile baris menumpuk (`flex-col`).
- Data diambil lewat `useMyOrders()` (sebelumnya `api.getMyOrders()` langsung di komponen).

## Perbaikan harga `Rp 0` (menyertai redesign)

Gejalanya: `RelatedProductsCarousel` menampilkan `Rp 0`, dan produk tanpa varian gagal masuk checkout dgn pesan "Harga untuk … belum tersedia".

Penyebab: form admin hanya mengirim `price` (string), tidak pernah `priceNumeric`, sehingga `priceNumeric` tersimpan 0 di database.

Perbaikan:
- `client/src/utils/price.ts` — `resolveProductPrice()`: pakai `priceNumeric` bila > 0, selain itu urai angka dari `price`. Tiga salinan helper yang sebelumnya dikopi di `ProductCard`, `ProductsSection`, dan `ProductSpotlightSection` dipusatkan ke sini.
- `RelatedProductsCarousel` dan `buildLiveCartItem` di `hooks/useApi.ts` ikut memakai helper itu — carousel tidak lagi `Rp 0`, dan hidrasi keranjang tidak lagi menolak produk tanpa varian.
- `routes/productRoutes.js` — `resolvePriceNumeric()` menurunkan angka dari `price` saat POST/PUT, jadi data baru tersimpan benar.

Dokumen lama tetap menyimpan `priceNumeric: 0` sampai produknya disimpan ulang lewat CMS; fallback di frontend yang menutup itu. Backfill massal belum dijalankan.

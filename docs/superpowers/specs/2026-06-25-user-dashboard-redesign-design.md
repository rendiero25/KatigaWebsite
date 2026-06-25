# User Dashboard Redesign — Design Spec
Date: 2026-06-25

## Overview

Redesign semua 9 halaman user dashboard menjadi visual modern bergaya Notion: clean, typography-first, whitespace kuat, minimal chrome. Dikerjakan parallel dengan 9 subagent masing-masing mengerjakan satu halaman.

## Scope

Halaman yang diubah (semua di dalam `UserLayout`):
1. `client/src/pages/Profil.tsx`
2. `client/src/pages/Pesanan.tsx`
3. `client/src/pages/PesananDetail.tsx`
4. `client/src/pages/PengaturanAkun.tsx`
5. `client/src/pages/AlamatSaya.tsx`
6. `client/src/pages/WishlistSaya.tsx`
7. `client/src/pages/Notifikasi.tsx`
8. `client/src/pages/UlasanSaya.tsx`
9. `client/src/pages/LaporanKeuangan.tsx`

`UserLayout.tsx` tidak diubah strukturnya — hanya konten halaman di dalamnya.

---

## Design System (berlaku untuk semua halaman)

### Surface & Color

| Token | Value | Penggunaan |
|---|---|---|
| Background | `#F7F7F5` | `bg-[#F7F7F5]` sudah di UserLayout `SidebarInset` |
| Card surface | `#FFFFFF` | Semua card/panel |
| Card border | `1px solid #E8E8E5` | `border border-[#E8E8E5]` |
| Text primary | `#1F1F1F` | Heading, label penting |
| Text secondary | `#4A4A4A` | Body text |
| Text muted | `#9A9A9A` | Caption, meta, placeholder |
| Divider | `#F0F0EC` | `border-[#F0F0EC]` antar row |
| Accent | `#4F68AF` | Link aktif, primary badge unread saja |
| Hover row | `#FAFAF9` | `hover:bg-[#FAFAF9]` |

**Dilarang:**
- `shadow-sm`, `shadow-md` — hapus semua, ganti border tipis
- Gradient (`from-[#4F68AF] to-[#2B3A67]`) pada button dan banner
- Stat card berwarna (bg-blue-50, bg-amber-50, dst)

### Typography

| Usage | Classes |
|---|---|
| Page section title | `text-[15px] font-semibold text-[#1F1F1F]` |
| Body | `text-sm text-[#4A4A4A]` |
| Caption / meta | `text-xs text-[#9A9A9A]` |
| Stat number besar | `text-2xl font-semibold text-[#1F1F1F]` |
| Stat label | `text-xs text-[#9A9A9A] uppercase tracking-wide` |

Tidak ada duplikasi heading — jika `UserLayout` sudah menerima `title` prop, jangan tambah `<h2>` di dalam halaman kecuali untuk section berbeda.

### Komponen

**Card:**
```
rounded-lg border border-[#E8E8E5] bg-white
```
Tidak ada `rounded-2xl`. Tidak ada `shadow-sm`.

**List row (pengganti card-per-item):**
```
flex items-center justify-between py-3 border-b border-[#F0F0EC] hover:bg-[#FAFAF9] transition-colors cursor-pointer
```
Row terakhir tidak perlu `border-b`.

**Primary button:**
```
bg-[#1F1F1F] text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-[#2F2F2F] transition-colors
```
Tidak ada gradient. Tidak ada `rounded-full`.

**Secondary / outline button:**
```
border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors
```

**Badge status** (warna per status dipertahankan tapi lebih kecil):
```
text-[11px] font-medium px-2 py-0.5 rounded
```

**Skeleton loading:**
Gunakan shadcn `<Skeleton>` konsisten di semua halaman. Tidak ada `animate-pulse` div manual.

**Empty state:**
```
flex flex-col items-center justify-center py-16 text-center
```
Isi: Icon `size-10 text-[#D0D0CC]` + teks utama `text-sm font-medium text-[#4A4A4A]` + teks sub `text-xs text-[#9A9A9A]` + satu CTA button (outline style).

---

## Per-Page Spec

### 1. Profil (`/profil`)

**Struktur:**
```
[Greeting section]
[Stats row — 4 metrik]
[Content grid — Pesanan Terbaru (3 col) | Info Profil (2 col)]
```

**Greeting section:**
- Bukan banner/card, hanya teks plain di atas konten
- `"Selamat datang, [Nama]"` — `text-xl font-semibold text-[#1F1F1F]`
- Sub: `"Kelola pesanan dan akun kamu dari sini."` — `text-sm text-[#9A9A9A]`

**Stats row (4 kolom):**
- Tidak ada bg-blue/amber/emerald, tidak ada icon block berwarna
- Tiap stat: angka besar di atas, label kecil di bawah, semua di dalam card border tipis
- Layout: `grid grid-cols-2 lg:grid-cols-4 gap-3`
- Stat "Total Belanja" tetap clickable ke `/profil/laporan-keuangan`

**Pesanan Terbaru:**
- Card border tipis, header "Pesanan Terbaru" + link "Lihat semua →"
- Isi: list row (bukan card per order) dengan separator
- Tiap row: ID order kecil + total bold | status badge kanan
- Empty state jika belum ada order

**Info Profil:**
- Card border tipis, header "Profil Saya" + link "Edit →"
- 3 baris: Nama, Email, HP — plain list, bukan icon block

---

### 2. Pesanan (`/pesanan`)

**Struktur:**
```
[Tab filter]
[List orders]
```

**Tab filter:**
- `<Tabs>` shadcn dengan values: `semua | menunggu | diproses | dikirim | selesai | dibatalkan`
- Tab underline style (bukan pill), `text-sm`
- Filter dilakukan client-side dari data yang sudah ada

**List:**
- Tiap order: list row dengan separator
- Kiri: ID order (mono xs), nama item pertama + jumlah item lainnya jika >1, tanggal
- Kanan: total bold + status badge
- Seluruh row clickable ke `/pesanan/${id}`

**Empty state:** berbeda per tab — "Belum ada pesanan" vs "Tidak ada pesanan dengan status ini"

---

### 3. PesananDetail (`/pesanan/:id`)

**Struktur:**
```
[Header: ID + status badge + tanggal]
[Status stepper]
[3 card: Info Pengiriman | Daftar Item | Ringkasan Biaya]
[Action buttons: Bayar / Ulasan]
```

**Status stepper:**
- 4 step horizontal: Menunggu Bayar → Diproses → Dikirim → Selesai
- Step aktif: dot solid `#1F1F1F`, step lewat: dot solid dengan checkmark, step belum: dot outline
- Label di bawah dot, `text-xs`

**Info Pengiriman card:**
- Nama penerima, alamat, ekspedisi, nomor resi (jika ada)

**Daftar Item card:**
- Tiap item: gambar 40×40 rounded-md, nama, variant (jika ada), qty × harga, subtotal kanan
- Border-b antar item

**Ringkasan Biaya card:**
- Baris: Subtotal, Ongkir, Diskon voucher (jika ada), **Total** (bold)

**Action buttons:**
- Jika `paymentStatus === 'awaiting_payment'`: tombol "Bayar Sekarang" (primary black)
- Jika `orderStatus === 'delivered'`: tombol ulasan per item yang belum diulas

---

### 4. PengaturanAkun (`/profil/pengaturan`)

Struktur sudah bagus, hanya perlu cleanup:
- TabsList pindah ke atas konten (saat ini di bawah form — aneh secara UX)
- Gradient button → primary black button
- `rounded-2xl` card → `rounded-lg`
- Avatar section tetap ada (fungsinya penting)
- Badge "Akun aktif" + Google tetap ada

---

### 5. AlamatSaya (`/profil/alamat`)

**Struktur:**
```
[Daftar alamat]
[Tombol "Tambah Alamat"]
[Form tambah (accordion/inline expand)]
```

**Alamat card:**
- Card border tipis, padding `p-4`
- Baris 1: Label alamat (bold) + badge "Utama" (jika default)
- Baris 2: Nama penerima, nomor HP
- Baris 3: Alamat lengkap (muted)
- Baris 4: Kota, Provinsi
- Footer card: tombol "Jadikan Utama" (outline, hanya jika bukan default) + tombol "Hapus" (merah, outline)

**Form tambah:**
- Expand inline setelah tombol "Tambah Alamat" diklik
- Field: Label, Nama Penerima, HP, Cari Area (dengan autocomplete), Alamat detail
- Submit: primary black button

---

### 6. WishlistSaya (`/profil/wishlist`)

- Hapus heading duplikat "Wishlist Saya" (sudah ada di `UserLayout title`)
- Sub count: `text-xs text-[#9A9A9A]` — "X produk tersimpan"
- Grid produk: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — card minimal sesuai Products.tsx
- WishlistButton tetap ada di corner gambar
- Empty state: Heart icon + "Belum ada produk di wishlist" + CTA ke `/produk`

---

### 7. Notifikasi (`/notifikasi`)

- Hapus shadcn `<Card>` per notifikasi → ganti list row dengan separator
- Unread: background `#F7F7F5` + dot biru `size-1.5 bg-[#4F68AF]` di kiri
- Read: background putih, tidak ada dot
- Layout tiap row: `[dot?] [konten flex-1] [timestamp xs muted]`
- Konten: title `text-sm font-medium` + message `text-xs text-[#9A9A9A]`
- Klik row: `markAsRead` + navigate ke `notif.link`
- "Tandai semua dibaca" hanya render jika `unreadCount > 0`
- Empty state jika tidak ada notifikasi sama sekali

---

### 8. UlasanSaya (`/profil/ulasan`)

- Tambahkan shadcn `<Skeleton>` untuk loading (ganti manual animate-pulse)
- Hapus heading duplikat
- Tiap ulasan: row dengan separator
  - Kiri: thumbnail produk 48×48 rounded-md + nama produk + bintang + teks review
  - Kanan: tanggal xs muted
- Pagination: pill angka sederhana, tanpa terlalu banyak chrome

---

### 9. LaporanKeuangan (`/profil/laporan-keuangan`)

**Struktur:**
```
[2 metrik besar]
[Breakdown per status]
[List transaksi selesai]
```

**2 metrik:**
- Tidak ada Card icon block — typographic saja
- "Total Belanja" + angka besar, sub "dari X pesanan selesai"
- "Total Hemat" + angka besar, sub "dari voucher"
- Layout: `grid grid-cols-1 sm:grid-cols-2 gap-4`
- Dibungkus card border tipis masing-masing

**Breakdown per status:**
- Card border tipis
- Table 2 kolom sederhana: Status (badge) | Jumlah pesanan

**List transaksi selesai:**
- Card border tipis dengan header "Riwayat Transaksi"
- Row per order: ID + tanggal | total kanan
- Sorted by newest

---

## Implementasi

- 9 subagent parallel, masing-masing 1 halaman
- Setiap agent membaca spec ini + file halaman yang dituju + `UserLayout.tsx`
- Boleh: menambah state UI minor (misalnya `activeTab` untuk filter Pesanan), import komponen shadcn baru, render data yang sudah ada dengan cara berbeda
- Tidak boleh: mengubah API calls, hooks (`useApi`), atau logika bisnis (payment, submit form, kalkulasi)
- Wajib: `npx tsc -b` dan `npm run lint` lulus sebelum selesai
- Tidak membuat file baru, tidak mengubah `UserLayout.tsx`

## Catatan Edge Case

- **PesananDetail cancelled:** Jika `orderStatus === 'cancelled'`, stepper tidak ditampilkan — ganti dengan satu badge besar "Dibatalkan" berwarna merah
- **PengaturanAkun TabsList:** Pindahkan TabsList dari bawah form ke atas konten (sebelum TabsContent), ini UX fix penting
- **AlamatSaya form:** Pertahankan semua logic `handleAreaSearch`, `selectArea`, dan `handleSubmit` yang sudah ada — hanya ubah JSX wrapper dan className
- **WishlistSaya price:** Tampilkan harga produk jika `priceNumeric > 0` menggunakan `Rp X.XXX` format, di bawah nama produk

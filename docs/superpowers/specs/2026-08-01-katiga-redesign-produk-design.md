# Katiga Redesign — Halaman Produk

Lanjutan dari [fondasi + homepage](2026-07-30-katiga-redesign-fondasi-homepage-design.md) dan [Tentang Kami](2026-07-30-katiga-redesign-tentang-kami-design.md). Referensi: https://littlepalmerhaus.com/collections/all

Token, Header, Footer sudah jadi — spec ini hanya mengatur `/produk` (`client/src/pages/Products.tsx`).

## Keputusan

| Topik | Keputusan | Alasan |
|---|---|---|
| Facet | `URUTKAN \| KATEGORI \| VARIAN \| KETERSEDIAAN` | Tidak ada data ukuran di model produk, jadi facet `SIZE` milik LPH tidak bisa ditiru. `variants[].name` isinya campur motif dan warna, jadi dinamai `VARIAN`, bukan `WARNA` |
| Kotak pencarian | Dibuang | LPH menaruh pencarian di header, bukan di halaman koleksi |
| `PartnersSection` | Dilepas dari halaman produk | Sudah tampil di Tentang Kami; logo partner tidak membantu orang yang sedang memilih produk |
| Wishlist & rating | Dipertahankan | Fitur nyata yang sudah berjalan; hanya di-restyle agar tenang |
| Struktur file | `Products.tsx` dipecah jadi komponen di `client/src/components/products/` | File sekarang 390 baris |

## Struktur Halaman

1. **Judul tipis** — `PRODUK` di tengah, `py-6`, `border-b border-[#E9E9EA]`. Menggantikan blok judul + subtitle besar yang sekarang.
2. **Banner** — `ProductPage.bannerImage`, full-bleed `h-[320px] md:h-[440px]`, `object-cover`. Placeholder `bg-[#F9F7F2]` bila kosong. Fallback URL Unsplash yang ada sekarang **dihapus** — jangan pernah menampilkan foto orang lain sebagai konten Katiga.
3. **Bar filter** — sticky di bawah header (`sticky top-20 z-30 bg-white border-y border-[#E9E9EA]`).
4. **Grid produk**.
5. **Paginasi bernomor**.

## Bar Filter

Desktop: satu baris, `uppercase tracking-[0.12em] text-[13px] text-[#6F6F71]`, tiap facet dropdown.

| Kontrol | Isi |
|---|---|
| `URUTKAN` | Terbaru, Harga Terendah, Harga Tertinggi, A–Z, Z–A |
| `KATEGORI` | dari `useCategories()`, pilihan tunggal + "Semua" |
| `VARIAN` | gabungan unik `variants[].name` dari produk yang tampil, pilihan ganda |
| `KETERSEDIAAN` | Tersedia (`stock > 0` atau ada varian `stock > 0`) / Habis |

Kanan bar: jumlah hasil `N PRODUK`.

Chip filter aktif muncul di bawah bar, tiap chip punya tombol hapus, plus `HAPUS SEMUA` bila ada lebih dari satu filter.

Mobile (`< md`): bar jadi dua tombol — `URUTKAN` dan `FILTER`. `FILTER` membuka drawer geser dari kanan berisi semua facet, dengan tombol `TERAPKAN` di kaki drawer.

Filter dan urutan dijalankan di klien atas hasil `useProducts()` — hanya 25 produk, tidak perlu endpoint baru.

`?category=<slug>` dari kartu kategori homepage harus tetap bekerja; logika pemetaan slug→nama yang sudah ada di `Products.tsx` dipertahankan.

## Kartu Produk

Rasio gambar `aspect-square`, `bg-[#F9F7F2]`, hover `scale-105 duration-700`. Tanpa radius, tanpa border, tanpa shadow.

Isi di bawah gambar, rata kiri:
- Nama — `uppercase text-[13px] text-[#1E1E1E]`
- Harga — `text-[13px] text-[#6F6F71]`. Bila ada `activePromotion`: harga diskon lalu harga asli `line-through text-[#6F6F71]/60`, badge persen `text-[11px] text-[#AE4B4B]` tanpa latar
- Chip varian — maksimal 4, `border border-[#E9E9EA] text-[11px] px-2 py-1`, sisanya `+N`
- Rating — hanya bila `reviewCount > 0`, `StarRating` ukuran `sm` + jumlah ulasan `text-[11px]`

Dibuang dari kartu: label kategori di atas nama (sudah ada facet kategori), `soldCount`, tinggi judul yang dipaksa `h-10`.

`WishlistButton` dipertahankan di pojok kanan atas gambar, tapi tanpa latar bulat penuh — cukup ikon putih dengan `drop-shadow`.

Grid: `grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12`. Mengikuti LPH yang memakai 3 kolom di desktop, bukan 5 seperti sekarang.

## Paginasi

12 produk per halaman. Angka halaman `text-[13px]`, aktif `text-[#1E1E1E] border-b border-[#1E1E1E]`, non-aktif `text-[#6F6F71]`. Panah kiri/kanan ikon garis tipis. Logika `getPageNumbers()` yang sudah ada dipertahankan.

Ganti halaman harus menggulir ke atas grid, bukan meninggalkan pengguna di kaki halaman.

## Pembagian File

| File | Isi |
|---|---|
| `components/products/ProductFilterBar.tsx` | bar desktop + drawer mobile + chip filter aktif |
| `components/products/ProductCard.tsx` | satu kartu |
| `components/products/ProductGrid.tsx` | grid + skeleton + keadaan kosong |
| `components/products/ProductPagination.tsx` | paginasi |
| `pages/Products.tsx` | pengambilan data, state filter, perakitan |

## Aturan Bersama

Sama dengan spec sebelumnya: styling hanya `className` Tailwind; tanpa `style={{}}` kecuali nilai numerik dinamis; radius 0; tanpa gradient/shadow tebal; container `container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30`; gambar wajib `api.getImageUrl()`; data lewat hook `useApi.ts`; tanpa `console.log`; tanpa `any`; `import type` untuk tipe; `interface Props` lokal; satu komponen per file, default export.

Keadaan kosong: bila tidak ada produk yang cocok, tampilkan pesan tenang di tengah grid + tombol `HAPUS SEMUA FILTER`. Jangan tampilkan grid kosong tanpa penjelasan.

## Verifikasi

```bash
cd client && npx tsc -b && npm run lint
```

Lalu buka `/produk`, uji: filter kategori, filter varian, ketersediaan, urutan, paginasi, drawer mobile, dan masuk lewat `/produk?category=<slug>` dari homepage.

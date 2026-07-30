# Katiga Redesign — Fondasi + Homepage

Referensi visual: https://littlepalmerhaus.com/ (LPH). Ambil design language + struktur homepage. Warna pakai palet Katiga, proporsi netral-dominan.

Spec ini cakupan **fondasi token + Header/Footer + Homepage**. Halaman lain (Katalog, Product Detail, Tentang Kami, Berita, Kontak, transaksional) dapat spec sendiri menyusul.

## Keputusan

| Topik | Keputusan |
|---|---|
| Kedalaman adopsi | Design language + struktur homepage LPH. Section korporat (Partners, dll) geser ke `/tentang-kami` |
| Bentuk | Radius 0, shadow nyaris nol, heading uppercase, tombol uppercase ls lebar |
| Warna | Netral dominan (putih / `#F9F7F2` / teks `#6F6F71`), biru Katiga `#4F68AF` sebagai aksen |
| Font | Nunito Sans (ganti Outfit). Admin ikut Nunito Sans |
| Token | Global untuk publik; admin dikecualikan lewat `.admin-shell` |
| Footer | Navy `#2B3A67` dengan tata letak & tipografi LPH |
| Shop the Look | Fase 1 — koordinat hotspot manual (persen). Editor visual menyusul |

## Fondasi Token — `client/src/index.css`

Ganti import font baris 1 → Nunito Sans `wght@300..700`.

```
--font-primary: "Nunito Sans", sans-serif;

--color-ink: #6f6f71;         /* teks body */
--color-ink-strong: #1e1e1e;  /* heading */
--color-line: #e9e9ea;        /* border */
--color-surface: #ffffff;
--color-surface-alt: #f9f7f2;
--color-primary: #4f68af;     /* aksen — flat, bukan gradient */
--color-primary-dark: #2b3a67;/* hover + footer bg */

--text-h1: clamp(1.5rem, 1.15rem + 1.1vw, 2.25rem);
--text-h2: clamp(1.25rem, 1.05rem + 0.8vw, 1.75rem);
--text-h3: clamp(1.125rem, 1.03rem + 0.4vw, 1.375rem);
--text-base: 0.875rem;
--text-sm: 0.8125rem;

--tracking-heading: 0.05em;
--tracking-button: 0.18em;
--tracking-nav: 0.12em;

--radius: 0;
--shadow-sm: 0 2px 8px rgb(0 0 0 / 0.05);
```

- `body`: `font-primary`, `14px`, `line-height 1.65`, `color var(--color-ink)`.
- Heading global: `font-weight 400`, `text-transform uppercase`, `letter-spacing var(--tracking-heading)`, `color var(--color-ink-strong)`.
- Spacing section publik: `--section-gap: 3.75rem` mobile → `6rem` desktop.
- Container publik tetap `container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30`.
- `.glass` dan `.gradient-text`: hapus **hanya jika** grep menunjukkan tak terpakai. Kalau masih dipakai halaman yang belum diredesign, biarkan sampai halaman itu digarap.
- Token shadcn (`--color-background`, `--color-sidebar-*`, dll) tetap; jangan diubah.

Isolasi admin:

```css
.admin-shell {
  --radius: 0.5rem;
  color: #111827;
}
.admin-shell :is(h1, h2, h3, h4, h5, h6) {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
}
.admin-shell :is(button, input, select, textarea) {
  text-transform: none;
  letter-spacing: normal;
}
```

Class `admin-shell` dipasang di root `AdminLayout.tsx`.

## Header — `client/src/components/Header.tsx`

Layout: `[logo kiri] [nav tengah] [ikon kanan]`, `h-20`, `bg-white`, `border-b border-[#E9E9EA]`, `sticky top-0`. Satu style untuk semua halaman.

- Pil hitam nav dibuang. Nav: `text-[13px] uppercase tracking-[0.12em] text-[#6F6F71]`, gap `28px`. Aktif: `text-[#1E1E1E]` + underline 1px. Hover: `text-[#1E1E1E]`.
- Ikon kanan (akun / notifikasi / keranjang): react-icons `Fi`, `20px`, `text-[#6F6F71]`. Badge keranjang jadi angka superscript kecil, bukan bulatan biru.
- Belum login: link teks `MASUK` + tombol `DAFTAR` kotak — `bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67]`.
- Mobile: hamburger → drawer geser dari kanan, full-height `bg-white`, item uppercase.
- Hapus semua cabang kondisi per-halaman di `Header.tsx:85-113` (`isAboutPage`, `isProductPage`, `isKatalogPage`, `isNewsPage`, `isContactPage`, `isProductDetailPage`, `isCartPage`, `isCheckoutPage`) beserta `backdrop-blur` dan `bg-[#F9F7F2]`.
- Logika auth, cart count, notifikasi, dropdown profil: **tidak berubah**, hanya restyle.

Efek samping: `Katalog.tsx` mengandalkan header absolute/transparan. Sesuaikan offset saat halaman Katalog digarap; pastikan tidak visual-broken sekarang.

## Footer — `client/src/components/Footer.tsx`

`bg-[#2B3A67]`, teks `text-white/80`, heading kolom `text-white uppercase tracking-[0.05em] text-[13px]`.

1. Blok CTA konsultasi — dipertahankan, diperkecil: heading `text-h2` weight 400 uppercase, tombol kotak outline putih.
2. Baris 4 kolom (desktop) / accordion (mobile):
   - Blurb perusahaan + ikon sosial
   - Navigasi: Beranda, Tentang Kami, Produk, Katalog, Berita, Kontak
   - Bantuan: FAQ, Syarat & Ketentuan, Kebijakan Privasi, Kebijakan Pengembalian
   - Kontak: alamat, telp, WA, email + form newsletter
3. Baris bawah: copyright, `border-t border-white/15`.

`FooterContent` saat ini hanya punya `consultationTitle`, `consultationText`, `copyright`. Blurb perusahaan: hardcode dulu di komponen, tandai dengan komentar; penambahan field model menyusul. Form newsletter: tampil non-fungsional (belum ada endpoint).

## Homepage — `client/src/pages/Home.tsx`

Urutan: Hero → Kategori → Banner Quote → Shop the Look → Produk Terbaru → Tentang → Badge Strip → Instagram → Berita.

`PartnersSection` tidak lagi dipanggil di `Home.tsx` (komponennya tetap ada, dipindah ke `/tentang-kami` nanti).

Wrapper `motion.div` dipertahankan; `y` 50 → 16, durasi 0.6 → 0.8.

### 1. Hero — `HeroSection.tsx`

Full-bleed `h-[calc(100vh-80px)] min-h-[560px]`. Auto-advance 6 s, dot indicator kanan-bawah, teks overlay kiri-bawah: `uppercase text-white` h1 + subtitle + tombol kotak outline putih.

Model `HeroSection` saat ini satu slide. Ubah ke:

```js
slides: [{ media: String, mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
           title: String, subtitle: String, buttonName: String, buttonLink: String }]
```

Route `routes/hero.js` + `admin/Hero.tsx` menyesuaikan (tambah/hapus/urutkan slide). Backward-compat: dokumen lama field `image`/`title`/dst dibaca sebagai satu slide.

Aset foto/video hero belum ada — komponen render placeholder `bg-[#F9F7F2]` bila `slides` kosong.

### 2. Kategori — `CategoriesSection.tsx` (baru)

Grid 3 kolom desktop, scroll horizontal mobile. Rasio `3/4`, foto `object-cover`, nama kategori putih di tengah (`text-5xl uppercase tracking-wide drop-shadow`), tombol `VIEW PRODUCTS` kotak putih di bawah. Hover: `scale-105` 700 ms.

`ProductCategory` perlu field tambahan: `image: String`, `displayOrder: Number` (default 0), `featured: Boolean` (default false). Admin `Categories.tsx` menyesuaikan (upload gambar, toggle featured, urutan). Section menampilkan kategori `featured` terurut `displayOrder`, maksimal 3; placeholder abu bila `image` kosong.

### 3. Banner Quote — `PromosiSection.tsx`

Full-bleed, `h-[320px]`, overlay hitam 25 %, quote tengah `text-2xl italic text-white` + baris "Ikuti Kami" + ikon Instagram/TikTok. Data sementara dari `Promotion` yang ada; foto + teks quote final menyusul.

### 4. Shop the Look — baru

Model `models/ShopTheLook.js`:

```js
{ title: String, image: String, active: Boolean,
  hotspots: [{ x: Number, y: Number, product: { type: ObjectId, ref: 'Product' } }] }
```

`x`/`y` = persen 0–100 relatif ukuran gambar.

- `routes/shopTheLook.js` — GET publik (populate `hotspots.product`), POST/PUT/DELETE ber-`auth`.
- Registrasi `app.use('/api/shop-the-look', require('./routes/shopTheLook'))` di `server.js`.
- `api.getShopTheLook()` / `updateShopTheLook()` di `services/api.ts`; `useShopTheLook()` di `hooks/useApi.ts`.
- `admin/ShopTheLook.tsx` — upload gambar, tabel hotspot (input `x`, `y`, select produk). Route di `App.tsx` + entri sidebar `AdminLayout.tsx`.
- `components/ShopTheLookSection.tsx` — desktop 2 kolom: foto rasio `4/5` + titik hotspot putih `w-3 h-3 rounded-full` posisi absolut dari `x`/`y`; klik → kartu produk di panel kanan (nama, harga, `VIEW PRODUCT`). Mobile: foto + carousel kartu di bawah.

Fase ini tanpa editor visual koordinat.

### 5. Produk Terbaru — `ProductsSection.tsx`

Judul `PRODUK TERBARU` tengah. Grid 3 desktop / 2 mobile. Kartu: foto `aspect-square bg-[#F9F7F2]`, swatch warna bulat kecil, nama `uppercase text-[13px]`, harga `text-[#6F6F71]`, chip varian kotak outline. Tanpa border kartu, tanpa shadow. Tombol `LIHAT SEMUA` kotak, tengah bawah.

### 6. Tentang — `ManufacturingSection.tsx`

Diringkas jadi full-bleed `h-[480px]` + overlay + teks tengah: label `TENTANG KAMI`, satu kalimat, tombol `BACA CERITA KAMI` → `/tentang-kami`. Konten detail manufaktur pindah ke `/tentang-kami` saat halaman itu digarap.

### 7. Badge Strip — `AdvantagesSection.tsx`

Satu baris, 4 kolom, `bg-white`, `h-36`. Item: ikon garis-tipis 32 px + label `uppercase text-[13px] tracking-[0.12em]`. Tanpa kartu, tanpa border.

### 8. Instagram — `InstagramSection.tsx` (baru)

Heading `IKUTI KAMI DI INSTAGRAM` + grid 6 kolom desktop / 3 mobile, `aspect-square`, gap 4 px. Belum ada sumber data: render 6 placeholder `bg-[#F9F7F2]`, props siap menerima array `{ image, link }`. Integrasi IG token atau model manual menyusul.

### 9. Berita — `NewsSection.tsx`

3 kartu horizontal: foto `aspect-[16/10]`, tanggal kecil, judul uppercase. Restyle saja, data tidak berubah.

## Aset & Akses yang Ditunggu

| Item | Dibutuhkan |
|---|---|
| Hero | 3–6 foto/video landscape + judul/subjudul per slide |
| Kategori | 3 foto potret kategori unggulan |
| Banner quote | 1 foto + kalimat quote + handle sosial |
| Shop the Look | 1–3 foto lifestyle + daftar produk per foto |
| Instagram | Token IG Basic Display **atau** 6 foto manual |
| Newsletter | Keputusan penyedia (endpoint belum ada) |

Semua section di atas dibangun dengan placeholder sampai aset masuk.

## Verifikasi

```bash
cd client && npx tsc -b && npm run lint
```

Lalu jalankan dev server, cek homepage + satu halaman admin (memastikan `.admin-shell` bekerja) + satu halaman publik yang belum diredesign (memastikan tidak crash).

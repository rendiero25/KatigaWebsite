# Katiga Redesign — Halaman Tentang Kami

Lanjutan dari [fondasi + homepage](2026-07-30-katiga-redesign-fondasi-homepage-design.md). Referensi: https://littlepalmerhaus.com/pages/about

Token, Header, dan Footer sudah jadi — spec ini hanya mengatur isi `/tentang-kami`.

## Keputusan

| Topik | Keputusan |
|---|---|
| `mission.points[]` | Jadi blok "NILAI KAMI" multi-kolom (pola `multi-column` LPH) |
| `vision` | Jadi banner kutipan full-bleed (pola `image-with-text-overlay` LPH) |
| Struktur file | `AboutUs.tsx` dipecah jadi komponen per blok di `client/src/components/about/` |
| Distribusi & Partners | Dipertahankan meski tak ada padanan di LPH — bukti jangkauan penting untuk produsen |
| Foto banner | Menyusul; render placeholder `bg-[#F9F7F2]` dengan tinggi final |

## Urutan Blok

| # | Blok | Komponen | Sumber data |
|---|---|---|---|
| 1 | Banner pembuka | `AboutBanner` | `AboutContent.images[0]` |
| 2 | Cerita Kami | `AboutStorySection` | `AboutContent.history` |
| 3 | Banner pemisah | `AboutBanner` | `AboutContent.images[1]` |
| 4 | Nilai Kami | `AboutValuesSection` | `AboutContent.mission` |
| 5–7 | Produk & Teknologi | `AboutTechSection` | `CertificationTechnology` |
| 8 | Kutipan visi | `AboutBanner` | `AboutContent.vision` |
| 9 | Di Balik Brand | `AboutBehindBrandSection` | `Manufacturing` |
| 10 | Distribusi | `AboutDistributionSection` | `DistributionChannel` |
| 11 | Dipercaya oleh | `PartnersSection` (restyle) | `Partner` |

## Aturan Bersama

- Semua styling lewat `className` Tailwind. `style={{}}` hanya untuk nilai numerik dinamis — background image pakai `<img className="absolute inset-0 w-full h-full object-cover">`, bukan `style={{ backgroundImage }}` seperti kode lama.
- Radius 0, tanpa gradient, tanpa shadow tebal.
- Heading section: `text-2xl md:text-3xl` (uppercase otomatis dari `@layer base`).
- Label/eyebrow: `uppercase tracking-[0.18em] text-[13px] text-[#6F6F71]`.
- Body: `text-sm text-[#6F6F71] leading-relaxed`.
- Tombol: `border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition`.
- Container: `container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30`.
- Gambar wajib `api.getImageUrl(path)`.
- Data lewat hook `useApi.ts` — jangan panggil `api.*` langsung di komponen.
- Setiap blok tanpa data: render placeholder dengan tinggi final, atau `return null` bila blok tidak bermakna kosong. Jangan pernah menampilkan teks palsu.

## Detail Blok

### `AboutBanner` — dipakai 3×

Props: `image?: string`, `quote?: string`, `label?: string`.

Full-bleed `h-[440px] relative overflow-hidden`. Gambar `object-cover`. Bila ada `quote`: overlay `bg-black/30` + teks tengah — `label` kecil di atas, `quote` `text-xl md:text-2xl text-white max-w-3xl`. Tanpa `quote`: tanpa overlay. Tanpa `image`: `bg-[#F9F7F2]`, tinggi tetap.

### `AboutStorySection`

Container terbatas `max-w-3xl mx-auto text-center`. Eyebrow `CERITA KAMI`, lalu `AboutContent.history` sebagai paragraf `text-sm leading-relaxed`. Padding vertikal `py-16`.

### `AboutValuesSection`

Eyebrow `NILAI KAMI` di tengah. Grid `grid-cols-2 md:grid-cols-5` (jumlah kolom mengikuti jumlah poin, maksimal 5). Tiap poin: ikon garis-tipis `react-icons/fi` 32 px (model tak punya field ikon — rotasi ikon seperti `AdvantagesSection`) + teks `uppercase text-[13px] tracking-[0.12em] text-center`. Baris tetap terpusat saat poin kurang dari 5 — pakai `flex flex-wrap justify-center`, bukan grid kaku.

### `AboutTechSection`

Blok 5: heading `certTech.header.title` + `subtitle` di tengah.

Blok 6 (`section1`): 2 kolom — gambar kiri `aspect-[4/5]`, teks kanan. Judul `section1.title`, lalu daftar `points[{ title, description }]` sebagai baris bergaris tipis `border-b border-[#E9E9EA]`.

Blok 7 (`section2`): 2 kolom terbalik — gambar kanan, teks kiri. Judul `section2.title`, eyebrow `section2.subtitle`, daftar `points[]` (array string) sebagai bullet tanpa marker, tiap baris `border-b border-[#E9E9EA]`.

Di mobile keduanya menumpuk dengan gambar selalu di atas.

### `AboutBehindBrandSection`

Eyebrow `DI BALIK BRAND` + judul `Manufacturing.tagline`. Deskripsi `Manufacturing.description`. Di bawahnya grid `Manufacturing.features[]` — tiap item `icon` (via `api.getImageUrl`) + `title`. Ini konten yang dilepas dari homepage saat homepage diringkas.

### `AboutDistributionSection`

2 kolom: teks kiri (`title`, `description`), `mapImage` kanan `object-contain` — peta tidak boleh terpotong, jadi `contain` bukan `cover`. Mobile menumpuk.

### `PartnersSection` (restyle)

Strip logo tenang: eyebrow `DIPERCAYA OLEH` di tengah, grid `grid-cols-3 md:grid-cols-6 gap-8 items-center`, logo `max-h-10 w-auto object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition`. Tanpa kartu, tanpa border. Komponen ini sudah tidak dipakai di homepage sejak redesign homepage.

## Hook Baru

`useAboutContent()` di `client/src/hooks/useApi.ts` — sudah ditambahkan. `useCertificationTech`, `useDistribution`, `useManufacturing`, `usePartners` sudah ada.

## Yang Ditunggu dari Pemilik Projek

3 foto banner full-bleed `2560×960` untuk blok 1, 3, dan 8, diunggah lewat admin ke `AboutContent.images[]` dan `AboutContent.vision.backgroundImage`.

## Verifikasi

```bash
cd client && npx tsc -b && npm run lint
```

Lalu buka `/tentang-kami` di dev server dan pastikan tidak ada blok yang crash saat datanya kosong.

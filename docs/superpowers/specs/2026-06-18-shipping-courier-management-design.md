# Shipping Courier Management

**Date:** 2026-06-18
**Scope:** Biteship courier visibility management in checkout + admin shipping settings

## Problem

Checkout saat ini mengambil metode pengiriman langsung dari Biteship, tetapi bisnis tidak punya kontrol untuk mematikan kurir tertentu. Semua kondisi kosong juga terlihat sama di UI:
- Biteship gagal dihubungi
- Biteship berhasil, tapi tidak ada metode untuk tujuan tsb
- Biteship berhasil, tapi semua metode harus disembunyikan oleh aturan bisnis

Akibatnya, ketika metode pengiriman tidak muncul, admin tidak tahu apakah akar masalah ada di provider, alamat tujuan, atau konfigurasi bisnis.

## Solution

Pakai model **live Biteship + admin courier filter**:
1. Backend tetap mengambil rate live dari Biteship
2. Admin mengatur kurir mana yang boleh tampil di checkout
3. Backend memfilter hasil Biteship sebelum dikirim ke frontend
4. Frontend membedakan empty state `provider_empty` vs `filtered_out` vs request error

Keputusan utama:
- **Biteship tetap source of truth** untuk availability, harga, dan ETA
- **Admin tetap source of truth** untuk izin bisnis menampilkan kurir
- **v1 hanya courier-level on/off**, belum service-level on/off

Default deploy behavior: semua kurir yang didukung aktif, supaya perilaku saat ini tetap aman sebelum admin mengubah config.

### Supported Couriers (v1)

| Code | Label |
|---|---|
| `jne` | JNE |
| `jnt` | J&T Express |
| `sicepat` | SiCepat |
| `anteraja` | AnterAja |
| `pos` | POS Indonesia |

## Backend

### `config/shippingCouriers.js` (baru)

Satu sumber tetap untuk courier catalog backend:

```js
const SUPPORTED_COURIERS = [
  { code: 'jne', label: 'JNE' },
  { code: 'jnt', label: 'J&T Express' },
  { code: 'sicepat', label: 'SiCepat' },
  { code: 'anteraja', label: 'AnterAja' },
  { code: 'pos', label: 'POS Indonesia' },
];
```

File ini dipakai oleh:
- `services/biteshipService.js` untuk menentukan `couriers` yang dikirim ke Biteship
- `routes/shippingSettingsRoutes.js` untuk mengirim daftar courier yang bisa dikonfigurasi admin
- filtering logic supaya validasi kode courier tidak di-hardcode di banyak tempat

### `models/ShippingSettings.js` (baru)

Singleton config model:

```js
{
  enabledCouriers: {
    type: [String],
    default: ['jne', 'jnt', 'sicepat', 'anteraja', 'pos'],
  },
  emptyStateMessage: {
    type: String,
    default: 'Metode pengiriman sedang tidak tersedia untuk alamat ini.',
  },
}
```

Catatan:
- Tidak perlu seed khusus
- Route `GET` / `PUT` auto-create document jika belum ada, mengikuti pola singleton settings lain di repo
- `enabledCouriers` harus selalu difilter ke daftar `SUPPORTED_COURIERS`, supaya tidak ada kode liar tersimpan

### `routes/shippingSettingsRoutes.js` (baru)

Protected by `auth` middleware.

#### `GET /api/shipping-settings`

Response:

```ts
{
  enabledCouriers: string[];
  emptyStateMessage: string;
  supportedCouriers: { code: string; label: string }[];
}
```

Jika document belum ada:
- create otomatis
- `enabledCouriers` default = semua courier yang didukung

#### `PUT /api/shipping-settings`

Body:

```ts
{
  enabledCouriers: string[];
  emptyStateMessage: string;
}
```

Rules:
- `enabledCouriers` boleh kosong
  - artinya checkout sengaja tidak menampilkan kurir apa pun
- semua nilai harus tervalidasi terhadap `SUPPORTED_COURIERS`
- backend harus dedupe value dan simpan urut mengikuti `SUPPORTED_COURIERS`
- `emptyStateMessage` di-trim; jika kosong, fallback ke default message

Response `PUT` sama seperti `GET`, supaya frontend bisa langsung refresh state dari payload hasil simpan.

### `services/biteshipService.js`

Tetap menjadi adapter provider, bukan tempat menyimpan aturan admin.

Perubahan:
- ganti hardcoded string `jne,jnt,sicepat,anteraja,pos` dengan nilai dari `SUPPORTED_COURIERS`
- tetap normalize response Biteship ke shape internal `ShippingRate`

Optional pure helper di file ini atau helper terpisah:

```js
filterRatesByEnabledCouriers(rates, enabledCouriers)
```

Tugas helper:
- keep rate jika `rate.courier_code` ada di `enabledCouriers`
- preserve urutan asli dari Biteship

### `routes/shippingRoutes.js`

`POST /api/shipping/rates` berubah dari return array polos menjadi response terstruktur.

#### Success: ada rate

```ts
{
  rates: ShippingRate[];
  reason: 'ok';
  message: '';
}
```

#### Success: Biteship sukses, tapi tidak ada rate

```ts
{
  rates: [];
  reason: 'provider_empty';
  message: 'Tidak ada kurir tersedia untuk tujuan ini.';
}
```

#### Success: Biteship sukses, tapi semua rate terfilter admin

```ts
{
  rates: [];
  reason: 'filtered_out';
  message: settings.emptyStateMessage;
}
```

#### Failure: Biteship/API error

Return non-200:

```ts
status: 502
{
  message: 'Gagal mengambil metode pengiriman'
}
```

Flow endpoint:
1. validasi `destinationAreaId` dan `items`
2. load `ShippingSettings`
3. fetch live rates dari Biteship
4. jika provider result kosong -> `provider_empty`
5. filter by `enabledCouriers`
6. jika hasil filter kosong -> `filtered_out`
7. selain itu return `ok`

### `server.js`

Tambah:

```js
app.use('/api/shipping-settings', require('./routes/shippingSettingsRoutes'));
```

## Frontend

### `client/src/types/ecommerce.ts`

Tambah type baru:

```ts
export interface ShippingCourierOption {
  code: string;
  label: string;
}

export interface ShippingSettings {
  enabledCouriers: string[];
  emptyStateMessage: string;
  supportedCouriers: ShippingCourierOption[];
}

export interface ShippingRatesResponse {
  rates: ShippingRate[];
  reason: 'ok' | 'provider_empty' | 'filtered_out';
  message: string;
}
```

### `client/src/services/api.ts`

Tambah:

```ts
getShippingSettings: async (): Promise<ShippingSettings> => { ... }
updateShippingSettings: async (data: {
  enabledCouriers: string[];
  emptyStateMessage: string;
}): Promise<ShippingSettings> => { ... }
```

Update:

```ts
getShippingRates: async (...): Promise<ShippingRatesResponse> => { ... }
```

Rules:
- semua request admin pakai `adminToken`
- `getShippingRates()` throw jika `!res.ok`

### `client/src/hooks/useApi.ts`

Tambah hook baru:

```ts
export function useShippingSettings() {
  const [data, setData] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => { ... }, []);
  const save = useCallback(async (payload) => { ... }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, saving, refresh, save };
}
```

Tujuan:
- admin page tidak pegang fetch logic mentah
- error handling dan refresh behavior konsisten

### `client/src/components/ShippingSelector.tsx`

Komponen ini tetap dipakai di checkout, tetapi state-nya diperjelas.

Tambahan state:
- `emptyReason: 'provider_empty' | 'filtered_out' | null`
- `emptyMessage: string`
- `errorMessage: string | null`

Fetch flow:
1. reset `rates`, `selected`, `emptyReason`, `emptyMessage`, `errorMessage`
2. call `api.getShippingRates(...)`
3. jika `reason === 'ok'` -> tampilkan opsi rate
4. jika `reason === 'provider_empty'` atau `filtered_out` -> tampilkan message tanpa treat as hard error
5. jika request throw -> tampilkan retry state

UI states:
- **loading**: `Mengambil tarif pengiriman...`
- **ok**: daftar radio card seperti sekarang
- **provider_empty**: `Tidak ada kurir tersedia untuk tujuan ini.`
- **filtered_out**: message dari admin settings
- **error**: `Gagal mengambil metode pengiriman. Coba lagi.` + tombol retry

Selected rate harus tetap di-reset saat:
- alamat berubah
- cart berubah
- fetch baru dimulai

### `client/src/pages/admin/ShippingSettings.tsx` (baru)

Lokasi: group `Sistem`.

UI minimum v1:
- title: `Pengaturan Pengiriman`
- checklist / toggle list semua `supportedCouriers`
- text input / textarea untuk `emptyStateMessage`
- save button
- inline warning jika semua courier dimatikan:
  - `Semua kurir nonaktif. Checkout tidak akan menampilkan metode pengiriman.`

Tidak perlu:
- drag sorting
- label custom per courier
- service-level checkbox

### `client/src/components/AdminLayout.tsx`

Tambah nav item baru di group `Sistem`:

```ts
{ path: '/admin/shipping', icon: Truck, label: 'Pengiriman' }
```

### `client/src/App.tsx`

Tambah route admin:

```ts
<Route path="/admin/shipping" element={<AdminShippingSettings />} />
```

## Data Flow

### Checkout flow

1. User pilih alamat
2. `ShippingSelector` call `POST /api/shipping/rates`
3. Backend call Biteship live
4. Backend filter hasil berdasarkan `ShippingSettings.enabledCouriers`
5. Frontend render salah satu state:
   - list rate
   - provider empty
   - filtered out
   - request error

### Admin flow

1. Admin buka `Pengiriman`
2. Frontend load `GET /api/shipping-settings`
3. Admin centang / uncentang courier
4. Save -> `PUT /api/shipping-settings`
5. Checkout request berikutnya langsung memakai config baru

## Default Behavior / Backward Compatibility

Supaya rollout aman:
- jika `ShippingSettings` belum ada -> auto-create dengan semua courier aktif
- jika admin belum pernah buka halaman pengiriman -> checkout tetap berjalan seperti perilaku saat ini
- tidak ada perubahan pada order payload (`shippingCourier`, `shippingService`, `shippingCost`, `estimatedDays` tetap sama)

## Caching

**v1: no cache**

Tidak perlu cache untuk:
- Biteship shipping rates
- `ShippingSettings` singleton

Alasan:
- scope tetap kecil
- tidak ada risiko stale config
- lebih mudah debug

Kalau nanti traffic naik, cache `ShippingSettings` in-memory 30-60 detik bisa ditambah tanpa ubah contract API.

## Manual Verification

Repo ini tidak punya test suite otomatis, jadi verifikasi fokus ke manual smoke test:

1. **Default settings**
   - semua courier aktif
   - checkout menampilkan metode pengiriman yang sama seperti sebelum feature ini

2. **Disable one courier**
   - admin matikan `jnt`
   - checkout tidak lagi menampilkan rate dengan `courier_code = 'jnt'`

3. **Disable all couriers**
   - admin kosongkan `enabledCouriers`
   - checkout menampilkan `emptyStateMessage` dari admin

4. **Provider empty**
   - gunakan tujuan yang memang tidak ada rate
   - checkout menampilkan message `Tidak ada kurir tersedia untuk tujuan ini.`

5. **Provider error**
   - simulasi Biteship error / key invalid
   - checkout menampilkan retry state, bukan silent empty list

6. **Order creation**
   - pilih salah satu metode pengiriman
   - lanjut bayar
   - order tetap tersimpan dengan `shippingCourier`, `shippingService`, `shippingServiceName`, `shippingCost`, `estimatedDays`

## Files Affected

| File | Change |
|---|---|
| `config/shippingCouriers.js` | New — supported courier catalog |
| `models/ShippingSettings.js` | New — singleton shipping config |
| `routes/shippingSettingsRoutes.js` | New — admin GET/PUT settings |
| `routes/shippingRoutes.js` | Return structured shipping response + filter logic |
| `services/biteshipService.js` | Use shared courier catalog |
| `server.js` | Register `/api/shipping-settings` route |
| `client/src/types/ecommerce.ts` | Add `ShippingSettings`, `ShippingRatesResponse`, courier option type |
| `client/src/services/api.ts` | Add shipping settings methods, update shipping rates method |
| `client/src/hooks/useApi.ts` | Add `useShippingSettings` |
| `client/src/components/ShippingSelector.tsx` | Handle structured response + clearer empty/error states |
| `client/src/pages/admin/ShippingSettings.tsx` | New — admin courier toggle page |
| `client/src/components/AdminLayout.tsx` | Add `Pengiriman` menu item |
| `client/src/App.tsx` | Register `/admin/shipping` route |

## Out of Scope

- Service-level on/off (`jne:yes`, `sicepat:best`, dll)
- Sync penuh courier/service catalog dari Biteship ke database
- Manual input ongkir oleh admin
- Per-daerah courier rules
- Priority sorting / custom order per courier
- Fallback non-Biteship shipping method

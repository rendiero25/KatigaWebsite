# Laporan Keuangan Customer + Kategorisasi Sidebar UserLayout

**Date:** 2026-06-18
**Scope:** Halaman laporan keuangan baru di area akun customer (`/profil/laporan-keuangan`) + kategorisasi sidebar `UserLayout.tsx`

## Problem

`Profil.tsx` (Beranda) cuma menampilkan 1 card "Total Belanja" — tidak ada detail breakdown status pesanan atau total hemat dari voucher. Sidebar `UserLayout.tsx` masih flat (5 item tanpa grouping), beda dengan `AdminLayout.tsx` yang sudah dikelompokkan.

## Solution

Halaman baru yang menampilkan ringkasan finansial customer, dihitung client-side dari data yang sudah ada (`GET /api/orders/my`, sudah unpaginated, scoped ke 1 customer — tidak perlu endpoint backend baru). Sidebar `UserLayout.tsx` dikelompokkan mengikuti pola `AdminLayout.tsx`.

### Metrics (dihitung dari `Order[]` hasil `api.getMyOrders()`)

| Metric | Formula | Catatan |
|---|---|---|
| Total Belanja | sum `order.total` dengan `orderStatus === 'delivered'` | Logic identik dengan card yang sudah ada di `Profil.tsx` — cuma direlokasi, bukan dihitung ulang dengan cara berbeda |
| Total Hemat dari Voucher | sum `order.voucherDiscount` dengan `orderStatus === 'delivered'` | Filter sama dengan Total Belanja, supaya konsisten |
| Breakdown Status Pesanan | count grouped by `orderStatus`, SEMUA order (tidak difilter delivered) | Tujuannya justru menunjukkan semua status termasuk pending/dibatalkan |

**Di luar scope:** tren belanja per waktu (chart) — user pilih untuk skip ini saat brainstorming. Tidak ada endpoint backend baru. Tidak ada perubahan ke `models/Order.js` atau `models/Customer.js`.

## Frontend

### `client/src/hooks/useApi.ts`

Tambah hook baru (saat ini `Profil.tsx` panggil `api.getMyOrders()` langsung, tidak lewat hook — kode baru harus ikut convention CLAUDE.md, tanpa mengubah `Profil.tsx` yang sudah ada):

```ts
export function useMyOrders() {
  const [data, setData] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    api.getMyOrders()
      .then((res) => setData(Array.isArray(res) ? res : []))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
```

Perlu tambah `Order` ke import type dari `../types/ecommerce` di file ini.

### `client/src/pages/LaporanKeuangan.tsx` (baru)

- Route: `/profil/laporan-keuangan`, dibungkus `<UserLayout title="Laporan Keuangan">`
- Visual style ikut `Profil.tsx` (card berwarna `border-0 shadow-sm bg-white rounded-xl`, **bukan** style shadcn-token ala admin) karena ini halaman customer
- 2 stat card: Total Belanja (violet, icon `CreditCard` — sama seperti di Beranda), Total Hemat dari Voucher (emerald, icon `Tag`)
- Breakdown status: list/badge per `orderStatus`, reuse styling `STATUS_LABEL` yang sudah ada di `Profil.tsx` (duplikat lokal di file baru ini, konsisten dengan cara admin Laporan men-duplikat `PAYMENT_STATUS_LABEL`/`ORDER_STATUS_LABEL` daripada saling import)
- Loading state: `Skeleton` (shadcn), pola sama dengan `Profil.tsx`
- Tidak menampilkan tabel order detail — itu sudah ada di halaman "Pesanan Saya", Laporan Keuangan murni ringkasan agregat

### `client/src/pages/Profil.tsx`

Card "Total Belanja" pada grid stats jadi clickable → `/profil/laporan-keuangan`, mirror pola card "Total Pendapatan" yang sudah dibuat di admin `Dashboard.tsx` (wrap card dengan `Link` jika ada `path`, card lain tetap tidak clickable).

### `client/src/components/UserLayout.tsx`

Ubah `NAV_MAIN` (flat array) jadi `NAV_GROUPS` (grouped), render mengikuti pola `AdminLayout.tsx` persis:

```tsx
{NAV_GROUPS.map((group, i) => (
  <SidebarGroup key={group.label ?? `g${i}`}>
    {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
    <SidebarGroupContent>
      <SidebarMenu>
        {group.items.map(item => /* render seperti sebelumnya */)}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
))}
```

Grouping:
- *(tanpa label)* Beranda
- **Transaksi**: Pesanan Saya, Laporan Keuangan (baru, icon `Wallet`)
- **Akun**: Alamat, Wishlist, Pengaturan

Perlu tambah import `SidebarGroupLabel` (belum diimport di file ini) dan icon `Wallet` dari `lucide-react`. Group "Kembali ke Toko" (mt-auto, sudah `SidebarGroup` terpisah) tidak berubah.

### `client/src/App.tsx`

Tambah import `LaporanKeuangan` + route `<Route path="/profil/laporan-keuangan" element={<LaporanKeuangan />} />`, diletakkan dekat route `/profil/*` lainnya.

## Files Affected

| File | Change |
|---|---|
| `client/src/hooks/useApi.ts` | Add `useMyOrders` hook + `Order` type import |
| `client/src/pages/LaporanKeuangan.tsx` | New — financial report page |
| `client/src/pages/Profil.tsx` | Total Belanja card jadi clickable link |
| `client/src/components/UserLayout.tsx` | Flat nav → grouped nav, tambah item Laporan Keuangan |
| `client/src/App.tsx` | Register route baru |

## Out of Scope

- Tren belanja per waktu / chart (user pilih skip)
- Endpoint backend baru / perubahan model
- Tabel detail per-order di halaman ini (sudah ada di Pesanan Saya)
- Perubahan ke `Pesanan.tsx`, `AlamatSaya.tsx`, `PengaturanAkun.tsx`, `WishlistSaya.tsx` selain link target di sidebar

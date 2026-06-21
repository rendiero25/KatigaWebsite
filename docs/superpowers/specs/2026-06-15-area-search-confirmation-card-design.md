# Area Search Confirmation Card

**Date:** 2026-06-15
**Scope:** UX improvement on Biteship area search in `AddressSelector.tsx` and `AlamatSaya.tsx`

## Problem

After user memilih kecamatan dari dropdown, tidak ada feedback visual yang menampilkan detail area terpilih (kecamatan, kota, provinsi, kode pos). User hanya melihat combined string di input field dan tidak tahu apakah kota/kode pos sudah terisi dengan benar.

## Solution

Ganti area search input dengan confirmation card setelah area dipilih. Card menampilkan 4 field secara eksplisit + tombol "Ganti" untuk reset ke search mode.

## UI States

### Search mode (default / after reset)
- Input: `Cari nama kecamatan atau kelurahan...` (placeholder diperbarui)
- Min 3 karakter → debounce 500ms → dropdown results
- Result item: `{kecamatan}, {kota}, {provinsi} {kode_pos}`

### Confirmed mode (setelah pilih)
- Input hilang
- Confirmation card muncul:
  ```
  ✓ Area terpilih                        [Ganti]
  Kecamatan : {kecamatan}
  Kota      : {kota}
  Provinsi  : {provinsi}
  Kode Pos  : {postalCode}
  ```
- Klik Ganti → kembali ke search mode, semua area fields di-reset

## State Changes

Tambah `kecamatan: ''` ke `emptyForm` di kedua file. Diisi saat `selectArea()` dari `area.administrative_division_level_3_name`. **Tidak disimpan ke DB** — hanya untuk display card.

Toggle: `form.areaId !== ''` → show card | `form.areaId === ''` → show search input.

Reset (Ganti button): clear `areaKeyword`, `areaResults`, dan reset `areaId`, `areaName`, `city`, `province`, `postalCode`, `kecamatan` ke `''`.

## Files Affected

| File | Change |
|------|--------|
| `client/src/components/AddressSelector.tsx` | Add `kecamatan` to emptyForm, update `selectArea`, replace area input section with toggle |
| `client/src/pages/AlamatSaya.tsx` | Same pattern — identical area search section |

## Out of Scope

- Kelurahan (level 4) — Biteship area API tidak support
- Map pin / koordinat
- Edit address (hanya add + delete)
- Perubahan pada model/API backend

# Area Search Confirmation Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setelah user memilih area (kecamatan) dari dropdown, ganti input field dengan confirmation card yang menampilkan kecamatan, kota, provinsi, dan kode pos — plus tombol "Ganti" untuk reset ke search mode.

**Architecture:** Toggle berbasis `form.areaId`: kosong → tampil search input + dropdown; berisi → tampil confirmation card. Tambah field `kecamatan` ke local `emptyForm` (tidak disimpan ke DB, hanya untuk display). Perubahan identik di dua file.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4. No test suite — verifikasi via `tsc --noEmit`, `eslint`, dan manual browser check.

---

## File Map

| File | Perubahan |
|------|-----------|
| `client/src/components/AddressSelector.tsx` | Tambah `kecamatan` ke emptyForm, update `selectArea`, ganti area input section dengan toggle |
| `client/src/pages/AlamatSaya.tsx` | Sama persis — pattern identik |

---

### Task 1: Update `AddressSelector.tsx`

**Files:**
- Modify: `client/src/components/AddressSelector.tsx`

- [ ] **Step 1: Tambah `kecamatan` ke `emptyForm`**

Cari:
```ts
const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  city: '',
  province: '',
  postalCode: '',
  saveToProfile: false,
  isDefault: false,
};
```

Ganti dengan:
```ts
const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  kecamatan: '',
  city: '',
  province: '',
  postalCode: '',
  saveToProfile: false,
  isDefault: false,
};
```

- [ ] **Step 2: Update `selectArea` — isi `kecamatan`**

Cari:
```ts
const selectArea = (area: BiteshipArea) => {
  const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
  setForm((f) => ({
    ...f,
    areaId: area.area_id,
    areaName: label,
    city: area.administrative_division_level_2_name,
    province: area.administrative_division_level_1_name,
    postalCode: area.postal_code,
  }));
  setAreaKeyword(label);
  setAreaResults([]);
};
```

Ganti dengan:
```ts
const selectArea = (area: BiteshipArea) => {
  const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`;
  setForm((f) => ({
    ...f,
    areaId: area.area_id,
    areaName: label,
    kecamatan: area.administrative_division_level_3_name,
    city: area.administrative_division_level_2_name,
    province: area.administrative_division_level_1_name,
    postalCode: area.postal_code,
  }));
  setAreaKeyword(label);
  setAreaResults([]);
};
```

- [ ] **Step 3: Ganti area input section dengan confirmation card toggle**

Cari blok ini (di dalam `{showForm && (...)}`) — mulai dari `<div className="relative">` sampai closing `</div>` yang wrap input + dropdown:
```tsx
          <div className="relative">
            <input
              type="text"
              placeholder="Cari kecamatan / kota (min. 3 huruf)"
              value={areaKeyword}
              onChange={(e) => handleAreaSearch(e.target.value)}
              className={inputCls}
            />
            {areaResults.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                {areaResults.map((area) => (
                  <li
                    key={area.area_id}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                    onClick={() => selectArea(area)}
                  >
                    {area.administrative_division_level_3_name},{' '}
                    {area.administrative_division_level_2_name},{' '}
                    {area.administrative_division_level_1_name}{' '}
                    {area.postal_code}
                  </li>
                ))}
              </ul>
            )}
          </div>
```

Ganti dengan:
```tsx
          <div className="relative">
            {form.areaId ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 text-sm">
                    <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Area terpilih</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kecamatan</span>{form.kecamatan}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kota</span>{form.city}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Provinsi</span>{form.province}</p>
                    <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kode Pos</span>{form.postalCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAreaKeyword('');
                      setAreaResults([]);
                      setForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }));
                    }}
                    className="text-xs text-primary underline shrink-0 hover:opacity-70 transition"
                  >
                    Ganti
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Cari nama kecamatan atau kelurahan..."
                  value={areaKeyword}
                  onChange={(e) => handleAreaSearch(e.target.value)}
                  className={inputCls}
                />
                {areaResults.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                    {areaResults.map((area) => (
                      <li
                        key={area.area_id}
                        className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => selectArea(area)}
                      >
                        {area.administrative_division_level_3_name},{' '}
                        {area.administrative_division_level_2_name},{' '}
                        {area.administrative_division_level_1_name}{' '}
                        {area.postal_code}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
```

- [ ] **Step 4: Type-check + lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AddressSelector.tsx
git commit -m "feat: show confirmation card after area selection in AddressSelector"
```

---

### Task 2: Update `AlamatSaya.tsx`

**Files:**
- Modify: `client/src/pages/AlamatSaya.tsx`

- [ ] **Step 1: Tambah `kecamatan` ke `emptyForm`**

Cari:
```ts
const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false,
}
```

Ganti dengan:
```ts
const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  street: '',
  areaId: '',
  areaName: '',
  kecamatan: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false,
}
```

- [ ] **Step 2: Update `selectArea` — isi `kecamatan`**

Cari:
```ts
  const selectArea = (area: BiteshipArea) => {
    const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`
    setForm((f) => ({
      ...f,
      areaId: area.area_id,
      areaName: label,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: area.postal_code,
    }))
    setAreaKeyword(label)
    setAreaResults([])
  }
```

Ganti dengan:
```ts
  const selectArea = (area: BiteshipArea) => {
    const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`
    setForm((f) => ({
      ...f,
      areaId: area.area_id,
      areaName: label,
      kecamatan: area.administrative_division_level_3_name,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: area.postal_code,
    }))
    setAreaKeyword(label)
    setAreaResults([])
  }
```

- [ ] **Step 3: Ganti area input section dengan confirmation card toggle**

Cari blok ini (di dalam `{showForm && (...)}`) — mulai dari `<div className="relative">` sampai closing `</div>` yang wrap input + dropdown:
```tsx
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari kecamatan / kota (min. 3 huruf) *"
                    value={areaKeyword}
                    onChange={(e) => handleAreaSearch(e.target.value)}
                    className={inputCls}
                  />
                  {areaResults.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {areaResults.map((area) => (
                        <li
                          key={area.area_id}
                          className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                          onClick={() => selectArea(area)}
                        >
                          {area.administrative_division_level_3_name},{' '}
                          {area.administrative_division_level_2_name},{' '}
                          {area.administrative_division_level_1_name}{' '}
                          {area.postal_code}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
```

Ganti dengan:
```tsx
                <div className="relative">
                  {form.areaId ? (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 text-sm">
                          <p className="text-xs font-semibold text-green-700 mb-1.5">✓ Area terpilih</p>
                          <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kecamatan</span>{form.kecamatan}</p>
                          <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kota</span>{form.city}</p>
                          <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Provinsi</span>{form.province}</p>
                          <p className="text-black/80"><span className="text-black/50 w-24 inline-block">Kode Pos</span>{form.postalCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAreaKeyword('')
                            setAreaResults([])
                            setForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }))
                          }}
                          className="text-xs text-primary underline shrink-0 hover:opacity-70 transition"
                        >
                          Ganti
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Cari nama kecamatan atau kelurahan..."
                        value={areaKeyword}
                        onChange={(e) => handleAreaSearch(e.target.value)}
                        className={inputCls}
                      />
                      {areaResults.length > 0 && (
                        <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                          {areaResults.map((area) => (
                            <li
                              key={area.area_id}
                              className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                              onClick={() => selectArea(area)}
                            >
                              {area.administrative_division_level_3_name},{' '}
                              {area.administrative_division_level_2_name},{' '}
                              {area.administrative_division_level_1_name}{' '}
                              {area.postal_code}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
```

- [ ] **Step 4: Type-check + lint**

```bash
cd client && npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/AlamatSaya.tsx
git commit -m "feat: show confirmation card after area selection in AlamatSaya"
```

---

### Task 3: Manual Verification

- [ ] **Step 1: Jalankan dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test di Checkout (`/checkout`)**

1. Login sebagai customer
2. Buka checkout, klik "Tambah Alamat Baru"
3. Ketik min 3 huruf di area search → pastikan dropdown muncul
4. Klik salah satu hasil → pastikan dropdown hilang, confirmation card muncul dengan Kecamatan / Kota / Provinsi / Kode Pos terisi
5. Klik "Ganti" → pastikan card hilang, input search kembali kosong
6. Pilih area lagi → isi form lainnya → klik "Gunakan Alamat Ini" → pastikan bisa lanjut ke pilih ongkir

- [ ] **Step 3: Test di Dashboard Alamat (`/akun/alamat` atau route yang sesuai)**

1. Buka halaman Alamat Saya
2. Klik "Tambah"
3. Ketik di area search → pilih area → confirm card muncul
4. Klik "Ganti" → input reset
5. Pilih ulang → isi field lain → "Simpan Alamat" → alamat muncul di list

import { useState, useRef } from 'react'
import { MapPin } from 'lucide-react'
import type { BiteshipArea, SavedAddress } from '../types/ecommerce'
import { useCustomerAddresses } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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

const inputCls =
  'w-full px-3 py-2 border border-[#E8E8E5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1F1F1F] text-sm bg-white text-[#1F1F1F] placeholder:text-[#9A9A9A]'

interface AreaSearchProps {
  areaId: string
  areaKeyword: string
  areaResults: BiteshipArea[]
  kecamatan: string
  city: string
  province: string
  postalCode: string
  onKeywordChange: (k: string) => void
  onSelectArea: (area: BiteshipArea) => void
  onClear: () => void
}

function AreaSearchField({
  areaId, areaKeyword, areaResults,
  kecamatan, city, province, postalCode,
  onKeywordChange, onSelectArea, onClear,
}: AreaSearchProps) {
  return (
    <div className="relative">
      {areaId ? (
        <div className="rounded-md border border-[#E8E8E5] bg-[#FAFAF9] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 text-sm">
              <p className="text-xs font-medium text-emerald-700 mb-1.5">Area terpilih</p>
              <p className="text-[#4A4A4A]">
                <span className="text-[#9A9A9A] inline-block w-24">Kecamatan</span>
                {kecamatan}
              </p>
              <p className="text-[#4A4A4A]">
                <span className="text-[#9A9A9A] inline-block w-24">Kota</span>
                {city}
              </p>
              <p className="text-[#4A4A4A]">
                <span className="text-[#9A9A9A] inline-block w-24">Provinsi</span>
                {province}
              </p>
              <p className="text-[#4A4A4A]">
                <span className="text-[#9A9A9A] inline-block w-24">Kode Pos</span>
                {postalCode}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClear}
              className="text-xs text-[#1F1F1F] underline shrink-0 hover:opacity-70 h-auto p-0"
            >
              Ganti
            </Button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Cari nama kecamatan atau kelurahan..."
            value={areaKeyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className={inputCls}
          />
          {areaResults.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 bg-white border border-[#E8E8E5] rounded-md mt-1 max-h-52 overflow-y-auto">
              {areaResults.map((area) => (
                <li
                  key={area.area_id}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9] transition-colors cursor-pointer text-sm text-[#4A4A4A]"
                  onClick={() => onSelectArea(area)}
                >
                  <span>
                    {area.administrative_division_level_3_name},{' '}
                    {area.administrative_division_level_2_name},{' '}
                    {area.administrative_division_level_1_name}
                  </span>
                  <span className="text-xs text-[#9A9A9A] ml-2 shrink-0">{area.postal_code}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function AlamatSaya() {
  const { addresses, loading, addAddress, updateAddress, deleteAddress, setDefault } = useCustomerAddresses()

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [areaKeyword, setAreaKeyword] = useState('')
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([])
  const [saving, setSaving] = useState(false)
  const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editAreaKeyword, setEditAreaKeyword] = useState('')
  const [editAreaResults, setEditAreaResults] = useState<BiteshipArea[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const editAreaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // --- Add form area search ---
  const handleAreaSearch = (keyword: string) => {
    setAreaKeyword(keyword)
    setForm((f) => ({ ...f, areaId: '', areaName: '', city: '', province: '', postalCode: '' }))
    if (areaTimer.current) clearTimeout(areaTimer.current)
    if (keyword.length < 3) { setAreaResults([]); return }
    areaTimer.current = setTimeout(async () => {
      try {
        const results = await api.searchAreas(keyword)
        setAreaResults(Array.isArray(results) ? results : [])
      } catch { setAreaResults([]) }
    }, 500)
  }

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

  const clearArea = () => {
    setAreaKeyword('')
    setAreaResults([])
    setForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }))
  }

  // --- Edit form area search ---
  const handleAreaSearchEdit = (keyword: string) => {
    setEditAreaKeyword(keyword)
    setEditForm((f) => ({ ...f, areaId: '', areaName: '', city: '', province: '', postalCode: '' }))
    if (editAreaTimer.current) clearTimeout(editAreaTimer.current)
    if (keyword.length < 3) { setEditAreaResults([]); return }
    editAreaTimer.current = setTimeout(async () => {
      try {
        const results = await api.searchAreas(keyword)
        setEditAreaResults(Array.isArray(results) ? results : [])
      } catch { setEditAreaResults([]) }
    }, 500)
  }

  const selectAreaEdit = (area: BiteshipArea) => {
    const label = `${area.administrative_division_level_3_name}, ${area.administrative_division_level_2_name}, ${area.administrative_division_level_1_name}`
    setEditForm((f) => ({
      ...f,
      areaId: area.area_id,
      areaName: label,
      kecamatan: area.administrative_division_level_3_name,
      city: area.administrative_division_level_2_name,
      province: area.administrative_division_level_1_name,
      postalCode: area.postal_code,
    }))
    setEditAreaKeyword(label)
    setEditAreaResults([])
  }

  const clearAreaEdit = () => {
    setEditAreaKeyword('')
    setEditAreaResults([])
    setEditForm((f) => ({ ...f, areaId: '', areaName: '', kecamatan: '', city: '', province: '', postalCode: '' }))
  }

  // --- Edit handlers ---
  const handleStartEdit = (addr: SavedAddress) => {
    setShowForm(false)
    setMsg(null)
    const kecamatan = addr.areaName.split(',')[0]?.trim() ?? ''
    setEditForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      street: addr.street,
      areaId: addr.areaId,
      areaName: addr.areaName,
      kecamatan,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    })
    setEditAreaKeyword(addr.areaName)
    setEditAreaResults([])
    setEditingId(addr._id)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
    setEditAreaKeyword('')
    setEditAreaResults([])
  }

  const handleUpdateSave = async () => {
    if (!editingId || !editForm.recipientName || !editForm.phone || !editForm.street || !editForm.areaId) return
    setEditSaving(true)
    setMsg(null)
    try {
      await updateAddress(editingId, {
        label: editForm.label,
        recipientName: editForm.recipientName,
        phone: editForm.phone,
        street: editForm.street,
        city: editForm.city,
        province: editForm.province,
        postalCode: editForm.postalCode,
        areaId: editForm.areaId,
        areaName: editForm.areaName,
        isDefault: editForm.isDefault,
      })
      setEditingId(null)
      setMsg({ type: 'success', text: 'Alamat berhasil diperbarui' })
    } catch {
      setMsg({ type: 'error', text: 'Gagal memperbarui alamat' })
    } finally {
      setEditSaving(false)
    }
  }

  // --- Add handlers ---
  const handleSave = async () => {
    if (!form.recipientName || !form.phone || !form.street || !form.areaId) return
    setSaving(true)
    setMsg(null)
    try {
      await addAddress({
        label: form.label,
        recipientName: form.recipientName,
        phone: form.phone,
        street: form.street,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        areaId: form.areaId,
        areaName: form.areaName,
        isDefault: form.isDefault,
      })
      setShowForm(false)
      setForm(emptyForm)
      setAreaKeyword('')
      setMsg({ type: 'success', text: 'Alamat berhasil ditambahkan' })
    } catch {
      setMsg({ type: 'error', text: 'Gagal menyimpan alamat' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus alamat ini?')) return
    try {
      await deleteAddress(id)
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghapus alamat' })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id)
      setMsg({ type: 'success', text: 'Alamat utama diperbarui' })
    } catch {
      setMsg({ type: 'error', text: 'Gagal memperbarui alamat utama' })
    }
  }

  return (
    <UserLayout title="Alamat Saya">
      <div className="w-full space-y-4">

        {/* Top action row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#4A4A4A]">Kelola alamat pengiriman tersimpan</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (editingId) handleCancelEdit()
              setShowForm((v) => !v)
              setMsg(null)
            }}
          >
            {showForm ? 'Tutup Form' : 'Tambah Alamat'}
          </Button>
        </div>

        {/* Feedback message */}
        {msg && (
          <div
            className={`text-sm px-4 py-2.5 rounded-md ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Add address form */}
        {showForm && (
          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4 space-y-3">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Tambah Alamat Baru</p>

            <div>
              <label className="text-sm text-[#9A9A9A] mb-1 block">Label (contoh: Rumah, Kantor)</label>
              <input
                type="text"
                placeholder="Rumah"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm text-[#9A9A9A] mb-1 block">Nama penerima *</label>
              <input
                type="text"
                placeholder="Nama lengkap"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm text-[#9A9A9A] mb-1 block">Nomor HP penerima *</label>
              <input
                type="tel"
                placeholder="08xx-xxxx-xxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm text-[#9A9A9A] mb-1 block">Alamat lengkap (jalan, nomor, RT/RW) *</label>
              <input
                type="text"
                placeholder="Jl. Contoh No. 1, RT 01/RW 02"
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm text-[#9A9A9A] mb-1 block">Kecamatan / Kelurahan *</label>
              <AreaSearchField
                areaId={form.areaId}
                areaKeyword={areaKeyword}
                areaResults={areaResults}
                kecamatan={form.kecamatan}
                city={form.city}
                province={form.province}
                postalCode={form.postalCode}
                onKeywordChange={handleAreaSearch}
                onSelectArea={selectArea}
                onClear={clearArea}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#4A4A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-[#1F1F1F]"
              />
              Jadikan alamat utama
            </label>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword('') }}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
              >
                {saving ? 'Menyimpan...' : 'Simpan Alamat'}
              </Button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Empty state */}
        {!loading && addresses.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="size-10 text-[#D0D0CC] mb-3" />
            <p className="text-sm font-medium text-[#4A4A4A]">Belum ada alamat tersimpan</p>
            <p className="text-xs text-[#9A9A9A] mt-1">Tambahkan alamat pengiriman untuk mempercepat checkout</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(true); setMsg(null) }}
              className="mt-4"
            >
              Tambah Alamat
            </Button>
          </div>
        )}

        {/* Address list */}
        {!loading && addresses.length > 0 && (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr._id} className="rounded-lg border border-[#E8E8E5] bg-white p-4">
                {editingId === addr._id ? (
                  /* Edit form */
                  <div className="space-y-3">
                    <p className="text-[15px] font-semibold text-[#1F1F1F]">Edit Alamat</p>

                    <div>
                      <label className="text-sm text-[#9A9A9A] mb-1 block">Label (contoh: Rumah, Kantor)</label>
                      <input
                        type="text"
                        placeholder="Rumah"
                        value={editForm.label}
                        onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#9A9A9A] mb-1 block">Nama penerima *</label>
                      <input
                        type="text"
                        placeholder="Nama lengkap"
                        value={editForm.recipientName}
                        onChange={(e) => setEditForm((f) => ({ ...f, recipientName: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#9A9A9A] mb-1 block">Nomor HP penerima *</label>
                      <input
                        type="tel"
                        placeholder="08xx-xxxx-xxxx"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#9A9A9A] mb-1 block">Alamat lengkap (jalan, nomor, RT/RW) *</label>
                      <input
                        type="text"
                        placeholder="Jl. Contoh No. 1, RT 01/RW 02"
                        value={editForm.street}
                        onChange={(e) => setEditForm((f) => ({ ...f, street: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#9A9A9A] mb-1 block">Kecamatan / Kelurahan *</label>
                      <AreaSearchField
                        areaId={editForm.areaId}
                        areaKeyword={editAreaKeyword}
                        areaResults={editAreaResults}
                        kecamatan={editForm.kecamatan}
                        city={editForm.city}
                        province={editForm.province}
                        postalCode={editForm.postalCode}
                        onKeywordChange={handleAreaSearchEdit}
                        onSelectArea={selectAreaEdit}
                        onClear={clearAreaEdit}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-[#4A4A4A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isDefault}
                        onChange={(e) => setEditForm((f) => ({ ...f, isDefault: e.target.checked }))}
                        className="accent-[#1F1F1F]"
                      />
                      Jadikan alamat utama
                    </label>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUpdateSave}
                        disabled={editSaving || !editForm.recipientName || !editForm.phone || !editForm.street || !editForm.areaId}
                      >
                        {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Normal display */
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1F1F1F]">
                        {addr.label || 'Alamat'}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[11px] font-medium bg-[#1F1F1F] text-white px-2 py-0.5 rounded">
                          Utama
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#4A4A4A] mt-1">
                      {addr.recipientName} · {addr.phone}
                    </p>
                    <p className="text-sm text-[#9A9A9A] mt-0.5">{addr.street}</p>
                    <p className="text-xs text-[#9A9A9A]">
                      {addr.city}, {addr.province}
                    </p>

                    <div className="pt-3 border-t border-[#F0F0EC] mt-3 flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(addr)}
                      >
                        Edit
                      </Button>
                      {!addr.isDefault && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(addr._id)}
                        >
                          Jadikan Utama
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(addr._id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}

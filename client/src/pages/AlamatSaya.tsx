import { useState, useRef } from 'react'
import { MapPin } from 'lucide-react'
import type { BiteshipArea, SavedAddress } from '../types/ecommerce'
import { useCustomerAddresses } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'

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
  'w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors bg-white text-[#1E1E1E] placeholder:text-[#9A9A9A]'
const labelCls = 'uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]'
const primaryBtnCls =
  'bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors'
const outlineBtnCls =
  'border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#1E1E1E] hover:text-white disabled:opacity-50 transition-colors'
const linkBtnCls = 'text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] underline transition-colors'
const dangerLinkBtnCls = 'text-[13px] text-[#AE4B4B] hover:text-[#8f3a3a] underline transition-colors'

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
        <div className="border border-[#E9E9EA] bg-[#FAFAF9] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 text-[13px]">
              <p className={`${labelCls} mb-1.5`}>Area terpilih</p>
              <p className="text-[#1E1E1E]">
                <span className="text-[#6F6F71] inline-block w-24">Kecamatan</span>
                {kecamatan}
              </p>
              <p className="text-[#1E1E1E]">
                <span className="text-[#6F6F71] inline-block w-24">Kota</span>
                {city}
              </p>
              <p className="text-[#1E1E1E]">
                <span className="text-[#6F6F71] inline-block w-24">Provinsi</span>
                {province}
              </p>
              <p className="text-[#1E1E1E]">
                <span className="text-[#6F6F71] inline-block w-24">Kode Pos</span>
                {postalCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className={`${linkBtnCls} shrink-0`}
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
            onChange={(e) => onKeywordChange(e.target.value)}
            className={inputCls}
          />
          {areaResults.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 bg-white border border-[#E9E9EA] mt-1 max-h-52 overflow-y-auto">
              {areaResults.map((area) => (
                <li
                  key={area.area_id}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#E9E9EA] last:border-0 hover:bg-[#FAFAF9] transition-colors cursor-pointer text-[13px] text-[#1E1E1E]"
                  onClick={() => onSelectArea(area)}
                >
                  <span>
                    {area.administrative_division_level_3_name},{' '}
                    {area.administrative_division_level_2_name},{' '}
                    {area.administrative_division_level_1_name}
                  </span>
                  <span className="text-[11px] text-[#6F6F71] ml-2 shrink-0">{area.postal_code}</span>
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
      <div className="w-full space-y-6">

        {/* Top action row */}
        <div className="flex items-center justify-between border-b border-[#E9E9EA] pb-5">
          <p className="text-[13px] text-[#6F6F71]">Kelola alamat pengiriman tersimpan</p>
          <button
            type="button"
            onClick={() => {
              if (editingId) handleCancelEdit()
              setShowForm((v) => !v)
              setMsg(null)
            }}
            className={outlineBtnCls}
          >
            {showForm ? 'Tutup Form' : 'Tambah Alamat'}
          </button>
        </div>

        {/* Feedback message */}
        {msg && (
          <div
            className={`text-[13px] border px-4 py-3 ${
              msg.type === 'success'
                ? 'border-[#1E1E1E] text-[#1E1E1E]'
                : 'border-[#AE4B4B] text-[#AE4B4B]'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Add address form */}
        {showForm && (
          <div className="border border-[#E9E9EA] p-6 space-y-4">
            <p className="text-[13px] uppercase tracking-[0.12em] text-[#1E1E1E]">Tambah Alamat Baru</p>

            <div className="space-y-1">
              <label htmlFor="add-label" className={labelCls}>Label (contoh: Rumah, Kantor)</label>
              <input
                id="add-label"
                type="text"
                placeholder="Rumah"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-recipient" className={labelCls}>Nama penerima *</label>
              <input
                id="add-recipient"
                type="text"
                placeholder="Nama lengkap"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-phone" className={labelCls}>Nomor HP penerima *</label>
              <input
                id="add-phone"
                type="tel"
                placeholder="08xx-xxxx-xxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-street" className={labelCls}>Alamat lengkap (jalan, nomor, RT/RW) *</label>
              <input
                id="add-street"
                type="text"
                placeholder="Jl. Contoh No. 1, RT 01/RW 02"
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="add-area" className={labelCls}>Kecamatan / Kelurahan *</label>
              <div id="add-area">
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
            </div>

            <label className="flex items-center gap-2 text-[13px] text-[#6F6F71] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-[#1E1E1E]"
              />
              Jadikan alamat utama
            </label>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword('') }}
                className={outlineBtnCls}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
                className={primaryBtnCls}
              >
                {saving ? 'Menyimpan...' : 'Simpan Alamat'}
              </button>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-[#E9E9EA] py-5 space-y-2">
                <div className="h-3 bg-gray-200 animate-pulse w-24" />
                <div className="h-3 bg-gray-200 animate-pulse w-1/3" />
                <div className="h-3 bg-gray-200 animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && addresses.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="size-10 text-[#D0D0CC] mb-3" />
            <p className="text-[13px] text-[#1E1E1E]">Belum ada alamat tersimpan</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Tambahkan alamat pengiriman untuk mempercepat checkout</p>
            <button
              type="button"
              onClick={() => { setShowForm(true); setMsg(null) }}
              className={`${outlineBtnCls} mt-5`}
            >
              Tambah Alamat
            </button>
          </div>
        )}

        {/* Address list */}
        {!loading && addresses.length > 0 && (
          <div>
            {addresses.map((addr) => (
              <div key={addr._id} className="border-b border-[#E9E9EA] py-5">
                {editingId === addr._id ? (
                  /* Edit form */
                  <div className="space-y-4">
                    <p className="text-[13px] uppercase tracking-[0.12em] text-[#1E1E1E]">Edit Alamat</p>

                    <div className="space-y-1">
                      <label htmlFor={`edit-label-${addr._id}`} className={labelCls}>Label (contoh: Rumah, Kantor)</label>
                      <input
                        id={`edit-label-${addr._id}`}
                        type="text"
                        placeholder="Rumah"
                        value={editForm.label}
                        onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-recipient-${addr._id}`} className={labelCls}>Nama penerima *</label>
                      <input
                        id={`edit-recipient-${addr._id}`}
                        type="text"
                        placeholder="Nama lengkap"
                        value={editForm.recipientName}
                        onChange={(e) => setEditForm((f) => ({ ...f, recipientName: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-phone-${addr._id}`} className={labelCls}>Nomor HP penerima *</label>
                      <input
                        id={`edit-phone-${addr._id}`}
                        type="tel"
                        placeholder="08xx-xxxx-xxxx"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-street-${addr._id}`} className={labelCls}>Alamat lengkap (jalan, nomor, RT/RW) *</label>
                      <input
                        id={`edit-street-${addr._id}`}
                        type="text"
                        placeholder="Jl. Contoh No. 1, RT 01/RW 02"
                        value={editForm.street}
                        onChange={(e) => setEditForm((f) => ({ ...f, street: e.target.value }))}
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-area-${addr._id}`} className={labelCls}>Kecamatan / Kelurahan *</label>
                      <div id={`edit-area-${addr._id}`}>
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
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-[#6F6F71] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isDefault}
                        onChange={(e) => setEditForm((f) => ({ ...f, isDefault: e.target.checked }))}
                        className="accent-[#1E1E1E]"
                      />
                      Jadikan alamat utama
                    </label>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={outlineBtnCls}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateSave}
                        disabled={editSaving || !editForm.recipientName || !editForm.phone || !editForm.street || !editForm.areaId}
                        className={primaryBtnCls}
                      >
                        {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal display */
                  <>
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      {addr.label && (
                        <span className={labelCls}>{addr.label}</span>
                      )}
                      {addr.isDefault && (
                        <span className="border border-[#1E1E1E] text-[11px] uppercase px-2 py-1 text-[#1E1E1E]">
                          Alamat Utama
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] uppercase text-[#1E1E1E]">{addr.recipientName}</p>
                    <p className="text-[13px] text-[#6F6F71] leading-relaxed mt-1">{addr.phone}</p>
                    <p className="text-[13px] text-[#6F6F71] leading-relaxed">{addr.street}</p>
                    <p className="text-[13px] text-[#6F6F71] leading-relaxed">
                      {addr.city}, {addr.province} {addr.postalCode}
                    </p>

                    <div className="flex gap-4 flex-wrap mt-4">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(addr)}
                        className={linkBtnCls}
                      >
                        Ubah
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr._id)}
                          className={linkBtnCls}
                        >
                          Jadikan Utama
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(addr._id)}
                        className={dangerLinkBtnCls}
                      >
                        Hapus
                      </button>
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

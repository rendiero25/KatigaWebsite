import { useState, useRef } from 'react'
import { MapPin } from 'lucide-react'
import type { BiteshipArea } from '../types/ecommerce'
import { useCustomerAddresses } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
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

export default function AlamatSaya() {
  const { addresses, loading, addAddress, deleteAddress, setDefault } = useCustomerAddresses()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [areaKeyword, setAreaKeyword] = useState('')
  const [areaResults, setAreaResults] = useState<BiteshipArea[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleAreaSearch = (keyword: string) => {
    setAreaKeyword(keyword)
    setForm((f) => ({ ...f, areaId: '', areaName: '', city: '', province: '', postalCode: '' }))
    if (areaTimer.current) clearTimeout(areaTimer.current)
    if (keyword.length < 3) { setAreaResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchAreas(keyword)
        setAreaResults(Array.isArray(results) ? results : [])
      } catch { setAreaResults([]) }
    }, 500)
    areaTimer.current = timer
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
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setMsg(null) }}
            className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
          >
            {showForm ? 'Tutup Form' : 'Tambah Alamat'}
          </button>
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
              <div className="relative">
                {form.areaId ? (
                  <div className="rounded-md border border-[#E8E8E5] bg-[#FAFAF9] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 text-sm">
                        <p className="text-xs font-medium text-emerald-700 mb-1.5">Area terpilih</p>
                        <p className="text-[#4A4A4A]">
                          <span className="text-[#9A9A9A] inline-block w-24">Kecamatan</span>
                          {form.kecamatan}
                        </p>
                        <p className="text-[#4A4A4A]">
                          <span className="text-[#9A9A9A] inline-block w-24">Kota</span>
                          {form.city}
                        </p>
                        <p className="text-[#4A4A4A]">
                          <span className="text-[#9A9A9A] inline-block w-24">Provinsi</span>
                          {form.province}
                        </p>
                        <p className="text-[#4A4A4A]">
                          <span className="text-[#9A9A9A] inline-block w-24">Kode Pos</span>
                          {form.postalCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAreaKeyword('')
                          setAreaResults([])
                          setForm((f) => ({
                            ...f,
                            areaId: '',
                            areaName: '',
                            kecamatan: '',
                            city: '',
                            province: '',
                            postalCode: '',
                          }))
                        }}
                        className="text-xs text-[#1F1F1F] underline shrink-0 hover:opacity-70 transition"
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
                      <ul className="absolute z-20 left-0 right-0 bg-white border border-[#E8E8E5] rounded-md mt-1 max-h-52 overflow-y-auto">
                        {areaResults.map((area) => (
                          <li
                            key={area.area_id}
                            className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9] transition-colors cursor-pointer text-sm text-[#4A4A4A]"
                            onClick={() => selectArea(area)}
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
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword('') }}
                className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
                className="bg-[#1F1F1F] text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-[#2F2F2F] transition-colors disabled:opacity-40"
              >
                {saving ? 'Menyimpan...' : 'Simpan Alamat'}
              </button>
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
            <button
              type="button"
              onClick={() => { setShowForm(true); setMsg(null) }}
              className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors mt-4"
            >
              Tambah Alamat
            </button>
          </div>
        )}

        {/* Address list */}
        {!loading && addresses.length > 0 && (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className="rounded-lg border border-[#E8E8E5] bg-white p-4"
              >
                {/* Line 1: label + default badge */}
                <div className="flex items-center gap-2">
                  {addr.label && (
                    <span className="text-sm font-semibold text-[#1F1F1F]">{addr.label}</span>
                  )}
                  {!addr.label && (
                    <span className="text-sm font-semibold text-[#1F1F1F]">Alamat</span>
                  )}
                  {addr.isDefault && (
                    <span className="text-[11px] font-medium bg-[#1F1F1F] text-white px-2 py-0.5 rounded">
                      Utama
                    </span>
                  )}
                </div>

                {/* Line 2: recipient · phone */}
                <p className="text-sm text-[#4A4A4A] mt-1">
                  {addr.recipientName} · {addr.phone}
                </p>

                {/* Line 3: street */}
                <p className="text-sm text-[#9A9A9A] mt-0.5">{addr.street}</p>

                {/* Line 4: city, province */}
                <p className="text-xs text-[#9A9A9A]">
                  {addr.city}, {addr.province}
                </p>

                {/* Footer actions */}
                <div className="pt-3 border-t border-[#F0F0EC] mt-3 flex gap-2 flex-wrap">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr._id)}
                      className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
                    >
                      Jadikan Utama
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(addr._id)}
                    className="border border-red-200 text-red-600 text-sm rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}

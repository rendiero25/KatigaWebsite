import { useState, useRef } from 'react'
import { MapPin, Plus, Trash2, Star, CheckCircle } from 'lucide-react'
import type { BiteshipArea } from '../types/ecommerce'
import { useCustomerAddresses } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white'

  return (
    <UserLayout title="Alamat Saya">
      <div className="w-full space-y-4">
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="size-5 text-primary" />
                Alamat Pengiriman
              </CardTitle>
              <CardDescription>Kelola alamat pengiriman yang tersimpan</CardDescription>
            </div>
            {!showForm && (
              <Button
                onClick={() => { setShowForm(true); setMsg(null) }}
                size="sm"
                className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white hover:opacity-90"
              >
                <Plus className="size-4 mr-1" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {msg && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${msg.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {msg.type === 'success' && <CheckCircle className="size-4 shrink-0" />}
                {msg.text}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : addresses.length === 0 && !showForm ? (
              <p className="text-sm text-black/60 py-4 text-center">Belum ada alamat tersimpan. Tambahkan alamat pengiriman Anda.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className={`border rounded-xl p-4 ${addr.isDefault ? 'border-primary bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {addr.label && (
                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {addr.label}
                            </span>
                          )}
                          {addr.isDefault && (
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="size-3" /> Utama
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-black">{addr.recipientName}</p>
                        <p className="text-xs text-black/60">{addr.phone}</p>
                        <p className="text-xs text-black/60 mt-0.5">{addr.street}, {addr.areaName}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {!addr.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleSetDefault(addr._id)}
                          >
                            Jadikan Utama
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                          onClick={() => handleDelete(addr._id)}
                        >
                          <Trash2 className="size-3 mr-1" /> Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showForm && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-bold text-black">Tambah Alamat Baru</p>
                <input
                  type="text"
                  placeholder="Label (contoh: Rumah, Kantor)"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Nama penerima *"
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                  className={inputCls}
                />
                <input
                  type="tel"
                  placeholder="Nomor HP penerima *"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Alamat lengkap (jalan, nomor, RT/RW) *"
                  value={form.street}
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                  className={inputCls}
                />
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
                <label className="flex items-center gap-2 text-sm text-black/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="accent-primary"
                  />
                  Jadikan alamat utama
                </label>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowForm(false); setForm(emptyForm); setAreaKeyword('') }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !form.recipientName || !form.phone || !form.street || !form.areaId}
                    className="flex-1 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Alamat'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  )
}

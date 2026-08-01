import { useEffect, useRef, useState } from 'react'
import { User, Phone, Mail, CheckCircle, Lock, Eye, EyeOff, Camera, Loader2 } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import type { CustomerProfile } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'

const inputClass =
  'w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors'
const labelClass = 'uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]'
const saveButtonClass =
  'bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors'
const tabButtonClass = (active: boolean) =>
  `uppercase tracking-[0.12em] text-[13px] px-4 py-3 border-b-2 transition-colors ${
    active ? 'border-[#1E1E1E] text-[#1E1E1E]' : 'border-transparent text-[#6F6F71] hover:text-[#1E1E1E]'
  }`

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function PengaturanAkun() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'profil' | 'password'>('profil')

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    ;(api.getCustomerProfile() as Promise<CustomerProfile & { message?: string }>)
      .then((data) => {
        if (data._id) {
          setCustomer(data)
          setProfileForm({ name: data.name || '', phone: data.phone || '' })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const result = await api.uploadCustomerAvatar(file)
      if (result.avatar) {
        setCustomer((prev) => prev ? { ...prev, avatar: result.avatar } : prev)
        localStorage.setItem('customerAvatar', result.avatar)
        window.dispatchEvent(new Event('storage'))
      }
    } catch {
      // silent — user can retry by clicking again
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const updated = await (api.updateCustomerProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
      }) as Promise<CustomerProfile & { message?: string }>)
      if (updated._id) {
        setCustomer(updated)
        localStorage.setItem('customerName', updated.name)
        window.dispatchEvent(new Event('storage'))
        setProfileMsg({ type: 'success', text: 'Profil berhasil disimpan' })
      } else {
        setProfileMsg({ type: 'error', text: updated.message || 'Gagal menyimpan profil' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Terjadi kesalahan, coba lagi' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Konfirmasi password tidak cocok' })
      return
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Password baru minimal 6 karakter' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      const result = await api.changeCustomerPassword({
        currentPassword: pwForm.current || undefined,
        newPassword: pwForm.newPw,
      })
      if (result.message === 'Password berhasil diubah') {
        setPwMsg({ type: 'success', text: result.message })
        setPwForm({ current: '', newPw: '', confirm: '' })
      } else {
        setPwMsg({ type: 'error', text: result.message || 'Gagal mengubah password' })
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Terjadi kesalahan, coba lagi' })
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return (
      <UserLayout title="Pengaturan">
        <div className="w-full space-y-4">
          <div className="h-24 w-full bg-gray-200 animate-pulse" />
          <div className="h-96 w-full bg-gray-200 animate-pulse" />
        </div>
      </UserLayout>
    )
  }

  const isGoogleOnly = !!customer?.googleId

  return (
    <UserLayout title="Pengaturan">
      <div className="w-full space-y-4">
        {/* Profile summary strip */}
        <div className="flex flex-col gap-4 border border-[#E9E9EA] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group/av relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-[#4F68AF] disabled:cursor-not-allowed"
              aria-label="Ganti foto profil"
            >
              <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-[#F0EFE9] text-base text-[#1E1E1E]">
                {customer?.avatar ? (
                  <img
                    src={api.getImageUrl(customer.avatar)}
                    alt={customer?.name ?? ''}
                    className="size-14 rounded-full object-cover"
                  />
                ) : (
                  customer?.name ? initials(customer.name) : 'U'
                )}
              </span>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover/av:opacity-100">
                {avatarUploading
                  ? <Loader2 className="size-5 animate-spin text-white" />
                  : <Camera className="size-5 text-white" />}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
              aria-label="Unggah foto profil"
            />
            <div className="min-w-0">
              <p className="truncate text-base text-[#1E1E1E]">
                {customer?.name || 'Pelanggan'}
              </p>
              <p className="truncate text-sm text-[#6F6F71]">{customer?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="uppercase tracking-[0.1em] text-[11px] text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1.5">
              Akun aktif
            </span>
            {isGoogleOnly && (
              <span className="flex items-center gap-1.5 uppercase tracking-[0.1em] text-[11px] text-[#1E1E1E] border border-[#E9E9EA] px-3 py-1.5">
                <FcGoogle className="size-3.5" />
                Google
              </span>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div className="border border-[#E9E9EA] bg-white">
          <div className="flex border-b border-[#E9E9EA]">
            <button
              type="button"
              onClick={() => setActiveTab('profil')}
              className={tabButtonClass(activeTab === 'profil')}
            >
              Informasi Akun
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={tabButtonClass(activeTab === 'password')}
            >
              Ubah Password
            </button>
          </div>

          {activeTab === 'profil' && (
            <div className="p-5 sm:p-6">
              <div className="mb-6 max-w-xl">
                <h2 className="text-base text-[#1E1E1E]">Informasi Akun</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6F6F71]">
                  Nama dan nomor HP dipakai untuk pesanan serta pengiriman.
                </p>
              </div>

              <form onSubmit={handleProfileSave} className="w-full space-y-6">
                <div className="space-y-1">
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                    <input
                      id="email"
                      value={customer?.email || ''}
                      disabled
                      className={`${inputClass} bg-[#F9F7F2] pl-10 text-[#6F6F71]`}
                    />
                  </div>
                  {isGoogleOnly && (
                    <p className="text-xs text-[#9A9A96]">
                      Terhubung ke akun Google. Email tidak dapat diubah di sini.
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="name" className={labelClass}>
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                      <input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nama lengkap kamu"
                        required
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="phone" className={labelClass}>
                      Nomor HP
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                      <input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 border px-4 py-3 text-sm ${
                      profileMsg.type === 'success'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-red-100 bg-red-50 text-red-600'
                    }`}
                    role="status"
                  >
                    {profileMsg.type === 'success' && <CheckCircle className="size-4 shrink-0" />}
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-[#E9E9EA] pt-5 sm:flex-row sm:justify-end">
                  <button type="submit" disabled={profileSaving} className={`${saveButtonClass} w-full sm:w-auto`}>
                    {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="p-5 sm:p-6">
              <div className="mb-6 max-w-xl">
                <h2 className="text-base text-[#1E1E1E]">Ubah Password</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#6F6F71]">
                  {isGoogleOnly
                    ? 'Atur password untuk mengaktifkan login dengan email dan password.'
                    : 'Masukkan password saat ini lalu buat password baru.'}
                </p>
              </div>

              <form onSubmit={handlePasswordSave} className="w-full space-y-5">
                {!isGoogleOnly && (
                  <div className="space-y-1">
                    <label htmlFor="current-password" className={labelClass}>
                      Password Saat Ini
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                      <input
                        id="current-password"
                        type={showCurrent ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        placeholder="Password lama kamu"
                        required
                        className={`${inputClass} pl-10 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9A9A96] hover:text-[#1E1E1E]"
                        tabIndex={-1}
                        aria-label={showCurrent ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="new-password" className={labelClass}>
                    Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.newPw}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                      placeholder="Min. 6 karakter"
                      required
                      className={`${inputClass} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9A9A96] hover:text-[#1E1E1E]"
                      tabIndex={-1}
                      aria-label={showNew ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirm-password" className={labelClass}>
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9A9A96]" />
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="Ulangi password baru"
                      required
                      className={`${inputClass} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9A9A96] hover:text-[#1E1E1E]"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {pwMsg && (
                  <div
                    className={`flex items-center gap-2 border px-4 py-3 text-sm ${
                      pwMsg.type === 'success'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-red-100 bg-red-50 text-red-600'
                    }`}
                    role="status"
                  >
                    {pwMsg.type === 'success' && <CheckCircle className="size-4 shrink-0" />}
                    {pwMsg.text}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-[#E9E9EA] pt-5 sm:flex-row sm:justify-end">
                  <button type="submit" disabled={pwSaving} className={`${saveButtonClass} w-full sm:w-auto`}>
                    {pwSaving ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  )
}

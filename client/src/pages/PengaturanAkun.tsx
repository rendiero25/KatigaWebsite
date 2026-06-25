import { useEffect, useRef, useState } from 'react'
import { User, Phone, Mail, Save, CheckCircle, Lock, Eye, EyeOff, Camera, Loader2 } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import type { CustomerProfile } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-[28rem] w-full rounded-lg" />
        </div>
      </UserLayout>
    )
  }

  const isGoogleOnly = !!customer?.googleId

  return (
    <UserLayout title="Pengaturan">
      <div className="w-full space-y-4">
        {/* Profile summary strip */}
        <div className="flex flex-col gap-4 rounded-lg border border-[#E8E8E5] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group/av relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed"
              aria-label="Ganti foto profil"
            >
              <Avatar className="size-14 ring-2 ring-primary/15 [&::after]:hidden">
                {customer?.avatar && <AvatarImage src={customer.avatar} alt={customer?.name ?? ''} />}
                <AvatarFallback className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-base font-semibold text-white">
                  {customer?.name ? initials(customer.name) : 'U'}
                </AvatarFallback>
              </Avatar>
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
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-black">
                {customer?.name || 'Pelanggan'}
              </p>
              <p className="truncate text-sm text-black/50">{customer?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge className="border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              Akun aktif
            </Badge>
            {isGoogleOnly && (
              <Badge variant="outline" className="gap-1 border-black/10 text-black/70">
                <FcGoogle className="size-3.5" />
                Google
              </Badge>
            )}
          </div>
        </div>

        {/* Settings panel */}
        <div className="overflow-hidden rounded-lg border border-[#E8E8E5] bg-white">
          <Tabs defaultValue="profil" className="flex-col gap-0">
            {/* TabsList above TabsContent */}
            <div className="px-4 py-3 border-b border-[#F0F0EC]">
              <TabsList className="h-9 w-full sm:w-auto">
                <TabsTrigger value="profil" className="gap-2 px-4 text-sm">
                  <User className="size-4" />
                  Informasi Akun
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-2 px-4 text-sm">
                  <Lock className="size-4" />
                  Ubah Password
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="profil" className="mt-0 p-5 sm:p-6">
              <div className="mb-6 max-w-xl">
                <h2 className="text-base font-semibold text-black">Informasi Akun</h2>
                <p className="mt-1 text-sm leading-relaxed text-black/50">
                  Nama dan nomor HP dipakai untuk pesanan serta pengiriman.
                </p>
              </div>

              <form onSubmit={handleProfileSave} className="w-full space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm text-black/70">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                    <Input
                      value={customer?.email || ''}
                      disabled
                      className="border-black/10 bg-[#F9F7F2] pl-10 text-black/60"
                    />
                  </div>
                  {isGoogleOnly && (
                    <p className="text-xs text-black/40">
                      Terhubung ke akun Google. Email tidak dapat diubah di sini.
                    </p>
                  )}
                </div>

                <Separator className="bg-black/5" />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm text-black/70">
                      Nama Lengkap
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nama lengkap kamu"
                        required
                        className="border-black/10 pl-10 focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm text-black/70">
                      Nomor HP
                    </Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className="border-black/10 pl-10 focus-visible:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                      profileMsg.type === 'success'
                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border border-red-100 bg-red-50 text-red-600'
                    }`}
                    role="status"
                  >
                    {profileMsg.type === 'success' && <CheckCircle className="size-4 shrink-0" />}
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full bg-[#1F1F1F] text-white text-sm font-medium rounded-md px-6 py-2 hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 sm:w-auto"
                  >
                    <Save className="mr-2 size-4" />
                    {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="password" className="mt-0 p-5 sm:p-6">

              <div className="mb-6 max-w-xl">
                <h2 className="text-base font-semibold text-black">Ubah Password</h2>
                <p className="mt-1 text-sm leading-relaxed text-black/50">
                  {isGoogleOnly
                    ? 'Atur password untuk mengaktifkan login dengan email dan password.'
                    : 'Masukkan password saat ini lalu buat password baru.'}
                </p>
              </div>

              <form onSubmit={handlePasswordSave} className="w-full space-y-5">
                {!isGoogleOnly && (
                  <div className="space-y-2">
                    <Label htmlFor="current-password" className="text-sm text-black/70">
                      Password Saat Ini
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                      <Input
                        id="current-password"
                        type={showCurrent ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        placeholder="Password lama kamu"
                        required
                        className="border-black/10 pl-10 pr-10 focus-visible:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-black/30 hover:text-black/60"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Separator className="bg-black/5" />

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm text-black/70">
                    Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                    <Input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.newPw}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                      placeholder="Min. 6 karakter"
                      required
                      className="border-black/10 pl-10 pr-10 focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-black/30 hover:text-black/60"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm text-black/70">
                    Konfirmasi Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/30" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="Ulangi password baru"
                      required
                      className="border-black/10 pl-10 pr-10 focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-black/30 hover:text-black/60"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {pwMsg && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                      pwMsg.type === 'success'
                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border border-red-100 bg-red-50 text-red-600'
                    }`}
                    role="status"
                  >
                    {pwMsg.type === 'success' && <CheckCircle className="size-4 shrink-0" />}
                    {pwMsg.text}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    disabled={pwSaving}
                    className="w-full bg-[#1F1F1F] text-white text-sm font-medium rounded-md px-6 py-2 hover:bg-[#2F2F2F] transition-colors disabled:opacity-50 sm:w-auto"
                  >
                    <Lock className="mr-2 size-4" />
                    {pwSaving ? 'Menyimpan...' : 'Simpan Password'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UserLayout>
  )
}

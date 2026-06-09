import { useEffect, useState } from 'react'
import { User, Phone, Mail, Save, CheckCircle } from 'lucide-react'
import type { CustomerProfile } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export default function PengaturanAkun() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  return (
    <UserLayout title="Pengaturan">
      <div className="w-full space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <Tabs defaultValue="profil">
            <TabsList className="mb-6">
              <TabsTrigger value="profil">Informasi Akun</TabsTrigger>
              <TabsTrigger value="keamanan">Keamanan</TabsTrigger>
            </TabsList>

            {/* Profile tab */}
            <TabsContent value="profil">
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-900">Informasi Akun</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Perbarui nama dan nomor HP kamu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSave} className="space-y-5">
                    {/* Email — read only */}
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        Email
                      </Label>
                      <Input
                        value={customer?.email || ''}
                        disabled
                        className="bg-gray-50 text-gray-500 border-gray-200"
                      />
                      <p className="text-xs text-gray-400">Email tidak dapat diubah</p>
                    </div>

                    <Separator className="bg-gray-100" />

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm text-gray-700 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        Nama Lengkap
                      </Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nama lengkap kamu"
                        required
                        className="border-gray-200 focus:border-primary"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm text-gray-700 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        Nomor HP
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="08xxxxxxxxxx"
                        className="border-gray-200 focus:border-primary"
                      />
                    </div>

                    {profileMsg && (
                      <div
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                          profileMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {profileMsg.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                        {profileMsg.text}
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={profileSaving}
                        className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white rounded-full px-8 hover:shadow-md hover:-translate-y-0.5 transition-all border-0"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security tab */}
            <TabsContent value="keamanan">
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-900">Keamanan Akun</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Pengaturan keamanan akun kamu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
                    <p className="font-medium mb-1">Akun Google Terkoneksi</p>
                    <p className="text-amber-600/80">
                      Keamanan akun dikelola melalui Google. Kamu bisa mengubah password melalui pengaturan akun Google kamu.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </UserLayout>
  )
}

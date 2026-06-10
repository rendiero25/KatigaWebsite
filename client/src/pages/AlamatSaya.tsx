import { useEffect, useState } from 'react'
import { MapPin, Save, CheckCircle } from 'lucide-react'
import type { CustomerProfile } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

interface AddressForm {
  recipientName: string
  phone: string
  street: string
  city: string
  province: string
  postalCode: string
}

export default function AlamatSaya() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<AddressForm>({
    recipientName: '',
    phone: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    ;(api.getCustomerProfile() as Promise<CustomerProfile & { message?: string }>)
      .then((data) => {
        if (data._id) {
          setCustomer(data)
          const addr = data.defaultAddress
          if (addr) {
            setForm({
              recipientName: addr.recipientName || '',
              phone: addr.phone || '',
              street: addr.street || '',
              city: addr.city || '',
              province: addr.province || '',
              postalCode: addr.postalCode || '',
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const fullAddress = {
        ...customer?.defaultAddress,
        recipientName: form.recipientName.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
      }
      const updated = await (api.updateCustomerProfile({ defaultAddress: fullAddress }) as Promise<CustomerProfile & { message?: string }>)
      if (updated._id) {
        setCustomer(updated)
        setMsg({ type: 'success', text: 'Alamat berhasil disimpan' })
      } else {
        setMsg({ type: 'error', text: updated.message || 'Gagal menyimpan alamat' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Terjadi kesalahan, coba lagi' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <UserLayout title="Alamat">
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="size-5 text-primary" />
              Alamat Pengiriman Default
            </CardTitle>
            <CardDescription>
              Alamat ini digunakan sebagai alamat pengiriman default saat checkout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nama Penerima</Label>
                  <Input
                    id="recipientName"
                    name="recipientName"
                    value={form.recipientName}
                    onChange={handleChange}
                    placeholder="Nama lengkap penerima"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon Penerima</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Jalan / Alamat Lengkap</Label>
                  <Textarea
                    id="street"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota / Kabupaten</Label>
                    <Input
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Jakarta Selatan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provinsi</Label>
                    <Input
                      id="province"
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      placeholder="DKI Jakarta"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 max-w-[200px]">
                  <Label htmlFor="postalCode">Kode Pos</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>

                {msg && (
                  <div className={`flex items-center gap-2 text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {msg.type === 'success' && <CheckCircle className="size-4" />}
                    {msg.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white hover:opacity-90"
                >
                  <Save className="size-4 mr-2" />
                  {saving ? 'Menyimpan...' : 'Simpan Alamat'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, CreditCard, CheckCircle, Clock, User, Phone, Mail, ArrowRight } from 'lucide-react'
import type { CustomerProfile, Order } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Dikirim', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function Profil() {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getCustomerProfile() as Promise<CustomerProfile & { message?: string }>,
      api.getMyOrders() as Promise<Order[] | { message: string }>,
    ])
      .then(([profile, orderData]) => {
        if (profile._id) setCustomer(profile)
        setOrders(Array.isArray(orderData) ? orderData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeOrders = orders.filter((o) =>
    ['awaiting_payment', 'processing', 'shipped'].includes(o.orderStatus)
  ).length
  const doneOrders = orders.filter((o) => o.orderStatus === 'delivered').length
  const totalSpent = orders
    .filter((o) => o.orderStatus === 'delivered')
    .reduce((s, o) => s + o.total, 0)

  const stats: { label: string; value: string; icon: typeof Package; color: string; bg: string; path?: string }[] = [
    { label: 'Total Pesanan', value: String(orders.length), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sedang Berjalan', value: String(activeOrders), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Selesai', value: String(doneOrders), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Belanja', value: fmt(totalSpent), icon: CreditCard, color: 'text-violet-600', bg: 'bg-violet-50', path: '/profil/laporan-keuangan' },
  ]

  const recent = orders.slice(0, 3)

  if (loading) {
    return (
      <UserLayout title="Beranda">
        <div className="space-y-6 w-full">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid lg:grid-cols-5 gap-6">
            <Skeleton className="lg:col-span-3 h-64 rounded-2xl" />
            <Skeleton className="lg:col-span-2 h-64 rounded-2xl" />
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Beranda">
      <div className="space-y-6 w-full">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] p-6 text-white">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <p className="text-white/60 text-sm mb-1">Selamat datang kembali,</p>
            <h2 className="text-2xl font-bold">{customer?.name || 'Pelanggan'} 👋</h2>
            <p className="text-white/50 text-sm mt-2">Kelola pesanan dan akun kamu dari sini.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            const content = (
              <Card className={`border-0 shadow-sm bg-white rounded-xl ${stat.path ? 'transition-shadow hover:shadow-md' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 mb-1 truncate">{stat.label}</p>
                      <p className={`text-lg font-bold ${stat.color} truncate`}>{stat.value}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 ml-2`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
            return stat.path ? (
              <Link key={stat.label} to={stat.path}>{content}</Link>
            ) : (
              <div key={stat.label}>{content}</div>
            )
          })}
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Recent orders */}
          <Card className="lg:col-span-3 border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Pesanan Terbaru</CardTitle>
                <Link to="/pesanan" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Lihat semua <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recent.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-3">Belum ada pesanan</p>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link to="/produk" />}
                    className="rounded-full"
                  >
                    Mulai Belanja
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {recent.map((order) => {
                    const s = STATUS_LABEL[order.orderStatus] ?? {
                      label: order.orderStatus,
                      color: 'bg-gray-100 text-gray-700',
                    }
                    return (
                      <Link
                        key={order._id}
                        to={`/pesanan/${order._id}`}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition group"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] text-gray-400 mb-0.5">
                            #{order._id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">{fmt(order.total)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{order.items.length} item</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                            {s.label}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile summary */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Profil Saya</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link to="/profil/pengaturan" />}
                  className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {customer &&
                [
                  { icon: User, label: customer.name },
                  { icon: Mail, label: customer.email },
                  ...(customer.phone ? [{ icon: Phone, label: customer.phone }] : []),
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-700 truncate">{item.label}</p>
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  )
}

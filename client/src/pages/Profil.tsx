import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, User, Phone, Mail } from 'lucide-react'
import type { CustomerProfile, Order } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
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

  const stats: { label: string; value: string; path?: string }[] = [
    { label: 'Total Pesanan', value: String(orders.length) },
    { label: 'Sedang Berjalan', value: String(activeOrders) },
    { label: 'Selesai', value: String(doneOrders) },
    { label: 'Total Belanja', value: fmt(totalSpent), path: '/profil/laporan-keuangan' },
  ]

  const recent = orders.slice(0, 3)

  if (loading) {
    return (
      <UserLayout title="Beranda">
        <div className="space-y-6 w-full">
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <div className="grid lg:grid-cols-5 gap-6">
            <Skeleton className="lg:col-span-3 h-64 rounded-lg" />
            <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Beranda">
      <div className="space-y-6 w-full">
        {/* Welcome */}
        <div className="mb-6">
          <p className="text-xl font-semibold text-[#1F1F1F]">
            Selamat datang, {customer?.name || 'Pelanggan'}
          </p>
          <p className="text-sm text-[#9A9A9A] mt-1">Kelola pesanan dan akun kamu dari sini.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const content = (
              <div className="rounded-lg border border-[#E8E8E5] bg-white p-4">
                <p className="text-xs text-[#9A9A9A] uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-2xl font-semibold text-[#1F1F1F]">{stat.value}</p>
              </div>
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
          <div className="lg:col-span-3 rounded-lg border border-[#E8E8E5] bg-white">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
              <span className="text-[15px] font-semibold text-[#1F1F1F]">Pesanan Terbaru</span>
              <Link to="/pesanan" className="text-xs text-[#9A9A9A] hover:text-[#4A4A4A]">
                Lihat semua
              </Link>
            </div>
            <div className="px-4 pb-4">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="size-10 text-[#D0D0CC] mb-3" />
                  <p className="text-sm font-medium text-[#4A4A4A]">Belum ada pesanan</p>
                  <p className="text-xs text-[#9A9A9A] mt-1">Yuk mulai belanja produk pilihan kamu</p>
                  <Link
                    to="/produk"
                    className="mt-4 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
                  >
                    Mulai Belanja
                  </Link>
                </div>
              ) : (
                <div>
                  {recent.map((order) => {
                    const s = STATUS_LABEL[order.orderStatus] ?? {
                      label: order.orderStatus,
                      color: 'bg-gray-100 text-gray-700',
                    }
                    return (
                      <Link
                        key={order._id}
                        to={`/pesanan/${order._id}`}
                        className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-[#9A9A9A] font-mono">
                            #{order._id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-sm font-semibold text-[#1F1F1F]">{fmt(order.total)}</p>
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ml-3 ${s.color}`}>
                          {s.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Profile summary */}
          <div className="lg:col-span-2 rounded-lg border border-[#E8E8E5] bg-white">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
              <span className="text-[15px] font-semibold text-[#1F1F1F]">Profil Saya</span>
              <Link to="/profil/pengaturan" className="text-xs text-[#9A9A9A] hover:text-[#4A4A4A]">
                Edit
              </Link>
            </div>
            <div className="px-4 pb-4">
              {customer &&
                [
                  { icon: User, label: customer.name },
                  { icon: Mail, label: customer.email },
                  ...(customer.phone ? [{ icon: Phone, label: customer.phone }] : []),
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-[#F0F0EC] last:border-0">
                      <Icon className="size-3.5 text-[#9A9A9A] shrink-0" />
                      <p className="text-sm text-[#4A4A4A] truncate">{item.label}</p>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  )
}

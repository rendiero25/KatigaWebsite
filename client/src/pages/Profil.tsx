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
  shipped: { label: 'Dikirim', color: 'bg-[#4F68AF]/10 text-[#4F68AF]' },
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
          <Skeleton className="h-14 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid lg:grid-cols-5 gap-6">
            <Skeleton className="lg:col-span-3 h-64" />
            <Skeleton className="lg:col-span-2 h-64" />
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
          <p className="text-xl text-[#1E1E1E]">
            Selamat datang, {customer?.name || 'Pelanggan'}
          </p>
          <p className="text-sm text-[#6F6F71] mt-1">Kelola pesanan dan akun kamu dari sini.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const content = (
              <div className="border border-[#E9E9EA] p-6">
                <p className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] mb-2">{stat.label}</p>
                <p className="text-2xl md:text-3xl text-[#1E1E1E]">{stat.value}</p>
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
          <div className="lg:col-span-3 border border-[#E9E9EA] bg-white">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E9E9EA]">
              <span className="text-sm text-[#1E1E1E]">Pesanan Terbaru</span>
              <Link to="/pesanan" className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] hover:text-[#1E1E1E]">
                Lihat semua
              </Link>
            </div>
            <div className="px-6 pb-2">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="size-10 text-[#D0D0CC] mb-3" />
                  <p className="text-sm text-[#4A4A4A]">Belum ada pesanan</p>
                  <p className="text-xs text-[#6F6F71] mt-1">Yuk mulai belanja produk pilihan kamu</p>
                  <Link
                    to="/produk"
                    className="mt-4 border border-[#E9E9EA] text-[#4A4A4A] text-sm px-4 py-2 hover:bg-[#F9F7F2] transition-colors"
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
                        className="flex items-center justify-between py-4 border-b border-[#E9E9EA] last:border-0 hover:bg-[#F9F7F2] transition-colors cursor-pointer -mx-6 px-6"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-[#6F6F71] font-mono">
                            #{order._id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-sm text-[#1E1E1E]">{fmt(order.total)}</p>
                        </div>
                        <span className={`text-[11px] uppercase tracking-[0.08em] px-2 py-1 shrink-0 ml-3 ${s.color}`}>
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
          <div className="lg:col-span-2 border border-[#E9E9EA] bg-white">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E9E9EA]">
              <span className="text-sm text-[#1E1E1E]">Profil Saya</span>
              <Link to="/profil/pengaturan" className="uppercase tracking-[0.12em] text-[11px] text-[#6F6F71] hover:text-[#1E1E1E]">
                Edit
              </Link>
            </div>
            <div className="px-6 pb-2">
              {customer &&
                [
                  { icon: User, label: customer.name },
                  { icon: Mail, label: customer.email },
                  ...(customer.phone ? [{ icon: Phone, label: customer.phone }] : []),
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="flex items-center gap-2 py-3 border-b border-[#E9E9EA] last:border-0">
                      <Icon className="size-3.5 text-[#6F6F71] shrink-0" />
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

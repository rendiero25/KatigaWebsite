import { Link } from 'react-router-dom'
import { useMyOrders } from '../hooks/useApi'
import UserLayout from '../components/UserLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { PackageOpen } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Dikirim', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function LaporanKeuangan() {
  const { data: orders, loading } = useMyOrders()

  const delivered = orders.filter((o) => o.orderStatus === 'delivered')
  const totalBelanja = delivered.reduce((s, o) => s + o.total, 0)
  const totalHemat = delivered.reduce((s, o) => s + (o.voucherDiscount ?? 0), 0)

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.orderStatus] = (acc[o.orderStatus] ?? 0) + 1
    return acc
  }, {})

  const sortedDelivered = delivered.slice().sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime
  })

  if (loading) {
    return (
      <UserLayout title="Laporan Keuangan">
        <div className="space-y-6 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Laporan Keuangan">
      <div className="space-y-6 w-full">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4">
            <p className="text-xs text-[#9A9A9A] uppercase tracking-wide mb-2">Total Belanja</p>
            <p className="text-2xl font-semibold text-[#1F1F1F]">{fmt(totalBelanja)}</p>
            <p className="text-xs text-[#9A9A9A] mt-1">Dari {delivered.length} pesanan selesai</p>
          </div>

          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4">
            <p className="text-xs text-[#9A9A9A] uppercase tracking-wide mb-2">Total Hemat</p>
            <p className="text-2xl font-semibold text-[#1F1F1F]">{fmt(totalHemat)}</p>
            <p className="text-xs text-[#9A9A9A] mt-1">Dari diskon voucher</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Ringkasan Status</p>
          </div>
          {Object.keys(statusCounts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="size-10 text-[#D0D0CC] mb-3" />
              <p className="text-sm font-medium text-[#4A4A4A]">Belum ada pesanan</p>
              <p className="text-xs text-[#9A9A9A] mt-1">Status pesanan akan tampil di sini</p>
            </div>
          ) : (
            Object.entries(statusCounts).map(([status, count]) => {
              const s = STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
              return (
                <div
                  key={status}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-[#F0F0EC] last:border-0"
                >
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${s.color}`}>
                    {s.label}
                  </span>
                  <span className="text-sm text-[#4A4A4A]">{count} pesanan</span>
                </div>
              )
            })
          )}
        </div>

        {/* Transaction List */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Riwayat Transaksi</p>
          </div>
          {sortedDelivered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="size-10 text-[#D0D0CC] mb-3" />
              <p className="text-sm font-medium text-[#4A4A4A]">Belum ada transaksi selesai</p>
              <p className="text-xs text-[#9A9A9A] mt-1">Pesanan yang sudah diterima akan muncul di sini</p>
              <Link
                to="/pesanan"
                className="mt-4 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
              >
                Lihat Pesanan
              </Link>
            </div>
          ) : (
            sortedDelivered.map((order) => (
              <Link
                key={order._id}
                to={`/pesanan/${order._id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9] transition-colors cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-[#9A9A9A]">#{order._id}</span>
                  <span className="text-xs text-[#9A9A9A]">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#1F1F1F]">{fmt(order.total)}</span>
              </Link>
            ))
          )}
        </div>

      </div>
    </UserLayout>
  )
}

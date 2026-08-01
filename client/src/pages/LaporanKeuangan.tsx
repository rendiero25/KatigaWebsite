import { Link } from 'react-router-dom'
import { useMyOrders } from '../hooks/useApi'
import UserLayout from '../components/UserLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { PackageOpen } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Menunggu Bayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
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
        <div className="w-full space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Laporan Keuangan">
      <div className="w-full space-y-10">

        {/* Stat summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="border-b border-[#E9E9EA] pb-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-2">Total Belanja</p>
            <p className="text-2xl text-[#1E1E1E]">{fmt(totalBelanja)}</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Dari {delivered.length} pesanan selesai</p>
          </div>

          <div className="border-b border-[#E9E9EA] pb-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-2">Total Hemat</p>
            <p className="text-2xl text-[#1E1E1E]">{fmt(totalHemat)}</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Dari diskon voucher</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-3">Ringkasan Status</p>
          {Object.keys(statusCounts).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="size-8 text-[#D0D0CC] mb-3" />
              <p className="text-[13px] uppercase text-[#1E1E1E]">Belum ada pesanan</p>
              <p className="text-[13px] text-[#6F6F71] mt-1">Status pesanan akan tampil di sini</p>
            </div>
          ) : (
            <div>
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between py-3 border-b border-[#E9E9EA]"
                >
                  <span className="text-[13px] text-[#1E1E1E]">
                    {STATUS_LABEL[status] ?? status}
                  </span>
                  <span className="text-[13px] text-[#6F6F71]">{count} pesanan</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction List */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-3">Riwayat Transaksi</p>
          {sortedDelivered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="size-8 text-[#D0D0CC] mb-3" />
              <p className="text-[13px] uppercase text-[#1E1E1E]">Belum ada transaksi selesai</p>
              <p className="text-[13px] text-[#6F6F71] mt-1">Pesanan yang sudah diterima akan muncul di sini</p>
              <Link
                to="/pesanan"
                className="mt-6 border border-[#E9E9EA] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#F9F7F2] transition-colors"
              >
                Lihat Pesanan
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pb-2 border-b border-[#E9E9EA]">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71]">Pesanan</span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71]">Total</span>
              </div>
              {sortedDelivered.map((order) => (
                <Link
                  key={order._id}
                  to={`/pesanan/${order._id}`}
                  className="flex items-center justify-between py-3 border-b border-[#E9E9EA] hover:bg-[#F9F7F2] transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[13px] text-[#1E1E1E]">#{order._id}</span>
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71]">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                  <span className="text-[13px] text-[#1E1E1E]">{fmt(order.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </UserLayout>
  )
}

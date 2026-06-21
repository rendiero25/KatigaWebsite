import { useMyOrders } from '../hooks/useApi'
import UserLayout from '../components/UserLayout'
import { CreditCard, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function LaporanKeuangan() {
  const { data: orders, loading } = useMyOrders()

  const delivered = orders.filter((o) => o.orderStatus === 'delivered')
  const totalBelanja = delivered.reduce((s, o) => s + o.total, 0)
  const totalHemat = delivered.reduce((s, o) => s + (o.voucherDiscount ?? 0), 0)

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.orderStatus] = (acc[o.orderStatus] ?? 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <UserLayout title="Laporan Keuangan">
        <div className="space-y-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout title="Laporan Keuangan">
      <div className="space-y-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm bg-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Total Belanja</p>
                  <p className="text-lg font-bold text-violet-600 truncate">{fmt(totalBelanja)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Dari {delivered.length} pesanan selesai</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 ml-2">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 mb-1">Total Hemat dari Voucher</p>
                  <p className="text-lg font-bold text-emerald-600 truncate">{fmt(totalHemat)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Dari pesanan selesai</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 ml-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">Breakdown Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Belum ada pesanan</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const s = STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <span key={status} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
                      {s.label}: {count}
                    </span>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  )
}

import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useReportsSummary } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAYMENT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Lunas',    color: 'bg-green-100 text-green-700' },
  failed:   { label: 'Gagal',    color: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expired',  color: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Refund',   color: 'bg-purple-100 text-purple-700' },
}

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-yellow-100 text-yellow-700' },
  processing:       { label: 'Diproses',       color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',        color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',        color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Dibatalkan',     color: 'bg-red-100 text-red-700' },
}

const chartConfig = {
  revenue: { label: 'Pendapatan', color: 'var(--color-primary)' },
} satisfies ChartConfig

function renderCountBadges(
  counts: Record<string, number>,
  labelMap: Record<string, { label: string; color: string }>
) {
  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada data</p>
  }
  return entries.map(([key, count]) => {
    const s = labelMap[key] ?? { label: key || 'Tidak diketahui', color: 'bg-gray-100 text-gray-600' }
    return (
      <span key={key} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
        {s.label}: {count}
      </span>
    )
  })
}

export default function PenjualanTab({ range }: Props) {
  const { data, loading, error } = useReportsSummary(range)

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const aov = data && data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0
  const totalOrdersInRange = Object.values(data?.orderStatusCounts ?? {}).reduce((a, b) => a + b, 0)
  const cancelledOrRefunded =
    (data?.orderStatusCounts?.cancelled ?? 0) + (data?.paymentStatusCounts?.refunded ?? 0)
  const cancellationRate = totalOrdersInRange > 0 ? (cancelledOrRefunded / totalOrdersInRange) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmt(data?.totalRevenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{data?.orderCount ?? 0} pesanan lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata Nilai Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{fmt(aov)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">per pesanan lunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tingkat Pembatalan/Refund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{cancellationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">{cancelledOrRefunded} dari {totalOrdersInRange} pesanan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.trend.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={data.trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data pendapatan di periode ini</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Status Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.paymentStatusCounts ?? {}, PAYMENT_STATUS_LABEL)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.orderStatusCounts ?? {}, ORDER_STATUS_LABEL)}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.paymentTypeCounts ?? {}, {})}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kurir Terpopuler</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {renderCountBadges(data?.courierCounts ?? {}, {})}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.map((p) => (
                  <TableRow key={p.productId || p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada produk terjual di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

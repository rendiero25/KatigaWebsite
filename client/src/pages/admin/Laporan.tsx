import { useState } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import { useReportsSummary } from '../../hooks/useApi'
import type { ReportsRange } from '../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const RANGE_OPTIONS: { value: ReportsRange; label: string }[] = [
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua' },
]

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

export default function Laporan() {
  const [range, setRange] = useState<ReportsRange>('30d')
  const { data, loading, error } = useReportsSummary(range)

  return (
    <AdminLayout title="Laporan">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Ringkasan pendapatan dan penjualan.</p>
        <Select value={range} onValueChange={(v) => setRange(v as ReportsRange)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{fmt(data?.totalRevenue ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{data?.orderCount ?? 0} pesanan lunas</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Status Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(data?.paymentStatusCounts ?? {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada data</p>
                ) : (
                  Object.entries(data?.paymentStatusCounts ?? {}).map(([status, count]) => {
                    const s = PAYMENT_STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
                    return (
                      <span key={status} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}: {count}
                      </span>
                    )
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(data?.orderStatusCounts ?? {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada data</p>
                ) : (
                  Object.entries(data?.orderStatusCounts ?? {}).map(([status, count]) => {
                    const s = ORDER_STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' }
                    return (
                      <span key={status} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}: {count}
                      </span>
                    )
                  })
                )}
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
        </>
      )}
    </AdminLayout>
  )
}

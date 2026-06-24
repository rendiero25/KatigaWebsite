import { useCustomersReport } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function PelangganTab({ range }: Props) {
  const { data, loading, error } = useCustomersReport(range)

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
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pelanggan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.totalRegistered ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Sepanjang waktu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelanggan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.newCustomers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Periode ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Baru vs Berulang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {data?.newBuyers === null ? 'N/A' : `${data?.newBuyers ?? 0} / ${data?.returningBuyers ?? 0}`}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.newBuyers === null ? 'Tidak berlaku untuk "Semua"' : 'Pembeli baru / berulang'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pelanggan Disuspend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.suspendedCount ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Sepanjang waktu</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.topSpenders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Jumlah Order</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topSpenders.map((s) => (
                  <TableRow key={s.customerId}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-right">{s.orderCount}</TableCell>
                    <TableCell className="text-right">{fmt(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada pelanggan dengan pesanan lunas di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

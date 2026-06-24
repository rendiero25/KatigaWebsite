import { usePromotionsReport } from '../../../hooks/useApi'
import type { ReportsRange, VoucherStatus } from '../../../types/ecommerce'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<VoucherStatus, { label: string; color: string }> = {
  aktif:     { label: 'Aktif',     color: 'bg-green-100 text-green-700' },
  nonaktif:  { label: 'Nonaktif',  color: 'bg-gray-100 text-gray-600' },
  terjadwal: { label: 'Terjadwal', color: 'bg-blue-100 text-blue-700' },
  berakhir:  { label: 'Berakhir',  color: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: VoucherStatus }) {
  const s = STATUS_LABEL[status]
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
}

export default function PromosiTab({ range }: Props) {
  const { data, loading, error } = usePromotionsReport(range)

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
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Diskon Voucher Diberikan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{fmt(data?.totalVoucherDiscount ?? 0)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Periode ini, semua pelanggan</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.vouchers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pemakaian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.code}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell><StatusBadge status={v.status} /></TableCell>
                    <TableCell className="text-right">
                      {v.usedCount}{v.usageLimit > 0 ? ` / ${v.usageLimit}` : ' (tanpa batas)'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada voucher</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performa Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.voucherPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead className="text-right">Jumlah Order</TableHead>
                  <TableHead className="text-right">Diskon Diberikan</TableHead>
                  <TableHead className="text-right">Revenue Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.voucherPerformance.map((v) => (
                  <TableRow key={v.code}>
                    <TableCell className="font-medium">{v.code}</TableCell>
                    <TableCell className="text-right">{v.orderCount}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalDiscount)}</TableCell>
                    <TableCell className="text-right">{fmt(v.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada voucher dipakai di periode ini</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Promosi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Dampak revenue promosi belum bisa diukur akurat — Order tidak menyimpan promosi mana yang berlaku saat checkout.
          </p>
          {data && data.promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Diskon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cakupan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.type === 'products' ? 'Produk' : 'Kategori'}</TableCell>
                    <TableCell className="text-right">{p.discountPercent}%</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">{p.productCount} produk</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada promosi</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

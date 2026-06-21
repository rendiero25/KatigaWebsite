import { useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import type { ReportsRange } from '../../types/ecommerce'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PenjualanTab from './laporan/PenjualanTab'
import ProdukTab from './laporan/ProdukTab'
import PelangganTab from './laporan/PelangganTab'
import PromosiTab from './laporan/PromosiTab'

const RANGE_OPTIONS: { value: ReportsRange; label: string }[] = [
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua' },
]

export default function Laporan() {
  const [range, setRange] = useState<ReportsRange>('30d')

  return (
    <AdminLayout title="Laporan">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Ringkasan penjualan, produk, pelanggan, dan promosi.</p>
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

      <Tabs defaultValue="penjualan">
        <TabsList>
          <TabsTrigger value="penjualan">Penjualan</TabsTrigger>
          <TabsTrigger value="produk">Produk</TabsTrigger>
          <TabsTrigger value="pelanggan">Pelanggan</TabsTrigger>
          <TabsTrigger value="promosi">Promosi & Voucher</TabsTrigger>
        </TabsList>
        <TabsContent value="penjualan" className="mt-4">
          <PenjualanTab range={range} />
        </TabsContent>
        <TabsContent value="produk" className="mt-4">
          <ProdukTab range={range} />
        </TabsContent>
        <TabsContent value="pelanggan" className="mt-4">
          <PelangganTab range={range} />
        </TabsContent>
        <TabsContent value="promosi" className="mt-4">
          <PromosiTab range={range} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  )
}

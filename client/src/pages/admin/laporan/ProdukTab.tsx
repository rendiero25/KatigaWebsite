import { useState } from 'react'
import { Star } from 'lucide-react'
import { useProductsReport } from '../../../hooks/useApi'
import type { ReportsRange } from '../../../types/ecommerce'
import api from '../../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Props {
  range: ReportsRange
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

export default function ProdukTab({ range }: Props) {
  const { data, loading, error } = useProductsReport(range)
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue')

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
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  const topProducts = sortBy === 'revenue' ? data?.topByRevenue ?? [] : data?.topByQuantity ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Produk Terlaris</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sortBy === 'revenue' ? 'default' : 'outline'}
              onClick={() => setSortBy('revenue')}
            >
              By Revenue
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'quantity' ? 'default' : 'outline'}
              onClick={() => setSortBy('quantity')}
            >
              By Qty
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((p) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Produk Tidak Terjual</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.unsoldProducts.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">{data.unsoldCount} produk tanpa penjualan di periode ini</p>
              <div className="space-y-2">
                {data.unsoldProducts.map((p) => (
                  <div key={p.productId} className="flex items-center gap-3">
                    <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={api.getImageUrl(p.image)}
                        alt={p.name}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Semua produk terjual di periode ini</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rating &amp; Ulasan per Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Sepanjang waktu, tidak mengikuti filter rentang</p>
          {data && data.topRated.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Jumlah Ulasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topRated.map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                        {p.ratingAvg.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{p.reviewCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada ulasan produk</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performa per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.categoryPerformance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.categoryPerformance.map((c) => (
                  <TableRow key={c.categoryId ?? 'none'}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{c.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data kategori di periode ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

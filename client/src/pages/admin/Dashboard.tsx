import { Link } from 'react-router-dom'
import { Package, Tags, Star, Wallet, Newspaper, Mail, PencilLine, ExternalLink, Calculator, UserPlus } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import { useProducts, useCategories, useReportsSummary } from '../../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

interface StatCard {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description: string
  path?: string
}

export default function Dashboard() {
  const { data: products } = useProducts()
  const { data: categories } = useCategories()
  const { data: reports } = useReportsSummary('30d')

  const stats: StatCard[] = [
    {
      label: 'Total Produk',
      value: products?.length ?? 0,
      icon: Package,
      description: 'Produk aktif di katalog',
    },
    {
      label: 'Kategori',
      value: categories?.length ?? 0,
      icon: Tags,
      description: 'Kategori produk',
    },
    {
      label: 'Featured',
      value: products?.filter((p: any) => p.isFeatured)?.length ?? 0, // eslint-disable-line @typescript-eslint/no-explicit-any
      icon: Star,
      description: 'Produk unggulan',
    },
    {
      label: 'Total Pendapatan',
      value: fmt(reports?.totalRevenue ?? 0),
      icon: Wallet,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
    {
      label: 'Rata-rata Nilai Order',
      value: fmt(reports?.orderCount ? reports.totalRevenue / reports.orderCount : 0),
      icon: Calculator,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
    {
      label: 'Pelanggan Baru',
      value: reports?.newCustomersCount ?? 0,
      icon: UserPlus,
      description: '30 hari terakhir',
      path: '/admin/laporan',
    },
  ]

  const quickLinks = [
    { label: 'Kelola Produk', path: '/admin/products', icon: Package },
    { label: 'Edit Hero', path: '/admin/hero', icon: PencilLine },
    { label: 'Lihat Pesan', path: '/admin/messages', icon: Mail },
    { label: 'Tambah Berita', path: '/admin/news', icon: Newspaper },
  ]

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white mb-6">
        <h2 className="text-xl font-semibold mb-1">Selamat Datang di Admin Panel</h2>
        <p className="text-white/75 text-sm">Kelola semua konten website KumaKuma dari satu tempat.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon
          const content = (
            <Card className={stat.path ? 'transition-shadow hover:shadow-md' : undefined}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
              </CardContent>
            </Card>
          )
          return stat.path ? (
            <Link key={stat.label} to={stat.path}>{content}</Link>
          ) : (
            <div key={stat.label}>{content}</div>
          )
        })}
      </div>

      {/* Quick actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickLinks.map(link => {
              const Icon = link.icon
              return (
                <Button
                  key={link.path}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  render={<Link to={link.path} />}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Produk Terbaru</CardTitle>
          <Button variant="ghost" size="sm" render={<Link to="/admin/products" />}>
            Lihat Semua
            <ExternalLink className="ml-1 size-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Produk</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium">Harga</th>
                  <th className="pb-3 font-medium">Featured</th>
                </tr>
              </thead>
              <tbody>
                {products?.slice(0, 5).map((product: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <tr key={product._id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img
                            src={api.getImageUrl(product.image)}
                            alt={product.name}
                            className="size-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'
                            }}
                          />
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[160px]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{product.category?.name || '—'}</td>
                    <td className="py-3 text-muted-foreground">{product.price || '—'}</td>
                    <td className="py-3">
                      <Badge variant={product.isFeatured ? 'default' : 'secondary'}>
                        {product.isFeatured ? 'Ya' : 'Tidak'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}

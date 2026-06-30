import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import type { Order } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

type TabKey = 'semua' | 'awaiting_payment' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

interface Tab {
  value: TabKey
  label: string
}

const TABS: Tab[] = [
  { value: 'semua',           label: 'Semua' },
  { value: 'awaiting_payment', label: 'Menunggu' },
  { value: 'processing',      label: 'Diproses' },
  { value: 'shipped',         label: 'Dikirim' },
  { value: 'delivered',       label: 'Selesai' },
  { value: 'cancelled',       label: 'Dibatalkan' },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-700' },
  processing:       { label: 'Diproses',            color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',              color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',              color: 'bg-emerald-100 text-emerald-700' },
  cancelled:        { label: 'Dibatalkan',           color: 'bg-red-100 text-red-700' },
}

export default function Pesanan() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('semua')

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) { navigate('/masuk?redirect=/pesanan'); return }
    api.getMyOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [navigate])

  const filteredOrders = activeTab === 'semua'
    ? orders
    : orders.filter((o) => o.orderStatus === activeTab)

  return (
    <UserLayout title="Pesanan Saya">
      {loading ? (
        <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-[#F0F0EC] last:border-0">
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-10 text-[#D0D0CC] mb-3" />
          <p className="text-sm font-medium text-[#4A4A4A]">Belum ada pesanan</p>
          <p className="text-xs text-[#9A9A9A] mt-1">Yuk mulai belanja dan temukan produk pilihan kamu</p>
          <Link
            to="/produk"
            className="mt-4 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="w-full">
          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-[#F0F0EC] mb-4 -mx-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={
                  'px-3 py-2 text-sm whitespace-nowrap transition-colors ' +
                  (activeTab === tab.value
                    ? 'border-b-2 border-[#1F1F1F] text-[#1F1F1F] font-medium'
                    : 'border-b-2 border-transparent text-[#9A9A9A] hover:text-[#4A4A4A]')
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Order list */}
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="size-10 text-[#D0D0CC] mb-3" />
              <p className="text-sm font-medium text-[#4A4A4A]">Tidak ada pesanan dengan status ini</p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
              {filteredOrders.map((order) => {
                const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, color: 'bg-gray-100 text-gray-700' }
                return (
                  <Link
                    key={order._id}
                    to={`/pesanan/${order._id}`}
                    className="flex w-full items-center justify-between px-4 py-3 border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF9] transition-colors"
                  >
                    <div>
                      <p className="text-xs text-[#9A9A9A] font-mono">#{order._id.slice(-8).toUpperCase()}</p>
                      <p className="text-sm font-semibold text-[#1F1F1F] mt-0.5">{fmt(order.total)}</p>
                      <p className="text-xs text-[#9A9A9A] mt-0.5">
                        {order.items.length} item · {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${s.color}`}>
                      {s.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </UserLayout>
  )
}

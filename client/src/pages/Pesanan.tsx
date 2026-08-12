import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useMyOrders } from '../hooks/useApi'
import UserLayout from '../components/UserLayout'

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

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', className: 'border-[#6F6F71] text-[#6F6F71]' },
  processing:       { label: 'Diproses',            className: 'border-[#4F68AF] text-[#4F68AF]' },
  shipped:          { label: 'Dikirim',              className: 'border-[#4F68AF] text-[#4F68AF]' },
  delivered:        { label: 'Selesai',              className: 'border-[#1E1E1E] text-[#1E1E1E]' },
  cancelled:        { label: 'Dibatalkan',           className: 'border-[#AE4B4B] text-[#AE4B4B]' },
}

export default function Pesanan() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('semua')
  const { data: orders, loading } = useMyOrders()

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) navigate('/masuk?redirect=/pesanan')
  }, [navigate])

  const filteredOrders = activeTab === 'semua'
    ? orders
    : orders.filter((o) => o.orderStatus === activeTab)

  return (
    <UserLayout title="Pesanan Saya">
      {loading ? (
        <div className="animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-[#E9E9EA] py-5">
              <div className="space-y-2">
                <div className="h-3 w-32 bg-gray-200" />
                <div className="h-3 w-24 bg-gray-200" />
                <div className="h-3 w-40 bg-gray-200" />
              </div>
              <div className="h-5 w-20 bg-gray-200" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-10 text-[#6F6F71]/40 mb-3" strokeWidth={1.5} />
          <p className="text-[13px] text-[#1E1E1E]">Belum ada pesanan</p>
          <p className="text-[13px] text-[#6F6F71] mt-1">Yuk mulai belanja dan temukan produk pilihan kamu</p>
          <Link
            to="/produk"
            className="mt-4 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.12em] text-[12px] px-6 py-2.5 hover:bg-[#1E1E1E] hover:text-white transition-colors"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="w-full">
          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-[#E9E9EA] mb-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={
                  'px-3 py-2.5 uppercase tracking-[0.1em] text-[12px] whitespace-nowrap transition-colors cursor-pointer ' +
                  (activeTab === tab.value
                    ? 'border-b-2 border-[#1E1E1E] text-[#1E1E1E]'
                    : 'border-b-2 border-transparent text-[#6F6F71] hover:text-[#1E1E1E]')
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Order list */}
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="size-10 text-[#6F6F71]/40 mb-3" strokeWidth={1.5} />
              <p className="text-[13px] text-[#6F6F71]">Tidak ada pesanan dengan status ini</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:flex items-center gap-4 border-b border-[#E9E9EA] py-3 uppercase tracking-[0.12em] text-[12px] text-[#6F6F71]">
                <span className="flex-1">Pesanan</span>
                <span className="w-40">Tanggal</span>
                <span className="w-32 text-right">Total</span>
                <span className="w-44 text-right">Status</span>
              </div>

              {filteredOrders.map((order) => {
                const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, className: 'border-[#6F6F71] text-[#6F6F71]' }
                return (
                  <Link
                    key={order._id}
                    to={`/pesanan/${order._id}`}
                    className="flex w-full flex-col gap-2 border-b border-[#E9E9EA] py-5 hover:bg-[#F9F7F2] transition-colors md:flex-row md:items-center md:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="uppercase text-[13px] text-[#1E1E1E]">
                        #{order.orderCode || order._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-[13px] text-[#6F6F71] mt-1">{order.items.length} item</p>
                    </div>
                    <span className="md:w-40 text-[13px] text-[#6F6F71]">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="md:w-32 text-[13px] text-[#1E1E1E] tabular-nums md:text-right">
                      {fmt(order.total)}
                    </span>
                    <span className="md:w-44 flex md:justify-end">
                      <span className={`border text-[11px] uppercase tracking-[0.12em] px-2 py-1 ${s.className}`}>
                        {s.label}
                      </span>
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

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { Order, CanReviewResponse } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import ReviewForm from '../components/ReviewForm'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-700' },
  processing:       { label: 'Diproses',            color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',              color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',              color: 'bg-emerald-100 text-emerald-700' },
  cancelled:        { label: 'Dibatalkan',           color: 'bg-red-100 text-red-700' },
}

const STEPS = ['Menunggu Bayar', 'Diproses', 'Dikirim', 'Selesai']

const STATUS_STEP_INDEX: Record<string, number> = {
  awaiting_payment: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
}

export default function PesananDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, CanReviewResponse>>({})
  const [reviewFormItem, setReviewFormItem] = useState<{
    productId: string; orderId: string; productName: string
  } | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) { navigate('/masuk'); return }
    if (!id) return
    api.getMyOrder(id)
      .then((data) => setOrder(data?.message ? null : data))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!order || order.orderStatus !== 'delivered') return
    const token = localStorage.getItem('customerToken')
    if (!token) return
    const fetchStatuses = async () => {
      const results: Record<string, CanReviewResponse> = {}
      await Promise.all(
        order.items.map(async (item) => {
          if (!item.product) return
          const key = `${order._id}-${item.product}`
          results[key] = await api.canReview(item.product, order._id)
        })
      )
      setReviewStatuses(results)
    }
    fetchStatuses()
  }, [order])

  const handleRepay = () => {
    if (!order?.midtransToken) return
    setPaying(true)
    window.snap.pay(order.midtransToken, {
      onSuccess: () => window.location.reload(),
      onPending: () => window.location.reload(),
      onError: () => { toast.error('Pembayaran gagal.'); setPaying(false) },
      onClose: () => setPaying(false),
    })
  }

  if (loading) return (
    <UserLayout title="Detail Pesanan">
      <div className="max-w-2xl space-y-4">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-1">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-5 w-36 rounded" />
          </div>
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </UserLayout>
  )

  if (!order) return (
    <UserLayout title="Detail Pesanan">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-[#4A4A4A]">Pesanan tidak ditemukan</p>
        <p className="text-xs text-[#9A9A9A] mt-1">Pesanan mungkin sudah dihapus atau tidak tersedia.</p>
        <Link
          to="/pesanan"
          className="mt-4 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
        >
          Kembali ke Pesanan
        </Link>
      </div>
    </UserLayout>
  )

  const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, color: 'bg-gray-100 text-gray-700' }
  const canRepay = order.paymentStatus === 'pending' && order.orderStatus === 'awaiting_payment' && order.midtransToken
  const currentStep = STATUS_STEP_INDEX[order.orderStatus] ?? 0

  return (
    <UserLayout title="Detail Pesanan">
      <div className="max-w-2xl">
        <Link to="/pesanan" className="text-xs text-[#9A9A9A] hover:text-[#4A4A4A] mb-4 block transition-colors">
          ← Semua Pesanan
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-[#9A9A9A] font-mono">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-lg font-semibold text-[#1F1F1F]">Detail Pesanan</p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
        </div>

        {/* Status stepper */}
        {order.orderStatus !== 'cancelled' ? (
          <div className="rounded-lg border border-[#E8E8E5] bg-white p-4 mb-4">
            <div className="flex items-end">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-end flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center mb-1 text-xs font-medium ${
                        i <= currentStep
                          ? 'bg-[#1F1F1F] text-white'
                          : 'border border-[#E8E8E5] text-[#9A9A9A]'
                      }`}
                    >
                      {i < currentStep ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span className="text-[10px] text-center leading-tight w-14 text-[#4A4A4A]">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-5 ${i < currentStep ? 'bg-[#1F1F1F]' : 'bg-[#E8E8E5]'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm font-medium text-red-700 text-center">
            Pesanan Dibatalkan
          </div>
        )}

        {/* Shipping info */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Info Pengiriman</p>
          </div>
          <div className="px-4 pb-4 pt-3 space-y-1">
            <p className="text-sm text-[#1F1F1F] font-medium">{order.shippingAddress.recipientName}</p>
            <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.phone}</p>
            <p className="text-sm text-[#4A4A4A]">{order.shippingAddress.street}</p>
            <p className="text-sm text-[#4A4A4A]">
              {order.shippingAddress.areaName}{order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
            </p>
            <div className="pt-2 border-t border-[#F0F0EC] mt-2">
              <p className="text-sm text-[#4A4A4A]">
                <span className="font-medium text-[#1F1F1F]">{order.shippingCourier.toUpperCase()}</span>
                {' — '}{order.shippingServiceName}
                {order.estimatedDays ? ` (${order.estimatedDays})` : ''}
              </p>
              {order.biteshipTrackingCode && (
                <p className="text-sm text-[#4A4A4A] mt-1">
                  No. Resi:{' '}
                  <span className="font-medium text-[#1F1F1F] font-mono">{order.biteshipTrackingCode}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Daftar Item</p>
          </div>
          <div>
            {order.items.map((item, i) => {
              const key = item.product ? `${order._id}-${item.product}` : null
              const status = key ? reviewStatuses[key] : null
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0EC] last:border-0"
                >
                  <img
                    src={api.getImageUrl(item.image)}
                    alt={item.name}
                    className="size-10 rounded-md object-cover bg-[#F7F7F5] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1F1F1F] truncate">{item.name}</p>
                    {item.variantName && (
                      <p className="text-xs text-[#9A9A9A]">{item.variantName}</p>
                    )}
                    <p className="text-xs text-[#9A9A9A]">{item.quantity} × {fmt(item.priceNumeric)}</p>
                    {order.orderStatus === 'delivered' && status?.canReview && (
                      <button
                        type="button"
                        onClick={() => setReviewFormItem({ productId: item.product, orderId: order._id, productName: item.name })}
                        className="mt-1.5 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
                      >
                        Tulis Ulasan
                      </button>
                    )}
                    {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
                      <span className="mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Sudah Diulas
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#1F1F1F] shrink-0 ml-auto">{fmt(item.subtotal)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cost summary */}
        <div className="rounded-lg border border-[#E8E8E5] bg-white mb-4">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0EC]">
            <p className="text-[15px] font-semibold text-[#1F1F1F]">Ringkasan Biaya</p>
          </div>
          <div className="py-1">
            <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
              <span>Subtotal produk</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
              <span>Ongkos kirim</span>
              <span>{fmt(order.shippingCost)}</span>
            </div>
            {(order.voucherDiscount ?? 0) > 0 && (
              <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                <span className="text-emerald-700">-{fmt(order.voucherDiscount ?? 0)}</span>
              </div>
            )}
            <div className="border-t border-[#F0F0EC] my-1" />
            <div className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold text-[#1F1F1F]">
              <span>Total</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Repay action */}
        {canRepay && (
          <button
            onClick={handleRepay}
            disabled={paying}
            className="w-full bg-[#1F1F1F] text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-[#2F2F2F] transition-colors disabled:opacity-50"
          >
            {paying ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        )}
      </div>

      <ReviewForm
        open={!!reviewFormItem}
        onClose={() => setReviewFormItem(null)}
        onSuccess={() => {
          if (!order || !reviewFormItem) return
          const key = `${reviewFormItem.orderId}-${reviewFormItem.productId}`
          setReviewStatuses((prev) => ({
            ...prev,
            [key]: { canReview: false, alreadyReviewed: true },
          }))
          setReviewFormItem(null)
        }}
        productId={reviewFormItem?.productId ?? ''}
        orderId={reviewFormItem?.orderId ?? ''}
        productName={reviewFormItem?.productName ?? ''}
      />
    </UserLayout>
  )
}

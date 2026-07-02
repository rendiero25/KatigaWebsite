import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { Check, Truck, FileText, XCircle, RefreshCw, MessageSquare } from 'lucide-react'
import type { Order, CanReviewResponse, BiteshipTracking, Complaint } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import ReviewForm from '../components/ReviewForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Transfer Bank',
  gopay: 'GoPay',
  qris: 'QRIS',
  credit_card: 'Kartu Kredit',
  cstore: 'Gerai Retail (Alfamart/Indomaret)',
  shopeepay: 'ShopeePay',
  bca_va: 'Transfer Bank BCA',
  bni_va: 'Transfer Bank BNI',
  bri_va: 'Transfer Bank BRI',
  permata_va: 'Transfer Bank Permata',
  other_va: 'Transfer Bank (VA)',
  akulaku: 'Akulaku PayLater',
  kredivo: 'Kredivo',
  echannel: 'Mandiri Bill',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-700' },
  processing:       { label: 'Diproses',             color: 'bg-blue-100 text-blue-700' },
  packing:          { label: 'Sedang Dikemas',        color: 'bg-violet-100 text-violet-700' },
  shipped:          { label: 'Dikirim',               color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',               color: 'bg-emerald-100 text-emerald-700' },
  cancelled:        { label: 'Dibatalkan',            color: 'bg-red-100 text-red-700' },
}

const STEPS = ['Menunggu Bayar', 'Diproses', 'Dikemas', 'Dikirim', 'Selesai']

const STATUS_STEP_INDEX: Record<string, number> = {
  awaiting_payment: 0,
  processing: 1,
  packing: 2,
  shipped: 3,
  delivered: 4,
}

const COMPLAINT_WINDOW_DAYS = 3

const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  open: 'Menunggu',
  processing: 'Diproses',
  awaiting_return_shipment: 'Retur Disetujui',
  return_shipped: 'Barang Dikirim',
  return_received: 'Barang Diterima',
  resolved: 'Selesai',
  rejected: 'Ditolak',
}

const COMPLAINT_STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  awaiting_return_shipment: 'bg-purple-100 text-purple-700',
  return_shipped: 'bg-indigo-100 text-indigo-700',
  return_received: 'bg-cyan-100 text-cyan-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

function useCountdown(targetMs: number | null) {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    if (targetMs === null) return
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetMs])

  if (targetMs === null || remaining <= 0) return null
  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface ComplaintFormProps {
  orderId: string
  onSuccess: (c: Complaint) => void
  onClose: () => void
}

function ComplaintForm({ orderId, onSuccess, onClose }: ComplaintFormProps) {
  const [type, setType] = useState<'complaint' | 'return'>('complaint')
  const [reason, setReason] = useState('')
  const [photos, setPhotos] = useState<FileList | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim().length < 10) {
      toast.error('Alasan minimal 10 karakter')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('orderId', orderId)
      fd.append('type', type)
      fd.append('reason', reason.trim())
      if (photos) {
        for (let i = 0; i < photos.length; i++) {
          fd.append('photos', photos[i])
        }
      }
      const result = await api.createComplaint(fd)
      toast.success('Komplain berhasil dikirim')
      onSuccess(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim komplain')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full sm:max-w-md rounded-2xl p-6 shadow-xl">
        <p className="text-[15px] font-semibold text-[#1F1F1F] mb-4">Buka Komplain</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Tipe</label>
            <div className="flex gap-2">
              {(['complaint', 'return'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    type === t
                      ? 'border-[#1F1F1F] bg-[#1F1F1F] text-white'
                      : 'border-[#E8E8E5] text-[#4A4A4A] hover:bg-[#F7F7F5]'
                  }`}
                >
                  {t === 'complaint' ? 'Komplain' : 'Retur Barang'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Alasan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ceritakan masalah yang kamu alami (min. 10 karakter)..."
              className="w-full border border-[#E8E8E5] rounded-lg px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F] resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4A4A4A] mb-1.5">Foto Bukti (opsional, maks. 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(e.target.files)}
              className="text-sm text-[#4A4A4A]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Mengirim...' : 'Kirim Komplain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PesananDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [tracking, setTracking] = useState<BiteshipTracking | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [showTracking, setShowTracking] = useState(false)
  const [complaint, setComplaint] = useState<Complaint | null | undefined>(undefined)
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [shipCourier, setShipCourier] = useState('')
  const [shipTrackingNumber, setShipTrackingNumber] = useState('')
  const [shipSubmitting, setShipSubmitting] = useState(false)
  const [nowMs] = useState(() => Date.now())
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, CanReviewResponse>>({})
  const [reviewFormItem, setReviewFormItem] = useState<{
    productId: string; orderId: string; productName: string
  } | null>(null)

  // Payment expiry countdown: createdAt + 24h
  const paymentDeadlineMs = order?.orderStatus === 'awaiting_payment' && order?.paymentStatus === 'pending'
    ? new Date(order.createdAt).getTime() + 24 * 60 * 60 * 1000
    : null
  const countdown = useCountdown(paymentDeadlineMs)

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) { navigate('/masuk'); return }
    if (!id) return
    const fromPayment = !!location.state?.fromPayment
    api.getMyOrder(id)
      .then(async (data) => {
        const fetched = data?.message ? null : data
        if (fetched && fromPayment && fetched.paymentStatus !== 'paid') {
          try {
            const verified = await api.verifyOrderPayment(fetched._id)
            setOrder(verified?._id ? verified : fetched)
          } catch {
            setOrder(fetched)
          }
        } else {
          setOrder(fetched)
        }
      })
      .finally(() => setLoading(false))
  }, [id, navigate, location.state])

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

  useEffect(() => {
    if (!order || order.orderStatus !== 'delivered') return
    api.getMyComplaintByOrder(order._id)
      .then((data) => setComplaint(data))
      .catch(() => setComplaint(null))
  }, [order])

  const handleRepay = () => {
    if (!order?.midtransToken) return
    if (!window.snap) {
      toast.error('Sistem pembayaran belum siap. Refresh halaman dan coba lagi.')
      return
    }
    setPaying(true)
    window.snap.pay(order.midtransToken, {
      onSuccess: () => { toast.success('Pembayaran berhasil!'); window.location.reload() },
      onPending: () => { toast.info('Pembayaran pending.'); window.location.reload() },
      onError: () => { toast.error('Pembayaran gagal.'); setPaying(false) },
      onClose: () => setPaying(false),
    })
  }

  const handleCancel = async () => {
    if (!order || !id) return
    const confirmed = window.confirm('Yakin ingin membatalkan pesanan ini?')
    if (!confirmed) return
    setCancelling(true)
    try {
      const updated = await api.cancelMyOrder(id)
      setOrder(updated)
      toast.success('Pesanan berhasil dibatalkan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membatalkan pesanan')
    } finally {
      setCancelling(false)
    }
  }

  const handleShipReturn = async () => {
    if (!complaint || !shipCourier.trim() || !shipTrackingNumber.trim()) return
    setShipSubmitting(true)
    try {
      const updated = await api.shipReturnComplaint(complaint._id, {
        courier: shipCourier.trim(),
        trackingNumber: shipTrackingNumber.trim(),
      })
      setComplaint(updated)
      toast.success('Data resi retur berhasil dikirim')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim data resi retur')
    } finally {
      setShipSubmitting(false)
    }
  }

  const handleLoadTracking = useCallback(async () => {
    if (!id) return
    setShowTracking(true)
    setTrackingLoading(true)
    setTrackingError('')
    try {
      const data = await api.getOrderTracking(id)
      setTracking(data)
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Gagal mengambil data tracking')
    } finally {
      setTrackingLoading(false)
    }
  }, [id])

  if (loading) return (
    <UserLayout title="Detail Pesanan">
      <div className="max-w-6xl mx-auto space-y-4">
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
  const canCancel = ['awaiting_payment', 'processing'].includes(order.orderStatus) && order.orderStatus !== 'cancelled'
  const canDownloadInvoice = order.paymentStatus === 'paid' || order.orderStatus === 'cancelled'
  const currentStep = STATUS_STEP_INDEX[order.orderStatus] ?? 0

  const deliveredAt = order.orderStatus === 'delivered' ? new Date(order.updatedAt).getTime() : null
  const complaintWindowExpired = deliveredAt
    ? nowMs - deliveredAt > COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : true
  const canComplain = order.orderStatus === 'delivered' && !complaintWindowExpired && complaint === null
  const complaintDeadlineLabel = deliveredAt
    ? new Date(deliveredAt + COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full max-w-6xl mx-auto">
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

        {/* Countdown timer */}
        {countdown && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700">Selesaikan pembayaran sebelum waktu habis</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Pesanan akan otomatis dibatalkan jika melewati batas waktu</p>
            </div>
            <p className="text-xl font-mono font-bold text-amber-700 shrink-0 ml-4">{countdown}</p>
          </div>
        )}

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

        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left column: status & shipping */}
          <div className="space-y-4">
            {/* Complaint status (if exists) */}
            {complaint && complaint._id && (
              <div className="rounded-lg border border-[#E8E8E5] bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="size-4 text-[#4A4A4A] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F1F1F]">
                      {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
                    </p>
                    <p className="text-xs text-[#9A9A9A] truncate">{complaint.reason}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${
                    COMPLAINT_STATUS_COLOR[complaint.status] ?? 'bg-amber-100 text-amber-700'
                  }`}>
                    {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
                  </span>
                </div>

                {complaint.type === 'return' && complaint.status === 'awaiting_return_shipment' && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC] space-y-2">
                    <p className="text-xs text-[#4A4A4A]">Retur disetujui. Kirim barang balik lalu isi data resi di bawah ini.</p>
                    <input
                      type="text"
                      value={shipCourier}
                      onChange={(e) => setShipCourier(e.target.value)}
                      placeholder="Nama kurir (mis. JNE)"
                      className="w-full border border-[#E8E8E5] rounded-lg px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F]"
                    />
                    <input
                      type="text"
                      value={shipTrackingNumber}
                      onChange={(e) => setShipTrackingNumber(e.target.value)}
                      placeholder="Nomor resi"
                      className="w-full border border-[#E8E8E5] rounded-lg px-3 py-2 text-sm text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F]"
                    />
                    <Button
                      type="button"
                      onClick={handleShipReturn}
                      disabled={shipSubmitting || !shipCourier.trim() || !shipTrackingNumber.trim()}
                      className="w-full"
                    >
                      {shipSubmitting ? 'Mengirim...' : 'Saya Sudah Mengirim Barang'}
                    </Button>
                  </div>
                )}

                {complaint.type === 'return' && ['return_shipped', 'return_received'].includes(complaint.status) && complaint.returnShipment && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC]">
                    <p className="text-xs text-[#9A9A9A]">
                      Resi: {complaint.returnShipment.courier} — {complaint.returnShipment.trackingNumber}
                    </p>
                    <p className="text-xs text-[#9A9A9A] mt-0.5">Menunggu verifikasi admin.</p>
                  </div>
                )}

                {complaint.status === 'resolved' && complaint.resolution?.type && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0EC]">
                    <p className="text-sm font-medium text-[#1F1F1F]">
                      {complaint.resolution.type === 'refund' ? 'Dana Dikembalikan' : 'Barang Diganti'}
                    </p>
                    {complaint.resolution.note && (
                      <p className="text-xs text-[#9A9A9A] mt-0.5">{complaint.resolution.note}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Shipping info */}
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
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
                  {order.biteshipTrackingCode && ['shipped', 'delivered'].includes(order.orderStatus) && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-[#F5F5F3] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide">No. Resi</p>
                        <p className="text-sm font-medium text-[#1F1F1F] font-mono truncate">{order.biteshipTrackingCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(order.biteshipTrackingCode ?? '')}
                        className="text-xs text-[#4A4A4A] border border-[#E8E8E5] px-2 py-1 rounded-md hover:bg-white transition-colors shrink-0"
                      >
                        Salin
                      </button>
                    </div>
                  )}
                </div>
                {/* Tracking button */}
                {order.biteshipOrderId && ['packing', 'shipped', 'delivered'].includes(order.orderStatus) && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={showTracking ? () => setShowTracking(false) : handleLoadTracking}
                      className="flex items-center gap-1.5"
                    >
                      {trackingLoading
                        ? <><RefreshCw className="size-3 animate-spin" /> Memuat...</>
                        : <><Truck className="size-3" /> {showTracking ? 'Sembunyikan Tracking' : 'Cek Status Pengiriman'}</>
                      }
                    </Button>
                    {showTracking && (
                      <div className="mt-3 border border-[#E8E8E5] rounded-lg p-3">
                        {trackingLoading && (
                          <p className="text-xs text-[#9A9A9A]">Mengambil data tracking...</p>
                        )}
                        {trackingError && (
                          <p className="text-xs text-red-600">{trackingError}</p>
                        )}
                        {!trackingLoading && !trackingError && tracking && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {tracking.courier?.driver_photo_url && (
                                <img
                                  src={tracking.courier.driver_photo_url}
                                  alt="Foto kurir"
                                  className="size-8 rounded-full object-cover shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <p className="text-xs font-semibold text-[#1F1F1F]">
                                {tracking.courier?.company?.toUpperCase()} — {tracking.courier?.tracking_id}
                              </p>
                            </div>
                            <div className="space-y-2">
                              {(tracking.courier?.history ?? []).slice().reverse().map((h, i) => (
                                <div key={i} className="flex gap-2 text-xs">
                                  <div className="flex flex-col items-center mt-0.5">
                                    <div className={`size-2 rounded-full ${i === 0 ? 'bg-[#1F1F1F]' : 'bg-[#C8C8C4]'}`} />
                                    {i < (tracking.courier?.history?.length ?? 0) - 1 && (
                                      <div className="w-px flex-1 bg-[#E8E8E5] my-1" />
                                    )}
                                  </div>
                                  <div className="pb-2">
                                    <p className="text-[#1F1F1F] font-medium leading-tight">{h.note}</p>
                                    <p className="text-[#9A9A9A] mt-0.5">
                                      {new Date(h.updated_at).toLocaleString('id-ID', {
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {canComplain && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowComplaintForm(true)}
                className="w-full"
              >
                <MessageSquare className="size-4" />
                Buka Komplain / Retur
              </Button>
            )}
            {canComplain && complaintDeadlineLabel && (
              <p className="text-[11px] text-[#9A9A9A] text-center">
                Kamu dapat mengajukan komplain hingga {complaintDeadlineLabel}
              </p>
            )}
            {order.orderStatus === 'delivered' && complaintWindowExpired && complaint === null && (
              <p className="text-[11px] text-[#9A9A9A] text-center">
                Batas waktu komplain untuk pesanan ini sudah berakhir
              </p>
            )}

            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full"
              >
                <XCircle className="size-4" />
                {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
              </Button>
            )}
          </div>

          {/* Right column: items & cost */}
          <div className="space-y-4">
            {/* Items */}
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewFormItem({ productId: item.product, orderId: order._id, productName: item.name })}
                            className="mt-1.5"
                          >
                            Tulis Ulasan
                          </Button>
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
            <div className="rounded-lg border border-[#E8E8E5] bg-white">
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
                {order.midtransPaymentType && (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-[#4A4A4A]">
                    <span>Metode Pembayaran</span>
                    <span className="text-[#1F1F1F] font-medium">
                      {PAYMENT_METHOD_LABEL[order.midtransPaymentType] ?? order.midtransPaymentType}
                    </span>
                  </div>
                )}
                <div className="border-t border-[#F0F0EC] my-1" />
                <div className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold text-[#1F1F1F]">
                  <span>Total</span>
                  <span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {canRepay && (
              <Button
                onClick={handleRepay}
                disabled={paying}
                className="w-full"
              >
                {paying ? 'Memproses...' : 'Bayar Sekarang'}
              </Button>
            )}

            {canDownloadInvoice && (
              <a
                href={api.getOrderInvoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-[#E8E8E5] text-[#4A4A4A] text-sm font-medium rounded-md px-4 py-2.5 hover:bg-[#F7F7F5] transition-colors"
              >
                <FileText className="size-4" />
                Download Invoice
              </a>
            )}
          </div>
        </div>
      </div>

      {showComplaintForm && order && (
        <ComplaintForm
          orderId={order._id}
          onSuccess={(c) => {
            setComplaint(c)
            setShowComplaintForm(false)
          }}
          onClose={() => setShowComplaintForm(false)}
        />
      )}

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

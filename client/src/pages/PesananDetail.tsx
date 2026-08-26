import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { Check, Truck, FileText, XCircle, RefreshCw, MessageSquare } from 'lucide-react'
import type { Order, CanReviewResponse, BiteshipTracking, Complaint } from '../types/ecommerce'
import api from '../services/api'
import {
  formatShipmentTime,
  hasShipmentData,
  isProblemShipmentStatus,
  resolveShipmentTimeline,
  shipmentStatusLabel,
} from '../utils/shipmentStatus'
import UserLayout from '../components/UserLayout'
import ReviewForm from '../components/ReviewForm'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const PAYMENT_CHANNEL_LABEL: Record<string, string> = {
  qris: 'QRIS',
  va: 'Transfer Bank',
  ewallet: 'E-Wallet',
  retail: 'Gerai Retail',
  credit_card: 'Kartu Kredit',
}

// Mayar memakai bentuk "kanal/penerbit", mis. "va/MANDIRI" atau "qris" — diamati di
// sandbox 2026-08-13. Daftar kanal lengkapnya tidak didokumentasikan, jadi kanal asing
// ditampilkan apa adanya alih-alih disembunyikan.
const formatPaymentMethod = (raw: string): string => {
  const [channel, issuer] = raw.split('/')
  const label = PAYMENT_CHANNEL_LABEL[channel] ?? channel.toUpperCase()
  return issuer ? `${label} ${issuer}` : label
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', className: 'border-[#6F6F71] text-[#6F6F71]' },
  processing:       { label: 'Diproses',             className: 'border-[#4F68AF] text-[#4F68AF]' },
  packing:          { label: 'Sedang Dikemas',       className: 'border-[#4F68AF] text-[#4F68AF]' },
  shipped:          { label: 'Dikirim',              className: 'border-[#4F68AF] text-[#4F68AF]' },
  delivered:        { label: 'Selesai',              className: 'border-[#1E1E1E] text-[#1E1E1E]' },
  cancelled:        { label: 'Dibatalkan',           className: 'border-[#AE4B4B] text-[#AE4B4B]' },
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

const COMPLAINT_STATUS_CLASS: Record<string, string> = {
  open: 'border-[#6F6F71] text-[#6F6F71]',
  processing: 'border-[#4F68AF] text-[#4F68AF]',
  awaiting_return_shipment: 'border-[#4F68AF] text-[#4F68AF]',
  return_shipped: 'border-[#4F68AF] text-[#4F68AF]',
  return_received: 'border-[#4F68AF] text-[#4F68AF]',
  resolved: 'border-[#1E1E1E] text-[#1E1E1E]',
  rejected: 'border-[#AE4B4B] text-[#AE4B4B]',
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
      <div className="bg-white w-full sm:max-w-md p-6">
        <p className="uppercase tracking-[0.12em] text-[13px] text-[#1E1E1E] mb-4">Buka Komplain</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] text-[#6F6F71] mb-1.5">Tipe</label>
            <div className="flex gap-2">
              {(['complaint', 'return'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-[13px] uppercase tracking-[0.08em] border transition-colors cursor-pointer ${
                    type === t
                      ? 'border-[#1E1E1E] bg-[#1E1E1E] text-white'
                      : 'border-[#E9E9EA] text-[#6F6F71] hover:border-[#1E1E1E]/40'
                  }`}
                >
                  {t === 'complaint' ? 'Komplain' : 'Retur Barang'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-[#6F6F71] mb-1.5">Alasan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ceritakan masalah yang kamu alami (min. 10 karakter)..."
              className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E] resize-none"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#6F6F71] mb-1.5">Foto Bukti (opsional, maks. 5)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(e.target.files)}
              className="text-[13px] text-[#6F6F71]"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.12em] text-[12px] px-4 py-2.5 hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#4F68AF] text-white uppercase tracking-[0.12em] text-[12px] px-4 py-2.5 hover:bg-[#2B3A67] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Mengirim...' : 'Kirim Komplain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section>
      <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] pb-2 mb-3 border-b border-[#E9E9EA]">
        {title}
      </p>
      {children}
    </section>
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
  const [complaint, setComplaint] = useState<Complaint | null | undefined>(undefined)
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [shipCourier, setShipCourier] = useState('')
  const [shipTrackingNumber, setShipTrackingNumber] = useState('')
  const [shipPhotos, setShipPhotos] = useState<FileList | null>(null)
  const [shipSubmitting, setShipSubmitting] = useState(false)
  const [refundBank, setRefundBank] = useState('')
  const [refundHolder, setRefundHolder] = useState('')
  const [refundNumber, setRefundNumber] = useState('')
  const [refundSaving, setRefundSaving] = useState(false)
  const [refundEditing, setRefundEditing] = useState(false)
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
    if (!order?.paymentLink) return
    setPaying(true)
    window.location.href = order.paymentLink
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

  const handleSaveRefundAccount = async () => {
    if (!id) return
    setRefundSaving(true)
    try {
      const updated = await api.submitRefundAccount(id, {
        bankName: refundBank.trim(),
        accountName: refundHolder.trim(),
        accountNumber: refundNumber.trim(),
      })
      setOrder(updated)
      setRefundEditing(false)
      toast.success('Rekening refund tersimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan rekening refund')
    } finally {
      setRefundSaving(false)
    }
  }

  const handleShipReturn = async () => {
    if (!complaint || !shipCourier.trim() || !shipTrackingNumber.trim()) return
    setShipSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('courier', shipCourier.trim())
      fd.append('trackingNumber', shipTrackingNumber.trim())
      if (shipPhotos) {
        for (let i = 0; i < shipPhotos.length; i++) fd.append('photos', shipPhotos[i])
      }
      const updated = await api.shipReturnComplaint(complaint._id, fd)
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

  // Pelacakan tidak lagi menunggu klik: begitu pesanan punya order Biteship, riwayat
  // kurir diambil sendiri dan bagian pengiriman langsung terbuka. Sengaja tidak memakai
  // handleLoadTracking — spinner tombol tidak boleh menyala di muat pertama, dan riwayat
  // webhook yang tersimpan sudah tampil selagi panggilan ini berjalan.
  const biteshipOrderId = order?.biteshipOrderId
  const orderStatus = order?.orderStatus
  useEffect(() => {
    if (!id || !biteshipOrderId) return
    if (!['packing', 'shipped', 'delivered'].includes(orderStatus ?? '')) return

    let cancelled = false
    const load = async () => {
      try {
        const data = await api.getOrderTracking(id)
        if (!cancelled) setTracking(data)
      } catch (err) {
        if (!cancelled) setTrackingError(err instanceof Error ? err.message : 'Gagal mengambil data tracking')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id, biteshipOrderId, orderStatus])

  if (loading) return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full animate-pulse">
        <div className="flex items-start justify-between pb-6 border-b border-[#E9E9EA]">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-gray-200" />
            <div className="h-3 w-36 bg-gray-200" />
          </div>
          <div className="h-5 w-20 bg-gray-200" />
        </div>
        <div className="space-y-3 pt-8">
          <div className="h-4 w-full bg-gray-200" />
          <div className="h-4 w-full bg-gray-200" />
          <div className="h-4 w-2/3 bg-gray-200" />
        </div>
      </div>
    </UserLayout>
  )

  if (!order) return (
    <UserLayout title="Detail Pesanan">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[13px] text-[#1E1E1E]">Pesanan tidak ditemukan</p>
        <p className="text-[13px] text-[#6F6F71] mt-1">Pesanan mungkin sudah dihapus atau tidak tersedia.</p>
        <Link
          to="/pesanan"
          className="mt-4 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.12em] text-[12px] px-6 py-2.5 hover:bg-[#1E1E1E] hover:text-white transition-colors"
        >
          Kembali ke Pesanan
        </Link>
      </div>
    </UserLayout>
  )

  const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, className: 'border-[#6F6F71] text-[#6F6F71]' }
  const canRepay = order.paymentStatus === 'pending'
    && order.orderStatus === 'awaiting_payment'
    && Boolean(order.paymentLink)
    && (!order.paymentExpiredAt || new Date(order.paymentExpiredAt) > new Date())
  const canCancel = ['awaiting_payment', 'processing'].includes(order.orderStatus) && order.orderStatus !== 'cancelled'
  const canDownloadInvoice = order.paymentStatus === 'paid' || order.orderStatus === 'cancelled'
  const currentStep = STATUS_STEP_INDEX[order.orderStatus] ?? 0

  const deliveredAt = order.orderStatus === 'delivered'
    ? new Date(order.deliveredAt ?? order.updatedAt).getTime()
    : null
  const complaintWindowExpired = deliveredAt
    ? nowMs - deliveredAt > COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : true
  const canComplain = order.orderStatus === 'delivered' && !complaintWindowExpired && complaint === null
  const complaintDeadlineLabel = deliveredAt
    ? new Date(deliveredAt + COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  const shipmentTimeline = resolveShipmentTimeline(order, tracking)
  const latestShipmentStatus = order.biteshipStatus
    || shipmentTimeline[shipmentTimeline.length - 1]?.status
    || ''
  const hasTrackingSection = hasShipmentData(order) && order.orderStatus !== 'awaiting_payment'

  const savedRefundAccount = order.refundAccount?.submittedAt ? order.refundAccount : null
  const refundFormFilled = Boolean(refundBank.trim() && refundHolder.trim() && refundNumber.trim())

  return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full">
        <Link to="/pesanan" className="text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] mb-6 block transition-colors">
          ← Semua Pesanan
        </Link>

        {/* Order header */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#E9E9EA] pb-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="uppercase text-[13px] text-[#1E1E1E]">#{order._id.slice(-8).toUpperCase()}</p>
            <p className="text-[13px] text-[#6F6F71]">
              {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className={`border text-[11px] uppercase tracking-[0.12em] px-2 py-1 shrink-0 ${s.className}`}>
            {s.label}
          </span>
        </div>

        {/* Countdown timer */}
        {countdown && (
          <div className="border border-[#AE4B4B]/40 px-4 py-3 mt-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#AE4B4B]">Selesaikan pembayaran sebelum waktu habis</p>
              <p className="text-[12px] text-[#AE4B4B]/70 mt-0.5">Pesanan akan otomatis dibatalkan jika melewati batas waktu</p>
            </div>
            <p className="text-lg font-mono text-[#AE4B4B] shrink-0 ml-4 tabular-nums">{countdown}</p>
          </div>
        )}

        {/* Rekening tujuan refund */}
        {order.paymentStatus === 'refund_pending' && (
          <div className="border border-[#E9E9EA] px-4 py-4 mt-4">
            <p className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E]">Rekening tujuan refund</p>
            {savedRefundAccount && !refundEditing ? (
              <>
                <p className="text-[13px] text-[#1E1E1E] mt-2">
                  {savedRefundAccount.bankName} — {savedRefundAccount.accountNumber}
                </p>
                <p className="text-[13px] text-[#6F6F71] mt-0.5">a.n. {savedRefundAccount.accountName}</p>
                <p className="text-[12px] text-[#6F6F71] mt-2">
                  Dana ditransfer ke rekening ini paling lambat 7 hari kerja. Selama dana belum kami
                  kirim, datanya masih bisa kamu perbaiki.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRefundBank(savedRefundAccount.bankName)
                    setRefundHolder(savedRefundAccount.accountName)
                    setRefundNumber(savedRefundAccount.accountNumber)
                    setRefundEditing(true)
                  }}
                  className="mt-3 border border-[#1E1E1E] uppercase tracking-[0.12em] text-[12px] px-4 py-2 hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer"
                >
                  Ubah rekening
                </button>
              </>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-[13px] text-[#6F6F71]">
                  Isi rekening tujuan supaya dana bisa kami kirim. Hitungan 7 hari kerja dimulai
                  setelah data ini kami terima.
                </p>
                <input
                  type="text"
                  value={refundBank}
                  onChange={(e) => setRefundBank(e.target.value)}
                  placeholder="Nama bank (mis. BCA)"
                  className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                />
                <input
                  type="text"
                  value={refundHolder}
                  onChange={(e) => setRefundHolder(e.target.value)}
                  placeholder="Nama pemilik rekening"
                  className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={refundNumber}
                  onChange={(e) => setRefundNumber(e.target.value)}
                  placeholder="Nomor rekening"
                  className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveRefundAccount}
                    disabled={refundSaving || !refundFormFilled}
                    className="bg-[#4F68AF] text-white uppercase tracking-[0.12em] text-[12px] px-4 py-2.5 hover:bg-[#2B3A67] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {refundSaving ? 'Menyimpan...' : 'Simpan rekening'}
                  </button>
                  {savedRefundAccount && (
                    <button
                      type="button"
                      onClick={() => setRefundEditing(false)}
                      className="border border-[#E9E9EA] uppercase tracking-[0.12em] text-[12px] px-4 py-2.5 text-[#6F6F71] hover:border-[#1E1E1E] hover:text-[#1E1E1E] transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status stepper */}
        {order.orderStatus !== 'cancelled' ? (
          <div className="mt-5">
            <div className="flex items-end">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-end flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-2.5 flex items-center justify-center mb-2 ${
                        i <= currentStep ? 'bg-[#1E1E1E]' : 'border border-[#E9E9EA]'
                      }`}
                    >
                      {i < currentStep && <Check className="size-2 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-[11px] text-center leading-tight w-16 text-[#6F6F71]">{step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-4 ${i < currentStep ? 'bg-[#1E1E1E]' : 'bg-[#E9E9EA]'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-[#AE4B4B]/40 px-4 py-3 mt-5 text-[13px] text-[#AE4B4B] text-center">
            Pesanan Dibatalkan
          </div>
        )}

        <div className="mt-8 grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 flex flex-col gap-8">

        {/* Complaint status */}
        {complaint && complaint._id && (
          <Section title="Komplain">
            <div className="flex items-center gap-3">
              <MessageSquare className="size-4 text-[#6F6F71] shrink-0" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#1E1E1E]">
                  {complaint.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dikirim
                </p>
                <p className="text-[13px] text-[#6F6F71] truncate">{complaint.reason}</p>
              </div>
              <span className={`border text-[11px] uppercase tracking-[0.12em] px-2 py-1 shrink-0 ${
                COMPLAINT_STATUS_CLASS[complaint.status] ?? 'border-[#6F6F71] text-[#6F6F71]'
              }`}>
                {COMPLAINT_STATUS_LABEL[complaint.status] ?? complaint.status}
              </span>
            </div>

            {complaint.type === 'return' && complaint.status === 'awaiting_return_shipment' && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA] space-y-2">
                <p className="text-[13px] text-[#6F6F71]">
                  Retur disetujui. Kami akan memesan kurir untuk menjemput barang dari alamatmu, tanpa
                  biaya di muka. Kalau kamu lebih suka mengirim sendiri, isi data resi di bawah ini.
                </p>
                <input
                  type="text"
                  value={shipCourier}
                  onChange={(e) => setShipCourier(e.target.value)}
                  placeholder="Nama kurir (mis. JNE)"
                  className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                />
                <input
                  type="text"
                  value={shipTrackingNumber}
                  onChange={(e) => setShipTrackingNumber(e.target.value)}
                  placeholder="Nomor resi"
                  className="w-full border border-[#E9E9EA] px-3 py-2 text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E]"
                />
                <div>
                  <label className="block text-[12px] text-[#6F6F71] mb-1.5">
                    Foto resi dan kondisi barang (maks. 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setShipPhotos(e.target.files)}
                    className="text-[13px] text-[#6F6F71]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleShipReturn}
                  disabled={shipSubmitting || !shipCourier.trim() || !shipTrackingNumber.trim()}
                  className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.12em] text-[12px] px-4 py-2.5 hover:bg-[#2B3A67] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {shipSubmitting ? 'Mengirim...' : 'Saya Sudah Mengirim Barang'}
                </button>
              </div>
            )}

            {complaint.type === 'return' && ['return_shipped', 'return_received'].includes(complaint.status) && complaint.returnShipment && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA]">
                <p className="text-[13px] text-[#1E1E1E]">
                  {complaint.returnShipment.bookedBy === 'merchant'
                    ? 'Kurir dipesan Katiga untuk menjemput dari alamatmu'
                    : 'Kamu mengirim barang dengan kurir sendiri'}
                </p>
                <p className="text-[13px] text-[#6F6F71] mt-0.5">
                  {complaint.returnShipment.courier.toUpperCase()}
                  {complaint.returnShipment.trackingNumber ? ` — ${complaint.returnShipment.trackingNumber}` : ''}
                </p>
                <p className="text-[13px] text-[#6F6F71] mt-0.5">
                  {complaint.status === 'return_received' ? 'Barang sudah diterima admin.' : 'Menunggu verifikasi admin.'}
                </p>
              </div>
            )}

            {complaint.status === 'resolved' && complaint.resolution?.type && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA]">
                <p className="text-[13px] text-[#1E1E1E]">
                  {complaint.resolution.type === 'refund' ? 'Dana Dikembalikan' : 'Barang Diganti'}
                </p>
                {complaint.resolution.note && (
                  <p className="text-[13px] text-[#6F6F71] mt-0.5">{complaint.resolution.note}</p>
                )}
                {complaint.resolution.type === 'refund' && (
                  <>
                    {(complaint.resolution.refundAmount ?? 0) > 0 && (
                      <p className="text-[13px] text-[#6F6F71] mt-0.5">
                        Nominal refund {fmt(complaint.resolution.refundAmount ?? 0)}
                        {(complaint.resolution.returnShippingDeducted ?? 0) > 0
                          ? ` — sudah dipotong ongkir retur ${fmt(complaint.resolution.returnShippingDeducted ?? 0)}`
                          : ''}
                      </p>
                    )}
                    {order.paymentStatus === 'refund_pending' && (
                      <p className="text-[13px] text-[#6F6F71] mt-0.5">
                        {savedRefundAccount
                          ? `Dana sedang diproses menuju rekening ${savedRefundAccount.bankName} yang kamu isi di atas.`
                          : 'Isi rekening tujuan refund di bagian atas halaman ini supaya dana bisa kami kirim.'}
                      </p>
                    )}
                  </>
                )}
                {complaint.resolution.type === 'replace' && !complaint.outboundShipment?.trackingCode && (
                  <p className="text-[13px] text-[#6F6F71] mt-0.5">
                    Barang pengganti sedang disiapkan. Nomor resi muncul di sini setelah kurir menjemput.
                  </p>
                )}
              </div>
            )}

            {complaint.outboundShipment?.trackingCode && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA]">
                <p className="text-[13px] text-[#1E1E1E]">
                  {complaint.outboundShipment.kind === 'replacement'
                    ? 'Barang pengganti dikirim'
                    : 'Barang retur dikirim balik ke alamatmu'}
                </p>
                <div className="flex items-center gap-2 mt-2 px-3 py-2 border border-[#E9E9EA]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#6F6F71] uppercase tracking-[0.1em]">
                      Resi — {complaint.outboundShipment.courier.toUpperCase()}
                    </p>
                    <p className="text-[13px] text-[#1E1E1E] font-mono truncate">
                      {complaint.outboundShipment.trackingCode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(complaint.outboundShipment?.trackingCode ?? '')}
                    className="text-[12px] uppercase tracking-[0.08em] text-[#6F6F71] border border-[#E9E9EA] px-2 py-1 hover:text-[#1E1E1E] hover:border-[#1E1E1E]/40 transition-colors shrink-0 cursor-pointer"
                  >
                    Salin
                  </button>
                </div>
              </div>
            )}

            {complaint.status === 'resolved' && !complaint.resolution?.type && complaint.adminNote && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA]">
                <p className="text-[13px] text-[#1E1E1E]">Komplain Diselesaikan</p>
                <p className="text-[13px] text-[#6F6F71] mt-0.5">{complaint.adminNote}</p>
              </div>
            )}

            {complaint.status === 'rejected' && complaint.adminNote && (
              <div className="mt-4 pt-4 border-t border-[#E9E9EA]">
                <p className="text-[13px] text-[#1E1E1E]">Alasan Penolakan</p>
                <p className="text-[13px] text-[#6F6F71] mt-0.5">{complaint.adminNote}</p>
              </div>
            )}
          </Section>
        )}

        {/* Tracking */}
        {hasTrackingSection && (
          <Section title="Pelacakan">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-[#6F6F71] shrink-0" strokeWidth={1.5} />
                  <p
                    className={`text-[13px] ${
                      isProblemShipmentStatus(latestShipmentStatus) ? 'text-[#AE4B4B]' : 'text-[#1E1E1E]'
                    }`}
                  >
                    {latestShipmentStatus
                      ? shipmentStatusLabel(latestShipmentStatus)
                      : 'Menunggu kurir memperbarui status'}
                  </p>
                </div>
                {(tracking?.courier?.company || order.shippingCourier) && (
                  <p className="text-[13px] text-[#6F6F71] mt-1">
                    {(tracking?.courier?.company ?? order.shippingCourier).toUpperCase()}
                    {tracking?.courier?.tracking_id || order.biteshipTrackingCode
                      ? ` — ${tracking?.courier?.tracking_id ?? order.biteshipTrackingCode}`
                      : ''}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleLoadTracking}
                disabled={trackingLoading}
                className="flex items-center gap-1.5 border border-[#E9E9EA] text-[#6F6F71] uppercase tracking-[0.1em] text-[11px] px-3 py-1.5 hover:border-[#1E1E1E] hover:text-[#1E1E1E] transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`size-3 ${trackingLoading ? 'animate-spin' : ''}`} />
                {trackingLoading ? 'Memuat' : 'Perbarui'}
              </button>
            </div>

            <div className="mt-4 border border-[#E9E9EA] p-4">
              {trackingError && (
                <p className="text-[13px] text-[#AE4B4B] mb-3">{trackingError}</p>
              )}
              {tracking?.courier?.driver_photo_url && (
                <img
                  src={tracking.courier.driver_photo_url}
                  alt="Foto kurir"
                  className="size-8 object-cover shrink-0 mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              {shipmentTimeline.length === 0 ? (
                <p className="text-[13px] text-[#6F6F71]">
                  {trackingLoading
                    ? 'Mengambil data pengiriman...'
                    : 'Belum ada pembaruan dari kurir.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {shipmentTimeline.slice().reverse().map((h, i) => (
                    <div key={`${h.status}-${h.updatedAt}-${i}`} className="flex gap-2 text-[13px]">
                      <div className="flex flex-col items-center mt-1">
                        <div className={`size-1.5 ${i === 0 ? 'bg-[#1E1E1E]' : 'bg-[#E9E9EA]'}`} />
                        {i < shipmentTimeline.length - 1 && (
                          <div className="w-px flex-1 bg-[#E9E9EA] my-1" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p
                          className={`leading-tight ${
                            isProblemShipmentStatus(h.status) ? 'text-[#AE4B4B]' : 'text-[#1E1E1E]'
                          }`}
                        >
                          {h.note || shipmentStatusLabel(h.status)}
                        </p>
                        <p className="text-[#6F6F71] mt-0.5">
                          {[h.note ? shipmentStatusLabel(h.status) : '', formatShipmentTime(h.updatedAt)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Items */}
        <Section title="Item">
          <div>
            {order.items.map((item, i) => {
              const key = item.product ? `${order._id}-${item.product}` : null
              const status = key ? reviewStatuses[key] : null
              const isReviewingThis = !!item.product
                && reviewFormItem?.orderId === order._id
                && reviewFormItem?.productId === item.product
              return (
                <div key={i} className="border-b border-[#E9E9EA] last:border-0">
                  <div className="flex items-center gap-4 py-3">
                    <img
                      src={api.getImageUrl(item.image)}
                      alt={item.name}
                      className="w-16 h-16 object-cover bg-[#F9F7F2] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="uppercase text-[13px] text-[#1E1E1E] truncate">{item.name}</p>
                      <p className="text-[13px] text-[#6F6F71]">
                        {item.variantName ? `${item.variantName} · ` : ''}{item.quantity} × {fmt(item.priceNumeric)}
                      </p>
                      {order.orderStatus === 'delivered' && status?.canReview && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewFormItem((prev) =>
                              prev?.productId === item.product ? null : { productId: item.product, orderId: order._id, productName: item.name }
                            )
                          }
                          className="mt-2 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.1em] text-[11px] px-3 py-1.5 hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer"
                        >
                          Beri Ulasan
                        </button>
                      )}
                      {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
                        <span className="mt-2 inline-block border border-[#1E1E1E] text-[11px] uppercase tracking-[0.1em] text-[#1E1E1E] px-2 py-1">
                          Sudah Diulas
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#1E1E1E] shrink-0 ml-auto">{fmt(item.subtotal)}</p>
                  </div>

                  {isReviewingThis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden border-t border-[#E9E9EA] bg-[#F9F7F2]"
                    >
                      <ReviewForm
                        productId={item.product}
                        orderId={order._id}
                        productName={item.name}
                        onClose={() => setReviewFormItem(null)}
                        onSuccess={() => {
                          setReviewStatuses((prev) => ({
                            ...prev,
                            [`${order._id}-${item.product}`]: { canReview: false, alreadyReviewed: true },
                          }))
                          setReviewFormItem(null)
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24">

        {/* Cost summary */}
        <Section title="Ringkasan Biaya">
          <div>
            <div className="flex items-center justify-between py-1.5 text-[13px] text-[#6F6F71]">
              <span>Subtotal produk</span>
              <span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-[13px] text-[#6F6F71]">
              <span>Ongkos kirim</span>
              <span>{fmt(order.shippingCost)}</span>
            </div>
            {(order.voucherDiscount ?? 0) > 0 && (
              <div className="flex items-center justify-between py-1.5 text-[13px] text-[#6F6F71]">
                <span>Diskon voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                <span>-{fmt(order.voucherDiscount ?? 0)}</span>
              </div>
            )}
            {order.paymentMethod && (
              <div className="flex items-center justify-between py-1.5 text-[13px] text-[#6F6F71]">
                <span>Metode Pembayaran</span>
                <span className="text-[#1E1E1E]">
                  {formatPaymentMethod(order.paymentMethod)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#E9E9EA] text-[13px] text-[#1E1E1E]">
              <span>Total</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
        </Section>

        {/* Actions */}
        <Section title="Aksi">
          <div className="flex flex-col gap-2.5">
            {canRepay && (
              <button
                type="button"
                onClick={handleRepay}
                disabled={paying}
                className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.12em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {paying ? 'Memproses...' : 'Bayar Sekarang'}
              </button>
            )}

            {canDownloadInvoice && (
              <a
                href={api.getOrderInvoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.12em] text-[13px] px-6 py-3 hover:bg-[#1E1E1E] hover:text-white transition-colors"
              >
                <FileText className="size-4" />
                Download Invoice
              </a>
            )}

            {canComplain && (
              <button
                type="button"
                onClick={() => setShowComplaintForm(true)}
                className="w-full flex items-center justify-center gap-2 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.12em] text-[13px] px-6 py-3 hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer"
              >
                <MessageSquare className="size-4" />
                Komplain
              </button>
            )}
            {canComplain && complaintDeadlineLabel && (
              <p className="text-[12px] text-[#6F6F71] text-center">
                Kamu dapat mengajukan komplain hingga {complaintDeadlineLabel}
              </p>
            )}
            {order.orderStatus === 'delivered' && complaintWindowExpired && complaint === null && (
              <p className="text-[12px] text-[#6F6F71] text-center">
                Batas waktu komplain untuk pesanan ini sudah berakhir
              </p>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full flex items-center justify-center gap-2 border border-[#AE4B4B] text-[#AE4B4B] uppercase tracking-[0.12em] text-[13px] px-6 py-3 hover:bg-[#AE4B4B] hover:text-white transition-colors disabled:opacity-60 cursor-pointer"
              >
                <XCircle className="size-4" />
                {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
              </button>
            )}
          </div>
        </Section>

        {/* Shipping */}
        <Section title="Pengiriman">
          <p className="text-[13px] text-[#1E1E1E]">{order.shippingAddress.recipientName}</p>
          <p className="text-[13px] text-[#6F6F71]">{order.shippingAddress.phone}</p>
          <p className="text-[13px] text-[#6F6F71] mt-1">{order.shippingAddress.street}</p>
          <p className="text-[13px] text-[#6F6F71]">
            {order.shippingAddress.areaName}{order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
          </p>
          <p className="text-[13px] text-[#6F6F71] pt-3 mt-3 border-t border-[#E9E9EA]">
            <span className="text-[#1E1E1E]">{order.shippingCourier.toUpperCase()}</span>
            {' — '}{order.shippingServiceName}
            {order.estimatedDays ? ` (${order.estimatedDays})` : ''}
          </p>
          {order.biteshipTrackingCode && ['shipped', 'delivered'].includes(order.orderStatus) && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 border border-[#E9E9EA]">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#6F6F71] uppercase tracking-[0.1em]">No. Resi</p>
                <p className="text-[13px] text-[#1E1E1E] font-mono truncate">{order.biteshipTrackingCode}</p>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(order.biteshipTrackingCode ?? '')}
                className="text-[12px] uppercase tracking-[0.08em] text-[#6F6F71] border border-[#E9E9EA] px-2 py-1 hover:text-[#1E1E1E] hover:border-[#1E1E1E]/40 transition-colors shrink-0 cursor-pointer"
              >
                Salin
              </button>
            </div>
          )}
        </Section>

        </aside>
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

    </UserLayout>
  )
}

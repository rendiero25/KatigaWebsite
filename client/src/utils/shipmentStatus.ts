import type { BiteshipTracking, Order, ShipmentEvent } from '../types/ecommerce'

// Status mentah Biteship. Jauh lebih rinci daripada enum orderStatus, dan sengaja
// dipetakan di satu tempat supaya halaman admin dan halaman pembeli tidak menerjemahkan
// status yang sama dengan kalimat berbeda.
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Pesanan kurir dikonfirmasi',
  scheduled: 'Penjemputan dijadwalkan',
  allocated: 'Kurir sudah ditugaskan',
  picking_up: 'Kurir menuju lokasi penjemputan',
  picked: 'Barang dijemput kurir',
  // Biteship memakai 'in_transit' dan 'dropping_off' untuk fase yang sama — 'in_transit'
  // yang benar-benar dikirim, diamati pada order 6a8e56c5 (JNE Reguler, 2026-08-26).
  in_transit: 'Barang dalam perjalanan',
  dropping_off: 'Barang dalam perjalanan',
  delivered: 'Barang diterima',
  on_hold: 'Pengiriman tertahan',
  courier_not_found: 'Kurir belum ditemukan',
  rejected: 'Pengiriman ditolak kurir',
  cancelled: 'Pengiriman dibatalkan',
  returned: 'Barang dikembalikan ke pengirim',
  return_in_transit: 'Barang dalam perjalanan kembali',
  disposed: 'Barang dimusnahkan',
}

// Status yang berarti pengiriman berhenti tidak normal — ditandai merah di kedua halaman.
const PROBLEM_STATUSES = new Set([
  'on_hold',
  'courier_not_found',
  'rejected',
  'cancelled',
  'returned',
  'return_in_transit',
  'disposed',
])

export function shipmentStatusLabel(status: string): string {
  if (!status) return ''
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ')
}

export function isProblemShipmentStatus(status: string): boolean {
  return PROBLEM_STATUSES.has(status)
}

// Timeline yang ditampilkan: riwayat kurir dari Biteship kalau panggilan live berhasil,
// selain itu rekaman webhook yang sudah tersimpan di order. Keduanya urut lama ke baru.
export function resolveShipmentTimeline(
  order: Pick<Order, 'shipmentHistory'>,
  tracking: BiteshipTracking | null,
): ShipmentEvent[] {
  const live = tracking?.courier?.history ?? []
  if (live.length) {
    return live.map((h) => ({ status: h.status, note: h.note, updatedAt: h.updated_at }))
  }
  return order.shipmentHistory ?? []
}

export function hasShipmentData(
  order: Pick<Order, 'shipmentHistory' | 'biteshipStatus' | 'biteshipTrackingCode' | 'biteshipOrderId'>,
): boolean {
  return Boolean(
    (order.shipmentHistory?.length ?? 0) > 0 ||
      order.biteshipStatus ||
      order.biteshipTrackingCode ||
      order.biteshipOrderId,
  )
}

export function formatShipmentTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

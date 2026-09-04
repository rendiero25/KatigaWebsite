import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '@/components/ui/button';
import api, { API_BASE_URL } from '../../services/api';
import {
  formatShipmentTime,
  hasShipmentData,
  isProblemShipmentStatus,
  resolveShipmentTimeline,
  shipmentStatusLabel,
} from '../../utils/shipmentStatus';
import type { Order, BiteshipTracking, Complaint } from '../../types/ecommerce';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const ORDER_STATUS_OPTIONS = [
  { value: 'awaiting_payment', label: 'Menunggu Bayar' },
  { value: 'processing',       label: 'Diproses' },
  { value: 'packing',          label: 'Dikemas' },
  { value: 'shipped',          label: 'Dikirim' },
  { value: 'delivered',        label: 'Selesai' },
  { value: 'cancelled',        label: 'Dibatalkan' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending',         label: 'Pending' },
  { value: 'paid',            label: 'Lunas' },
  { value: 'failed',          label: 'Gagal' },
  { value: 'expired',         label: 'Expired' },
  { value: 'refund_pending',  label: 'Menunggu Refund' },
  { value: 'refunded',        label: 'Refund' },
];

const ORDER_STATUS_COLOR: Record<string, string> = {
  awaiting_payment: 'bg-yellow-100 text-yellow-700',
  processing:       'bg-blue-100 text-blue-700',
  packing:          'bg-violet-100 text-violet-700',
  shipped:          'bg-indigo-100 text-indigo-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending:         'bg-yellow-100 text-yellow-700',
  paid:            'bg-green-100 text-green-700',
  failed:          'bg-red-100 text-red-700',
  expired:         'bg-gray-100 text-gray-600',
  refund_pending:  'bg-orange-100 text-orange-700',
  refunded:        'bg-purple-100 text-purple-700',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const token = localStorage.getItem('adminToken');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [shipModal, setShipModal] = useState(false);
  const [shipResi, setShipResi] = useState('');
  const [shipLoading, setShipLoading] = useState(false);
  const [fetchingResi, setFetchingResi] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [markingRefunded, setMarkingRefunded] = useState(false);
  const [refundComplaint, setRefundComplaint] = useState<Complaint | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [tracking, setTracking] = useState<BiteshipTracking | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const [form, setForm] = useState({
    orderStatus: '',
    paymentStatus: '',
    adminNote: '',
    biteshipTrackingCode: '',
  });

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setOrder(data);
        setForm({
          orderStatus: data.orderStatus ?? '',
          paymentStatus: data.paymentStatus ?? '',
          adminNote: data.adminNote ?? '',
          biteshipTrackingCode: data.biteshipTrackingCode ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  // Refund yang lahir dari resolusi retur bisa dipotong ongkir penjemputan, jadi nominal
  // yang wajib ditransfer belum tentu sama dengan total pesanan. Refund dari pembatalan
  // tidak punya komplain, dan di situ total pesanan memang angka yang benar.
  useEffect(() => {
    if (!id || order?.paymentStatus !== 'refund_pending') return;
    const load = async () => {
      setRefundLoading(true);
      setRefundError('');
      try {
        setRefundComplaint(await api.getAdminComplaintByOrder(id));
      } catch (err) {
        setRefundError(err instanceof Error ? err.message : 'Gagal memuat data komplain');
      } finally {
        setRefundLoading(false);
      }
    };
    void load();
  }, [id, order?.paymentStatus]);

  useEffect(() => {
    if (!id || !order?.biteshipOrderId) return;
    if (!['processing', 'packing', 'shipped', 'delivered'].includes(order.orderStatus)) return;
    const load = async () => {
      setTrackingLoading(true);
      setTrackingError('');
      try {
        const t = await api.getAdminOrderTracking(id);
        setTracking(t);
      } catch (err: unknown) {
        setTrackingError(err instanceof Error ? err.message : 'Gagal memuat tracking');
      } finally {
        setTrackingLoading(false);
      }
    };
    void load();
  }, [id, order?.biteshipOrderId, order?.orderStatus]);

  useEffect(() => {
    if (!shipModal || !id || !order?.biteshipOrderId) return;
    const fetch = async () => {
      setFetchingResi(true);
      try {
        const t = await api.getAdminOrderTracking(id);
        const code = t.courier?.tracking_id || t.courier?.waybill_id || '';
        if (code) setShipResi(code);
      } catch {
        // Silent — admin can input manually
      } finally {
        setFetchingResi(false);
      }
    };
    void fetch();
  }, [shipModal, id, order?.biteshipOrderId]);

  const handleAccept = async () => {
    if (!id) return;
    setAccepting(true);
    try {
      const data = await api.acceptOrder(id);
      setOrder(data);
      setForm((f) => ({ ...f, orderStatus: data.orderStatus }));
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Gagal menerima pesanan');
    } finally {
      setAccepting(false);
    }
  };

  const handleMarkRefunded = async () => {
    if (!id) return;
    const confirmed = window.confirm('Konfirmasi bahwa dana sudah ditransfer ke customer?');
    if (!confirmed) return;
    setMarkingRefunded(true);
    setSaveMsg('');
    try {
      const data = await api.updateOrderStatus(id, { paymentStatus: 'refunded' });
      setOrder(data);
      setForm((f) => ({ ...f, paymentStatus: 'refunded' }));
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Gagal menandai refund');
    } finally {
      setMarkingRefunded(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setSaveMsg('Disimpan.');
      } else {
        setSaveMsg(data.message || 'Gagal menyimpan.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShip = async () => {
    if (!id) return;
    setShipLoading(true);
    try {
      const data = await api.shipOrder(id, shipResi || undefined);
      setOrder(data);
      setForm((f) => ({ ...f, orderStatus: data.orderStatus }));
      setShipModal(false);
      setShipResi('');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Gagal mengirim pesanan');
      setShipModal(false);
    } finally {
      setShipLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!id) return;
    setDelivering(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderStatus: 'delivered' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setForm((f) => ({ ...f, orderStatus: data.orderStatus }));
      } else {
        setSaveMsg(data.message || 'Gagal mengubah status');
      }
    } catch {
      setSaveMsg('Gagal mengubah status');
    } finally {
      setDelivering(false);
    }
  };

  const handleSyncBiteship = async () => {
    if (!id) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const data = await api.syncBiteshipOrder(id);
      setOrder(data);
      setSyncMsg(
        data.biteshipTrackingCode
          ? `Resi tersinkron: ${data.biteshipTrackingCode}`
          : 'Sinkron berhasil, resi belum tersedia dari kurir.'
      );
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Gagal sinkronisasi dengan Biteship');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <AdminLayout title="Detail Pesanan"><p className="text-gray-400">Memuat...</p></AdminLayout>;
  if (!order) return <AdminLayout title="Detail Pesanan"><p className="text-gray-400">Pesanan tidak ditemukan.</p></AdminLayout>;

  const osColor = ORDER_STATUS_COLOR[order.orderStatus] ?? 'bg-gray-100 text-gray-600';
  const psColor = PAYMENT_STATUS_COLOR[order.paymentStatus] ?? 'bg-gray-100 text-gray-600';

  // Sama dengan aturan di daftar pesanan: resi baru dicetak setelah "Terima & Mulai Kemas".
  const canPrintLabel = ['packing', 'shipped', 'delivered'].includes(order.orderStatus);

  const shipmentTimeline = resolveShipmentTimeline(order, tracking);
  const latestShipmentStatus = order.biteshipStatus
    || shipmentTimeline[shipmentTimeline.length - 1]?.status
    || '';

  const refundResolution = refundComplaint?.resolution?.type === 'refund' ? refundComplaint.resolution : null;
  const refundAmount = refundResolution?.refundAmount ?? order.total;
  const refundDeducted = refundResolution?.returnShippingDeducted ?? 0;

  return (
    <AdminLayout title="Detail Pesanan">
      <div className="mb-4">
        <Link to="/admin/orders" className="text-sm text-indigo-600 hover:text-indigo-800">← Kembali ke Pesanan</Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — order info */}
        <div className="xl:col-span-2 space-y-6">

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 font-mono mb-1">#{order._id.toUpperCase()}</p>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${psColor}`}>{PAYMENT_STATUS_OPTIONS.find(o => o.value === order.paymentStatus)?.label ?? order.paymentStatus}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${osColor}`}>{ORDER_STATUS_OPTIONS.find(o => o.value === order.orderStatus)?.label ?? order.orderStatus}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Customer</h2>
            <p className="font-medium text-gray-900">{order.customerSnapshot.name}</p>
            <p className="text-sm text-gray-500">{order.customerSnapshot.email}</p>
            {order.customerSnapshot.phone && <p className="text-sm text-gray-500">{order.customerSnapshot.phone}</p>}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Produk</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 font-medium text-right">Harga</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-800">{item.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{fmt(item.priceNumeric)}</td>
                    <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Ongkir ({order.shippingCourier?.toUpperCase()} — {order.shippingServiceName})</span><span>{fmt(order.shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100"><span>Total</span><span>{fmt(order.total)}</span></div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Pengiriman</h2>
            <p className="text-sm text-gray-800 font-medium">{order.shippingAddress.recipientName}</p>
            <p className="text-sm text-gray-600">{order.shippingAddress.phone}</p>
            <p className="text-sm text-gray-600 mt-1">{order.shippingAddress.street}</p>
            <p className="text-sm text-gray-600">{order.shippingAddress.areaName} {order.shippingAddress.postalCode}</p>
            <p className="text-sm text-gray-700 font-medium mt-2">{order.shippingCourier?.toUpperCase()} — {order.shippingServiceName}</p>
            {order.estimatedDays && <p className="text-sm text-gray-500">{order.estimatedDays}</p>}
            {order.biteshipTrackingCode && (
              <p className="text-sm text-gray-700 mt-2">Resi: <span className="font-bold">{order.biteshipTrackingCode}</span></p>
            )}
            {order.biteshipOrderId && (
              <p className="text-xs text-gray-400 mt-1">Biteship Order ID: {order.biteshipOrderId}</p>
            )}
            {['processing', 'packing', 'shipped', 'delivered'].includes(order.orderStatus) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={handleSyncBiteship}
                  disabled={syncing}
                  className="w-full text-sm font-medium"
                >
                  {syncing ? 'Sinkronisasi...' : 'Sync Biteship (Ambil Resi)'}
                </Button>
                <p className="text-xs text-gray-400 mt-2">
                  Gunakan jika resi/AWB tidak otomatis tersinkron dari Biteship.
                </p>
                {syncMsg && (
                  <p className={`text-xs text-center mt-2 ${syncMsg.startsWith('Gagal') ? 'text-red-600' : 'text-green-600'}`}>
                    {syncMsg}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tracking timeline — terbuka sendiri begitu pengiriman punya data */}
          {hasShipmentData(order) && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-700">Status Pengiriman</h2>
                {order.biteshipTrackingCode && (
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 select-all">
                    {order.biteshipTrackingCode}
                  </span>
                )}
              </div>
              <p
                className={`text-sm font-medium mb-3 ${
                  isProblemShipmentStatus(latestShipmentStatus) ? 'text-red-600' : 'text-gray-800'
                }`}
              >
                {latestShipmentStatus
                  ? shipmentStatusLabel(latestShipmentStatus)
                  : 'Menunggu pembaruan dari kurir'}
                {latestShipmentStatus && (
                  <span className="ml-2 text-xs font-mono text-gray-400">{latestShipmentStatus}</span>
                )}
              </p>
              {trackingError && <p className="text-xs text-red-500 mb-2">{trackingError}</p>}
              {(tracking?.courier?.company || order.shippingCourier) && (
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {(tracking?.courier?.company ?? order.shippingCourier).toUpperCase()}
                  {tracking?.courier?.tracking_id ? ` — ${tracking.courier.tracking_id}` : ''}
                </p>
              )}
              {shipmentTimeline.length === 0 ? (
                <p className="text-xs text-gray-400">
                  {trackingLoading ? 'Memuat tracking...' : 'Data tracking belum tersedia.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {shipmentTimeline.slice().reverse().map((h, i) => (
                    <div key={`${h.status}-${h.updatedAt}-${i}`} className="flex gap-2 text-xs">
                      <div className="flex flex-col items-center mt-0.5">
                        <div
                          className={`size-2 rounded-full ${
                            isProblemShipmentStatus(h.status)
                              ? 'bg-red-500'
                              : i === 0
                                ? 'bg-indigo-600'
                                : 'bg-gray-300'
                          }`}
                        />
                        {i < shipmentTimeline.length - 1 && (
                          <div className="w-px flex-1 bg-gray-200 my-1" />
                        )}
                      </div>
                      <div className="pb-2">
                        <p className="text-gray-800 font-medium leading-tight">
                          {h.note || shipmentStatusLabel(h.status)}
                        </p>
                        <p className="text-gray-400 mt-0.5">
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
          )}

          {/* Pembayaran */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Pembayaran</h2>
            {order.orderCode && <p className="text-sm text-gray-600">Kode Pesanan: <span className="font-mono">{order.orderCode}</span></p>}
            {order.paymentMethod && <p className="text-sm text-gray-600">Metode: {order.paymentMethod}</p>}
            {order.paymentStatus === 'refund_pending' && (
              <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                {refundLoading ? (
                  <p className="text-sm text-yellow-800">Menghitung nominal refund...</p>
                ) : refundError ? (
                  <p className="text-sm text-red-700">
                    Nominal refund belum bisa dipastikan: {refundError}. Buka komplain pesanan ini
                    di menu Komplain sebelum mentransfer — retur bisa memotong ongkir penjemputan.
                  </p>
                ) : (
                  <p className="text-sm text-yellow-800">
                    Menunggu refund manual sebesar <span className="font-semibold">{fmt(refundAmount)}</span>.
                    Mayar tidak memproses refund otomatis — transfer dulu ke rekening customer.
                    {refundDeducted > 0 && (
                      <> Total pesanan {fmt(order.total)} dipotong ongkir retur {fmt(refundDeducted)}.</>
                    )}
                  </p>
                )}
                {order.refundAccount?.submittedAt ? (
                  <div className="mt-3 rounded-md bg-white border border-yellow-200 p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Rekening tujuan</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {order.refundAccount.bankName} — <span className="font-mono">{order.refundAccount.accountNumber}</span>
                    </p>
                    <p className="text-sm text-gray-600">a.n. {order.refundAccount.accountName}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-red-700">
                    Customer belum mengisi rekening tujuan. Tombol terkunci sampai datanya masuk —
                    tanpa rekening, transfer tidak bisa dilakukan.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleMarkRefunded}
                  disabled={markingRefunded || refundLoading || !order.refundAccount?.submittedAt}
                  className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {markingRefunded ? 'Menyimpan...' : 'Tandai sudah direfund'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — manual correction */}
        <div className="space-y-6">
          {/* Accept order action */}
          {order.orderStatus === 'processing' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Tindakan Cepat</h2>
              <p className="text-xs text-gray-500 mb-3">
                Terima pesanan untuk mulai proses pengemasan. Setelah diterima, customer tidak bisa membatalkan.
              </p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
              >
                {accepting ? 'Memproses...' : '✓ Terima & Mulai Kemas'}
              </Button>
            </div>
          )}

          {/* Ship action — visible when packing */}
          {order.orderStatus === 'packing' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Tindakan Cepat</h2>
              <p className="text-xs text-gray-500 mb-3">
                Konfirmasi paket diserahkan ke kurir. Nomor resi akan diambil otomatis dari Biteship jika tersedia.
              </p>
              <Button
                onClick={() => setShipModal(true)}
                disabled={shipLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                Serahkan ke Kurir
              </Button>
            </div>
          )}

          {/* Deliver action — visible when shipped, as webhook fallback */}
          {order.orderStatus === 'shipped' && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-700 mb-3">Konfirmasi Penerimaan</h2>
              <p className="text-xs text-gray-500 mb-3">
                Gunakan jika kurir sudah konfirmasi paket diterima namun status belum diperbarui otomatis.
              </p>
              <Button
                variant="outline"
                onClick={handleDeliver}
                disabled={delivering}
                className="w-full text-sm font-medium"
              >
                {delivering ? 'Memproses...' : '✓ Tandai Diterima'}
              </Button>
            </div>
          )}

          {/* Dokumen cetak */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Dokumen</h2>
            <div className="space-y-2">
              <a
                href={api.getAdminInvoiceUrl(order._id)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                Download Invoice PDF
              </a>
              {canPrintLabel && (
                <a
                  href={api.getAdminShippingLabelUrl([order._id])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  Cetak Resi (A6)
                </a>
              )}
            </div>
            {!canPrintLabel && (
              <p className="text-xs text-gray-400 mt-2">
                Resi bisa dicetak setelah pesanan diterima dan mulai dikemas.
              </p>
            )}
            {canPrintLabel && !order.biteshipTrackingCode && (
              <p className="text-xs text-gray-400 mt-2">
                Resi belum ada — label tercetak dengan kolom nomor resi kosong.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Koreksi Manual</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status Pesanan</label>
                <select
                  value={form.orderStatus}
                  onChange={(e) => setForm((f) => ({ ...f, orderStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ORDER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status Pembayaran</label>
                <select
                  value={form.paymentStatus}
                  onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PAYMENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nomor Resi (override)</label>
                <input
                  type="text"
                  value={form.biteshipTrackingCode}
                  onChange={(e) => setForm((f) => ({ ...f, biteshipTrackingCode: e.target.value }))}
                  placeholder="Isi jika perlu override"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Catatan Admin</label>
                <textarea
                  value={form.adminNote}
                  onChange={(e) => setForm((f) => ({ ...f, adminNote: e.target.value }))}
                  rows={3}
                  placeholder="Catatan internal..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>

              {saveMsg && (
                <p className={`text-sm text-center ${saveMsg === 'Disimpan.' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</p>
              )}
            </div>
          </div>

          {order.adminNote && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-medium text-yellow-700 mb-1">Catatan Admin</p>
              <p className="text-sm text-yellow-800">{order.adminNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ship confirmation modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Konfirmasi Pengiriman</h3>
            <p className="text-xs text-gray-500 mb-4">
              Masukkan nomor resi. Jika sudah terdaftar di Biteship akan diisi otomatis.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">No. Resi</label>
            <input
              type="text"
              value={shipResi}
              onChange={(e) => setShipResi(e.target.value)}
              placeholder={fetchingResi ? 'Mengambil dari Biteship...' : 'Contoh: JNE1234567'}
              disabled={fetchingResi}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShipModal(false); setShipResi(''); }}
                disabled={shipLoading}
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleShip}
                disabled={shipLoading || fetchingResi}
              >
                {shipLoading ? 'Memproses...' : 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

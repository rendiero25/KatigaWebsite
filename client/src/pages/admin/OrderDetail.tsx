import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '../../services/api';
import type { Order } from '../../types/ecommerce';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const ORDER_STATUS_OPTIONS = [
  { value: 'awaiting_payment', label: 'Menunggu Bayar' },
  { value: 'processing',       label: 'Diproses' },
  { value: 'shipped',          label: 'Dikirim' },
  { value: 'delivered',        label: 'Selesai' },
  { value: 'cancelled',        label: 'Dibatalkan' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'paid',     label: 'Lunas' },
  { value: 'failed',   label: 'Gagal' },
  { value: 'expired',  label: 'Expired' },
  { value: 'refunded', label: 'Refund' },
];

const ORDER_STATUS_COLOR: Record<string, string> = {
  awaiting_payment: 'bg-yellow-100 text-yellow-700',
  processing:       'bg-blue-100 text-blue-700',
  shipped:          'bg-indigo-100 text-indigo-700',
  delivered:        'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-700',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  paid:     'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-700',
  expired:  'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const token = localStorage.getItem('adminToken');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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

  if (loading) return <AdminLayout title="Detail Pesanan"><p className="text-gray-400">Memuat...</p></AdminLayout>;
  if (!order) return <AdminLayout title="Detail Pesanan"><p className="text-gray-400">Pesanan tidak ditemukan.</p></AdminLayout>;

  const osColor = ORDER_STATUS_COLOR[order.orderStatus] ?? 'bg-gray-100 text-gray-600';
  const psColor = PAYMENT_STATUS_COLOR[order.paymentStatus] ?? 'bg-gray-100 text-gray-600';

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
          </div>

          {/* Midtrans */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Pembayaran</h2>
            {order.midtransOrderId && <p className="text-sm text-gray-600">Midtrans Order ID: <span className="font-mono">{order.midtransOrderId}</span></p>}
            {order.midtransPaymentType && <p className="text-sm text-gray-600">Metode: {order.midtransPaymentType}</p>}
          </div>
        </div>

        {/* Right — manual correction */}
        <div className="space-y-6">
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
    </AdminLayout>
  );
}

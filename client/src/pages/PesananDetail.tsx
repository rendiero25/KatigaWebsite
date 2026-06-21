import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { Order, CanReviewResponse } from '../types/ecommerce'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import ReviewForm from '../components/ReviewForm'

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700' },
  processing:       { label: 'Diproses',            color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',              color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',              color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Dibatalkan',           color: 'bg-red-100 text-red-700' },
};

export default function PesananDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, CanReviewResponse>>({});
  const [reviewFormItem, setReviewFormItem] = useState<{
    productId: string; orderId: string; productName: string;
  } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) { navigate('/masuk'); return; }
    if (!id) return;
    api.getMyOrder(id)
      .then((data) => setOrder(data?.message ? null : data))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!order || order.orderStatus !== 'delivered') return;
    const token = localStorage.getItem('customerToken');
    if (!token) return;
    const fetchStatuses = async () => {
      const results: Record<string, CanReviewResponse> = {};
      await Promise.all(
        order.items.map(async (item) => {
          if (!item.product) return;
          const key = `${order._id}-${item.product}`;
          results[key] = await api.canReview(item.product, order._id);
        })
      );
      setReviewStatuses(results);
    };
    fetchStatuses();
  }, [order]);

  const handleRepay = () => {
    if (!order?.midtransToken) return;
    setPaying(true);
    window.snap.pay(order.midtransToken, {
      onSuccess: () => window.location.reload(),
      onPending: () => window.location.reload(),
      onError: () => { alert('Pembayaran gagal.'); setPaying(false); },
      onClose: () => setPaying(false),
    });
  };

  if (loading) return (
    <UserLayout title="Detail Pesanan">
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-black/40">Memuat...</div>
      </div>
    </UserLayout>
  )

  if (!order) return (
    <UserLayout title="Detail Pesanan">
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl font-bold text-black mb-4">Pesanan tidak ditemukan</p>
        <Link to="/pesanan" className="text-primary hover:underline">← Kembali</Link>
      </div>
    </UserLayout>
  )

  const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, color: 'bg-gray-100 text-gray-700' };
  const canRepay = order.paymentStatus === 'pending' && order.orderStatus === 'awaiting_payment' && order.midtransToken;

  return (
    <UserLayout title="Detail Pesanan">
      <div className="w-full">
        <Link to="/pesanan" className="text-sm text-black/60 hover:text-black mb-6 block">← Semua Pesanan</Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-black/50">#{order._id.slice(-8).toUpperCase()}</p>
              <h1 className="text-2xl font-bold text-black">Detail Pesanan</h1>
            </div>
            <span className={`text-sm font-medium px-4 py-1.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-5 mb-4 space-y-3">
            <h2 className="font-bold text-black mb-3">Produk</h2>
            {order.items.map((item, i) => {
              const key    = item.product ? `${order._id}-${item.product}` : null;
              const status = key ? reviewStatuses[key] : null;
              return (
                <div key={i} className="flex items-center gap-3">
                  <img src={api.getImageUrl(item.image)} alt={item.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black truncate">{item.name}</p>
                    <p className="text-sm text-black/60">{fmt(item.priceNumeric)} × {item.quantity}</p>
                    {order.orderStatus === 'delivered' && status?.canReview && (
                      <button
                        type="button"
                        onClick={() => setReviewFormItem({ productId: item.product, orderId: order._id, productName: item.name })}
                        className="mt-1 text-xs font-medium text-primary hover:underline"
                      >
                        Tulis Ulasan
                      </button>
                    )}
                    {order.orderStatus === 'delivered' && status?.alreadyReviewed && (
                      <span className="mt-1 inline-block text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Sudah Diulas
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-black shrink-0">{fmt(item.subtotal)}</p>
                </div>
              );
            })}
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl p-5 mb-4">
            <h2 className="font-bold text-black mb-3">Pengiriman</h2>
            <p className="text-sm text-black/70">{order.shippingAddress.recipientName} · {order.shippingAddress.phone}</p>
            <p className="text-sm text-black/70">{order.shippingAddress.street}</p>
            <p className="text-sm text-black/70">{order.shippingAddress.areaName} {order.shippingAddress.postalCode}</p>
            <p className="text-sm font-medium text-black mt-3">
              {order.shippingCourier?.toUpperCase()} — {order.shippingServiceName}
              {order.estimatedDays ? ` (${order.estimatedDays})` : ''}
            </p>
            {order.biteshipTrackingCode && (
              <p className="text-sm text-black mt-2">
                Nomor Resi: <span className="font-bold">{order.biteshipTrackingCode}</span>
              </p>
            )}
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl p-5 mb-4">
            <div className="flex justify-between text-sm text-black/70 mb-2">
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-black/70 mb-3">
              <span>Ongkir</span><span>{fmt(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-black border-t border-gray-100 pt-3">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
          </div>

          {canRepay && (
            <button
              onClick={handleRepay}
              disabled={paying}
              className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg transition disabled:opacity-50"
            >
              {paying ? 'Memproses...' : 'Bayar Sekarang'}
            </button>
          )}
        </div>
      <ReviewForm
        open={!!reviewFormItem}
        onClose={() => setReviewFormItem(null)}
        onSuccess={() => {
          if (!order || !reviewFormItem) return;
          const key = `${reviewFormItem.orderId}-${reviewFormItem.productId}`;
          setReviewStatuses((prev) => ({
            ...prev,
            [key]: { canReview: false, alreadyReviewed: true },
          }));
          setReviewFormItem(null);
        }}
        productId={reviewFormItem?.productId ?? ''}
        orderId={reviewFormItem?.orderId ?? ''}
        productName={reviewFormItem?.productName ?? ''}
      />
    </UserLayout>
  )
}

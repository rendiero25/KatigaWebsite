import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Order } from '../types/ecommerce';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700' },
  processing:       { label: 'Diproses',            color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',              color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',              color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Dibatalkan',           color: 'bg-red-100 text-red-700' },
};

export default function Pesanan() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('customerToken')) { navigate('/masuk?redirect=/pesanan'); return; }
    api.getMyOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <h1 className="text-3xl font-bold text-black mb-8">Pesanan Saya</h1>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl font-bold text-black mb-3">Belum ada pesanan</p>
              <Link to="/produk" className="text-primary hover:underline">Mulai belanja →</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const s = STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, color: 'bg-gray-100 text-gray-700' };
                return (
                  <Link
                    key={order._id}
                    to={`/pesanan/${order._id}`}
                    className="block bg-white rounded-2xl p-5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-black/50 mb-1">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="font-bold text-black">{fmt(order.total)}</p>
                        <p className="text-sm text-black/60 mt-1">{order.items.length} item · {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

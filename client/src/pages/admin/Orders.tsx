import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE_URL } from '../../services/api';
import type { Order, Pagination } from '../../types/ecommerce';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  awaiting_payment: { label: 'Menunggu Bayar', color: 'bg-yellow-100 text-yellow-700' },
  processing:       { label: 'Diproses',       color: 'bg-blue-100 text-blue-700' },
  shipped:          { label: 'Dikirim',         color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Selesai',         color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Dibatalkan',      color: 'bg-red-100 text-red-700' },
};

const PAYMENT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
  paid:     { label: 'Lunas',   color: 'bg-green-100 text-green-700' },
  failed:   { label: 'Gagal',   color: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expired', color: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Refund',  color: 'bg-purple-100 text-purple-700' },
};

export default function AdminOrders() {
  const token = localStorage.getItem('adminToken');
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ orderStatus: '', paymentStatus: '', search: '', page: 1 });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.orderStatus) params.set('orderStatus', filters.orderStatus);
    if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', '20');
    try {
      const res = await fetch(`${API_BASE_URL}/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.data ?? []);
      setPagination(data.pagination ?? null);
    } finally { setLoading(false); }
  }, [filters, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const setFilter = (key: string, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return (
    <AdminLayout title="Pesanan">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Cari nama customer / order ID..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <select
          value={filters.orderStatus}
          onChange={(e) => setFilter('orderStatus', e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilter('paymentStatus', e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Semua Pembayaran</option>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        {pagination && (
          <p className="ml-auto text-sm text-gray-500 self-center">
            {pagination.total} pesanan
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Order ID</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Pembayaran</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Tanggal</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Memuat...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Tidak ada pesanan</td></tr>
            ) : orders.map((order) => {
              const os = ORDER_STATUS_LABEL[order.orderStatus] ?? { label: order.orderStatus, color: 'bg-gray-100 text-gray-600' };
              const ps = PAYMENT_STATUS_LABEL[order.paymentStatus] ?? { label: order.paymentStatus, color: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">#{order._id.slice(-8).toUpperCase()}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{order.customerSnapshot.name}</p>
                    <p className="text-xs text-gray-400">{order.customerSnapshot.email}</p>
                  </td>
                  <td className="px-5 py-3 font-medium">{fmt(order.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${os.color}`}>{os.label}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <Link to={`/admin/orders/${order._id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            disabled={filters.page <= 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Hal {filters.page} / {pagination.pages}</span>
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            disabled={filters.page >= pagination.pages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

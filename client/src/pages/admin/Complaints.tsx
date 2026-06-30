import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import type { Complaint } from '../../types/ecommerce';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'open', label: 'Menunggu' },
  { value: 'processing', label: 'Diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'complaint', label: 'Komplain' },
  { value: 'return', label: 'Retur' },
];

const STATUS_COLOR: Record<string, string> = {
  open:       'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  resolved:   'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  open:       'Menunggu',
  processing: 'Diproses',
  resolved:   'Selesai',
  rejected:   'Ditolak',
};

interface ComplaintWithOrder extends Complaint {
  order: { _id: string; midtransOrderId: string; total: number };
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<ComplaintWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<ComplaintWithOrder | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (filterStatus) params.status = filterStatus;
        if (filterType) params.type = filterType;
        const res = await api.getAdminComplaints(params);
        if (!cancelled) setComplaints(res.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [filterStatus, filterType]);

  const openDetail = (c: ComplaintWithOrder) => {
    setSelected(c);
    setAdminNote(c.adminNote ?? '');
    setUpdateMsg('');
  };

  const handleUpdate = async (status: string) => {
    if (!selected) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      const updated = await api.updateComplaint(selected._id, { status, adminNote });
      setComplaints((prev) => prev.map((c) => c._id === updated._id ? { ...c, ...updated } : c));
      setSelected({ ...selected, ...updated });
      setUpdateMsg('Disimpan.');
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : 'Gagal update');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout title="Komplain & Retur">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Memuat...</p>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
          Tidak ada komplain ditemukan.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Tipe</th>
                <th className="px-4 py-3 font-medium">Alasan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {complaints.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{c.customerSnapshot.name}</p>
                    <p className="text-xs text-gray-400">{c.customerSnapshot.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.type === 'return' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.type === 'return' ? 'Retur' : 'Komplain'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-700">{c.reason}</p>
                    {typeof c.order === 'object' && c.order?.midtransOrderId && (
                      <Link
                        to={`/admin/orders/${c.order._id}`}
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        #{c.order.midtransOrderId.slice(-8).toUpperCase()}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => openDetail(c)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {selected.type === 'return' ? 'Permintaan Retur' : 'Komplain'} dari {selected.customerSnapshot.name}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[selected.status] ?? ''}`}>
                  {STATUS_LABEL[selected.status] ?? selected.status}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 size-7"
              >
                ×
              </Button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Alasan</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.reason}</p>
              </div>
              {selected.photos?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Foto Bukti</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.photos.map((p, i) => (
                      <img
                        key={i}
                        src={api.getImageUrl(p)}
                        alt={`foto ${i + 1}`}
                        className="size-20 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Catatan Admin</p>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Catatan untuk customer atau internal..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            {updateMsg && (
              <p className={`text-sm mb-3 ${updateMsg === 'Disimpan.' ? 'text-green-600' : 'text-red-600'}`}>{updateMsg}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {['open', 'processing', 'resolved', 'rejected']
                .filter((s) => s !== selected.status)
                .map((s) => (
                  <Button
                    key={s}
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdate(s)}
                    variant={s === 'rejected' ? 'destructive' : 'outline'}
                    className={s === 'resolved' ? 'border-green-300 text-green-700 hover:bg-green-50' : ''}
                  >
                    → {STATUS_LABEL[s] ?? s}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

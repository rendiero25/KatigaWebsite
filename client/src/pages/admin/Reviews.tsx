import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { API_BASE_URL } from '../../services/api';
import StarRating from '../../components/StarRating';
import { Button } from '@/components/ui/button';

interface AdminReview {
  _id: string;
  rating: number;
  comment: string;
  photos: string[];
  isVisible: boolean;
  createdAt: string;
  customerDoc: { name: string; avatar?: string };
  productDoc:  { _id: string; name: string };
}

interface AdminReviewsResponse {
  reviews: AdminReview[];
  total: number;
  page: number;
  pages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminReviews() {
  const token = localStorage.getItem('adminToken');
  const [reviews, setReviews]         = useState<AdminReview[]>([]);
  const [pagination, setPagination]   = useState<{ total: number; pages: number; page: number } | null>(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterVisible, setFilterVisible] = useState('');
  const [page, setPage]               = useState(1);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const fetchReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (search)        params.set('search',    search);
      if (filterRating)  params.set('rating',    filterRating);
      if (filterVisible) params.set('isVisible', filterVisible);
      const res = await fetch(`${API_BASE_URL}/admin/reviews?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: AdminReviewsResponse = await res.json();
      setReviews(data.reviews || []);
      setPagination({ total: data.total, pages: data.pages, page: data.page });
    } finally {
      setLoading(false);
    }
  }, [token, search, filterRating, filterVisible]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchReviews(1); setPage(1); }, [fetchReviews]);

  const toggleVisibility = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${id}/visibility`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReviews((prev) =>
      prev.map((r) => (r._id === id ? { ...r, isVisible: data.isVisible } : r))
    );
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('Hapus ulasan ini secara permanen?')) return;
    await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setReviews((prev) => prev.filter((r) => r._id !== id));
    setPagination((prev) => prev ? { ...prev, total: prev.total - 1 } : prev);
  };

  return (
    <AdminLayout title="Ulasan Produk">
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Cari produk atau customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[180px]"
          />
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Bintang</option>
            ))}
          </select>
          <select
            value={filterVisible}
            onChange={(e) => setFilterVisible(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Status</option>
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </div>

        {/* Stats */}
        {pagination && (
          <p className="text-sm text-gray-500">{pagination.total} ulasan</p>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Komentar</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Foto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">Memuat...</td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada ulasan</td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <React.Fragment key={review._id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === review._id ? null : review._id)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">
                          {review.productDoc?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">
                          {review.customerDoc?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StarRating value={review.rating} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                          {review.comment
                            ? review.comment.slice(0, 80) + (review.comment.length > 80 ? '…' : '')
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {review.photos.length > 0 ? `${review.photos.length} foto` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            review.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {review.isVisible ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => toggleVisibility(review._id)}
                              className={review.isVisible ? '' : 'border-green-200 text-green-700 hover:bg-green-50'}
                            >
                              {review.isVisible ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => deleteReview(review._id)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expandedId === review._id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            {review.comment && (
                              <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">{review.comment}</p>
                            )}
                            {review.photos.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {review.photos.map((photo, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setLightboxSrc(photo)}
                                    className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                                  >
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!review.comment && review.photos.length === 0 && (
                              <p className="text-sm text-gray-400">Tidak ada komentar atau foto.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); fetchReviews(p); }}
            >
              ← Sebelumnya
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => { const p = page + 1; setPage(p); fetchReviews(p); }}
            >
              Berikutnya →
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Foto ulasan" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </AdminLayout>
  );
}

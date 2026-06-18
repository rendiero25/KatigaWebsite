import { useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useMyReviews } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function UlasanSaya() {
  const [page, setPage] = useState(1)
  const { data, loading, error } = useMyReviews(page)

  const reviews = data?.reviews ?? []
  const pages = data?.pages ?? 1
  const total = data?.total ?? 0

  return (
    <UserLayout title="Ulasan Saya">
      <div className="w-full space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ulasan Saya</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? '...' : `${total} ulasan`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex gap-4">
                  <div className="size-16 bg-gray-200 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-3/4 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="size-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Belum ada ulasan</p>
            <p className="text-gray-400 text-sm mt-1">
              Selesaikan pembelian dan bagikan pengalamanmu!
            </p>
            <Link
              to="/produk"
              className="mt-6 inline-flex items-center px-6 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm font-medium rounded-full hover:opacity-90 transition"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3"
                >
                  <div className="flex gap-4">
                    <Link to={`/produk/${review.product._id}`} className="shrink-0">
                      <img
                        src={api.getImageUrl(review.product.image)}
                        alt={review.product.name}
                        className="size-16 rounded-xl object-cover bg-gray-100"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/produk/${review.product._id}`}
                          className="text-sm font-semibold text-gray-900 leading-tight hover:text-primary transition line-clamp-2"
                        >
                          {review.product.name}
                        </Link>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <StarRating rating={review.rating} />
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-gray-500">
                  Halaman {page} dari {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  )
}

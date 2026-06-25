import { useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useMyReviews } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import { Skeleton } from '@/components/ui/skeleton'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
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
      <div className="w-full">
        {!loading && !error && (
          <p className="text-xs text-[#9A9A9A] mb-4">{total} ulasan</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-12 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2 rounded" />
                  <Skeleton className="h-3 w-1/4 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-[#9A9A9A] py-8 text-center">Gagal memuat ulasan.</p>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="size-10 text-[#D0D0CC] mb-3" />
            <p className="text-sm font-medium text-[#4A4A4A]">Belum ada ulasan</p>
            <p className="text-xs text-[#9A9A9A] mt-1">Selesaikan pembelian dan bagikan pengalamanmu!</p>
            <Link
              to="/produk"
              className="mt-4 border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors"
            >
              Mulai Berbelanja
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[#E8E8E5] bg-white overflow-hidden">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-[#F0F0EC] last:border-0"
                >
                  <Link to={`/produk/${review.product._id}`} className="shrink-0">
                    <img
                      src={api.getImageUrl(review.product.image)}
                      alt={review.product.name}
                      className="size-12 rounded-md object-cover bg-[#F7F7F5] shrink-0"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produk/${review.product._id}`}
                      className="text-sm font-medium text-[#1F1F1F] truncate block hover:underline"
                    >
                      {review.product.name}
                    </Link>
                    <div className="mt-0.5">
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-xs text-[#9A9A9A] mt-1 line-clamp-2">{review.comment}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#9A9A9A] shrink-0 ml-2 mt-0.5">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center gap-1 mt-4 justify-center">
                {Array.from({ length: pages }).map((_, i) => {
                  const pageNum = i + 1
                  const isActive = pageNum === page
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`size-8 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-[#1F1F1F] text-white'
                          : 'text-[#4A4A4A] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  )
}

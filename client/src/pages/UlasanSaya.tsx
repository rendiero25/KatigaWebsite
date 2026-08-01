import { useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useMyReviews } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import StarRating from '../components/StarRating'
import { Skeleton } from '@/components/ui/skeleton'

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
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-2">{total} ulasan</p>
        )}

        {loading ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-5 border-b border-[#E9E9EA]">
                <Skeleton className="size-12 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-[13px] text-[#6F6F71] py-8 text-center">Gagal memuat ulasan.</p>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="size-8 text-[#D0D0CC] mb-3" />
            <p className="text-[13px] uppercase text-[#1E1E1E]">Belum ada ulasan</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Selesaikan pembelian dan bagikan pengalamanmu!</p>
            <Link
              to="/produk"
              className="mt-6 border border-[#E9E9EA] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#F9F7F2] transition-colors"
            >
              Mulai Berbelanja
            </Link>
          </div>
        ) : (
          <>
            <div>
              {reviews.map((review) => (
                <div key={review._id} className="flex items-start gap-3 py-5 border-b border-[#E9E9EA]">
                  <Link to={`/produk/${review.product._id}`} className="shrink-0">
                    <img
                      src={api.getImageUrl(review.product.image)}
                      alt={review.product.name}
                      className="size-12 object-cover bg-[#F9F7F2] shrink-0"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produk/${review.product._id}`}
                      className="uppercase text-[13px] text-[#1E1E1E] truncate block hover:underline"
                    >
                      {review.product.name}
                    </Link>
                    <div className="mt-1.5">
                      <StarRating value={review.rating} size="sm" />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[#6F6F71] leading-relaxed mt-2 line-clamp-2">
                        {review.comment}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] shrink-0 ml-2 mt-0.5">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center gap-1 mt-8 justify-center">
                {Array.from({ length: pages }).map((_, i) => {
                  const pageNum = i + 1
                  const isActive = pageNum === page
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`size-8 text-sm transition-colors ${
                        isActive
                          ? 'bg-[#1E1E1E] text-white'
                          : 'text-[#6F6F71] hover:bg-[#F9F7F2]'
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

import { useState } from 'react';
import type { Review } from '../types/ecommerce';
import StarRating from './StarRating';
import api from '../services/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Props {
  review: Review;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ReviewCard({ review }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      <div className="py-5 border-b border-gray-100 last:border-0">
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0 [&::after]:hidden">
            {review.customer.avatar && (
              <AvatarImage src={api.getImageUrl(review.customer.avatar)} alt={review.customer.name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-semibold">
              {initials(review.customer.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{review.customer.name}</p>
              <p className="text-xs text-gray-400 shrink-0">{formatDate(review.createdAt)}</p>
            </div>
            <StarRating value={review.rating} size="sm" />
            {review.comment && (
              <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {review.comment}
              </p>
            )}
            {review.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {review.photos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxSrc(api.getImageUrl(photo))}
                    className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-zoom-in"
                  >
                    <img
                      src={api.getImageUrl(photo)}
                      alt={`Foto ulasan ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Foto ulasan"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Camera, Loader2, Check } from 'lucide-react';

import api from '../services/api';
import StarRating from './StarRating';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  orderId: string;
  productName: string;
}

const RATING_HINT: Record<number, string> = {
  1: 'Sangat kurang',
  2: 'Kurang sesuai',
  3: 'Cukup baik',
  4: 'Bagus',
  5: 'Sangat puas',
};

export default function ReviewForm({ onClose, onSuccess, productId, orderId, productName }: Props) {
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [photos, setPhotos]         = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Maksimal 5 foto');
      return;
    }
    const newFiles    = [...photos, ...files].slice(0, 5);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPhotos(newFiles);
    setPreviews(newPreviews);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Pilih rating bintang terlebih dahulu'); return; }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('orderId',   orderId);
      formData.append('rating',    String(rating));
      formData.append('comment',   comment.trim());
      photos.forEach((f) => formData.append('photos', f));
      await api.submitReview(formData);
      setSubmitted(true);
      setTimeout(onSuccess, 1100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan ulasan');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-9 text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="size-11 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <Check className="size-5 text-emerald-600" strokeWidth={2.5} />
        </motion.div>
        <p className="text-sm font-medium text-[#1F1F1F]">Terima kasih atas ulasannya!</p>
        <p className="text-xs text-[#9A9A9A]">Ulasanmu membantu pembeli lain menentukan pilihan</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1F1F1F]">Bagikan pengalamanmu</p>
          <p className="text-xs text-[#9A9A9A] truncate mt-0.5">{productName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 size-7 rounded-full flex items-center justify-center text-[#9A9A9A] hover:bg-[#EFEFEA] hover:text-[#4A4A4A] transition-colors"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Star rating */}
        <div>
          <p className="text-xs font-medium text-[#4A4A4A] mb-1.5">Rating</p>
          <div className="flex items-center gap-3">
            <StarRating value={rating} interactive onChange={setRating} size="lg" />
            <span className="text-xs text-[#9A9A9A]">{rating > 0 ? RATING_HINT[rating] : ''}</span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <p className="text-xs font-medium text-[#4A4A4A] mb-1.5">
            Komentar <span className="text-[#B8B8B4] font-normal">(opsional)</span>
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            placeholder="Ceritakan pengalamanmu dengan produk ini..."
            className="resize-none h-24 bg-white border-[#E8E8E5] focus-visible:border-[#4F68AF] text-sm"
          />
          <p className="text-[11px] text-[#B8B8B4] text-right mt-1">{comment.length}/1000</p>
        </div>

        {/* Photo upload */}
        <div>
          <p className="text-xs font-medium text-[#4A4A4A] mb-1.5">
            Foto <span className="text-[#B8B8B4] font-normal">(opsional, maks 5)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative size-16">
                <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-[#E8E8E5]" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 size-5 bg-[#1F1F1F] text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="size-16 rounded-lg border-2 border-dashed border-[#E0E0DA] flex flex-col items-center justify-center text-[#9A9A9A] hover:border-[#4F68AF] hover:text-[#4F68AF] transition-colors text-[11px] gap-1"
              >
                <Camera className="size-4" />
                <span>Foto</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={submitting || rating === 0}
            className="flex-1 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white border-0"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Kirim Ulasan'}
          </Button>
        </div>
      </form>
    </div>
  );
}

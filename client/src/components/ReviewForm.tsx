import { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import api from '../services/api';
import StarRating from './StarRating';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  orderId: string;
  productName: string;
}

export default function ReviewForm({ open, onClose, onSuccess, productId, orderId, productName }: Props) {
  const [rating, setRating]         = useState(0);
  const [comment, setComment]       = useState('');
  const [photos, setPhotos]         = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRating(0);
    setComment('');
    setPhotos([]);
    setPreviews([]);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

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
      reset();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-6 py-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold text-gray-900">
            Tulis Ulasan
          </SheetTitle>
          <p className="text-sm text-gray-500 truncate">{productName}</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star rating */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Rating</p>
            <StarRating value={rating} interactive onChange={setRating} size="lg" />
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Komentar <span className="text-gray-400 font-normal">(opsional)</span>
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Ceritakan pengalamanmu dengan produk ini..."
              className="resize-none h-28 border-gray-200 focus-visible:border-primary"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/1000</p>
          </div>

          {/* Photo upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Foto <span className="text-gray-400 font-normal">(opsional, maks 5)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition text-xs gap-1"
                >
                  <Camera className="size-4" />
                  <span>Tambah</span>
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
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={handleClose}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 rounded-full bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white border-0"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Kirim Ulasan'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  productId: string
  inWishlist: boolean
  onToggle: (productId: string, inWishlist: boolean) => void
  size?: 'sm' | 'md'
  redirectTo?: string
  /** 'pill' keeps the white rounded background; 'bare' is the flat icon used by the redesigned catalogue. */
  variant?: 'pill' | 'bare'
}

const variantClasses: Record<'pill' | 'bare', string> = {
  pill: 'w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white',
  bare: 'w-8 h-8 drop-shadow-md',
}

export default function WishlistButton({
  productId,
  inWishlist,
  onToggle,
  size = 'sm',
  redirectTo,
  variant = 'pill',
}: Props) {
  const navigate = useNavigate()
  const iconSize = size === 'sm' ? 14 : 16

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!localStorage.getItem('customerToken')) {
      navigate(redirectTo ? `/masuk?redirect=${encodeURIComponent(redirectTo)}` : '/masuk')
      return
    }
    onToggle(productId, inWishlist)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={inWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      className={`absolute top-3 right-3 z-10 flex items-center justify-center transition cursor-pointer ${variantClasses[variant]}`}
    >
      <Heart
        size={iconSize}
        className={
          inWishlist
            ? 'fill-red-500 text-red-500'
            : variant === 'bare'
              ? 'text-white'
              : 'text-gray-400'
        }
      />
    </button>
  )
}

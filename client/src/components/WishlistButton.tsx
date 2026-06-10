import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  productId: string
  inWishlist: boolean
  onToggle: (productId: string, inWishlist: boolean) => void
  size?: 'sm' | 'md'
}

export default function WishlistButton({ productId, inWishlist, onToggle, size = 'sm' }: Props) {
  const navigate = useNavigate()
  const iconSize = size === 'sm' ? 14 : 16

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!localStorage.getItem('customerToken')) {
      navigate('/masuk')
      return
    }
    onToggle(productId, inWishlist)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={inWishlist ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm transition hover:bg-white cursor-pointer"
    >
      <Heart
        size={iconSize}
        className={inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}
      />
    </button>
  )
}

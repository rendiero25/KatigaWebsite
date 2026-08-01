import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import WishlistButton from '../components/WishlistButton'
import { Skeleton } from '@/components/ui/skeleton'

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function WishlistSaya() {
  const { wishlist, wishlistIds, loading, remove } = useWishlist()

  const handleToggle = (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      remove(productId)
    }
  }

  return (
    <UserLayout title="Wishlist">
      <div className="w-full">
        {!loading && (
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-6">
            {wishlist.length} produk tersimpan
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square w-full mb-4" />
                <Skeleton className="h-3.5 w-3/4 mb-2" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="size-8 text-[#D0D0CC] mb-3" />
            <p className="text-[13px] uppercase text-[#1E1E1E]">Belum ada produk di wishlist</p>
            <p className="text-[13px] text-[#6F6F71] mt-1">Mulai jelajahi produk kami</p>
            <Link
              to="/produk"
              className="border border-[#E9E9EA] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#F9F7F2] transition-colors mt-6 inline-block"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-12">
            {wishlist.map((product) => (
              <Link key={product._id} to={`/produk/${product._id}`} className="group block">
                <div className="relative w-full aspect-square bg-[#F9F7F2] overflow-hidden mb-4">
                  <img
                    src={api.getImageUrl(
                      (product.images && product.images.length > 0)
                        ? product.images[0]
                        : product.image
                    )}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />
                  <WishlistButton
                    variant="bare"
                    productId={product._id}
                    inWishlist={wishlistIds.has(product._id)}
                    onToggle={handleToggle}
                  />
                </div>
                <h3 className="uppercase text-[13px] text-[#1E1E1E] mb-1">{product.name}</h3>
                {product.priceNumeric > 0 && (
                  <p className="text-[13px] text-[#6F6F71]">{formatRp(product.priceNumeric)}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}

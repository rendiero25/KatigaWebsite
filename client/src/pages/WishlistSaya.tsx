import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import WishlistButton from '../components/WishlistButton'
import { Skeleton } from '@/components/ui/skeleton'

export default function WishlistSaya() {
  const { wishlist, wishlistIds, loading, remove } = useWishlist()

  const handleToggle = (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      remove(productId)
    }
  }

  return (
    <UserLayout title="Wishlist">
      <div className="w-full space-y-4">
        {!loading && (
          <p className="text-xs text-[#9A9A9A] mb-4">{wishlist.length} produk tersimpan</p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-lg mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="size-10 text-[#D0D0CC] mb-3" />
            <p className="text-sm font-medium text-[#4A4A4A]">Belum ada produk di wishlist</p>
            <p className="text-xs text-[#9A9A9A] mt-1">Mulai jelajahi produk kami</p>
            <Link
              to="/produk"
              className="border border-[#E8E8E5] text-[#4A4A4A] text-sm rounded-md px-4 py-2 hover:bg-[#F7F7F5] transition-colors mt-4 inline-block"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div key={product._id} className="group">
                <Link to={`/produk/${product._id}`} className="block">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-[#F7F7F5] mb-2">
                    <img
                      src={api.getImageUrl(
                        (product.images && product.images.length > 0)
                          ? product.images[0]
                          : product.image
                      )}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <WishlistButton
                      productId={product._id}
                      inWishlist={wishlistIds.has(product._id)}
                      onToggle={handleToggle}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1F1F1F] line-clamp-2 leading-tight h-10 overflow-hidden mt-2">
                    {product.name}
                  </h3>
                  {product.priceNumeric > 0 && (
                    <p className="text-sm font-bold text-[#1F1F1F] mt-1">
                      Rp {product.priceNumeric.toLocaleString('id-ID')}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}

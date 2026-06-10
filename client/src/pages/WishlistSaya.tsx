import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWishlist } from '../hooks/useApi'
import api from '../services/api'
import UserLayout from '../components/UserLayout'
import WishlistButton from '../components/WishlistButton'

export default function WishlistSaya() {
  const { wishlist, wishlistIds, loading, remove } = useWishlist()

  const handleToggle = (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      remove(productId)
    }
  }

  return (
    <UserLayout title="Wishlist">
      <div className="w-full space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Wishlist Saya</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? '...' : `${wishlist.length} produk tersimpan`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-2xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="size-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Belum ada produk di wishlist</p>
            <p className="text-gray-400 text-sm mt-1">Mulai jelajahi produk kami</p>
            <Link
              to="/produk"
              className="mt-6 inline-flex items-center px-6 py-2.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-sm font-medium rounded-full hover:opacity-90 transition"
            >
              Lihat Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((product) => (
              <div key={product._id} className="group">
                <Link to={`/produk/${product._id}`} className="block">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
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
                  <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  )
}

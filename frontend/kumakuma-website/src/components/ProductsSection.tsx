import { useProducts, useCategories } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function ProductsSection() {
  const { data: products, loading } = useProducts();
  const { data: categories } = useCategories();

  // Get featured products or first 4
  const featuredProducts = products?.filter((p: any) => p.isFeatured)?.slice(0, 4) 
    || products?.slice(0, 4) 
    || [];

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-medium text-pink-600 mb-2">Produk Kami</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Koleksi Terbaru
            </h2>
          </div>
          <Link 
            to="/produk"
            className="inline-flex items-center gap-2 text-pink-600 font-medium hover:text-pink-700 transition"
          >
            Lihat Semua Produk
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featuredProducts.map((product: any) => (
            <Link 
              key={product._id}
              to={`/produk/${product._id}`}
              className="group"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
                <img 
                  src={api.getImageUrl(product.image)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400';
                  }}
                />
                {product.isFeatured && (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-pink-600 transition">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                {product.description}
              </p>
              <p className="text-pink-600 font-semibold">
                {product.price || 'Hubungi Kami'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useProducts, useCategories } from '../hooks/useApi';
import api from '../services/api';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || undefined;
  
  const { data: products, loading: productsLoading } = useProducts({ category: categoryParam });
  const { data: categories } = useCategories();
  
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryParam);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Produk Kami</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Temukan berbagai produk berkualitas tinggi untuk kebutuhan Anda, dari bahan alami hingga solusi modern.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Kategori</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryChange(undefined)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      !selectedCategory ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Semua Produk
                  </button>
                  {categories.map((cat: any) => (
                    <button
                      key={cat._id}
                      onClick={() => handleCategoryChange(cat.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedCategory === cat.name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                  <p className="text-gray-500">Tidak ada produk ditemukan di kategori ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: any) => (
                    <Link
                      key={product._id}
                      to={`/produk/${product._id}`}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100"
                    >
                      <div className="aspect-square relative overflow-hidden bg-gray-100">
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
                      <div className="p-4">
                        <p className="text-xs text-indigo-600 font-medium mb-1">{product.category?.name || 'Umum'}</p>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900 font-bold">{product.price || 'Hubungi Kami'}</span>
                          <span className="text-sm text-indigo-600 group-hover:underline">Detail →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

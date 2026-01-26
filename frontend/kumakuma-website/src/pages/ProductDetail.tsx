import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';
import { FaWhatsapp } from 'react-icons/fa';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  useEffect(() => {
    if (id) {
      // setLoading(true); // Removed to avoid cascading render warning
      Promise.all([
        api.getProduct(id),
        api.getSiteSettings()
      ])
      .then(([productData, settingsData]) => {
        setProduct(productData);
        setSiteSettings(settingsData);
      })
      .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Produk tidak ditemukan</h2>
          <Link to="/produk" className="text-indigo-600 hover:text-indigo-800">
            &larr; Kembali ke daftar produk
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const whatsappMessage = `Halo, saya tertarik dengan produk ${product.name}. Bisakah saya mendapatkan informasi lebih lanjut?`;
  const whatsappLink = `https://wa.me/${siteSettings?.whatsapp?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-indigo-600">Beranda</Link>
            <span className="mx-2">/</span>
            <Link to="/produk" className="hover:text-indigo-600">Produk</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Image Gallery (Single Image for now) */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square md:aspect-[4/3] relative">
              <img 
                src={api.getImageUrl(product.image)}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800';
                }}
              />
              {product.isFeatured && (
                <span className="absolute top-4 left-4 px-3 py-1 bg-pink-500 text-white font-medium rounded-full">
                  Featured
                </span>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-2">
                <span className="text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full text-sm">
                  {product.category?.name || 'Kategori Umum'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              <p className="text-2xl font-bold text-gray-900 mb-6">
                {product.price || 'Hubungi untuk harga'}
              </p>
              
              <div className="prose prose-indigo text-gray-600 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deskripsi Produk</h3>
                <p className="whitespace-pre-line">{product.description}</p>
              </div>

              {product.link && (
                 <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Link Marketplace</h3>
                    <a href={product.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                      {product.link}
                    </a>
                 </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-500 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

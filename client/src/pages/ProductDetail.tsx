import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../services/api";
import { FaWhatsapp, FaShoppingCart } from "react-icons/fa";
import { addToCart } from "../utils/cart";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    if (id) {
      // setLoading(true); // Removed to avoid cascading render warning
      Promise.all([api.getProduct(id), api.getSiteSettings()])
        .then(([productData, settingsData]) => {
          setProduct(productData);
          setSiteSettings(settingsData);
          // Initialize active image
          if (productData.images && productData.images.length > 0) {
            setActiveImage(productData.images[0]);
          } else if (productData.image) {
            setActiveImage(productData.image);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex items-center justify-center">
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
        <main className="grow flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Produk tidak ditemukan
          </h2>
          <Link to="/produk" className="text-indigo-600 hover:text-indigo-800">
            &larr; Kembali ke daftar produk
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const whatsappMessage = `Halo, saya tertarik dengan produk ${product.name}. Bisakah saya mendapatkan informasi lebih lanjut?`;
  const whatsappLink = `https://wa.me/${siteSettings?.whatsapp?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow pt-20 pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="mb-6">
            <Link
              to="/produk"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Kembali ke Produk
            </Link>
          </div>

          <nav className="text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-indigo-600">
              Beranda
            </Link>
            <span className="mx-2">/</span>
            <Link to="/produk" className="hover:text-indigo-600">
              Produk
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl overflow-hidden w-full h-auto md:w-[400px] md:h-[300px] xl:w-[600px] xl:h-[550px] relative">
                <img
                  src={
                    activeImage
                      ? api.getImageUrl(activeImage)
                      : api.getImageUrl(product.image)
                  }
                  alt={product.name}
                  className="w-full h-auto md:h-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800";
                  }}
                />
                {product.isFeatured && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-pink-500 text-white font-medium rounded-full">
                    Featured
                  </span>
                )}
              </div>

              {/* Thumbnails Swiper */}
              {product.images && product.images.length > 1 && (
                <div className="w-full">
                  <Swiper
                    modules={[Navigation]}
                    spaceBetween={10}
                    slidesPerView={4}
                    navigation
                    className="w-full"
                  >
                    {product.images.map((img: string, idx: number) => (
                      <SwiperSlide key={idx}>
                        <button
                          onClick={() => setActiveImage(img)}
                          className={`cursor-pointer w-full aspect-square rounded-lg overflow-hidden border-2 transition
                            ${activeImage === img ? "border-indigo-600 ring-2 ring-indigo-600 ring-offset-2" : "border-transparent hover:border-gray-300"}
                          `}
                        >
                          <img
                            src={api.getImageUrl(img)}
                            alt={`${product.name} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-2">
                <span className="text-indigo-600 font-medium bg-indigo-50 px-3 py-1 rounded-full text-sm">
                  {product.category?.name || "Kategori Umum"}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              <p className="text-2xl font-bold text-gray-900 mb-6">
                {product.price || "Hubungi untuk harga"}
              </p>

              <div className="prose prose-indigo text-gray-600 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Deskripsi Produk
                </h3>
                <p className="whitespace-pre-line">{product.description}</p>
              </div>

              <div className="flex flex-col gap-4">
                {product.priceNumeric > 0 && (
                  <button
                    onClick={() => {
                      addToCart({
                        productId: product._id,
                        name: product.name,
                        image: product.image || (product.images?.[0] ?? ''),
                        priceNumeric: product.priceNumeric,
                        weightGrams: product.weightGrams ?? 0,
                      });
                      alert('Produk ditambahkan ke keranjang!');
                    }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <FaShoppingCart className="w-5 h-5" />
                    Tambah ke Keranjang
                  </button>
                )}



                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Products Section */}
        <section className="bg-[#F9F7F2] py-16 mt-15">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Produk Unggulan
            </h2>
            <FeaturedProducts />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    api.getProducts({ featured: true }).then((data) => {
      if (Array.isArray(data)) {
        setProducts(data);
      }
    });
  }, []);

  if (products.length === 0) return null;

  return (
    <Swiper
      modules={[Navigation]}
      spaceBetween={24}
      slidesPerView={1}
      navigation
      breakpoints={{
        640: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1024: { slidesPerView: 4 },
      }}
      className="pb-12"
    >
      {products.map((product) => (
        <SwiperSlide key={product._id} className="h-auto">
          <Link
            to={`/produk/${product._id}`}
            className="block h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group"
          >
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
              <img
                src={api.getImageUrl(product.image)}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition">
                {product.name}
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                {product.category?.name}
              </p>
              <p className="font-bold text-indigo-600">
                {product.price || "Hubungi Kami"}
              </p>
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

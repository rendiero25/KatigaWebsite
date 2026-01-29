import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useProducts } from "../hooks/useApi";
import api from "../services/api";
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(1); // 1 or 2
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Page Settings and Partners
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, partnersData] = await Promise.all([
          api.getProductPageSettings(),
          api.getPartners(),
        ]);
        setSettings(settingsData);
        setPartners(partnersData);
      } catch (error) {
        console.error("Error fetching page data:", error);
      }
    };
    fetchData();
  }, []);

  // Determine Category to fetch based on active Tab and Settings
  const currentCategoryName =
    activeTab === 1 ? settings?.category1?.name : settings?.category2?.name;

  const { data: productskumakuma, loading: productsLoading } = useProducts({
    category: currentCategoryName,
  });

  const handleTabChange = (tabIndex: number) => {
    setActiveTab(tabIndex);
    setSearchQuery("");
  };

  const currentCategoryTitle =
    activeTab === 1 ? settings?.category1?.title : settings?.category2?.title;

  const currentCategorySubtitle =
    activeTab === 1
      ? settings?.category1?.subtitle
      : settings?.category2?.subtitle;

  // Filter products based on search query
  const filteredProducts = (
    Array.isArray(productskumakuma) ? productskumakuma : []
  ).filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Header Section */}
          <div className="mb-8">
            <p className="text-gray-600 font-medium mb-2">
              {settings?.subtitle || "Produk Kualitas Dunia, Buatan Indonesia"}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight md:max-w-4xl">
              {settings?.title ||
                "Hadirkan pelukan hangat dalam setiap momen tidur dan mandi. Rangkaian produk premium yang dirancang khusus untuk mempererat ikatan kasih sayang keluarga Anda."}
            </h1>
          </div>

          {/* Trusted By Section */}
          <div className="mb-12 flex flex-wrap items-center gap-8 md:gap-12 opacity-80">
            <span className="text-sm font-medium text-gray-500 max-w-[150px] leading-tight">
              Trusted by several big company in Indonesia
            </span>
            <div className="flex flex-wrap items-center gap-8 grayscale hover:grayscale-0 transition-all duration-300">
              {partners.slice(0, 6).map((partner: any) => (
                <img
                  key={partner._id}
                  src={api.getImageUrl(partner.logo)}
                  alt={partner.name}
                  className="h-6 md:h-8 object-contain opacity-60 hover:opacity-100 transition"
                />
              ))}
            </div>
          </div>

          {/* Banner Image */}
          <div className="mb-12 w-full h-64 md:h-[400px] rounded-2xl overflow-hidden bg-gray-100">
            <img
              src={
                settings?.bannerImage
                  ? api.getImageUrl(settings?.bannerImage)
                  : "https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2070&auto=format&fit=crop"
              }
              alt="Product Banner"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Controls: Tabs & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            {/* Tabs */}
            <div className="flex items-center bg-indigo-50 p-1 rounded-full self-start md:self-auto">
              <button
                onClick={() => handleTabChange(1)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 1
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-indigo-600 hover:text-indigo-800"
                }`}
              >
                {settings?.category1?.name || "Perlengkapan Tidur Bayi"}
              </button>
              <button
                onClick={() => handleTabChange(2)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === 2
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-indigo-600 hover:text-indigo-800"
                }`}
              >
                {settings?.category2?.name || "Handuk Keluarga"}
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative flex-grow md:flex-grow-0 md:w-80">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50">
                  Category
                  <FaChevronDown className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Refined Tab logic based on visual re-check:
                 The image shows [Perlengkapan Tidur Bayi] [Handuk Keluarga]
                 "Perlengkapan Tidur Bayi" has clear background (white), text dark.
                 "Handuk Keluarga" has blue background, text white.
                 It's possible "Handuk Keluarga" is the Active one? Or they are just styled differently.
                 Given the content below says "Perlengkapan Tidur Bayi (Baby Sleep Essentials)", it implies Tab 1 is active.
                 So Active = White pill? Or maybe the blue one is just a CTA? 
                 I'll implement standard tabs: Active = Slate/Indigo, Inactive = White/Gray.
                 Let's go with: Active = Indigo-600 Text White. Inactive = Gray Text.
                 Actually, let's copy the Pill shape in the image.
                 Container: Blue-ish/Indigo-50.
                 Tab 1 (Active in screenshot context): White Bg, Blue Text.
                 Tab 2: Blue Bg, White Text.
                 
                 Wait, if Tab 1 corresponds to the content below, then Tab 1 is active. 
                 It looks like the container is Blue-ish.
                 Let's do: Container p-1. Active = bg-white text-blue. Inactive = text-blue (transparent).
              */}
          </div>

          {/* Current Category Title */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {currentCategorySubtitle || "Kenyamanan Tidur Si Kecil"}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {currentCategoryTitle ||
                "Perlengkapan Tidur Bayi (Baby Sleep Essentials)"}
            </h2>
          </div>

          {/* Product Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {filteredProducts.map((product: any) => (
                <Link
                  key={product._id}
                  to={`/produk/${product._id}`}
                  className="group block"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <img
                      src={api.getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {product.description}
                    </p>
                    <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      Beli Sekarang
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination (Visual Only for now) */}
          <div className="mt-16 flex justify-center items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-900 disabled:opacity-50">
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-gray-900">1</span>
            <span className="text-gray-400">2</span>
            <span className="text-gray-400">3</span>
            <button className="p-2 text-gray-400 hover:text-gray-900">
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom CTA Section */}
          <div className="mt-20 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 md:p-12 md:flex items-center justify-between">
            <div className="mb-6 md:mb-0 md:max-w-xl">
              <p className="text-sm font-bold text-gray-500 mb-2">
                Gratis Konsultasi
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi
                bagian dari Keluarga Kuma Kuma?
              </h3>
              <p className="text-gray-600">
                Tim kami siap membantu Anda menemukan kenyamanan terbaik untuk
                keluarga.
              </p>
            </div>
            <Link
              to="/kontak" /* Assuming contact route exists or is anchor */
              className="px-8 py-3 bg-indigo-900 text-white font-semibold rounded-full hover:bg-indigo-800 transition shadow-lg"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

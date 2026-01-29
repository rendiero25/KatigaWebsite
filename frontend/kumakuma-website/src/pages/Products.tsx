import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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
import PartnersSection from "../components/PartnersSection";

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

  // Animation Variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="pt-20 flex-grow">
        <div className="">
          {/* Main Header Section */}
          <div className="container mx-auto mb-20 overflow-hidden">
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-black font-medium text-lg mb-2"
            >
              {settings?.subtitle}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-3xl md:text-5xl font-normal text-black leading-tight w-full"
            >
              {settings?.title}
            </motion.h1>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <PartnersSection />
          </motion.div>

          {/* Banner Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-20 mb-12 w-full h-64 md:h-[400px] overflow-hidden bg-gray-100"
          >
            <img
              src={
                settings?.bannerImage
                  ? api.getImageUrl(settings?.bannerImage)
                  : "https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=2070&auto=format&fit=crop"
              }
              alt="Product Banner"
              className="w-full h-full object-cover"
            />
          </motion.div>

          <div className="container mx-auto">
            {/* Controls: Tabs & Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
            >
              {/* Tabs */}
              <div className="flex items-center bg-primary p-1 rounded-full self-start md:self-auto">
                <button
                  onClick={() => handleTabChange(1)}
                  className={`cursor-pointer px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === 1
                      ? "bg-white text-black shadow-sm"
                      : "text-white"
                  }`}
                >
                  {settings?.category1?.name || "Perlengkapan Tidur Bayi"}
                </button>

                <button
                  onClick={() => handleTabChange(2)}
                  className={`cursor-pointer px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === 2
                      ? "bg-white text-black shadow-sm"
                      : "text-white"
                  }`}
                >
                  {settings?.category2?.name}
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
            </motion.div>

            {/* Current Category Title */}
            <div className="mb-8 overflow-hidden">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-lg font-normal text-black mb-1"
              >
                {currentCategorySubtitle || "Kenyamanan Tidur Si Kecil"}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl md:text-3xl font-normal text-black"
              >
                {currentCategoryTitle ||
                  "Perlengkapan Tidur Bayi (Baby Sleep Essentials)"}
              </motion.h2>
            </div>

            {/* Product Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="animate-pulse"
                  >
                    <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10"
              >
                {filteredProducts.map((product: any) => (
                  <motion.div key={product._id} variants={fadeInUp}>
                    <Link to={`/produk/${product._id}`} className="group block">
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
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination (Visual Only for now) */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-16 flex justify-center items-center gap-4"
            >
              <button className="p-2 text-gray-400 hover:text-gray-900 disabled:opacity-50">
                <FaChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-gray-900">1</span>
              <span className="text-gray-400">2</span>
              <span className="text-gray-400">3</span>
              <button className="p-2 text-gray-400 hover:text-gray-900">
                <FaChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

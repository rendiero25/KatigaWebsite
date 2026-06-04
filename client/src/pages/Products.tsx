import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useProducts, useCategories } from "../hooks/useApi";
import api from "../services/api";
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import PartnersSection from "../components/PartnersSection";

export default function Products() {
  const [settings, setSettings] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "az" | "za">("default");

  const { data: categories } = useCategories();

  useEffect(() => {
    api.getProductPageSettings()
      .then(setSettings)
      .catch((error) => console.error("Error fetching page data:", error));
  }, []);

  const { data: productskumakuma, loading: productsLoading } = useProducts({
    category: activeCategory || undefined,
  });

  const filteredProducts = (Array.isArray(productskumakuma) ? productskumakuma : [])
    .filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: any, b: any) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "za") return b.name.localeCompare(a.name);
      return 0;
    });

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

      <main className="pt-20 grow">
        <div className="">
          {/* Main Header Section */}
          <div className="container mx-auto mb-20 overflow-hidden px-4 sm:px-10 lg:px-20 xl:px-30">
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

          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            {/* Filter Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap gap-3 items-center mb-8"
            >
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <input
                  type="text"
                  placeholder="Cari produk…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              {/* Category filter */}
              <div className="relative">
                <select
                  value={activeCategory}
                  onChange={(e) => { setActiveCategory(e.target.value); setSearchQuery(""); }}
                  className="appearance-none cursor-pointer pl-4 pr-9 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "default" | "az" | "za")}
                  className="appearance-none cursor-pointer pl-4 pr-9 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="default">Urutan Default</option>
                  <option value="az">Nama A–Z</option>
                  <option value="za">Nama Z–A</option>
                </select>
                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              </div>

              {/* Result count */}
              {!productsLoading && (
                <span className="ml-auto text-sm text-gray-400">
                  {filteredProducts.length} produk
                </span>
              )}
            </motion.div>

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
                        <button className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                          Lihat Detail
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
              <button className="cursor-pointer p-2 text-gray-400 hover:text-gray-900 disabled:opacity-50">
                <FaChevronLeft className="w-4 h-4" />
              </button>
              <span className="cursor-pointer font-bold text-gray-900">1</span>
              <span className="cursor-pointer text-gray-400">2</span>
              <span className="cursor-pointer text-gray-400">3</span>
              <button className="cursor-pointer p-2 text-gray-400 hover:text-gray-900">
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

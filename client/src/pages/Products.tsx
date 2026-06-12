import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronDownIcon } from "lucide-react";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useProducts, useCategories, useWishlist } from "../hooks/useApi";
import api from "../services/api";
import WishlistButton from "../components/WishlistButton";
import StarRating from '../components/StarRating';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PartnersSection from "../components/PartnersSection";

const PRODUCTS_PER_PAGE = 12;

const sortLabels: Record<"default" | "az" | "za", string> = {
  default: "Urutan Default",
  az: "Nama A–Z",
  za: "Nama Z–A",
};

export default function Products() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "az" | "za">("default");
  const [currentPage, setCurrentPage] = useState(1);

  const { wishlistIds, add, remove } = useWishlist();

  const handleToggleWishlist = (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      remove(productId);
    } else {
      add(productId);
    }
  };

  const { data: categories } = useCategories();

  useEffect(() => {
    api.getProductPageSettings()
      .then(setSettings)
      .catch((error) => console.error("Error fetching page data:", error));
  }, []);

  const { data: productskumakuma, loading: productsLoading } = useProducts({
    category: activeCategory || undefined,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy]);

  const filteredProducts = (Array.isArray(productskumakuma) ? productskumakuma : [])
    .filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase())) // eslint-disable-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "za") return b.name.localeCompare(a.name);
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 2) return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-2 pl-4 pr-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                  {activeCategory || "Semua Kategori"}
                  <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => { setActiveCategory(""); setSearchQuery(""); }}>
                      Semua Kategori
                    </DropdownMenuItem>
                    {categories.map((cat) => (
                      <DropdownMenuItem key={cat._id} onClick={() => { setActiveCategory(cat.name); setSearchQuery(""); }}>
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-2 pl-4 pr-4 py-2 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                  {sortLabels[sortBy]}
                  <ChevronDownIcon className="w-3 h-3 text-gray-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setSortBy("default")}>Urutan Default</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("az")}>Nama A–Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("za")}>Nama Z–A</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

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
                {pagedProducts.map((product: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <motion.div key={product._id} variants={fadeInUp}>
                    <Link to={`/produk/${product._id}`} className="group block">
                      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
                        <img
                          src={api.getImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <WishlistButton
                          productId={product._id}
                          inWishlist={wishlistIds.has(product._id)}
                          onToggle={handleToggleWishlist}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mb-1">
                          <StarRating value={product.ratingAvg ?? 0} size="sm" />
                          {product.reviewCount > 0 && (
                            <span className="text-xs text-gray-400">({product.reviewCount})</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                        {product.priceNumeric > 0 && product.activePromotion && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-sm font-bold text-red-600">
                              {`Rp ${Math.round(product.priceNumeric * (1 - product.activePromotion.discountPercent / 100)).toLocaleString('id-ID')}`}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              {`Rp ${product.priceNumeric.toLocaleString('id-ID')}`}
                            </span>
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-500 text-xs font-bold rounded-full">
                              -{product.activePromotion.discountPercent}%
                            </span>
                          </div>
                        )}
                        <button className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                          Lihat Detail
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-16 flex justify-center items-center gap-2"
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer p-2 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers().map((page, i) =>
                  page === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-400 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`cursor-pointer w-9 h-9 rounded-full text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer p-2 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

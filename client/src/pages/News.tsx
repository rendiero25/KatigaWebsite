import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNews } from "../hooks/useApi";
import api from "../services/api";
import { 
  FaSearch, 
  FaChevronLeft, 
  FaChevronRight, 
  FaClock, 
  FaHistory, 
  FaSortAlphaDown, 
  FaSortAlphaUp,
  FaChevronDown
} from "react-icons/fa";

export default function News() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [category] = useState(""); // Default to all news
  const [sort, setSort] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Pass params to hook
  const { data: news, pagination, loading } = useNews(page, 12, searchQuery, category, sort);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sectionContent, setSectionContent] = useState<any>(null);

  useEffect(() => {
    // Fetch section content for banner
    api.getNewsSection()
      .then(setSectionContent)
      .catch(console.error);
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
  // Reset page when search, category, or sort changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [searchQuery, category, sort]);

  const sortOptions = [
    { value: "newest", label: "Terbaru", icon: <FaClock /> },
    { value: "oldest", label: "Terlama", icon: <FaHistory /> },
    { value: "az", label: "A-Z", icon: <FaSortAlphaDown /> },
    { value: "za", label: "Z-A", icon: <FaSortAlphaUp /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="grow">
        {/* Banner Section */}
        <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
          <img
            src={
              sectionContent?.bannerImage
                ? api.getImageUrl(sectionContent.bannerImage)
                : "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600"
            }
            alt="News Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="hidden md:block mb-2"
              >
                <div className="bg-black px-2 w-fit py-1">
                  <p className="text-white text-lg font-medium leading-relaxed ">
                    {sectionContent?.subtitle}
                  </p>
                </div>
              </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-4xl font-bold text-white uppercase leading-tight mb-4 max-w-lg"
                >
                  {sectionContent?.title}
                </motion.h1>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-12 px-4 sm:px-10 lg:px-20 xl:px-30">
          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row w-full justify-between items-center gap-4 mb-10 z-20 relative">
            {/* Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full md:w-1/2 relative"
            >
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cursor-pointer w-full pl-12 pr-6 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-lg"
              />
              <FaSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-black/40 w-4 h-4" />
            </motion.div>

            {/* Filter Group */}
            <div className="flex w-full">
              {/* Custom Sort Dropdown */}
               <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="w-1/2 relative"
              >
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="cursor-pointer px-6 py-4 rounded-full border border-gray-300 bg-white flex items-center justify-between shadow-sm text-lg hover:border-indigo-500 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {sortOptions.find(opt => opt.value === sort)?.icon}
                    {sortOptions.find(opt => opt.value === sort)?.label}
                  </span>
                  <FaChevronDown className={`w-3 h-3 ml-2 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                </button>
                
                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 p-1"
                    >
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSort(opt.value);
                            setIsSortOpen(false);
                          }}
                          className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                            sort === opt.value 
                              ? "bg-indigo-50 text-indigo-600 font-medium" 
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <span className={`${sort === opt.value ? "text-indigo-600" : "text-gray-400"}`}>
                            {opt.icon}
                          </span>
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>


          {/* News Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="animate-pulse aspect-[4/5] bg-gray-200 rounded-lg"
                ></div>
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
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {news.map((item: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <motion.div
                  key={item._id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                  }}
                >
                  <Link
                    to={`/berita/${item._id}`}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-gray-900 h-full"
                  >
                    <img
                      src={api.getImageUrl(item.image)}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-60"
                    />

                    {/* Date Badge */}
                    <div className="absolute top-0 right-4 bg-primary text-white p-2 text-center min-w-[60px]">
                      <span className="block text-xl font-bold leading-none">
                        {new Date(item.date).getDate()}
                      </span>
                      <span className="block text-xs uppercase font-medium">
                        {new Date(item.date).toLocaleDateString("id-ID", {
                          month: "short",
                        })}
                      </span>
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent pt-20">
                      <h3 className="text-white font-bold text-lg mb-1 leading-tight group-hover:underline">
                        {item.title}
                      </h3>
                      {/* Assuming user meant excerpt for the subtitle 'Outlet Baru di Bekasi' */}
                      <p className="text-white/80 text-sm font-medium">
                        {item.excerpt}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-16 flex justify-center items-center gap-6">
              <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-black transition disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              
              <div className="flex gap-4 font-medium">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`${
                      page === pageNum 
                        ? "text-black font-bold" 
                        : "text-gray-400 hover:text-black"
                    } transition`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.pages}
                className="cursor-pointer p-2 text-gray-400 hover:text-black transition disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <FaChevronRight className="cursor-pointer w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

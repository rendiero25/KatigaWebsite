import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNews } from "../hooks/useApi";
import api from "../services/api";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function News() {
  const { data: news, loading } = useNews();
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionContent, setSectionContent] = useState<any>(null);

  useEffect(() => {
    // Fetch section content for banner
    fetch("http://localhost:5000/api/news/content")
      .then((res) => res.json())
      .then(setSectionContent)
      .catch(console.error);
  }, []);

  const filteredNews = news.filter((item: any) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gray-900">
          <img
            src={
              sectionContent?.bannerImage
                ? api.getImageUrl(sectionContent.bannerImage)
                : "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600"
            }
            alt="News Banner"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl md:text-6xl font-bold text-white uppercase leading-tight mb-4">
                  {sectionContent?.title || "TEMUKAN\nBERITA\nTERBARU\nKAMI"}
                </h1>
              </div>
              <div className="hidden md:block">
                <div className="bg-black/40 backdrop-blur-sm p-6 border-l-4 border-white max-w-md">
                  <p className="text-white text-lg font-medium leading-relaxed">
                    {sectionContent?.subtitle ||
                      "Dapatkan update terbaru, highlight, dan informasi penting dari perusahaan kami"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-16 relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-lg"
            />
            <FaSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.map((item: any) => (
                <Link
                  key={item._id}
                  to={`/berita/${item._id}`}
                  className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-900"
                >
                  <img
                    src={api.getImageUrl(item.image)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-60"
                  />

                  {/* Date Badge */}
                  <div className="absolute top-0 right-4 bg-[#D32F2F] text-white p-2 text-center min-w-[60px]">
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
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-16 flex justify-center items-center gap-6">
            <button className="p-2 text-gray-400 hover:text-black transition">
              <FaChevronLeft className="w-3 h-3" />
            </button>
            <div className="flex gap-4 font-medium">
              <button className="text-black font-bold">1</button>
              <button className="text-gray-400 hover:text-black transition">
                2
              </button>
              <button className="text-gray-400 hover:text-black transition">
                3
              </button>
            </div>
            <button className="p-2 text-gray-400 hover:text-black transition">
              <FaChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

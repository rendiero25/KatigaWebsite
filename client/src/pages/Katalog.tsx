import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../services/api";

export default function Katalog() {
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCatalog()
      .then(setCatalog)
      .catch((err) => console.error("Error fetching catalog:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = () => {
    if (catalog?.fileUrl) {
      window.open(api.getImageUrl(catalog.fileUrl), "_blank");
    }
  };

  const bgImage = catalog?.backgroundImage
    ? api.getImageUrl(catalog.backgroundImage)
    : "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=2070";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="grow">
        <section
          className="relative w-full overflow-hidden flex items-center"
          style={{ minHeight: "100svh" }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${bgImage})` }}
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1526]/95 via-[#0d1526]/70 to-[#0d1526]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1526]/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="container mx-auto relative z-10 px-4 sm:px-10 lg:px-20 xl:px-30 py-32">
            <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-16">

              {/* Left — text */}
              <div className="max-w-lg">
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.1 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-normal text-white leading-[1.05] mb-8"
                >
                  {catalog?.title ? (
                    catalog.title
                  ) : (
                    <>E-Katalog<br />Produk</>
                  )}
                </motion.h1>

                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-px w-12 bg-white/25 mb-8 origin-left"
                />

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.38 }}
                  className="text-white text-lg leading-relaxed mb-10 max-w-sm"
                >
                  {catalog?.description || "Temukan koleksi lengkap produk kami dalam satu katalog."}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.5 }}
                  className="flex flex-wrap items-center gap-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownload}
                    disabled={!catalog?.fileUrl}
                    className="cursor-pointer inline-flex items-center gap-2.5 px-10 py-4 bg-white text-gray-900 text-sm font-semibold rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:bg-gray-100 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-all duration-300 disabled:cursor-not-allowed tracking-wide"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Unduh Katalog
                  </motion.button>

                  {!catalog?.fileUrl && (
                    <span className="text-white/30 text-xs">Katalog belum tersedia</span>
                  )}
                </motion.div>
              </div>

              {/* Right — catalog cover */}
              {catalog?.cardImage && (
                <motion.div
                  initial={{ opacity: 0, y: 40, rotate: 4 }}
                  animate={{ opacity: 1, y: 0, rotate: 2 }}
                  transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden lg:block shrink-0 self-end"
                >
                  <div className="relative">
                    {/* Depth shadow card */}
                    <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-2xl bg-[#4F68AF]/20 blur-lg" />
                    <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-2xl bg-black/30" />
                    <img
                      src={api.getImageUrl(catalog.cardImage)}
                      alt="Catalog Cover"
                      className="relative w-56 xl:w-72 object-contain rounded-2xl shadow-2xl"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}

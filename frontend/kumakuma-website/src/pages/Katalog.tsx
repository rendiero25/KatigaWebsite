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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3d4c7a]"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="grow">
        <div className="relative h-screen min-h-[600px] w-full overflow-hidden">
          {/* Background Image Layer */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${catalog?.backgroundImage ? api.getImageUrl(catalog.backgroundImage) : "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=2070"})`,
            }}
          />

          {/* Gradient Overlay Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-white-50 to-transparent"></div>

          <div className="container mx-auto relative h-full flex items-center z-10">
            {/* Floating Card */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="rounded-r-3xl p-8 md:p-12 max-w-xl relative"
            >
              {/* Decorative corner shape if needed - standard rounded corners seem enough based on image usually */}

              {/* Card Content - Dynamic Image or Default Layout */}
              {catalog?.cardImage ? (
                <div className="mb-8 flex justify-start">
                  <img
                    src={api.getImageUrl(catalog.cardImage)}
                    alt="Catalog Card"
                    className="w-1/2 h-auto object-contain rounded-lg" // Adjust sizing as needed
                  />
                </div>
              ) : (
                <>
                  {/* Default Layout (Logo + Title) if no card image */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={api.getImageUrl("/logo.png")}
                          alt="Kuma Logo"
                          className="h-10 object-contain"
                          onError={(e: any) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                        <div className="text-blue-600 font-bold text-lg leading-tight">
                          PT Kusuma Kencana
                          <br />
                          Khatulistiwa
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-4xl font-bold text-[#6B705C] mb-8 leading-tight"
                  >
                    Company
                    <br />
                    Catalogue
                  </motion.h1>
                </>
              )}

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-black font-normal text-2xl mb-8 leading-relaxed"
              >
                {catalog?.description || ""}
              </motion.p>

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                onClick={handleDownload}
                className="cursor-pointer w-full md:w-auto px-10 py-4 bg-[#3d4c7a] text-white rounded-full font-medium shadow-lg"
              >
                Download
              </motion.button>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

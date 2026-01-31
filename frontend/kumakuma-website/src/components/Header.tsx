import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSiteSettings } from "../hooks/useApi";
import IconTokopedia from "../assets/icon-tokopedia.png";
import IconShopee from "../assets/icon-shopee.png";

export default function Header() {
  const { data: settings } = useSiteSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
        ? "bg-white text-black"
        : "text-white hover:text-gray-300";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/")
      ? "bg-white text-black"
      : "text-white hover:text-gray-300";
  };

  // Check if we are on the About Us page
  const isAboutPage = location.pathname === "/tentang-kami";
  const isProductPage = location.pathname === "/produk";
  const isKatalogPage = location.pathname === "/katalog";
  const isNewsPage = location.pathname === "/berita";
  const isContactPage = location.pathname === "/kontak";
  const isProductDetailPage = location.pathname.startsWith("/produk/");

  return (
    <header
      className={`top-0 z-50 transition-colors duration-300 ${
        isKatalogPage
          ? isScrolled
            ? "fixed w-full bg-white/80 backdrop-blur-md shadow-sm"
            : "absolute w-full bg-transparent"
          : `sticky ${isScrolled || isAboutPage || isProductPage || isNewsPage || isContactPage || isProductDetailPage ? "bg-white/80 backdrop-blur-md" : "bg-[#F9F7F2]"}`
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 py-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="">
              {settings?.logo ? (
                <img
                  src={`http://localhost:5000${settings.logo}`}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-gradient-to-br from-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  KK
                </div>
              )}
            </div>
          </Link>

          {/* Navigation - Black Capsule Style */}
          <nav className="hidden md:flex items-center bg-black rounded-full px-1.5 py-1.5 gap-2 shadow-lg ">
            <Link
              to="/"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/")}`}
            >
              Beranda
            </Link>
            <Link
              to="/tentang-kami"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/tentang-kami")}`}
            >
              Tentang Kami
            </Link>
            <Link
              to="/produk"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/produk")}`}
            >
              Produk
            </Link>

            <Link
              to="/katalog"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/katalog")}`}
            >
              Katalog
            </Link>
            <Link
              to="/berita"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/berita")}`}
            >
              Berita
            </Link>
            <Link
              to="/kontak"
              className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/kontak")}`}
            >
              Kontak
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <a
              href={settings?.shopNowUrl || "#"}
              className="hidden sm:block text-lg font-semibold text-primary"
            >
              Shop Now
            </a>
            <div className="flex items-center gap-4">
              <a
                href={settings?.tokopediaUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center transition hover:opacity-80"
              >
                <img
                  src={IconTokopedia}
                  alt="Tokopedia"
                  className="w-10 object-contain"
                />
              </a>

              <a
                href={settings?.shopeeUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center transition hover:opacity-80"
              >
                <img
                  src={IconShopee}
                  alt="Shopee"
                  className="w-10 object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

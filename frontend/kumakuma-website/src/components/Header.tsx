import { useState, useEffect } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { useSiteSettings } from "../hooks/useApi";
import api from "../services/api";
import IconTokopedia from "../assets/icon-tokopedia.png";
import IconShopee from "../assets/icon-shopee.png";

export default function Header() {
  const { data: settings } = useSiteSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    return location.pathname === path ||
      location.pathname.startsWith(path + "/")
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
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="flex items-center justify-between h-20 py-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="">
              {settings?.logo ? (
                <img
                  src={api.getImageUrl(settings.logo)}
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
          <nav className="hidden xl:flex items-center bg-black rounded-full px-1.5 py-1.5 gap-2 shadow-lg ">
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

            {/* Hamburger Menu Button */}
            <button
              className="xl:hidden text-2xl text-gray-800 focus:outline-none ml-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="xl:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md shadow-xl border-t border-gray-100 py-6 px-6 flex flex-col gap-4">
            <Link
              to="/"
              className={`text-lg font-medium transition ${location.pathname === "/" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Beranda
            </Link>
            <Link
              to="/tentang-kami"
              className={`text-lg font-medium transition ${location.pathname === "/tentang-kami" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Tentang Kami
            </Link>
            <Link
              to="/produk"
              className={`text-lg font-medium transition ${location.pathname === "/produk" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Produk
            </Link>
            <Link
              to="/katalog"
              className={`text-lg font-medium transition ${location.pathname === "/katalog" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Katalog
            </Link>
            <Link
              to="/berita"
              className={`text-lg font-medium transition ${location.pathname === "/berita" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Berita
            </Link>
            <Link
              to="/kontak"
              className={`text-lg font-medium transition ${location.pathname === "/kontak" ? "text-indigo-600" : "text-gray-800 hover:text-indigo-600"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Kontak
            </Link>
            <a
              href={settings?.shopNowUrl || "#"}
              className="mt-2 text-center py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Shop Now
            </a>

            <div className="flex items-center justify-center gap-6 mt-2 border-t border-gray-100 pt-4">
              <a
                href={settings?.tokopediaUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:opacity-80"
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
                className="transition hover:opacity-80"
              >
                <img
                  src={IconShopee}
                  alt="Shopee"
                  className="w-10 object-contain"
                />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

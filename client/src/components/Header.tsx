import { useState, useEffect } from "react";
import { FiMenu, FiX, FiUser, FiPackage, FiLogOut } from "react-icons/fi";
import { FaShoppingCart } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSiteSettings, useCartCount, useNotifications } from "../hooks/useApi";
import { clearCart } from "../utils/cart";
import api from "../services/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "./NotificationBell";

interface Customer {
  name: string;
  avatar?: string;
}

export default function Header() {
  const { data: settings } = useSiteSettings();
  const cartCount = useCartCount();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('customer');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("customerToken");
      const name = localStorage.getItem("customerName");
      const avatar = localStorage.getItem("customerAvatar") || undefined;
      setCustomer(token && name ? { name, avatar } : null);
    };
    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerName");
    localStorage.removeItem("customerAvatar");
    clearCart();
    setCustomer(null);
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const profileMenuItemClass =
    "rounded-lg cursor-pointer gap-2.5 !text-gray-700 transition-colors hover:!text-indigo-600 focus:bg-transparent data-highlighted:bg-transparent focus:!text-indigo-600 data-highlighted:!text-indigo-600 hover:[&_svg]:!text-indigo-600 focus:[&_svg]:!text-indigo-600 data-highlighted:[&_svg]:!text-indigo-600 focus:**:!text-indigo-600 data-highlighted:**:!text-indigo-600";
  const profileMenuIconClass = "w-4 h-4 shrink-0 transition-colors";
  const profileMenuLabelClass = "text-sm font-medium";

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

  const isAboutPage = location.pathname === "/tentang-kami";
  const isProductPage = location.pathname === "/produk";
  const isKatalogPage = location.pathname === "/katalog";
  const isNewsPage = location.pathname === "/berita";
  const isContactPage = location.pathname === "/kontak";
  const isProductDetailPage = location.pathname.startsWith("/produk/");
  const isCartPage = location.pathname === "/keranjang";
  const isCheckoutPage = location.pathname === "/checkout";

  return (
    <header
      className={`top-0 z-50 transition-colors duration-300 ${
        isKatalogPage
          ? isScrolled
            ? "fixed w-full bg-white/80 backdrop-blur-md shadow-sm"
            : "absolute w-full bg-transparent"
          : `sticky ${
              isScrolled ||
              isAboutPage ||
              isProductPage ||
              isNewsPage ||
              isContactPage ||
              isProductDetailPage ||
              isCartPage ||
              isCheckoutPage
                ? "bg-white/80 backdrop-blur-md"
                : "bg-[#F9F7F2]"
            }`
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

          {/* Navigation — black capsule */}
          <nav className="hidden xl:flex items-center bg-black rounded-full px-1.5 py-1.5 gap-2 shadow-lg">
            <Link to="/" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/")}`}>
              Beranda
            </Link>
            <Link to="/tentang-kami" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/tentang-kami")}`}>
              Tentang Kami
            </Link>
            <Link to="/produk" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/produk")}`}>
              Produk
            </Link>
            <Link to="/katalog" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/katalog")}`}>
              Katalog
            </Link>
            <Link to="/berita" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/berita")}`}>
              Berita
            </Link>
            <Link to="/kontak" className={`text-md font-medium transition px-3 py-1.5 rounded-full ${isActive("/kontak")}`}>
              Kontak
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            {customer && (
              <NotificationBell
                role="customer"
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markAsRead}
                onMarkAllRead={markAllAsRead}
              />
            )}

            {/* Cart */}
            <button
              onClick={() => {
                if (!localStorage.getItem("customerToken")) {
                  navigate("/masuk?redirect=/keranjang");
                } else {
                  navigate("/keranjang");
                }
              }}
              className="relative flex items-center justify-center text-gray-800 hover:text-primary transition cursor-pointer"
            >
              <FaShoppingCart className="w-5 h-5" />
              {customer && cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* Auth — desktop */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {customer ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="cursor-pointer bg-transparent border-0 p-0 focus:outline-none">
                    <Avatar className="size-9 [&::after]:hidden ring-2 ring-primary/20 rounded-full">
                      {customer.avatar && <AvatarImage src={api.getImageUrl(customer.avatar)} alt={customer.name} />}
                      <AvatarFallback className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-semibold">
                        {initials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-52 rounded-xl shadow-xl ring-1 ring-gray-100 p-1.5"
                  >
                    <div className="px-3 py-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-400">Pelanggan</p>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      className={profileMenuItemClass}
                      onClick={() => navigate("/profil")}
                    >
                      <FiUser className={profileMenuIconClass} />
                      <span className={profileMenuLabelClass}>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={profileMenuItemClass}
                      onClick={() => navigate("/pesanan")}
                    >
                      <FiPackage className={profileMenuIconClass} />
                      <span className={profileMenuLabelClass}>Pesanan</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem
                      className="rounded-lg cursor-pointer gap-2.5 text-red-500 transition-colors hover:text-red-600 focus:bg-transparent data-highlighted:bg-transparent focus:text-red-600 data-highlighted:text-red-600 hover:**:text-red-600 focus:**:text-red-600 data-highlighted:**:text-red-600"
                      onClick={handleLogout}
                    >
                      <FiLogOut className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">Keluar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link
                    to="/masuk"
                    className="text-sm font-medium text-gray-700 hover:text-primary transition px-3 py-1.5 rounded-full hover:bg-gray-100"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/daftar"
                    className="text-sm font-medium text-white px-4 py-1.5 rounded-full bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger */}
            <button
              className="xl:hidden text-2xl text-gray-800 focus:outline-none ml-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
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

            {/* Mobile auth */}
            {customer ? (
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3 px-1 pb-1">
                  <Avatar className="size-9 shrink-0 [&::after]:hidden">
                    {customer.avatar && <AvatarImage src={api.getImageUrl(customer.avatar)} alt={customer.name} />}
                    <AvatarFallback className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white text-xs font-semibold">
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-400">Pelanggan</p>
                  </div>
                </div>
                <Link
                  to="/profil"
                  className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiUser className="w-4 h-4 shrink-0" />
                  <span className="text-base font-medium">Dashboard</span>
                </Link>
                <Link
                  to="/pesanan"
                  className="flex items-center gap-2.5 text-gray-700 hover:text-indigo-600 transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiPackage className="w-4 h-4 shrink-0" />
                  <span className="text-base font-medium">Pesanan</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 text-red-500 hover:text-red-600 transition"
                >
                  <FiLogOut className="w-4 h-4 shrink-0" />
                  <span className="text-base font-medium">Keluar</span>
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                <Link
                  to="/masuk"
                  className="text-center py-3 border border-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-50 transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  className="text-center py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white rounded-lg font-semibold hover:shadow-md transition"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Daftar
                </Link>
              </div>
            )}

          </div>
        )}
      </div>
    </header>
  );
}

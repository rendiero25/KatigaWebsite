import { useState, useEffect } from "react";
import { FiMenu, FiX, FiUser, FiPackage, FiLogOut, FiShoppingCart } from "react-icons/fi";
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

const NAV_LINKS = [
  { to: "/", label: "Beranda" },
  { to: "/tentang-kami", label: "Tentang Kami" },
  { to: "/produk", label: "Produk" },
  { to: "/katalog", label: "Katalog" },
  { to: "/berita", label: "Berita" },
  { to: "/kontak", label: "Kontak" },
];

export default function Header() {
  const { data: settings } = useSiteSettings();
  const cartCount = useCartCount();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('customer');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

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
    "rounded-lg cursor-pointer gap-2.5 !text-gray-700 transition-colors hover:!text-primary focus:bg-transparent data-highlighted:bg-transparent focus:!text-primary data-highlighted:!text-primary hover:[&_svg]:!text-primary focus:[&_svg]:!text-primary data-highlighted:[&_svg]:!text-primary focus:**:!text-primary data-highlighted:**:!text-primary";
  const profileMenuIconClass = "w-4 h-4 shrink-0 transition-colors";
  const profileMenuLabelClass = "text-sm font-medium";

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(path + "/");

  const handleCartClick = () => {
    if (!localStorage.getItem("customerToken")) {
      navigate("/masuk?redirect=/keranjang");
    } else {
      navigate("/keranjang");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E9E9EA] h-20">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 flex items-center">
              {settings?.logo ? (
                <img
                  src={api.getImageUrl(settings.logo)}
                  alt="Logo"
                  className="h-10 w-auto max-w-40 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-[#4F68AF] flex items-center justify-center text-white font-bold text-xs">
                  KK
                </div>
              )}
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden xl:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-[13px] uppercase tracking-[0.12em] transition-colors pb-0.5 ${
                  isActive(link.to)
                    ? "text-[#1E1E1E] underline underline-offset-4 decoration-1"
                    : "text-[#6F6F71] hover:text-[#1E1E1E]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
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
              onClick={handleCartClick}
              className="relative flex items-center justify-center text-[#6F6F71] hover:text-[#1E1E1E] transition-colors cursor-pointer"
              aria-label="Keranjang"
            >
              <FiShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <sup className="absolute -top-1 -right-2 text-[10px] font-bold text-primary">
                  {cartCount > 9 ? "9+" : cartCount}
                </sup>
              )}
            </button>

            {/* Auth — desktop */}
            <div className="hidden sm:flex items-center gap-3 ml-1">
              {customer ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="cursor-pointer bg-transparent border-0 p-0 focus:outline-none">
                    <Avatar className="size-9 [&::after]:hidden ring-2 ring-primary/20 rounded-full">
                      {customer.avatar && <AvatarImage src={api.getImageUrl(customer.avatar)} alt={customer.name} />}
                      <AvatarFallback className="bg-[#4F68AF] text-white text-xs font-semibold">
                        {initials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-52 rounded-none shadow-xl ring-1 ring-gray-100 p-1.5"
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
                    className="text-[13px] uppercase tracking-[0.12em] text-[#6F6F71] hover:text-[#1E1E1E] transition-colors"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/daftar"
                    className="bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition-colors"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger */}
            <button
              className="xl:hidden text-2xl text-[#1E1E1E] focus:outline-none ml-1"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka menu"
            >
              <FiMenu />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`xl:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white flex flex-col transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-end h-20 px-6 border-b border-[#E9E9EA]">
            <button
              className="text-2xl text-[#1E1E1E] focus:outline-none"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Tutup menu"
            >
              <FiX />
            </button>
          </div>

          <div className="flex flex-col gap-6 px-6 py-8 overflow-y-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-[13px] uppercase tracking-[0.12em] transition-colors ${
                  isActive(link.to) ? "text-[#1E1E1E]" : "text-[#6F6F71] hover:text-[#1E1E1E]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {customer ? (
              <div className="border-t border-[#E9E9EA] pt-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-1">
                  <Avatar className="size-9 shrink-0 [&::after]:hidden">
                    {customer.avatar && <AvatarImage src={api.getImageUrl(customer.avatar)} alt={customer.name} />}
                    <AvatarFallback className="bg-[#4F68AF] text-white text-xs font-semibold">
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-[#1E1E1E]">{customer.name}</p>
                    <p className="text-xs text-[#6F6F71]">Pelanggan</p>
                  </div>
                </div>
                <Link
                  to="/profil"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.12em] text-[#6F6F71] hover:text-[#1E1E1E] transition-colors"
                >
                  <FiUser className="w-4 h-4 shrink-0" />
                  Dashboard
                </Link>
                <Link
                  to="/pesanan"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.12em] text-[#6F6F71] hover:text-[#1E1E1E] transition-colors"
                >
                  <FiPackage className="w-4 h-4 shrink-0" />
                  Pesanan
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 text-[13px] uppercase tracking-[0.12em] text-red-500 hover:text-red-600 transition-colors"
                >
                  <FiLogOut className="w-4 h-4 shrink-0" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="border-t border-[#E9E9EA] pt-6 flex flex-col gap-3">
                <Link
                  to="/masuk"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-3 border border-[#6F6F71] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] hover:bg-[#F9F7F2] transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-3 bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] hover:bg-[#2B3A67] transition-colors"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import { Link } from 'react-router-dom';
import { useSiteSettings, useContactInfo } from '../hooks/useApi';
import { FaInstagram } from 'react-icons/fa';
import IconTokopedia from '../assets/icon-tokopedia.png';
import IconShopee from '../assets/icon-shopee.png';

export default function Header() {
  const { data: settings } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 bg-[#F9F7F2] backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10">
               {/* Placeholder for actual logo image if available, otherwise using text/shape for now */}
               <div className="w-full h-full bg-gradient-to-br from-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">KK</div>
            </div>
            <div className="flex flex-col">
               {/* Matching the reference hierarchy */}
               <span className="text-xs font-bold text-blue-900 tracking-wide uppercase">PT Kusuma Kencana</span>
               <span className="text-[10px] text-gray-500 tracking-wider uppercase">Khatulistiwa</span>
            </div>
          </Link>

          {/* Navigation - Black Capsule Style */}
          <nav className="hidden md:flex items-center bg-gray-900 rounded-full px-6 py-2.5 gap-6 shadow-lg">
            <Link 
              to="/" 
              className="text-sm font-medium text-white hover:text-gray-300 transition"
            >
              Beranda
            </Link>
            <Link 
              to="/tentang-kami" 
              className="text-sm font-medium text-white hover:text-gray-300 transition"
            >
              Tentang Kami
            </Link>
            <Link 
              to="/produk" 
              className="text-sm font-medium text-white hover:text-gray-300 transition"
            >
              Produk
            </Link>
            <Link 
              to="/lokasi-toko" 
              className="text-sm font-medium text-white hover:text-gray-300 transition"
            >
              Lokasi Toko
            </Link>
            <Link 
              to="/kontak" 
              className="text-sm font-medium text-white hover:text-gray-300 transition"
            >
              Kontak
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <a 
              href={settings?.shopNowUrl || '#'} 
              className="hidden sm:block text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Shop Now
            </a>
            <div className="flex items-center gap-2">
              <a 
                href={settings?.tokopediaUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center transition hover:opacity-80"
              >
                <img src={IconTokopedia} alt="Tokopedia" className="w-6 h-6 object-contain" />
              </a>
              <a 
                href={settings?.shopeeUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center transition hover:opacity-80"
              >
                <img src={IconShopee} alt="Shopee" className="w-6 h-6 object-contain" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

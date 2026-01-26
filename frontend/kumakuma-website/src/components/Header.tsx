import { Link } from 'react-router-dom';
import { useSiteSettings, useContactInfo } from '../hooks/useApi';
import { FaInstagram } from 'react-icons/fa';
import { SiTokopedia, SiShopee } from 'react-icons/si';

export default function Header() {
  const { data: settings } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">KK</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-red-600">PT Kusuma Kencana</p>
              <p className="text-xs text-blue-600">Khatulistiwa</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-full"
            >
              Beranda
            </Link>
            <Link 
              to="/tentang-kami" 
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
            >
              Tentang Kami
            </Link>
            <Link 
              to="/produk" 
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
            >
              Produk
            </Link>
            <Link 
              to="/lokasi-toko" 
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
            >
              Lokasi Toko
            </Link>
            <Link 
              to="/kontak" 
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition"
            >
              Kontak
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <a 
              href={settings?.shopNowUrl || '#'} 
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Shop Now
            </a>
            <a 
              href={settings?.tokopediaUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition"
            >
              <SiTokopedia className="w-4 h-4" />
            </a>
            <a 
              href={settings?.shopeeUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition"
            >
              <SiShopee className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

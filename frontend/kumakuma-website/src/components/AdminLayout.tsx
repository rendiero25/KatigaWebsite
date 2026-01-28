import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { 
  FaHome, FaImage, FaUsers, FaStar, FaBox, FaTags, 
  FaInfoCircle, FaCertificate, FaBook, FaPhone, FaNewspaper,
  FaCog, FaEnvelope, FaSignOutAlt, FaBars
} from 'react-icons/fa';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const menuItems = [
  { path: '/admin', icon: FaHome, label: 'Dashboard' },
  { path: '/admin/hero', icon: FaImage, label: 'Hero Section' },
  { path: '/admin/partners', icon: FaUsers, label: 'Partners' },
  { path: '/admin/advantages', icon: FaStar, label: 'Keunggulan' },
  { path: '/admin/categories', icon: FaTags, label: 'Kategori' },
  { path: '/admin/products', icon: FaBox, label: 'Produk' },
  { path: '/admin/product-page-content', icon: FaBox, label: 'Konten Hal. Produk' },
  { 
    path: '/admin/about', 
    icon: FaInfoCircle, 
    label: 'About Us',
    children: [
      { path: '/admin/about', label: 'General Info' }, // Leads to the form with Title, History, Mission, Vision
      { path: '/admin/certification-tech', label: 'Technology' },
      { path: '/admin/distribution', label: 'Distribution' }
    ]
  },
  { path: '/admin/certifications', icon: FaCertificate, label: 'Sertifikasi' },
  { path: '/admin/catalog', icon: FaBook, label: 'E-Catalog' },
  { path: '/admin/contact-page-content', icon: FaPhone, label: 'Konten Hal. Kontak' },
  { path: '/admin/contact', icon: FaPhone, label: 'Info Kontak' },
  { path: '/admin/footer', icon: FaInfoCircle, label: 'Footer' },
  { path: '/admin/news', icon: FaNewspaper, label: 'Berita' },
  { path: '/admin/messages', icon: FaEnvelope, label: 'Pesan' },
  { path: '/admin/manufacturing', icon: FaCog, label: 'Manufacturing' },
  { path: '/admin/settings', icon: FaCog, label: 'Pengaturan' },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminEmail] = useState(() => localStorage.getItem('adminEmail') || 'Admin');
  
  // State to track expanded menus
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['About Us']);

  const toggleMenu = (label: string) => {
    if (expandedMenus.includes(label)) {
      setExpandedMenus(expandedMenus.filter(item => item !== label));
    } else {
      setExpandedMenus([...expandedMenus, label]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 w-64 h-full bg-gray-900 text-white transform transition-transform duration-200 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">KK</span>
            </div>
            <div>
              <p className="font-semibold">KumaKuma</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.children && item.children.some(child => location.pathname === child.path));
            const isExpanded = expandedMenus.includes(item.label);

            if (item.children) {
                return (
                    <div key={item.label}>
                         <button
                            onClick={() => toggleMenu(item.label)}
                            className={`
                              w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition
                              ${isActive 
                                ? 'bg-indigo-900 text-white' 
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5" />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </button>
                          
                          {isExpanded && (
                              <div className="ml-8 mt-1 space-y-1 border-l border-gray-700 pl-2">
                                  {item.children.map(child => {
                                      const isChildActive = location.pathname === child.path;
                                      return (
                                          <Link
                                            key={child.path}
                                            to={child.path}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`
                                              block px-4 py-2 rounded-lg text-sm transition
                                              ${isChildActive 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'text-gray-400 hover:text-white'
                                              }
                                            `}
                                          >
                                            {child.label}
                                          </Link>
                                      );
                                  })}
                              </div>
                          )}
                    </div>
                )
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg transition
                  ${isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition"
          >
            <FaSignOutAlt className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <FaBars className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                target="_blank"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Lihat Website →
              </Link>
              <div className="text-sm text-gray-600">
                {adminEmail}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

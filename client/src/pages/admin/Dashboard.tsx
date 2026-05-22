import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import { useProducts, useCategories } from '../../hooks/useApi';
import { Link } from 'react-router-dom';
import { FaBox, FaUsers, FaNewspaper, FaEnvelope, FaImage, FaStar } from 'react-icons/fa';

export default function Dashboard() {
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  const stats = [
    { label: 'Total Produk', value: products?.length || 0, icon: FaBox, color: 'bg-blue-500' },
    { label: 'Kategori', value: categories?.length || 0, icon: FaUsers, color: 'bg-green-500' },
    { label: 'Featured', value: products?.filter((p: any) => p.isFeatured)?.length || 0, icon: FaStar, color: 'bg-yellow-500' },
    { label: 'Media', value: 0, icon: FaImage, color: 'bg-purple-500' },
  ];

  const quickLinks = [
    { label: 'Kelola Produk', path: '/admin/products', icon: FaBox },
    { label: 'Edit Hero', path: '/admin/hero', icon: FaImage },
    { label: 'Lihat Pesan', path: '/admin/messages', icon: FaEnvelope },
    { label: 'Tambah Berita', path: '/admin/news', icon: FaNewspaper },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Selamat Datang di Admin Panel</h2>
        <p className="opacity-90">Kelola semua konten website KumaKuma dari satu tempat.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <Icon className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-gray-900">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Produk Terbaru</h3>
          <Link to="/admin/products" className="text-sm text-indigo-600 hover:text-indigo-700">
            Lihat Semua →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Produk</th>
                <th className="pb-3 font-medium">Kategori</th>
                <th className="pb-3 font-medium">Harga</th>
                <th className="pb-3 font-medium">Featured</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {products?.slice(0, 5).map((product: any) => (
                <tr key={product._id} className="border-b border-gray-100">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={api.getImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40';
                          }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{product.category?.name || '-'}</td>
                  <td className="py-3 text-gray-600">{product.price || '-'}</td>
                  <td className="py-3">
                    {product.isFeatured ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ya</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Tidak</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

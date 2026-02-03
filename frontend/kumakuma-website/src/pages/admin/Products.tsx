import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: any; // Can be ID or object depending on population
  price: string;
  link?: string;
  linkTokopedia?: string;
  linkShopee?: string;
  isFeatured: boolean;
  image: string;
  images?: string[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    link: '',
    linkTokopedia: '',
    linkShopee: '',
    isFeatured: false
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const token = localStorage.getItem('adminToken');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchProducts, fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('price', formData.price);
    data.append('link', formData.link);
    data.append('linkTokopedia', formData.linkTokopedia);
    data.append('linkShopee', formData.linkShopee);
    data.append('isFeatured', String(formData.isFeatured));
    
    // Append new images
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        data.append('images', file);
      });
    }

    // Append kept existing images
    if (existingImages.length > 0) {
      existingImages.forEach(img => {
        data.append('keptImages', img);
      });
    }

    try {
      const url = editingProduct 
        ? `${API_URL}/products/${editingProduct._id}`
        : `${API_URL}/products`;
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (res.ok) {
        fetchProducts();
        resetForm();
        alert('Produk berhasil disimpan');
      } else {
        const errData = await res.json();
        alert(`Gagal menyimpan produk: ${errData.message || 'Unknown error'}`);
        console.error('Save failed:', errData);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    
    try {
      await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category?._id || product.category || '',
      price: product.price || '',
      link: product.link || '',
      linkTokopedia: product.linkTokopedia || '',
      linkShopee: product.linkShopee || '',
      isFeatured: product.isFeatured || false
    });
    
    // Populate existing images
    // If product has 'images' array, use it. Else fallback to 'image' string if present.
    if (product.images && product.images.length > 0) {
      setExistingImages(product.images);
    } else if (product.image) {
      setExistingImages([product.image]);
    } else {
      setExistingImages([]);
    }
    
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: '', price: '', link: '', linkTokopedia: '', linkShopee: '', isFeatured: false });
    setImageFiles([]);
    setExistingImages([]);
    setEditingProduct(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Kelola Produk">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {products.length} produk</p>
        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          + Tambah Produk
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Produk</th>
              <th className="px-6 py-4 font-medium">Kategori</th>
              <th className="px-6 py-4 font-medium">Harga</th>
              <th className="px-6 py-4 font-medium">Featured</th>
              <th className="px-6 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={api.getImageUrl(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48'}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{product.category?.name || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{product.price || '-'}</td>
                <td className="px-6 py-4">
                  {product.isFeatured ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Ya</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Tidak</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="cursor-pointer px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="cursor-pointer px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Rp 150.000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Tokopedia</label>
                  <input
                    type="text"
                    value={formData.linkTokopedia}
                    onChange={(e) => setFormData({ ...formData, linkTokopedia: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://tokopedia.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Shopee</label>
                  <input
                    type="text"
                    value={formData.linkShopee}
                    onChange={(e) => setFormData({ ...formData, linkShopee: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://shopee.co.id/..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
                
                {/* Existing Images Preview */}
                {existingImages.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {existingImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={api.getImageUrl(img)} 
                          alt={`Existing ${index}`} 
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}
                          className="cursor-pointer absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File Input */}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setImageFiles(prev => [...prev, ...files]);
                  }}
                  className="cursor-pointer w-full px-4 py-2 border rounded-lg"
                />
                
                {/* New Files Preview */}
                {imageFiles.length > 0 && (
                   <div className="mt-3 grid grid-cols-3 gap-2">
                     {imageFiles.map((file, index) => (
                       <div key={index} className="relative group">
                         <span className="text-xs absolute bottom-0 left-0 bg-black/50 text-white w-full truncate px-1">{file.name}</span>
                         <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg border text-gray-400 text-xs">
                           New Image
                         </div>
                          <button
                           type="button"
                           onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== index))}
                           className="cursor-pointer absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 transition"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                           </svg>
                         </button>
                       </div>
                     ))}
                   </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="text-sm text-gray-700">Tampilkan di Featured</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="cursor-pointer flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="cursor-pointer flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

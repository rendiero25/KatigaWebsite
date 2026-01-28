import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
import { FaSave, FaSpinner } from 'react-icons/fa';

export default function ProductPageContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    subtitle: '',
    title: '',
    bannerImage: '',
    cat1Name: '',
    cat1Subtitle: '',
    cat1Title: '',
    cat2Name: '',
    cat2Subtitle: '',
    cat2Title: ''
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getProductPageSettings();
      if (data) {
        setFormData({
          subtitle: data.subtitle || '',
          title: data.title || '',
          bannerImage: data.bannerImage || '',
          cat1Name: data.category1?.name || '',
          cat1Subtitle: data.category1?.subtitle || '',
          cat1Title: data.category1?.title || '',
          cat2Name: data.category2?.name || '',
          cat2Subtitle: data.category2?.subtitle || '',
          cat2Title: data.category2?.title || ''
        });
        if (data.bannerImage) {
          setPreviewUrl(api.getImageUrl(data.bannerImage));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      const data = new FormData();
      
      data.append('subtitle', formData.subtitle);
      data.append('title', formData.title);
      data.append('cat1Name', formData.cat1Name);
      data.append('cat1Subtitle', formData.cat1Subtitle);
      data.append('cat1Title', formData.cat1Title);
      data.append('cat2Name', formData.cat2Name);
      data.append('cat2Subtitle', formData.cat2Subtitle);
      data.append('cat2Title', formData.cat2Title);

      if (bannerFile) {
        data.append('bannerImage', bannerFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/product-page`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (res.ok) {
        alert('Pengaturan berhasil disimpan');
        fetchSettings(); // Refresh data to get clean state
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <AdminLayout title="Konten Halaman Produk">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Header Utama</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={e => setFormData({...formData, subtitle: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Product Kualitas Dunia, Buatan Indonesia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <textarea
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Hadirkan pelukan hangat..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
              <div className="flex items-start gap-4">
                {previewUrl && (
                  <div className="w-64 aspect-video rounded-lg overflow-hidden bg-gray-100 border">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: JPG, PNG, WEBP. Max size: 2MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category 1 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Kategori Tab 1</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tab</label>
                <input
                  type="text"
                  value={formData.cat1Name}
                  onChange={e => setFormData({...formData, cat1Name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Perlengkapan Tidur Bayi"
                />
              </div>
              <div className="md:col-span-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Subtitle</label>
                        <input
                            type="text"
                            value={formData.cat1Subtitle}
                            onChange={e => setFormData({...formData, cat1Subtitle: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Kenyamanan Tidur Si Kecil"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Title</label>
                        <input
                            type="text"
                            value={formData.cat1Title}
                            onChange={e => setFormData({...formData, cat1Title: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Perlengkapan Tidur Bayi (Baby Sleep Essentials)"
                        />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Category 2 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Kategori Tab 2</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tab</label>
                <input
                  type="text"
                  value={formData.cat2Name}
                  onChange={e => setFormData({...formData, cat2Name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Handuk Keluarga"
                />
              </div>
              <div className="md:col-span-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Subtitle</label>
                        <input
                            type="text"
                            value={formData.cat2Subtitle}
                            onChange={e => setFormData({...formData, cat2Subtitle: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Kenyamanan Handuk Keluarga"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category Title</label>
                        <input
                            type="text"
                            value={formData.cat2Title}
                            onChange={e => setFormData({...formData, cat2Title: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Handuk Keluarga (Family Towels)"
                        />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminContactPageContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle1: '',
    subtitle2: ''
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/contact-page`)
      .then(res => res.json())
      .then(data => {
        setFormData({
          title: data.title || '',
          subtitle1: data.subtitle1 || '',
          subtitle2: data.subtitle2 || ''
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/contact-page`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Konten halaman kontak berhasil diperbarui!');
      } else {
        alert('Gagal menyimpan perubahan');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout title="Konten Hal. Kontak">Loading...</AdminLayout>;

  return (
    <AdminLayout title="Konten Hal. Kontak">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Header Content</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama (Title)</label>
              <input 
                type="text" 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Let’s get in touch" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle 1 (Bold)</label>
              <input 
                type="text" 
                value={formData.subtitle1} 
                onChange={(e) => setFormData({ ...formData, subtitle1: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Don’t be afraid to say hello with us!" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle 2 (Description)</label>
              <textarea 
                value={formData.subtitle2} 
                onChange={(e) => setFormData({ ...formData, subtitle2: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg" 
                rows={3}
                placeholder="Great! we’re excited to hear from you..." 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

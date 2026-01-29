import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminDistribution() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/distribution`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setFormData({
          title: data.title || '',
          description: data.description || ''
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    if (imageFile) submitData.append('mapImage', imageFile);

    try {
      const res = await fetch(`${API_URL}/distribution`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: submitData
      });
      
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        alert('Berhasil diperbarui!');
      }
    } catch (error) {
      console.error('Error updating:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout title="Distribution">Loading...</AdminLayout>;

  return (
    <AdminLayout title="Jangkauan Distribusi">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Gambar Peta</h3>
            <div className="aspect-2/1 bg-gray-100 rounded-lg overflow-hidden mb-4">
              {data.mapImage ? (
                <img src={`http://localhost:5000${data.mapImage}`} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={4} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

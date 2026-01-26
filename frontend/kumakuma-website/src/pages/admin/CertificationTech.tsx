import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminCertificationTech() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [points, setPoints] = useState<string[]>([]);
  const [newPoint, setNewPoint] = useState('');

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/certification-tech`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setFormData({
          title: data.title || '',
          content: data.content || ''
        });
        setPoints(data.points || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddPoint = () => {
    if (newPoint.trim()) {
      setPoints([...points, newPoint.trim()]);
      setNewPoint('');
    }
  };

  const handleRemovePoint = (index: number) => {
    setPoints(points.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('content', formData.content);
    submitData.append('points', JSON.stringify(points));
    if (imageFile) submitData.append('image', imageFile);

    try {
      const res = await fetch(`${API_URL}/certification-tech`, {
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

  if (loading) return <AdminLayout title="Certification Tech">Loading...</AdminLayout>;

  return (
    <AdminLayout title="Certification Technology">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Gambar Section</h3>
            <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden mb-4 max-w-md">
              {data.image ? (
                <img src={`http://localhost:5000${data.image}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten Utama</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konten Deskripsi</label>
              <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={4} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Poin-poin Keunggulan</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newPoint} 
                onChange={(e) => setNewPoint(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPoint())}
                className="flex-1 px-4 py-2 border rounded-lg" 
                placeholder="Tambah poin baru..."
              />
              <button type="button" onClick={handleAddPoint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Tambah</button>
            </div>
            <ul className="space-y-2">
              {points.map((point, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>{point}</span>
                  <button type="button" onClick={() => handleRemovePoint(index)} className="text-red-600 hover:text-red-800">Hapus</button>
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

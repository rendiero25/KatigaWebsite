import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminNews() {
  const [news, setNews] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', excerpt: '', content: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const token = localStorage.getItem('adminToken');

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/news`);
    setNews(await res.json());
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('excerpt', formData.excerpt);
    data.append('content', formData.content);
    if (imageFile) data.append('image', imageFile);

    const url = editing ? `${API_URL}/news/${editing._id}` : `${API_URL}/news`;
    await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data
    });
    fetchData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus berita ini?')) return;
    await fetch(`${API_URL}/news/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setFormData({ title: item.title, excerpt: item.excerpt || '', content: item.content });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ title: '', excerpt: '', content: '' });
    setImageFile(null);
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Berita & Artikel">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {news.length} artikel</p>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Tambah Artikel</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {news.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
            <div className="aspect-video bg-gray-100">
              {item.image && <img src={`http://localhost:5000${item.image}`} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-1">{new Date(item.date).toLocaleDateString('id-ID')}</p>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{item.excerpt}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleEdit(item)} className="flex-1 px-3 py-1 text-indigo-600 border border-indigo-600 rounded">Edit</button>
                <button onClick={() => handleDelete(item._id)} className="flex-1 px-3 py-1 text-red-600 border border-red-600 rounded">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Tambah'} Artikel</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ringkasan</label>
                <input type="text" value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konten</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={6} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 px-4 py-2 border rounded-lg">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

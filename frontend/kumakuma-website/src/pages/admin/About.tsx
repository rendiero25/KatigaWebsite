import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminAbout() {
  const [aboutContent, setAboutContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ section: 'history', title: '', content: '' });
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);

  const token = localStorage.getItem('adminToken');
  const sections = ['history', 'mission', 'vision', 'teamwork'];

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/about`);
    setAboutContent(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('section', formData.section);
    data.append('title', formData.title);
    data.append('content', formData.content);
    if (imageFiles) {
      Array.from(imageFiles).forEach(file => data.append('images', file));
    }

    const url = editing ? `${API_URL}/about/${editing._id}` : `${API_URL}/about`;
    await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data
    });
    fetchData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus konten ini?')) return;
    await fetch(`${API_URL}/about/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setFormData({ section: item.section, title: item.title, content: item.content });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ section: 'history', title: '', content: '' });
    setImageFiles(null);
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="About Us Content">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Kelola konten halaman About Us</p>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Tambah Konten</button>
      </div>

      <div className="space-y-4">
        {aboutContent.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium uppercase mb-2 inline-block">{item.section}</span>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{item.content}</p>
                {item.images?.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {item.images.map((img: string, i: number) => (
                      <img key={i} src={`http://localhost:5000${img}`} alt="" className="w-20 h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(item)} className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded">Edit</button>
                <button onClick={() => handleDelete(item._id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Tambah'} Konten About</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                  {sections.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konten</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={6} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(e.target.files)} className="w-full px-4 py-2 border rounded-lg" />
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

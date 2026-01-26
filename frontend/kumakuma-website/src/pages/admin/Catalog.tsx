import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminCatalog() {
  const [catalog, setCatalog] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/catalog`)
      .then(res => res.json())
      .then(data => {
        setCatalog(data);
        setFormData({ title: data.title || '', description: data.description || '' });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    if (bgFile) data.append('backgroundImage', bgFile);
    if (pdfFile) data.append('file', pdfFile);

    const res = await fetch(`${API_URL}/catalog`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data
    });

    if (res.ok) {
      setCatalog(await res.json());
      alert('Catalog berhasil diperbarui!');
    }
    setSaving(false);
  };

  return (
    <AdminLayout title="E-Catalog">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Background Image</h3>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
              {catalog.backgroundImage ? (
                <img src={`http://localhost:5000${catalog.backgroundImage}`} alt="Catalog BG" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Belum ada gambar</div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten Catalog</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Company Catalogue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={4} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">File Catalog (PDF)</h3>
            {catalog.fileUrl && (
              <p className="text-sm text-gray-600 mb-2">File saat ini: <a href={`http://localhost:5000${catalog.fileUrl}`} target="_blank" className="text-indigo-600">{catalog.fileUrl}</a></p>
            )}
            <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

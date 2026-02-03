import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Advantage {
  _id: string;
  number: string;
  title: string;
  description: string;
  order: number;
}

interface SectionContent {
  title: string;
  subtitle: string;
  content: string;
}

export default function AdminAdvantages() {
  const [advantages, setAdvantages] = useState<Advantage[]>([]);
  const [sectionContent, setSectionContent] = useState<SectionContent>({ title: '', subtitle: '', content: '' });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Advantage | null>(null);
  const [formData, setFormData] = useState({ number: '', title: '', description: '', order: 0 });

  const token = localStorage.getItem('adminToken');

  const fetchData = useCallback(async () => {
    try {
        const res = await fetch(`${API_URL}/advantages`);
        setAdvantages(await res.json());

        const resContent = await fetch(`${API_URL}/advantages/content`);
        const contentData = await resContent.json();
        setSectionContent({
            title: contentData.title || '',
            subtitle: contentData.subtitle || '',
            content: contentData.content || ''
        });

        setLoading(false);
    } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await fetch(`${API_URL}/advantages/content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(sectionContent)
        });
        alert('Konten Header berhasil disimpan!');
    } catch (error) {
        console.error("Error updating section content:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing ? `${API_URL}/advantages/${editing._id}` : `${API_URL}/advantages`;
    await fetch(url, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    fetchData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus keunggulan ini?')) return;
    await fetch(`${API_URL}/advantages/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const handleEdit = (item: Advantage) => {
    setEditing(item);
    setFormData({ number: item.number, title: item.title, description: item.description, order: item.order || 0 });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ number: '', title: '', description: '', order: 0 });
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Keunggulan Kami">
      
      {/* Section Header Editor */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Edit Header Section</h3>
        <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama (Vertikal)</label>
                    <input 
                        type="text" 
                        value={sectionContent.title} 
                        onChange={(e) => setSectionContent({...sectionContent, title: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="KEUNGGULAN KAMI"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Judul (Intro)</label>
                    <input 
                        type="text" 
                        value={sectionContent.subtitle} 
                        onChange={(e) => setSectionContent({...sectionContent, subtitle: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Tumbuh Bersama..."
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konten Deskripsi</label>
                <textarea 
                    value={sectionContent.content}
                    onChange={(e) => setSectionContent({...sectionContent, content: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={3}
                    placeholder="PT Kusuma Kencana..."
                />
            </div>
            <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan Header</button>
            </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {advantages.length} keunggulan</p>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">+ Tambah Keunggulan</button>
      </div>

      <div className="space-y-4">
        {advantages.map((item) => (
          <div key={item._id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <span className="text-3xl font-bold text-pink-500">{item.number}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
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
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Tambah'} Keunggulan Item</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor</label>
                  <input type="text" value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Item</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Item</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" rows={4} required />
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

import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

const API_URL = 'http://localhost:5000/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    tagline: '',
    shopNowUrl: '',
    tokopediaUrl: '',
    shopeeUrl: '',
    instagramUrl: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetch(`${API_URL}/site-settings`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setFormData({
          companyName: data.companyName || '',
          tagline: data.tagline || '',
          shopNowUrl: data.shopNowUrl || '',
          tokopediaUrl: data.tokopediaUrl || '',
          shopeeUrl: data.shopeeUrl || '',
          instagramUrl: data.instagramUrl || ''
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    if (logoFile) data.append('logo', logoFile);

    const res = await fetch(`${API_URL}/site-settings`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: data
    });

    if (res.ok) {
      setSettings(await res.json());
      alert('Pengaturan berhasil disimpan!');
    }
    setSaving(false);
  };

  return (
    <AdminLayout title="Pengaturan Website">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Logo Website</h3>
            <div className="flex items-center gap-4 mb-4">
              {settings.logo ? (
                <img src={`http://localhost:5000${settings.logo}`} alt="Logo" className="w-20 h-20 object-contain border rounded-lg" />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">No Logo</div>
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="flex-1 px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Informasi Perusahaan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
              <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input type="text" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Link Marketplace</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Now URL</label>
              <input type="text" value={formData.shopNowUrl} onChange={(e) => setFormData({ ...formData, shopNowUrl: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tokopedia</label>
                <input type="text" value={formData.tokopediaUrl} onChange={(e) => setFormData({ ...formData, tokopediaUrl: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shopee</label>
                <input type="text" value={formData.shopeeUrl} onChange={(e) => setFormData({ ...formData, shopeeUrl: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <input type="text" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
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

import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

interface Promotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  type: 'products' | 'category';
  productIds: string[];
  categoryId: string | null;
  discountPercent: number;
  isVisible: boolean;
  displayOrder: number;
}

interface Product {
  _id: string;
  name: string;
  category: { _id: string; name: string } | null;
  priceNumeric: number;
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
}

interface Category {
  _id: string;
  name: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const toInputDate = (iso: string) => (iso ? iso.slice(0, 10) : '');

const isActive = (promo: Promotion) => {
  const now = new Date();
  return new Date(promo.startDate) <= now && new Date(promo.endDate) >= now;
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'products' | 'category'>('products');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerSort, setPickerSort] = useState<'name' | 'price'>('name');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const data = await api.getPromotions();
      setPromotions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromotions(); }, []);

  useEffect(() => {
    if (!showSheet) return;
    api.getProducts().then(setProducts);
    api.getCategories().then(setCategories);
  }, [showSheet]);

  const openCreate = () => {
    setEditing(null);
    setName(''); setDescription(''); setBannerFile(null); setBannerPreview('');
    setStartDate(''); setEndDate(''); setType('products');
    setSelectedProductIds([]); setSelectedCategoryId(''); setDiscountPercent('');
    setPickerSearch(''); setPickerCategory(''); setPickerSort('name');
    setError('');
    setShowSheet(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditing(promo);
    setName(promo.name);
    setDescription(promo.description);
    setBannerFile(null);
    setBannerPreview(api.getImageUrl(promo.bannerImage));
    setStartDate(toInputDate(promo.startDate));
    setEndDate(toInputDate(promo.endDate));
    setType(promo.type);
    setSelectedProductIds(promo.productIds);
    setSelectedCategoryId(promo.categoryId || '');
    setDiscountPercent(String(promo.discountPercent));
    setPickerSearch(''); setPickerCategory(''); setPickerSort('name');
    setError('');
    setShowSheet(true);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Nama promosi wajib diisi'); return; }
    if (!startDate || !endDate) { setError('Durasi promosi wajib diisi'); return; }
    const pct = Number(discountPercent);
    if (!discountPercent || pct < 1 || pct > 100) { setError('Diskon harus antara 1–100%'); return; }
    if (type === 'products' && selectedProductIds.length === 0) { setError('Pilih minimal 1 produk'); return; }
    if (type === 'category' && !selectedCategoryId) { setError('Pilih kategori'); return; }

    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('startDate', startDate);
      fd.append('endDate', endDate);
      fd.append('type', type);
      fd.append('discountPercent', discountPercent);
      fd.append('productIds', JSON.stringify(type === 'products' ? selectedProductIds : []));
      fd.append('categoryId', type === 'category' ? selectedCategoryId : '');
      if (bannerFile) fd.append('bannerImage', bannerFile);

      if (editing) {
        await api.updatePromotion(editing._id, fd);
      } else {
        await api.createPromotion(fd);
      }
      setShowSheet(false);
      fetchPromotions();
    } catch (e: unknown) {
      setError((e as Error).message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus promosi ini?')) return;
    await api.deletePromotion(id);
    fetchPromotions();
  };

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    .filter(p => (pickerCategory ? p.category?._id === pickerCategory : true))
    .sort((a, b) => pickerSort === 'price' ? a.priceNumeric - b.priceNumeric : a.name.localeCompare(b.name));

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <AdminLayout title="Kelola Promosi">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Daftar Promosi</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          + Tambah Promosi
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Belum ada promosi.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipe</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Diskon</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Durasi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {promotions.map(promo => (
                <tr key={promo._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{promo.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {promo.type === 'products' ? 'Produk' : 'Kategori'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{promo.discountPercent}%</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(promo) ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        {new Date(promo.startDate) > new Date() ? 'Akan datang' : 'Berakhir'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(promo)} className="text-indigo-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(promo._id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSheet && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSheet(false)} />
          <div className="relative ml-auto w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold">{editing ? 'Edit Promosi' : 'Tambah Promosi'}</h3>
              <button onClick={() => setShowSheet(false)} className="text-gray-500 hover:text-gray-900 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div>
                <label className={labelClass}>Nama Promosi *</label>
                <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Promo Lebaran 2026" />
              </div>

              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan promosi..." />
              </div>

              <div>
                <label className={labelClass}>Banner</label>
                {bannerPreview && (
                  <img src={bannerPreview} alt="banner preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-indigo-600 hover:underline">
                  {bannerPreview ? 'Ganti gambar' : 'Upload banner'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tanggal Mulai *</label>
                  <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tanggal Berakhir *</label>
                  <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Diskon (%) *</label>
                <input
                  type="number" min="1" max="100" className={inputClass}
                  value={discountPercent} onChange={e => setDiscountPercent(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div>
                <label className={labelClass}>Tipe Seleksi Produk *</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" value="products" checked={type === 'products'} onChange={() => setType('products')} />
                    Pilih Produk
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" value="category" checked={type === 'category'} onChange={() => setType('category')} />
                    Pilih Kategori
                  </label>
                </div>
              </div>

              {type === 'category' ? (
                <div>
                  <label className={labelClass}>Kategori *</label>
                  <select className={inputClass} value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                    <option value="">— Pilih kategori —</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>
                    Produk *{' '}
                    <span className="text-gray-400 font-normal">({selectedProductIds.length} dipilih)</span>
                  </label>

                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Cari produk..."
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                    />
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      value={pickerCategory}
                      onChange={e => setPickerCategory(e.target.value)}
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                      value={pickerSort}
                      onChange={e => setPickerSort(e.target.value as 'name' | 'price')}
                    >
                      <option value="name">Nama A–Z</option>
                      <option value="price">Harga</option>
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-64">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Nama</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Kategori</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Harga</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Status Promo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(p => {
                          const inOtherPromo = p.activePromotion && p.activePromotion._id !== editing?._id;
                          const checked = selectedProductIds.includes(p._id);
                          return (
                            <tr
                              key={p._id}
                              className={`cursor-pointer hover:bg-indigo-50 ${checked ? 'bg-indigo-50' : ''} ${inOtherPromo ? 'opacity-60' : ''}`}
                              onClick={() => { if (!inOtherPromo) toggleProduct(p._id); }}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!!inOtherPromo}
                                  onChange={() => { if (!inOtherPromo) toggleProduct(p._id); }}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                              <td className="px-3 py-2 text-gray-500">{p.category?.name || '—'}</td>
                              <td className="px-3 py-2 text-gray-500">
                                {p.priceNumeric > 0 ? `Rp ${p.priceNumeric.toLocaleString('id-ID')}` : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {inOtherPromo && (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                    {p.activePromotion!.name}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowSheet(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

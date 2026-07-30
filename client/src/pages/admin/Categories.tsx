import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE_URL, api } from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = API_BASE_URL;

interface Category {
  _id: string;
  name: string;
  slug: string;
  image: string;
  displayOrder: number;
  featured: boolean;
}

interface CategoryFormState {
  name: string;
  slug: string;
  displayOrder: string;
  featured: boolean;
}

const emptyForm: CategoryFormState = { name: "", slug: "", displayOrder: "0", featured: false };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormState>({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/categories`);
    setCategories(await res.json());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const featuredCount = categories.filter((c) => c.featured).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `${API_URL}/categories/${editing._id}` : `${API_URL}/categories`;

    const body = new FormData();
    body.append("name", formData.name);
    body.append("slug", formData.slug);
    body.append("displayOrder", formData.displayOrder);
    body.append("featured", String(formData.featured));
    if (imageFile) {
      body.append("image", imageFile);
    } else if (imageRemoved) {
      body.append("keptImage", "");
    }

    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    await fetchData();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    await fetch(`${API_URL}/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleEdit = (item: Category) => {
    setEditing(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      displayOrder: String(item.displayOrder ?? 0),
      featured: item.featured ?? false,
    });
    setImageFile(null);
    setImagePreview(item.image || "");
    setImageRemoved(false);
    setView("form");
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditing(null);
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(false);
    setView("list");
  };

  const setName = (val: string) =>
    setFormData({ ...formData, name: val, slug: val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview("");
    setImageRemoved(true);
  };

  /* ─── LIST VIEW ─── */
  if (view === "list") {
    return (
      <AdminLayout title="Kategori Produk">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{categories.length} kategori</p>
          <Button onClick={() => setView("form")}>
            + Tambah Kategori
          </Button>
        </div>

        {featuredCount > 3 && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Ada {featuredCount} kategori unggulan. Beranda hanya menampilkan 3 kategori unggulan pertama berdasarkan urutan tampil.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Gambar</th>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Urutan</th>
                <th className="px-6 py-4">Unggulan</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 rounded-md bg-gray-100 overflow-hidden">
                      {item.image ? (
                        <img src={api.getImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-mono">{item.slug}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{item.displayOrder ?? 0}</td>
                  <td className="px-6 py-4">
                    {item.featured ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        Unggulan
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs h-7 px-2">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2">
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">
                    Belum ada kategori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminLayout>
    );
  }

  /* ─── FORM VIEW ─── */
  return (
    <AdminLayout title={editing ? "Edit Kategori" : "Tambah Kategori"}>
      <div className="-m-6 flex flex-col bg-white" style={{ minHeight: "calc(100vh - 64px)" }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-700 transition p-1 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-gray-400">Kategori</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {editing ? editing.name : "Kategori Baru"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetForm} size="sm">Batal</Button>
            <Button onClick={handleSubmit} disabled={saving} size="sm"
              className="min-w-[90px]">
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-wrap gap-5">
            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Informasi Kategori</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name" className="text-xs text-gray-500">Nama <span className="text-red-400">*</span></Label>
                  <Input id="cat-name" value={formData.name} onChange={(e) => setName(e.target.value)}
                    placeholder="Nama kategori" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-slug" className="text-xs text-gray-500">Slug</Label>
                  <Input id="cat-slug" value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="nama-kategori" required className="h-9 text-sm font-mono" />
                  <p className="text-[11px] text-gray-400">Auto-generate dari nama. Bisa diedit manual.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-order" className="text-xs text-gray-500">Urutan Tampil</Label>
                  <Input id="cat-order" type="number" value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    placeholder="0" className="h-9 text-sm" />
                  <p className="text-[11px] text-gray-400">Angka lebih kecil tampil lebih dulu.</p>
                </div>
                <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Kategori Unggulan</p>
                    <p className="text-[11px] text-gray-400">Ditampilkan di beranda (maksimal 3).</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </div>
                {!editing && featuredCount >= 3 && formData.featured && (
                  <p className="text-[11px] text-amber-600">
                    Sudah ada {featuredCount} kategori unggulan. Beranda hanya menampilkan 3 kategori unggulan.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Gambar Kategori</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="aspect-[3/4] w-full max-w-[220px] rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview.startsWith("blob:") ? imagePreview : api.getImageUrl(imagePreview)}
                      alt={formData.name || "Pratinjau kategori"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">Belum ada gambar</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input id="cat-image" type="file" accept="image/*" onChange={handleImageChange}
                    className="h-9 text-sm" />
                  {imagePreview && (
                    <Button type="button" variant="secondary" size="sm" onClick={handleImageRemove}>
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">Rasio potret (3:4) direkomendasikan untuk tampilan beranda.</p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

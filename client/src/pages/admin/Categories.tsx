import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = API_BASE_URL;

interface Category {
  _id: string;
  name: string;
  slug: string;
}

const emptyForm = { name: "", slug: "" };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/categories`);
    setCategories(await res.json());
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `${API_URL}/categories/${editing._id}` : `${API_URL}/categories`;
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(formData),
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
    setFormData({ name: item.name, slug: item.slug });
    setView("form");
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditing(null);
    setView("list");
  };

  const setName = (val: string) =>
    setFormData({ name: val, slug: val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") });

  /* ─── LIST VIEW ─── */
  if (view === "list") {
    return (
      <AdminLayout title="Kategori Produk">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{categories.length} kategori</p>
          <Button onClick={() => setView("form")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            + Tambah Kategori
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm font-mono">{item.slug}</td>
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
                  <td colSpan={3} className="px-6 py-16 text-center text-gray-400 text-sm">
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
            <Button variant="outline" onClick={resetForm} size="sm" className="text-gray-600">Batal</Button>
            <Button onClick={handleSubmit} disabled={saving} size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[90px]">
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
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

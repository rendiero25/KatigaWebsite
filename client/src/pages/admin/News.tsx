import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_URL = API_BASE_URL;

interface Article {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  date: string;
}

interface SectionContent {
  title: string;
  subtitle: string;
  bannerImage?: string;
}

const emptyForm = { title: "", excerpt: "", content: "", category: "Company News" };
const CATEGORIES = ["Company News", "Events", "Product Updates", "CSR"];

export default function AdminNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sectionContent, setSectionContent] = useState<SectionContent>({ title: "", subtitle: "" });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Article | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("adminToken");

  const fetchData = async () => {
    try {
      const [resArticles, resContent] = await Promise.all([
        fetch(`${API_URL}/news?limit=1000`),
        fetch(`${API_URL}/news/content`),
      ]);
      const articlesData = await resArticles.json();
      setArticles(articlesData.data || []);
      setSectionContent(await resContent.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHeader(true);
    const data = new FormData();
    data.append("title", sectionContent.title);
    data.append("subtitle", sectionContent.subtitle);
    if (bannerFile) data.append("bannerImage", bannerFile);
    try {
      const res = await fetch(`${API_URL}/news/content`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (res.ok) setSectionContent(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("excerpt", formData.excerpt);
    data.append("content", formData.content);
    data.append("category", formData.category);
    if (imageFile) data.append("image", imageFile);
    try {
      const url = editing ? `${API_URL}/news/${editing._id}` : `${API_URL}/news`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (!res.ok) throw new Error("Failed to save");
      await fetchData();
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus berita ini?")) return;
    await fetch(`${API_URL}/news/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleEdit = (item: Article) => {
    setEditing(item);
    setFormData({ title: item.title, excerpt: item.excerpt, content: item.content, category: item.category || "Company News" });
    setImageFile(null);
    setImagePreview(item.image ? api.getImageUrl(item.image) : null);
    setView("form");
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
    setView("list");
  };

  const handleImageChange = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* ─── LIST VIEW ─── */
  if (view === "list") {
    return (
      <AdminLayout title="Kelola Berita">
        {/* Section header editor */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Header Section Berita</h3>
          <form onSubmit={handleSectionSubmit}>
            <div className="flex flex-wrap gap-5">
              {/* Banner preview */}
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-gray-500 mb-1.5 block">Banner Image</Label>
                <div
                  className="aspect-video rounded-lg bg-gray-100 overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors"
                  onClick={() => document.getElementById("banner-input")?.click()}
                >
                  {bannerFile ? (
                    <img src={URL.createObjectURL(bannerFile)} className="w-full h-full object-cover" />
                  ) : sectionContent.bannerImage ? (
                    <img src={api.getImageUrl(sectionContent.bannerImage)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">Klik untuk upload banner</span>
                    </div>
                  )}
                </div>
                <input id="banner-input" type="file" accept="image/*" className="hidden"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              </div>

              {/* Title & subtitle */}
              <div className="flex-1 min-w-[220px] flex flex-col gap-4 justify-center">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Sub-Judul</Label>
                  <Input value={sectionContent.subtitle}
                    onChange={(e) => setSectionContent({ ...sectionContent, subtitle: e.target.value })}
                    placeholder="Certificates & Teknologi" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Judul Utama</Label>
                  <Input value={sectionContent.title}
                    onChange={(e) => setSectionContent({ ...sectionContent, title: e.target.value })}
                    placeholder="Rangkuman berita terbaru..." className="h-9 text-sm" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingHeader} size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                    {savingHeader ? "Menyimpan…" : "Simpan Header"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Articles list */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{loading ? "Memuat…" : `${articles.length} artikel`}</p>
          <Button onClick={() => setView("form")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            + Tambah Berita
          </Button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {articles.map((item) => (
            <div key={item._id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
              <div className="aspect-video bg-gray-100">
                {item.image && (
                  <img src={api.getImageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString("id-ID")}</span>
                  <Badge className="text-xs bg-black text-white hover:bg-gray-800">{item.category || "Uncategorized"}</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{item.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{item.excerpt}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}
                    className="flex-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs h-7">
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)}
                    className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7">
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!loading && articles.length === 0 && (
            <div className="col-span-3 py-16 text-center text-gray-400 text-sm bg-white rounded-xl">
              Belum ada artikel.
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  /* ─── FORM VIEW ─── */
  return (
    <AdminLayout title={editing ? "Edit Berita" : "Tambah Berita"}>
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
              <p className="text-xs text-gray-400">Berita</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {editing ? editing.title : "Artikel Baru"}
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

            {/* Informasi Artikel */}
            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Informasi Artikel</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="news-title" className="text-xs text-gray-500">Judul <span className="text-red-400">*</span></Label>
                  <Input id="news-title" value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Judul artikel" required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="news-category" className="text-xs text-gray-500">Kategori</Label>
                  <select id="news-category" value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 text-sm border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="news-excerpt" className="text-xs text-gray-500">Ringkasan</Label>
                  <Input id="news-excerpt" value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Ringkasan singkat artikel" className="h-9 text-sm" />
                </div>
              </CardContent>
            </Card>

            {/* Foto Artikel */}
            <Card className="shadow-none border-gray-200 flex-1 min-w-[280px]">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Foto Artikel</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div
                  className="aspect-video rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors overflow-hidden"
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) handleImageChange(file);
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 p-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-center">Klik atau seret gambar ke sini</span>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageChange(f); }} />
                {imagePreview && (
                  <Button variant="ghost" size="sm" className="mt-2 text-xs text-gray-500 w-full"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    Hapus gambar
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Konten */}
            <Card className="shadow-none border-gray-200 w-full">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-gray-700">Konten Artikel</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tulis konten artikel di sini…"
                  required
                  rows={12}
                  className="text-sm resize-y"
                />
              </CardContent>
            </Card>

          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

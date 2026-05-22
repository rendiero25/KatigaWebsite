import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

export default function AdminNews() {
  const [articles, setArticles] = useState<any[]>([]);
  const [sectionContent, setSectionContent] = useState<any>({
    title: "",
    subtitle: "",
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Company News",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  const categories = ["Company News", "Events", "Product Updates", "CSR"];

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/news?limit=1000`);
      const data = await res.json();
      setArticles(data.data || []);

      const resContent = await fetch(`${API_URL}/news/content`);
      const contentData = await resContent.json();
      setSectionContent(contentData);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res.ok) {
        const updated = await res.json();
        setSectionContent(updated);
        alert("Konten Header berhasil disimpan!");
      }
    } catch (error) {
      console.error("Error updating section content:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("excerpt", formData.excerpt);
    data.append("content", formData.content);
    data.append("category", formData.category);
    if (imageFile) data.append("image", imageFile);

    try {
      const url = editing
        ? `${API_URL}/news/${editing._id}`
        : `${API_URL}/news`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (!res.ok) throw new Error("Failed to save");

      fetchData();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan berita");
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

  const handleEdit = (item: any) => {
    setEditing(item);
    setFormData({
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      category: item.category || "Company News",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      category: "Company News",
    });
    setImageFile(null);
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Kelola Berita">
      {/* Section Header Editor */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">
          Edit Header Section
        </h3>
        <form onSubmit={handleSectionSubmit} className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image
            </label>
            <div className="aspect-video w-full md:w-1/3 bg-gray-100 rounded-lg overflow-hidden mb-2">
              {bannerFile ? (
                <img
                  src={URL.createObjectURL(bannerFile)}
                  className="w-full h-full object-cover"
                />
              ) : sectionContent.bannerImage ? (
                <img
                  src={api.getImageUrl(sectionContent.bannerImage)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <input
              type="file"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-Judul (Kecil)
              </label>
              <input
                type="text"
                value={sectionContent.subtitle}
                onChange={(e) =>
                  setSectionContent({
                    ...sectionContent,
                    subtitle: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Certificates & Technologi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Judul Utama
              </label>
              <input
                type="text"
                value={sectionContent.title}
                onChange={(e) =>
                  setSectionContent({
                    ...sectionContent,
                    title: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Rangkuman berita..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Simpan Header
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {articles.length} berita</p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Tambah Berita
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {articles.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-xl shadow-sm overflow-hidden group"
          >
            <div className="aspect-video bg-gray-100">
              {item.image && (
                <img
                  src={api.getImageUrl(item.image)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm text-gray-500">
                  {new Date(item.date).toLocaleDateString("id-ID")}
                </p>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  {item.category || "Uncategorized"}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {item.excerpt}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-3 py-1 text-indigo-600 border border-indigo-600 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="flex-1 px-3 py-1 text-red-600 border border-red-600 rounded"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? "Edit" : "Tambah"} Artikel
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ringkasan
                </label>
                <input
                  type="text"
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konten
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gambar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

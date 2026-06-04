import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

interface CatalogData {
  title: string;
  description: string;
  backgroundImage?: string;
  cardImage?: string;
  fileUrl?: string;
}

export default function AdminCatalog() {
  const [catalog, setCatalog] = useState<CatalogData>({
    title: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/catalog`);
      const data = await res.json();
      setCatalog(data);
      setFormData({
        title: data.title || "",
        description: data.description || "",
      });
    } catch (error) {
      console.error("Error fetching catalog:", error);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      if (bgFile) data.append("backgroundImage", bgFile);
      if (cardFile) data.append("cardImage", cardFile);
      if (pdfFile) data.append("file", pdfFile);

      const res = await fetch(`${API_URL}/catalog`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        setCatalog(await res.json());
        alert("Catalog berhasil diperbarui!");
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        alert(`Gagal menyimpan: ${err.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="E-Catalog">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Background Image
            </h3>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
              {catalog.backgroundImage ? (
                <img
                  src={api.getImageUrl(catalog.backgroundImage)}
                  alt="Catalog BG"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Belum ada gambar
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBgFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Gambar Kartu Katalog (Hexagon/Collage)
            </h3>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4 max-w-xs mx-auto">
              {catalog.cardImage ? (
                <img
                  src={api.getImageUrl(catalog.cardImage)}
                  alt="Card Image"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Belum ada gambar
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCardFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten Catalog</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg"
                rows={4}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              File Catalog (PDF)
            </h3>
            {catalog.fileUrl && (
              <p className="text-sm text-gray-600 mb-2">
                File saat ini:{" "}
                <a
                  href={api.getImageUrl(catalog.fileUrl)}
                  target="_blank"
                  className="text-indigo-600"
                >
                  {catalog.fileUrl}
                </a>
              </p>
            )}
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

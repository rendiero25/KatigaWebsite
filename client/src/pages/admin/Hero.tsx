import { useState, useEffect } from "react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";

const API_URL = API_BASE_URL;

export default function AdminHero() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hero, setHero] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    buttonName: "",
    buttonLink: "",
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/hero`)
      .then((res) => res.json())
      .then((data) => {
        setHero(data);
        setFormData({
          title: data.title || "",
          subtitle: data.subtitle || "",
          buttonName: data.buttonName || "",
          buttonLink: data.buttonLink || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("subtitle", formData.subtitle);
    data.append("buttonName", formData.buttonName);
    data.append("buttonLink", formData.buttonLink);
    if (imageFile) data.append("image", imageFile);

    try {
      const res = await fetch(`${API_URL}/hero`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        const updated = await res.json();
        setHero(updated);
        toast.success("Hero section berhasil diperbarui!");
      }
    } catch (error) {
      console.error("Error updating hero:", error);
      toast.error("Gagal memperbarui hero section");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Hero Section">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Hero Section">
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Image Preview */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Gambar Hero Saat Ini
            </h3>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
              {hero.image ? (
                <img
                  src={api.getImageUrl(hero.image)}
                  alt="Hero"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Belum ada gambar
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unggah Gambar Baru
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten Hero</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Judul Utama
              </label>
              <textarea
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Menghadirkan perlengkapan tidur bayi..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Judul
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Bersertifikat SNI, OEKO-TEX®, dan K3L."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Tombol
                </label>
                <input
                  type="text"
                  value={formData.buttonName}
                  onChange={(e) =>
                    setFormData({ ...formData, buttonName: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Lihat Koleksi Kami"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Tombol
                </label>
                <input
                  type="text"
                  value={formData.buttonLink}
                  onChange={(e) =>
                    setFormData({ ...formData, buttonLink: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="/produk"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}

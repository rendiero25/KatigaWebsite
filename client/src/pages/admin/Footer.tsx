import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

export default function AdminFooter() {
  const [footer, setFooter] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    consultationTitle: "",
    consultationText: "",
    copyright: "",
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/footer`)
      .then((res) => res.json())
      .then((data) => {
        setFooter(data);
        setFormData({
          consultationTitle: data.consultationTitle || "",
          consultationText: data.consultationText || "",
          copyright: data.copyright || "",
        });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`${API_URL}/footer`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      alert("Footer berhasil diperbarui!");
    }
    setSaving(false);
  };

  return (
    <AdminLayout title="Konten Footer">
      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Konsultasi
            </label>
            <input
              type="text"
              value={formData.consultationTitle}
              onChange={(e) =>
                setFormData({ ...formData, consultationTitle: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Gratis Konsultasi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teks Konsultasi
            </label>
            <textarea
              value={formData.consultationText}
              onChange={(e) =>
                setFormData({ ...formData, consultationText: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Copyright
            </label>
            <input
              type="text"
              value={formData.copyright}
              onChange={(e) =>
                setFormData({ ...formData, copyright: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="2026 Kusuma Kencana Khatulistiwa..."
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

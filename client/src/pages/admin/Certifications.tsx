import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

interface Certification {
  _id: string;
  name: string;
  description: string;
  order: number;
  icon: string;
}

export default function AdminCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    order: 0,
  });
  const [iconFile, setIconFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  const fetchData = useCallback(async () => {
    const res = await fetch(`${API_URL}/certifications`);
    setCertifications(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("order", String(formData.order));
    if (iconFile) data.append("icon", iconFile);

    const url = editing
      ? `${API_URL}/certifications/${editing._id}`
      : `${API_URL}/certifications`;
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    fetchData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus sertifikasi ini?")) return;
    await fetch(`${API_URL}/certifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleEdit = (item: Certification) => {
    setEditing(item);
    setFormData({
      name: item.name,
      description: item.description,
      order: item.order || 0,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", order: 0 });
    setIconFile(null);
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Sertifikasi">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Total {certifications.length} sertifikasi
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Tambah Sertifikasi
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {certifications.map((item) => (
          <div
            key={item._id}
            className="bg-white rounded-xl shadow-sm p-6 relative group"
          >
            {item.icon && (
              <img
                src={api.getImageUrl(item.icon)}
                alt=""
                className="w-12 h-12 object-contain mb-4"
              />
            )}
            <h3 className="font-semibold text-gray-900 mb-2">{item.name}</h3>
            <p className="text-gray-600 text-sm">{item.description}</p>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition flex gap-2">
              <button
                onClick={() => handleEdit(item)}
                className="p-2 bg-indigo-100 text-indigo-600 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item._id)}
                className="p-2 bg-red-100 text-red-600 rounded"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? "Edit" : "Tambah"} Sertifikasi
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
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
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIconFile(e.target.files?.[0] || null)}
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

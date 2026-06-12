import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

interface Partner {
  _id: string;
  name: string;
  logo: string;
  order?: number; // Add order as optional since it's used
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({ name: "", order: 0 });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  const fetchPartners = useCallback(async () => {
    const res = await fetch(`${API_URL}/partners`);
    const data = await res.json();
    setPartners(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPartners();
  }, [fetchPartners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("order", String(formData.order));
    if (logoFile) data.append("logo", logoFile);

    const url = editing
      ? `${API_URL}/partners/${editing._id}`
      : `${API_URL}/partners`;
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });

    if (res.ok) {
      fetchPartners();
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus partner ini?")) return;
    await fetch(`${API_URL}/partners/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPartners();
  };

  const handleEdit = (item: Partner) => {
    setEditing(item);
    setFormData({ name: item.name, order: item.order || 0 });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", order: 0 });
    setLogoFile(null);
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Kelola Partners">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {partners.length} partner</p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Tambah Partner
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {partners.map((partner) => (
          <div
            key={partner._id}
            className="bg-white rounded-xl shadow-sm p-4 text-center group relative"
          >
            <div className="h-16 flex items-center justify-center mb-2">
              <img
                src={api.getImageUrl(partner.logo)}
                alt={partner.name}
                className="max-h-full max-w-full object-contain"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/100x50")
                }
              />
            </div>
            <p className="text-sm font-medium text-gray-900">{partner.name}</p>
            <p className="text-xs text-gray-500">Order: {partner.order}</p>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center gap-2">
              <button
                onClick={() => handleEdit(partner)}
                className="px-3 py-1 bg-white text-gray-900 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(partner._id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
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
              {editing ? "Edit" : "Tambah"} Partner
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
                  Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
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

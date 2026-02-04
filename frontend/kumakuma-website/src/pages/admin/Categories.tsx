import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const token = localStorage.getItem("adminToken");

  const fetchData = async () => {
    const res = await fetch(`${API_URL}/categories`);
    setCategories(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing
      ? `${API_URL}/categories/${editing._id}`
      : `${API_URL}/categories`;
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    fetchData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    await fetch(`${API_URL}/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setFormData({ name: item.name, slug: item.slug });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: "", slug: "" });
    setEditing(null);
    setShowModal(false);
  };

  return (
    <AdminLayout title="Kategori Produk">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total {categories.length} kategori</p>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Tambah Kategori
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500">
              <th className="px-6 py-4 font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Slug</th>
              <th className="px-6 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-gray-600">{item.slug}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? "Edit" : "Tambah"} Kategori
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
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
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

import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";

const API_URL = API_BASE_URL;

export default function AdminManufacturing() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState([
    { title: "", icon: "" },
    { title: "", icon: "" },
    { title: "", icon: "" },
  ]);

  // File uploads
  const [iconFiles, setIconFiles] = useState<(File | null)[]>([
    null,
    null,
    null,
  ]);
  const [bgFile, setBgFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/manufacturing`)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setTagline(fetchedData.tagline || "");
        setDescription(fetchedData.description || "");

        // Ensure we have 3 features
        const loadedFeatures = fetchedData.features || [];
        const newFeatures = [
          loadedFeatures[0] || { title: "", icon: "" },
          loadedFeatures[1] || { title: "", icon: "" },
          loadedFeatures[2] || { title: "", icon: "" },
        ];
        setFeatures(newFeatures);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFeatureTitleChange = (index: number, val: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], title: val };
    setFeatures(newFeatures);
  };

  const handleIconFileChange = (index: number, file: File | null) => {
    const newFiles = [...iconFiles];
    newFiles[index] = file;
    setIconFiles(newFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("tagline", tagline);
    formData.append("description", description);
    if (bgFile) formData.append("backgroundImage", bgFile);

    features.forEach((feat, i) => {
      formData.append(`title${i}`, feat.title);
    });

    iconFiles.forEach((file, i) => {
      if (file) {
        formData.append(`icon${i}`, file);
      }
    });

    try {
      const res = await fetch(`${API_URL}/manufacturing`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        alert("Manufacturing section berhasil diperbarui!");
        // Clear file inputs if needed, or keep them? Usually keep or reset.
        setIconFiles([null, null, null]);
      } else {
        alert("Gagal memperbarui.");
      }
    } catch (error) {
      console.error("Error updating manufacturing:", error);
      alert("Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Manufacturing Section">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manufacturing Section">
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Konten Utama</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagline (Atas)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Kualitas yang Kami Jaga..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi Utama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 h-32"
                placeholder="Sebagai produsen langsung..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Image
              </label>
              <div className="flex items-center gap-4">
                {data.backgroundImage && (
                  <img
                    src={api.getImageUrl(data.backgroundImage)}
                    alt="Current Background"
                    className="w-32 h-20 object-cover rounded-lg border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBgFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Format: JPG, PNG. Ukuran ideal 1920x1080px.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Fitur / Poin Kunci (3 Item)
            </h3>

            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-medium text-gray-800 mb-4">
                  Fitur #{i + 1}
                </h4>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul
                    </label>
                    <textarea
                      value={feature.title}
                      onChange={(e) =>
                        handleFeatureTitleChange(i, e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Contoh: Benang berkualitas tinggi"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Gunakan enter untuk baris baru.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    {/* Preview */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {feature.icon ? (
                          <img
                            src={api.getImageUrl(feature.icon)}
                            alt={`Icon ${i + 1}`}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No Icon</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleIconFileChange(i, e.target.files?.[0] || null)
                          }
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Upload gambar/icon baru untuk mengganti.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../services/api";
import { FaPlus, FaTrash, FaSave } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminCertificationTech() {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    headerTitle: "",
    headerSubtitle: "",
    sec1Title: "",
    sec1Points: [] as { title: string; description: string }[],
    sec2Title: "",
    sec2Subtitle: "",
    sec2Points: [] as string[],
  });

  const [sec1Image, setSec1Image] = useState<File | null>(null);
  const [sec1ImagePreview, setSec1ImagePreview] = useState("");

  const [sec2Image, setSec2Image] = useState<File | null>(null);
  const [sec2ImagePreview, setSec2ImagePreview] = useState("");

  const token = localStorage.getItem("adminToken");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/certification-tech`);
      const data = await res.json();
      if (data) {
        setFormData({
          headerTitle: data.header?.title || "",
          headerSubtitle: data.header?.subtitle || "",
          sec1Title: data.section1?.title || "",
          sec1Points: data.section1?.points || [],
          sec2Title: data.section2?.title || "",
          sec2Subtitle: data.section2?.subtitle || "",
          sec2Points: data.section2?.points || [],
        });
        if (data.section1?.image)
          setSec1ImagePreview(api.getImageUrl(data.section1.image));
        if (data.section2?.image)
          setSec2ImagePreview(api.getImageUrl(data.section2.image));
      }
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch data", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers for Section 1 Points
  const addSec1Point = () => {
    setFormData({
      ...formData,
      sec1Points: [...formData.sec1Points, { title: "", description: "" }],
    });
  };
  const updateSec1Point = (
    idx: number,
    field: "title" | "description",
    value: string,
  ) => {
    const newPoints = [...formData.sec1Points];
    newPoints[idx][field] = value;
    setFormData({ ...formData, sec1Points: newPoints });
  };
  const removeSec1Point = (idx: number) => {
    setFormData({
      ...formData,
      sec1Points: formData.sec1Points.filter((_, i) => i !== idx),
    });
  };

  // Handlers for Section 2 Points
  const addSec2Point = () => {
    setFormData({ ...formData, sec2Points: [...formData.sec2Points, ""] });
  };
  const updateSec2Point = (idx: number, value: string) => {
    const newPoints = [...formData.sec2Points];
    newPoints[idx] = value;
    setFormData({ ...formData, sec2Points: newPoints });
  };
  const removeSec2Point = (idx: number) => {
    setFormData({
      ...formData,
      sec2Points: formData.sec2Points.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("headerTitle", formData.headerTitle);
    data.append("headerSubtitle", formData.headerSubtitle);

    data.append("sec1Title", formData.sec1Title);
    data.append("sec1Points", JSON.stringify(formData.sec1Points));
    if (sec1Image) data.append("section1Image", sec1Image);

    data.append("sec2Title", formData.sec2Title);
    data.append("sec2Subtitle", formData.sec2Subtitle);
    data.append(
      "sec2Points",
      JSON.stringify(formData.sec2Points.filter((p) => p.trim() !== "")),
    );
    if (sec2Image) data.append("section2Image", sec2Image);

    try {
      const res = await fetch(`${API_URL}/certification-tech`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (res.ok) {
        alert("Perubahan berhasil disimpan!");
        fetchData();
      } else {
        alert("Gagal menyimpan perubahan");
      }
    } catch (e) {
      console.error("Error saving", e);
    }
  };

  if (loading)
    return (
      <AdminLayout title="Certification & Technology">
        <p>Loading...</p>
      </AdminLayout>
    );

  return (
    <AdminLayout title="Certification & Technology">
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Edit Page Content
        </h1>
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Global Header */}
          <section className="space-y-4 border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-700">Page Header</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Main Title
                </label>
                <input
                  type="text"
                  value={formData.headerTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, headerTitle: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="KAMI MENJAMIN..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.headerSubtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, headerSubtitle: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="Certificates & Technology"
                />
              </div>
            </div>
          </section>

          {/* Section 1: Certificates */}
          <section className="space-y-6 border-b pb-6">
            <h2 className="text-xl font-semibold text-gray-700">
              Section 1: Certificates (Left Image, Right Points)
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Section 1 Image (Left Side)
              </label>
              <div className="flex items-center gap-4">
                {sec1ImagePreview && (
                  <img
                    src={sec1ImagePreview}
                    className="h-20 w-32 object-cover rounded border"
                    alt="Preview"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSec1Image(e.target.files[0]);
                      setSec1ImagePreview(
                        URL.createObjectURL(e.target.files[0]),
                      );
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Points */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-600">
                  Certificate Points
                </label>
                <button
                  type="button"
                  onClick={addSec1Point}
                  className="text-sm text-blue-600 flex items-center gap-1"
                >
                  <FaPlus /> Add Point
                </button>
              </div>
              {formData.sec1Points.map((point, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 p-4 rounded-lg flex gap-4 items-start"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      placeholder="Point Title (e.g. SNI & K3L)"
                      value={point.title}
                      onChange={(e) =>
                        updateSec1Point(idx, "title", e.target.value)
                      }
                      className="w-full border rounded px-3 py-1 font-semibold"
                    />
                    <textarea
                      placeholder="Description"
                      value={point.description}
                      onChange={(e) =>
                        updateSec1Point(idx, "description", e.target.value)
                      }
                      className="w-full border rounded px-3 py-1 text-sm"
                      rows={2}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSec1Point(idx)}
                    className="text-red-500 p-2 hover:bg-red-100 rounded"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Forest to Fashion */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-700">
              Section 2: Forest to Fashion (Left Image, Right Content)
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.sec2Title}
                  onChange={(e) =>
                    setFormData({ ...formData, sec2Title: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="DARI HUTAN UNTUK..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Subtitle (Parentheses)
                </label>
                <input
                  type="text"
                  value={formData.sec2Subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, sec2Subtitle: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  placeholder="(FROM FOREST TO FASHION)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Section 2 Image (Left Side)
              </label>
              <div className="flex items-center gap-4">
                {sec2ImagePreview && (
                  <img
                    src={sec2ImagePreview}
                    className="h-20 w-32 object-cover rounded border"
                    alt="Preview"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSec2Image(e.target.files[0]);
                      setSec2ImagePreview(
                        URL.createObjectURL(e.target.files[0]),
                      );
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Simple Points */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-600">
                  Feature Points
                </label>
                <button
                  type="button"
                  onClick={addSec2Point}
                  className="text-sm text-blue-600 flex items-center gap-1"
                >
                  <FaPlus /> Add Point
                </button>
              </div>
              {formData.sec2Points.map((point, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="pt-2 font-bold text-gray-400">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updateSec2Point(idx, e.target.value)}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Feature description..."
                  />
                  <button
                    type="button"
                    onClick={() => removeSec2Point(idx)}
                    className="text-red-500 p-2 hover:bg-red-100 rounded"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium shadow-lg"
            >
              <FaSave /> Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

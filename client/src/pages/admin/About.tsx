import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import api, { API_BASE_URL } from "../../services/api";
import { FaTrash, FaPlus } from "react-icons/fa";

const API_URL = API_BASE_URL;

export default function AdminAbout() {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    history: "",
    visionContent: "",
    missionPoints: [""],
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<FileList | null>(null);

  // Background Images
  const [missionBg, setMissionBg] = useState<File | null>(null);
  const [visionBg, setVisionBg] = useState<File | null>(null);
  const [missionBgPreview, setMissionBgPreview] = useState("");
  const [visionBgPreview, setVisionBgPreview] = useState("");

  const token = localStorage.getItem("adminToken");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/about`);
      const data = await res.json();
      if (data) {
        setFormData({
          title: data.title || "",
          subtitle: data.subtitle || "",
          history: data.history || "",
          visionContent: data.vision?.content || "",
          missionPoints:
            data.mission?.points?.length > 0 ? data.mission.points : [""],
        });
        setExistingImages(data.images || []);
        if (data.mission?.backgroundImage)
          setMissionBgPreview(api.getImageUrl(data.mission.backgroundImage));
        if (data.vision?.backgroundImage)
          setVisionBgPreview(api.getImageUrl(data.vision.backgroundImage));
      }
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch about content", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleMissionChange = (index: number, value: string) => {
    const newPoints = [...formData.missionPoints];
    newPoints[index] = value;
    setFormData({ ...formData, missionPoints: newPoints });
  };

  const addMissionPoint = () => {
    setFormData({
      ...formData,
      missionPoints: [...formData.missionPoints, ""],
    });
  };

  const removeMissionPoint = (index: number) => {
    const newPoints = formData.missionPoints.filter((_, i) => i !== index);
    setFormData({ ...formData, missionPoints: newPoints });
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm("Hapus gambar ini?")) return;
    try {
      await fetch(`${API_URL}/about/images/delete`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });
      setExistingImages(existingImages.filter((img) => img !== imageUrl));
    } catch (e) {
      console.error("Failed to delete image", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", formData.title);
    data.append("subtitle", formData.subtitle);
    data.append("history", formData.history);
    data.append("visionContent", formData.visionContent);
    data.append(
      "missionPoints",
      JSON.stringify(formData.missionPoints.filter((p) => p.trim() !== "")),
    );

    if (newImageFiles) {
      if (existingImages.length + newImageFiles.length > 10) {
        toast.warning("Maksimal 10 gambar diperbolehkan.");
        return;
      }
      Array.from(newImageFiles).forEach((file) => data.append("images", file));
    }

    if (missionBg) data.append("missionBg", missionBg);
    if (visionBg) data.append("visionBg", visionBg);

    try {
      const res = await fetch(`${API_URL}/about`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (res.ok) {
        toast.success("Perubahan berhasil disimpan!");
        fetchData();
        setNewImageFiles(null);
        // Reset file input value if possible, or just let page refresh reload data
        const fileInput = document.getElementById(
          "fileInput",
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        toast.error("Gagal menyimpan perubahan");
      }
    } catch (e) {
      console.error("Error saving", e);
    }
  };

  if (loading)
    return (
      <AdminLayout title="About Us Content">
        <p>Loading...</p>
      </AdminLayout>
    );

  return (
    <AdminLayout title="About Us Content">
      <div className="bg-white rounded-xl shadow-sm p-6 w-full">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Header Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Utama (Title)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="ABOUT US"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub-Judul (Subtitle)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="From a family's passion..."
                />
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Gallery Images (Max 10)
            </h3>

            {existingImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {existingImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={api.getImageUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteImage(img)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                    >
                      <FaTrash size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload New Images
              </label>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setNewImageFiles(e.target.files)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select multiple images. Max total 10.
              </p>
            </div>
          </div>

          {/* History Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">History</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.history}
                onChange={(e) =>
                  setFormData({ ...formData, history: e.target.value })
                }
                rows={5}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Didirikan pada tahun 2001..."
              />
            </div>
          </div>

          {/* Mission Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Mission</h3>

            {/* Background Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Image
              </label>
              <div className="flex items-center gap-4">
                {missionBgPreview && (
                  <img
                    src={missionBgPreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setMissionBg(e.target.files[0]);
                      setMissionBgPreview(
                        URL.createObjectURL(e.target.files[0]),
                      );
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              {formData.missionPoints.map((point, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => handleMissionChange(idx, e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg"
                    placeholder={`Mission point ${idx + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeMissionPoint(idx)}
                  >
                    <FaTrash />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addMissionPoint}
              >
                <FaPlus /> Add Mission Point
              </Button>
            </div>
          </div>

          {/* Vision Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Vision</h3>

            {/* Background Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Image
              </label>
              <div className="flex items-center gap-4">
                {visionBgPreview && (
                  <img
                    src={visionBgPreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVisionBg(e.target.files[0]);
                      setVisionBgPreview(
                        URL.createObjectURL(e.target.files[0]),
                      );
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.visionContent}
                onChange={(e) =>
                  setFormData({ ...formData, visionContent: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="To serve THE WORLD..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit">
              Simpan Semua Perubahan
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminLayout from "../../components/AdminLayout";
import api, { API_BASE_URL } from "../../services/api";
import { Button } from "@/components/ui/button";

const API_URL = API_BASE_URL;

type MediaType = "image" | "video";

interface HeroSlideForm {
  media: string;
  mediaType: MediaType;
  title: string;
  subtitle: string;
  buttonName: string;
  buttonLink: string;
  file: File | null;
  previewUrl: string;
}

interface HeroSlideApi {
  media?: string;
  mediaType?: string;
  title?: string;
  subtitle?: string;
  buttonName?: string;
  buttonLink?: string;
}

interface HeroApiResponse {
  slides?: HeroSlideApi[];
}

function emptySlide(): HeroSlideForm {
  return {
    media: "",
    mediaType: "image",
    title: "",
    subtitle: "",
    buttonName: "",
    buttonLink: "",
    file: null,
    previewUrl: "",
  };
}

export default function AdminHero() {
  const [slides, setSlides] = useState<HeroSlideForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/hero`)
      .then((res) => res.json())
      .then((data: HeroApiResponse) => {
        const loadedSlides: HeroSlideForm[] = (data.slides || []).map((slide) => ({
          media: slide.media || "",
          mediaType: slide.mediaType === "video" ? "video" : "image",
          title: slide.title || "",
          subtitle: slide.subtitle || "",
          buttonName: slide.buttonName || "",
          buttonLink: slide.buttonLink || "",
          file: null,
          previewUrl: "",
        }));
        setSlides(loadedSlides);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSlide = (index: number, patch: Partial<HeroSlideForm>) => {
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    );
  };

  const handleAddSlide = () => {
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const handleRemoveSlide = (index: number) => {
    setSlides((prev) => {
      const target = prev[index];
      if (target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMoveSlide = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    setSlides((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleFileChange = (index: number, fileList: FileList | null) => {
    const file = fileList?.[0] || null;
    if (!file) {
      updateSlide(index, { file: null, previewUrl: "" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updateSlide(index, { file, previewUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    const payload = slides.map((slide, index) => {
      if (slide.file) {
        const fieldname = `slideMedia_${index}`;
        data.append(fieldname, slide.file);
        return {
          media: `__file__${fieldname}`,
          mediaType: slide.mediaType,
          title: slide.title,
          subtitle: slide.subtitle,
          buttonName: slide.buttonName,
          buttonLink: slide.buttonLink,
        };
      }
      return {
        media: slide.media,
        mediaType: slide.mediaType,
        title: slide.title,
        subtitle: slide.subtitle,
        buttonName: slide.buttonName,
        buttonLink: slide.buttonLink,
      };
    });
    data.append("slides", JSON.stringify(payload));

    try {
      const res = await fetch(`${API_URL}/hero`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        const updated: HeroApiResponse = await res.json();
        const savedSlides: HeroSlideForm[] = (updated.slides || []).map((slide) => ({
          media: slide.media || "",
          mediaType: slide.mediaType === "video" ? "video" : "image",
          title: slide.title || "",
          subtitle: slide.subtitle || "",
          buttonName: slide.buttonName || "",
          buttonLink: slide.buttonLink || "",
          file: null,
          previewUrl: "",
        }));
        setSlides(savedSlides);
        toast.success("Hero section berhasil diperbarui!");
      } else {
        toast.error("Gagal memperbarui hero section");
      }
    } catch {
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
          {slides.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-gray-500">
              Belum ada slide. Tambahkan slide pertama.
            </div>
          )}

          {slides.map((slide, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Slide {index + 1}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMoveSlide(index, -1)}
                  >
                    Naik
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === slides.length - 1}
                    onClick={() => handleMoveSlide(index, 1)}
                  >
                    Turun
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveSlide(index)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>

              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {slide.previewUrl ? (
                  slide.mediaType === "video" ? (
                    <video
                      src={slide.previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={slide.previewUrl}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : slide.media ? (
                  slide.mediaType === "video" ? (
                    <video
                      src={api.getImageUrl(slide.media)}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={api.getImageUrl(slide.media)}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Belum ada media
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe Media
                  </label>
                  <select
                    value={slide.mediaType}
                    onChange={(e) =>
                      updateSlide(index, { mediaType: e.target.value as MediaType })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="image">Gambar</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unggah Media Baru
                  </label>
                  <input
                    type="file"
                    accept={slide.mediaType === "video" ? "video/*" : "image/*"}
                    onChange={(e) => handleFileChange(index, e.target.files)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul
                </label>
                <textarea
                  value={slide.title}
                  onChange={(e) => updateSlide(index, { title: e.target.value })}
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
                  value={slide.subtitle}
                  onChange={(e) => updateSlide(index, { subtitle: e.target.value })}
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
                    value={slide.buttonName}
                    onChange={(e) => updateSlide(index, { buttonName: e.target.value })}
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
                    value={slide.buttonLink}
                    onChange={(e) => updateSlide(index, { buttonLink: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="/produk"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={handleAddSlide} className="w-full">
            Tambah Slide
          </Button>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}

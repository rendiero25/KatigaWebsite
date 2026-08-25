import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Play, Plus, Trash2 } from "lucide-react";

import api, { API_BASE_URL } from "../../services/api";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const API_URL = API_BASE_URL;

// The preview box is 192 CSS px wide; request 2x for retina and let Cloudinary
// do the resizing. The stored originals are 5-7 MB PNGs.
const THUMB_W = 384;
const THUMB_H = 216;

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

function toFormSlides(slides: HeroSlideApi[] | undefined): HeroSlideForm[] {
  return (slides || []).map((slide) => ({
    media: slide.media || "",
    mediaType: slide.mediaType === "video" ? "video" : "image",
    title: slide.title || "",
    subtitle: slide.subtitle || "",
    buttonName: slide.buttonName || "",
    buttonLink: slide.buttonLink || "",
    file: null,
    previewUrl: "",
  }));
}

function slidePreview(slide: HeroSlideForm) {
  if (slide.previewUrl) {
    return slide.mediaType === "video" ? (
      <video
        src={slide.previewUrl}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
    ) : (
      <img src={slide.previewUrl} alt="" className="h-full w-full object-cover" />
    );
  }

  if (!slide.media) {
    return (
      <span className="flex flex-col items-center gap-1.5 text-gray-400">
        <ImagePlus className="size-5" />
        <span className="text-[11px]">Pilih media</span>
      </span>
    );
  }

  if (slide.mediaType === "video") {
    const poster = api.getVideoPosterUrl(slide.media, THUMB_W, THUMB_H);
    return (
      <>
        {poster ? (
          <img
            src={poster}
            alt=""
            width={THUMB_W}
            height={THUMB_H}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <Play className="size-5 text-gray-400" />
        )}
        <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-gray-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Play className="size-2.5 fill-current" />
          Video
        </span>
      </>
    );
  }

  return (
    <img
      src={api.getThumbnailUrl(slide.media, THUMB_W, THUMB_H)}
      alt=""
      width={THUMB_W}
      height={THUMB_H}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
}

export default function AdminHero() {
  const [slides, setSlides] = useState<HeroSlideForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/hero`)
      .then((res) => res.json())
      .then((data: HeroApiResponse) => setSlides(toFormSlides(data.slides)))
      .finally(() => setLoading(false));
  }, []);

  const updateSlide = (index: number, patch: Partial<HeroSlideForm>) => {
    setDirty(true);
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    );
  };

  const handleAddSlide = () => {
    setDirty(true);
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const handleRemoveSlide = (index: number) => {
    setDirty(true);
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
    setDirty(true);
    setSlides((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleFileChange = (index: number, fileList: FileList | null) => {
    const previous = slides[index]?.previewUrl;
    if (previous) {
      URL.revokeObjectURL(previous);
    }

    const file = fileList?.[0] || null;
    if (!file) {
      updateSlide(index, { file: null, previewUrl: "" });
      return;
    }
    updateSlide(index, { file, previewUrl: URL.createObjectURL(file) });
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
        setSlides(toFormSlides(updated.slides));
        setDirty(false);
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
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="gap-0 py-0 ring-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <Skeleton className="aspect-video w-full shrink-0 sm:w-48" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Hero Section">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {slides.length} slide
            </p>
            <p className="text-xs text-gray-400">
              {dirty
                ? "Ada perubahan yang belum disimpan."
                : "Urutan di sini menentukan urutan tampil di beranda."}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleAddSlide}>
              <Plus className="size-4" />
              Tambah Slide
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="min-w-[150px]">
              {saving ? (
                <>
                  <Spinner className="size-3.5" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </div>

        {slides.length === 0 ? (
          <Card className="ring-gray-200">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <ImagePlus className="size-7 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-700">Belum ada slide</p>
                <p className="mt-1 text-xs text-gray-400">
                  Slide pertama tampil paling atas di beranda.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSlide}>
                <Plus className="size-4" />
                Tambah Slide
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => (
              <Card key={index} className="gap-0 py-0 ring-gray-200">
                <div className="flex items-center gap-2.5 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded bg-gray-900 text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700">
                    {slide.title.trim() || (
                      <span className="text-gray-400">Slide tanpa judul</span>
                    )}
                  </span>

                  <div className="flex shrink-0 items-center">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-gray-500 hover:text-gray-900"
                            disabled={index === 0}
                            onClick={() => handleMoveSlide(index, -1)}
                            aria-label={`Pindahkan slide ${index + 1} ke atas`}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Naikkan</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-gray-500 hover:text-gray-900"
                            disabled={index === slides.length - 1}
                            onClick={() => handleMoveSlide(index, 1)}
                            aria-label={`Pindahkan slide ${index + 1} ke bawah`}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Turunkan</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleRemoveSlide(index)}
                            aria-label={`Hapus slide ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>Hapus slide</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  <div className="w-full shrink-0 space-y-2 sm:w-48">
                    <label className="group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-100 transition-colors hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                      <input
                        type="file"
                        accept={slide.mediaType === "video" ? "video/*" : "image/*"}
                        onChange={(e) => handleFileChange(index, e.target.files)}
                        className="sr-only"
                        aria-label={`Unggah media untuk slide ${index + 1}`}
                      />
                      {slidePreview(slide)}
                      {(slide.media || slide.previewUrl) && (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Ganti media
                        </span>
                      )}
                    </label>

                    {slide.file && (
                      <p className="truncate text-[11px] text-indigo-600" title={slide.file.name}>
                        Baru: {slide.file.name}
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`slide-type-${index}`}
                        className="text-xs text-gray-500"
                      >
                        Tipe Media
                      </Label>
                      <select
                        id={`slide-type-${index}`}
                        value={slide.mediaType}
                        onChange={(e) =>
                          updateSlide(index, { mediaType: e.target.value as MediaType })
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
                      >
                        <option value="image">Gambar</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`slide-title-${index}`}
                        className="text-xs text-gray-500"
                      >
                        Judul
                      </Label>
                      <Textarea
                        id={`slide-title-${index}`}
                        value={slide.title}
                        onChange={(e) => updateSlide(index, { title: e.target.value })}
                        rows={2}
                        className="resize-none text-sm"
                        placeholder="Menghadirkan perlengkapan tidur bayi..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`slide-subtitle-${index}`}
                        className="text-xs text-gray-500"
                      >
                        Sub Judul
                      </Label>
                      <Input
                        id={`slide-subtitle-${index}`}
                        value={slide.subtitle}
                        onChange={(e) => updateSlide(index, { subtitle: e.target.value })}
                        className="h-9 text-sm"
                        placeholder="Bersertifikat SNI, OEKO-TEX®, dan K3L."
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`slide-button-${index}`}
                          className="text-xs text-gray-500"
                        >
                          Nama Tombol
                        </Label>
                        <Input
                          id={`slide-button-${index}`}
                          value={slide.buttonName}
                          onChange={(e) =>
                            updateSlide(index, { buttonName: e.target.value })
                          }
                          className="h-9 text-sm"
                          placeholder="Lihat Koleksi Kami"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor={`slide-link-${index}`}
                          className="text-xs text-gray-500"
                        >
                          Link Tombol
                        </Label>
                        <Input
                          id={`slide-link-${index}`}
                          value={slide.buttonLink}
                          onChange={(e) =>
                            updateSlide(index, { buttonLink: e.target.value })
                          }
                          className="h-9 text-sm"
                          placeholder="/produk"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </form>
    </AdminLayout>
  );
}

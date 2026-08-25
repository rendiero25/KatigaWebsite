import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, ImagePlus } from "lucide-react";

import api, { API_BASE_URL } from "../../services/api";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const API_URL = API_BASE_URL;

// Preview boxes are 192 CSS px wide; request 2x and let Cloudinary resize.
const THUMB_W = 384;
const THUMB_H = 216;

interface CatalogData {
  title?: string;
  description?: string;
  backgroundImage?: string;
  cardImage?: string;
  fileUrl?: string;
}

interface FormState {
  title: string;
  description: string;
}

// Cloudinary stores the original filename nowhere, so show the public_id tail.
const fileNameOf = (url: string) => url.split("/").pop() || url;

export default function AdminCatalog() {
  const [catalog, setCatalog] = useState<CatalogData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formData, setFormData] = useState<FormState>({ title: "", description: "" });

  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const token = localStorage.getItem("adminToken");

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/catalog`);
      const data = await res.json();
      setCatalog(data || {});
      setFormData({ title: data?.title || "", description: data?.description || "" });
    } catch {
      toast.error("Gagal memuat data katalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalog();
  }, [fetchCatalog]);

  const update = (patch: Partial<FormState>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const pickImage = (
    file: File | null,
    setFile: (f: File | null) => void,
    previous: string,
    setPreview: (v: string) => void,
  ) => {
    if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
    setDirty(true);
    setFile(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      if (bgFile) data.append("backgroundImage", bgFile);
      if (cardFile) data.append("cardImage", cardFile);
      if (pdfFile) data.append("file", pdfFile);

      const res = await fetch(`${API_URL}/catalog`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        setCatalog(await res.json());
        setBgFile(null);
        setCardFile(null);
        setPdfFile(null);
        setBgPreview("");
        setCardPreview("");
        setDirty(false);
        toast.success("Catalog berhasil diperbarui!");
      } else {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        toast.error(`Gagal menyimpan: ${err.message}`);
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="E-Catalog">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
          <Skeleton className="h-40" />
        </div>
      </AdminLayout>
    );
  }

  const bgSrc = bgPreview || (catalog.backgroundImage ? api.getThumbnailUrl(catalog.backgroundImage, THUMB_W, THUMB_H) : "");
  const cardSrc = cardPreview || (catalog.cardImage ? api.getThumbnailUrl(catalog.cardImage, THUMB_W, THUMB_H) : "");

  return (
    <AdminLayout title="E-Catalog">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">E-Catalog</p>
            <p className="text-xs text-gray-400">
              {dirty ? "Ada perubahan yang belum disimpan." : "Isi halaman /katalog."}
            </p>
          </div>

          <Button type="submit" size="sm" disabled={saving} className="ml-auto min-w-[150px]">
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

        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="ring-gray-200">
              <CardHeader className="border-b [.border-b]:pb-4">
                <CardTitle className="text-sm font-semibold text-gray-700">Banner Halaman</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="group relative flex aspect-video w-48 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-100 transition-colors hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Unggah banner halaman katalog"
                    onChange={(e) =>
                      pickImage(e.target.files?.[0] || null, setBgFile, bgPreview, setBgPreview)
                    }
                  />
                  {bgSrc ? (
                    <img
                      src={bgSrc}
                      alt=""
                      width={THUMB_W}
                      height={THUMB_H}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 text-gray-400">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px]">Pilih gambar</span>
                    </span>
                  )}
                  {bgSrc && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Ganti gambar
                    </span>
                  )}
                </label>
                {bgFile && (
                  <p className="mt-2 truncate text-[11px] text-indigo-600">Baru: {bgFile.name}</p>
                )}
              </CardContent>
            </Card>

            <Card className="ring-gray-200">
              <CardHeader className="border-b [.border-b]:pb-4">
                <CardTitle className="text-sm font-semibold text-gray-700">Gambar Sampul</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="group relative flex aspect-video w-48 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-100 transition-colors hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Unggah gambar sampul katalog"
                    onChange={(e) =>
                      pickImage(e.target.files?.[0] || null, setCardFile, cardPreview, setCardPreview)
                    }
                  />
                  {cardSrc ? (
                    <img
                      src={cardSrc}
                      alt=""
                      width={THUMB_W}
                      height={THUMB_H}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 text-gray-400">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px]">Pilih gambar</span>
                    </span>
                  )}
                  {cardSrc && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Ganti gambar
                    </span>
                  )}
                </label>
                {cardFile && (
                  <p className="mt-2 truncate text-[11px] text-indigo-600">Baru: {cardFile.name}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="ring-gray-200">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Teks Katalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="catalog-title" className="text-xs text-gray-500">
                  Judul
                </Label>
                <Input
                  id="catalog-title"
                  value={formData.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="Katalog Produk Katiga"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catalog-description" className="text-xs text-gray-500">
                  Deskripsi
                </Label>
                <Textarea
                  id="catalog-description"
                  value={formData.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={4}
                  className="resize-none text-sm"
                  placeholder="Unduh katalog lengkap produk kami."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="ring-gray-200">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Berkas PDF</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {catalog.fileUrl && (
                <div className="flex items-center gap-2.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                  <FileText className="size-4 shrink-0 text-gray-400" />
                  <a
                    href={api.getImageUrl(catalog.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-indigo-600 hover:underline"
                  >
                    {fileNameOf(catalog.fileUrl)}
                  </a>
                  <span className="shrink-0 text-[11px] text-gray-400">Berkas saat ini</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="catalog-pdf" className="text-xs text-gray-500">
                  Unggah PDF Baru
                </Label>
                <Input
                  id="catalog-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    setDirty(true);
                    setPdfFile(e.target.files?.[0] || null);
                  }}
                  className="h-9 text-sm file:mr-3 file:text-xs"
                />
                {pdfFile && (
                  <p className="truncate text-[11px] text-indigo-600">Baru: {pdfFile.name}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </AdminLayout>
  );
}

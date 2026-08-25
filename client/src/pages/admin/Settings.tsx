import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";

import api, { API_BASE_URL } from "../../services/api";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const API_URL = API_BASE_URL;

interface SettingsForm {
  companyName: string;
  tagline: string;
  shopNowUrl: string;
  tokopediaUrl: string;
  shopeeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
}

const emptyForm: SettingsForm = {
  companyName: "",
  tagline: "",
  shopNowUrl: "",
  tokopediaUrl: "",
  shopeeUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
};

export default function AdminSettings() {
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [formData, setFormData] = useState<SettingsForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/site-settings`)
      .then((res) => res.json())
      .then((data) => {
        setLogoUrl(data.logo || "");
        setFormData({
          companyName: data.companyName || "",
          tagline: data.tagline || "",
          shopNowUrl: data.shopNowUrl || "",
          tokopediaUrl: data.tokopediaUrl || "",
          shopeeUrl: data.shopeeUrl || "",
          instagramUrl: data.instagramUrl || "",
          tiktokUrl: data.tiktokUrl || "",
        });
      })
      .catch(() => toast.error("Gagal memuat pengaturan"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<SettingsForm>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const pickLogo = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setDirty(true);
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    if (logoFile) data.append("logo", logoFile);

    try {
      const res = await fetch(`${API_URL}/site-settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (res.ok) {
        const saved = await res.json();
        setLogoUrl(saved.logo || "");
        setLogoFile(null);
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview("");
        setDirty(false);
        toast.success("Pengaturan berhasil disimpan!");
      } else {
        toast.error("Gagal menyimpan pengaturan");
      }
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Pengaturan Website">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-56" />
        </div>
      </AdminLayout>
    );
  }

  const logoSrc = logoPreview || (logoUrl ? api.getImageUrl(logoUrl) : "");

  return (
    <AdminLayout title="Pengaturan Website">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Pengaturan Website</p>
            <p className="text-xs text-gray-400">
              {dirty ? "Ada perubahan yang belum disimpan." : "Identitas dasar situs."}
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
                <CardTitle className="text-sm font-semibold text-gray-700">Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <label className="group relative flex h-24 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label="Unggah logo website"
                    onChange={(e) => pickLogo(e.target.files?.[0] || null)}
                  />
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 text-gray-400">
                      <ImagePlus className="size-5" />
                      <span className="text-[11px]">Pilih logo</span>
                    </span>
                  )}
                  {logoSrc && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Ganti logo
                    </span>
                  )}
                </label>

                {logoFile ? (
                  <p className="truncate text-[11px] text-indigo-600">Baru: {logoFile.name}</p>
                ) : (
                  <p className="text-[11px] text-gray-400">Tampil di header semua halaman.</p>
                )}
              </CardContent>
            </Card>

            <Card className="ring-gray-200">
              <CardHeader className="border-b [.border-b]:pb-4">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Identitas Perusahaan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-company" className="text-xs text-gray-500">
                    Nama Perusahaan
                  </Label>
                  <Input
                    id="settings-company"
                    value={formData.companyName}
                    onChange={(e) => update({ companyName: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="PT Kusuma Kencana Khatulistiwa"
                  />
                  <p className="text-[11px] text-gray-400">
                    Dipakai di Syarat &amp; Ketentuan dan Kebijakan Privasi.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-tagline" className="text-xs text-gray-500">
                    Tagline
                  </Label>
                  <Input
                    id="settings-tagline"
                    value={formData.tagline}
                    onChange={(e) => update({ tagline: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="Kelembutan Cinta untuk Keluarga Indonesia"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="ring-gray-200">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Tautan Marketplace &amp; Sosial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-shopnow" className="text-xs text-gray-500">
                    Shop Now
                  </Label>
                  <Input
                    id="settings-shopnow"
                    value={formData.shopNowUrl}
                    onChange={(e) => update({ shopNowUrl: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-instagram" className="text-xs text-gray-500">
                    Instagram
                  </Label>
                  <Input
                    id="settings-instagram"
                    value={formData.instagramUrl}
                    onChange={(e) => update({ instagramUrl: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-tiktok" className="text-xs text-gray-500">
                    TikTok
                  </Label>
                  <Input
                    id="settings-tiktok"
                    value={formData.tiktokUrl}
                    onChange={(e) => update({ tiktokUrl: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="https://tiktok.com/@..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-tokopedia" className="text-xs text-gray-500">
                    Tokopedia
                  </Label>
                  <Input
                    id="settings-tokopedia"
                    value={formData.tokopediaUrl}
                    onChange={(e) => update({ tokopediaUrl: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="https://tokopedia.com/..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="settings-shopee" className="text-xs text-gray-500">
                    Shopee
                  </Label>
                  <Input
                    id="settings-shopee"
                    value={formData.shopeeUrl}
                    onChange={(e) => update({ shopeeUrl: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="https://shopee.co.id/..."
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Instagram dan TikTok tampil sebagai ikon di footer. Shop Now, Tokopedia, dan
                Shopee tersimpan tapi belum ditampilkan di halaman publik mana pun.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </AdminLayout>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { API_BASE_URL } from "../../services/api";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const API_URL = API_BASE_URL;

interface ContactPageForm {
  subtitle1: string;
  subtitle2: string;
}

export default function AdminContactPageContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formData, setFormData] = useState<ContactPageForm>({
    subtitle1: "",
    subtitle2: "",
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/contact-page`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          subtitle1: data.subtitle1 || "",
          subtitle2: data.subtitle2 || "",
        });
      })
      .catch(() => toast.error("Gagal memuat konten"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<ContactPageForm>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/contact-page`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setDirty(false);
        toast.success("Konten halaman kontak berhasil diperbarui!");
      } else {
        toast.error("Gagal menyimpan perubahan");
      }
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Konten Halaman Kontak">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56" />
          <Card className="ring-gray-200">
            <CardContent className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Konten Halaman Kontak">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Konten Halaman Kontak</p>
            <p className="text-xs text-gray-400">
              {dirty
                ? "Ada perubahan yang belum disimpan."
                : "Teks pengantar di atas form kontak."}
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

        <Card className="ring-gray-200">
          <CardHeader className="border-b [.border-b]:pb-4">
            <CardTitle className="text-sm font-semibold text-gray-700">Teks Pengantar</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-subtitle1" className="text-xs text-gray-500">
                Paragraf Utama
              </Label>
              <Textarea
                id="contact-subtitle1"
                value={formData.subtitle1}
                onChange={(e) => update({ subtitle1: e.target.value })}
                rows={3}
                className="resize-none text-sm"
                placeholder="Ada pertanyaan tentang produk kami?"
              />
              <p className="text-[11px] text-gray-400">Tampil lebih besar, rata tengah.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-subtitle2" className="text-xs text-gray-500">
                Paragraf Pendukung
              </Label>
              <Textarea
                id="contact-subtitle2"
                value={formData.subtitle2}
                onChange={(e) => update({ subtitle2: e.target.value })}
                rows={3}
                className="resize-none text-sm"
                placeholder="Tim kami siap membantu pada jam kerja."
              />
              <p className="text-[11px] text-gray-400">Tampil lebih kecil, di bawah paragraf utama.</p>
            </div>
          </CardContent>
        </Card>
      </form>
    </AdminLayout>
  );
}

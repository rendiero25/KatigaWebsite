import { useEffect, useState } from "react";
import { toast } from "sonner";

import { API_BASE_URL } from "../../services/api";

import AdminLayout from "../../components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const API_URL = API_BASE_URL;

interface FooterForm {
  consultationTitle: string;
  consultationText: string;
  copyright: string;
}

export default function AdminFooter() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formData, setFormData] = useState<FooterForm>({
    consultationTitle: "",
    consultationText: "",
    copyright: "",
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/footer`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          consultationTitle: data.consultationTitle || "",
          consultationText: data.consultationText || "",
          copyright: data.copyright || "",
        });
      })
      .catch(() => toast.error("Gagal memuat konten footer"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<FooterForm>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/footer`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setDirty(false);
        toast.success("Footer berhasil diperbarui!");
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
      <AdminLayout title="Konten Footer">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56" />
          <Card className="ring-gray-200">
            <CardContent className="space-y-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Konten Footer">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Konten Footer</p>
            <p className="text-xs text-gray-400">
              {dirty
                ? "Ada perubahan yang belum disimpan."
                : "Tampil di bagian bawah semua halaman."}
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
          <Card className="ring-gray-200">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Ajakan Konsultasi
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="footer-consult-title" className="text-xs text-gray-500">
                  Judul
                </Label>
                <Input
                  id="footer-consult-title"
                  value={formData.consultationTitle}
                  onChange={(e) => update({ consultationTitle: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="Gratis Konsultasi"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="footer-consult-text" className="text-xs text-gray-500">
                  Teks Pendukung
                </Label>
                <Textarea
                  id="footer-consult-text"
                  value={formData.consultationText}
                  onChange={(e) => update({ consultationText: e.target.value })}
                  rows={3}
                  className="resize-none text-sm"
                  placeholder="Punya pertanyaan seputar produk? Hubungi kami."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="ring-gray-200">
            <CardHeader className="border-b [.border-b]:pb-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Baris Bawah</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="footer-copyright" className="text-xs text-gray-500">
                  Copyright
                </Label>
                <Input
                  id="footer-copyright"
                  value={formData.copyright}
                  onChange={(e) => update({ copyright: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="© 2026 Kusuma Kencana Khatulistiwa. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </AdminLayout>
  );
}

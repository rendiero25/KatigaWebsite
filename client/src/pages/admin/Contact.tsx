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

interface ContactForm {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
}

export default function AdminContact() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formData, setFormData] = useState<ContactForm>({
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetch(`${API_URL}/contact/info`)
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          email: data.email || "",
          address: data.address || "",
        });
      })
      .catch(() => toast.error("Gagal memuat informasi kontak"))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<ContactForm>) => {
    setDirty(true);
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/contact/info`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setDirty(false);
        toast.success("Informasi kontak berhasil diperbarui!");
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
      <AdminLayout title="Informasi Kontak">
        <div className="space-y-4">
          <Skeleton className="h-9 w-56" />
          <Card className="ring-gray-200">
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Informasi Kontak">
      <form onSubmit={handleSubmit}>
        <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Informasi Kontak</p>
            <p className="text-xs text-gray-400">
              {dirty
                ? "Ada perubahan yang belum disimpan."
                : "Dipakai di footer, halaman kontak, dan tombol WhatsApp."}
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
            <CardTitle className="text-sm font-semibold text-gray-700">
              Kontak yang tampil di website
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone" className="text-xs text-gray-500">
                  Nomor Telepon
                </Label>
                <Input
                  id="contact-phone"
                  value={formData.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="021-535-7450"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-whatsapp" className="text-xs text-gray-500">
                  WhatsApp
                </Label>
                <Input
                  id="contact-whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => update({ whatsapp: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="0821-2233-8226"
                />
                <p className="text-[11px] text-gray-400">
                  Dipakai tombol WhatsApp melayang di semua halaman.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs text-gray-500">
                  Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="info@katiga.id"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-address" className="text-xs text-gray-500">
                Alamat
              </Label>
              <Textarea
                id="contact-address"
                value={formData.address}
                onChange={(e) => update({ address: e.target.value })}
                rows={3}
                className="resize-none text-sm"
                placeholder="Jl. Raya Kb. Jeruk No.18B, Jakarta Barat"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </AdminLayout>
  );
}

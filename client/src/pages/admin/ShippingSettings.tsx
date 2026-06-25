import { useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../../components/AdminLayout';
import { useShippingSettings } from '../../hooks/useApi';
import { getCourierLogoUrl } from '../../utils/courierLogos';
import { Button } from '@/components/ui/button';

export default function AdminShippingSettings() {
  const { data, loading, saving, error, refresh, save } = useShippingSettings();
  const [enabledCouriers, setEnabledCouriers] = useState<string[]>([]);
  const [emptyStateMessage, setEmptyStateMessage] = useState('');
  const [syncedData, setSyncedData] = useState(data);

  if (data && data !== syncedData) {
    setSyncedData(data);
    setEnabledCouriers(data.enabledCouriers);
    setEmptyStateMessage(data.emptyStateMessage);
  }

  const hasInitialLoadError = Boolean(error && !data);

  const toggleCourier = (code: string) => {
    setEnabledCouriers((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    try {
      await save({ enabledCouriers, emptyStateMessage });
      toast.success('Pengaturan pengiriman berhasil disimpan');
    } catch {
      // Error state already handled by hook
    }
  };

  const couriers = data?.supportedCouriers ?? [];

  return (
    <AdminLayout title="Pengaturan Pengiriman">
      <div className="w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {hasInitialLoadError ? (
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Gagal Memuat Pengaturan</h2>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void refresh();
                }}
                disabled={loading}
              >
                {loading ? 'Memuat ulang...' : 'Coba Lagi'}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Kurir Checkout</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Pilih kurir Biteship yang boleh tampil di checkout.
                  </p>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-14 bg-gray-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {couriers.map((courier) => {
                      const checked = enabledCouriers.includes(courier.code);
                      const logo = getCourierLogoUrl(courier.code);
                      return (
                        <label
                          key={courier.code}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition ${
                            checked
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {logo && (
                              <img
                                src={logo}
                                alt={courier.label}
                                className="h-8 w-8 object-contain shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {courier.label}
                              </p>
                              <p className="text-xs text-gray-500">{courier.code}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCourier(courier.code)}
                            className="h-4 w-4 accent-indigo-600 shrink-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                {!loading && enabledCouriers.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Semua kurir nonaktif. Checkout tidak akan menampilkan metode pengiriman.
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pesan Empty State</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Pesan ini tampil jika Biteship punya rate, tapi semua kurir sedang dimatikan admin.
                  </p>
                </div>

                <textarea
                  value={emptyStateMessage}
                  onChange={(e) => setEmptyStateMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {error && data && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || saving || !data}
            className="w-full py-3"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}

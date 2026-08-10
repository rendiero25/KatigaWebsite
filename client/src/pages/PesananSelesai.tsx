import type { ReactNode } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';

import { useMyOrder } from '../hooks/useApi';

import api from '../services/api';

import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const PAYMENT_STATUS_COPY: Record<string, { title: string; note: string }> = {
  paid: {
    title: 'Terima kasih, pesanan kamu sudah kami terima',
    note: 'Pembayaran berhasil. Kami akan mengabari lewat email dan notifikasi setiap kali status pesanan berubah.',
  },
  pending: {
    title: 'Pesanan kamu sudah dibuat',
    note: 'Pembayaran belum kami terima. Selesaikan pembayaran sesuai instruksi dari penyedia pembayaran sebelum tenggat, lalu status pesanan akan diperbarui otomatis.',
  },
  failed: {
    title: 'Pembayaran belum berhasil',
    note: 'Pesanan tetap tersimpan. Kamu bisa mengulang pembayaran dari halaman detail pesanan.',
  },
  expired: {
    title: 'Pembayaran kedaluwarsa',
    note: 'Batas waktu pembayaran sudah lewat. Silakan buat pesanan baru dari keranjang.',
  },
  refunded: {
    title: 'Pembayaran dikembalikan',
    note: 'Dana pesanan ini sudah dikembalikan. Cek halaman detail pesanan untuk rinciannya.',
  },
};

interface InfoBlockProps {
  label: string;
  children: ReactNode;
}

function InfoBlock({ label, children }: InfoBlockProps) {
  return (
    <div className="border-b border-[#E9E9EA] py-5 last:border-b-0">
      <p className="uppercase tracking-[0.18em] text-[11px] text-[#6F6F71] mb-2">{label}</p>
      <div className="text-[13px] text-[#1E1E1E] leading-relaxed">{children}</div>
    </div>
  );
}

export default function PesananSelesai() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: order, loading } = useMyOrder(id, searchParams.get('verify') === '1');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow">
        {loading ? (
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16 animate-pulse">
            <div className="h-8 bg-gray-200 w-2/3 max-w-lg" />
            <div className="h-4 bg-gray-200 w-1/2 max-w-md mt-4" />
            <div className="flex flex-col lg:flex-row gap-10 mt-12">
              <div className="flex-1 space-y-4">
                <div className="h-20 bg-gray-200" />
                <div className="h-20 bg-gray-200" />
                <div className="h-20 bg-gray-200" />
              </div>
              <div className="lg:w-96 shrink-0 space-y-3">
                <div className="h-16 bg-gray-200" />
                <div className="h-16 bg-gray-200" />
                <div className="h-10 bg-gray-200" />
              </div>
            </div>
          </div>
        ) : !order ? (
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-24 flex flex-col items-center gap-6 text-center">
            <h1 className="text-2xl md:text-3xl">Pesanan Tidak Ditemukan</h1>
            <p className="text-sm text-[#6F6F71] max-w-md">
              Pesanan yang kamu cari tidak ada atau bukan milik akun ini.
            </p>
            <Link
              to="/pesanan"
              className="border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
            >
              Lihat Riwayat Pesanan
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-[#E9E9EA] py-10">
              <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 text-center">
                <p className="uppercase tracking-[0.18em] text-[11px] text-[#6F6F71]">
                  Pesanan #{order.orderCode || order._id.slice(-8).toUpperCase()}
                </p>
                <h1 className="text-2xl md:text-3xl mt-3">
                  {(PAYMENT_STATUS_COPY[order.paymentStatus] ?? PAYMENT_STATUS_COPY.pending).title}
                </h1>
                <p className="text-sm text-[#6F6F71] leading-relaxed max-w-xl mx-auto mt-4">
                  {(PAYMENT_STATUS_COPY[order.paymentStatus] ?? PAYMENT_STATUS_COPY.pending).note}
                </p>
              </div>
            </div>

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-12">
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                  <h2 className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E] mb-2">
                    Rincian Pesanan
                  </h2>

                  <InfoBlock label="Kontak">
                    <p>{order.customerSnapshot.name}</p>
                    <p className="text-[#6F6F71]">{order.customerSnapshot.email}</p>
                    <p className="text-[#6F6F71]">{order.customerSnapshot.phone}</p>
                  </InfoBlock>

                  <InfoBlock label="Alamat Pengiriman">
                    <p>
                      {order.shippingAddress.recipientName} · {order.shippingAddress.phone}
                    </p>
                    <p className="text-[#6F6F71]">
                      {order.shippingAddress.street}, {order.shippingAddress.areaName}
                    </p>
                    <p className="text-[#6F6F71]">
                      {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                      {order.shippingAddress.postalCode}
                    </p>
                  </InfoBlock>

                  <InfoBlock label="Metode Pengiriman">
                    <p>{order.shippingServiceName}</p>
                    {order.estimatedDays && (
                      <p className="text-[#6F6F71]">Estimasi {order.estimatedDays}</p>
                    )}
                  </InfoBlock>

                  <InfoBlock label="Pembayaran">
                    <p>{fmt(order.total)}</p>
                    <p className="text-[#6F6F71]">
                      {order.paymentStatus === 'paid' ? 'Sudah dibayar' : 'Menunggu pembayaran'}
                    </p>
                  </InfoBlock>

                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <Link
                      to={`/pesanan/${order._id}`}
                      className="bg-[#4F68AF] text-white text-center uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#2B3A67] transition"
                    >
                      Lihat Detail Pesanan
                    </Link>
                    <Link
                      to="/produk"
                      className="border border-[#1E1E1E] text-center uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
                    >
                      Lanjut Belanja
                    </Link>
                  </div>
                </div>

                <div className="lg:w-96 shrink-0">
                  <div className="border border-[#E9E9EA] p-5">
                    <p className="uppercase tracking-[0.18em] text-[11px] text-[#6F6F71] mb-4">
                      Ringkasan Pesanan
                    </p>

                    <div className="mb-4">
                      {order.items.map((item, index) => (
                        <div
                          key={`${item.product}-${item.variantId ?? index}`}
                          className="flex items-center gap-3 py-3 border-b border-[#E9E9EA] last:border-b-0"
                        >
                          <div className="w-12 h-12 bg-[#F9F7F2] shrink-0 overflow-hidden">
                            {item.image && (
                              <img
                                src={api.getImageUrl(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="uppercase text-[12px] text-[#1E1E1E] truncate leading-tight">
                              {item.name}
                            </p>
                            {item.variantName && (
                              <p className="text-[12px] text-[#6F6F71] truncate">{item.variantName}</p>
                            )}
                            <p className="text-[12px] text-[#6F6F71]">×{item.quantity}</p>
                          </div>
                          <span className="text-[13px] text-[#1E1E1E] shrink-0 tabular-nums">
                            {fmt(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#E9E9EA] pt-4 space-y-2 text-[13px] text-[#6F6F71]">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{fmt(order.subtotal)}</span>
                      </div>
                      {!!order.voucherDiscount && order.voucherDiscount > 0 && (
                        <div className="flex justify-between">
                          <span>Diskon {order.voucherCode}</span>
                          <span className="tabular-nums">− {fmt(order.voucherDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Ongkir</span>
                        <span className="tabular-nums">{fmt(order.shippingCost)}</span>
                      </div>
                    </div>

                    <div className="border-t border-[#E9E9EA] mt-3 pt-3 flex items-center justify-between">
                      <span className="uppercase tracking-[0.12em] text-[13px] text-[#6F6F71]">Total</span>
                      <span className="text-lg text-[#1E1E1E] tabular-nums">{fmt(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

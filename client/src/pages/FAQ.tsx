import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import Header from '../components/Header';
import Footer from '../components/Footer';

interface FaqItemProps {
  question: string;
  answer: ReactNode;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="text-lg font-medium text-black">{question}</span>
        <span className="shrink-0 text-black/60">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="mt-3 text-lg text-black/80 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-6">
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-normal leading-tight text-[#1e1e1e] mb-4">FAQ</h1>
              <p className="text-sm text-black/60 mb-12">Terakhir diperbarui: 10 Juli 2026</p>
              <p className="text-lg text-black/80 leading-relaxed mb-12">
                Pertanyaan yang sering ditanyakan seputar akun, pemesanan, pembayaran, pengiriman, dan pengembalian di
                katiga.id.
              </p>

              <div className="space-y-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">
                    Akun & Pendaftaran
                  </h2>
                  <div>
                    <FaqItem
                      question="Bagaimana cara membuat akun di katiga.id?"
                      answer='Klik "Daftar" di pojok kanan atas, isi nama, email, dan kata sandi, atau daftar langsung menggunakan akun Google Anda.'
                    />
                    <FaqItem
                      question="Saya lupa kata sandi akun saya, bagaimana solusinya?"
                      answer="Saat ini pemulihan kata sandi mandiri belum tersedia. Silakan hubungi tim kami melalui WhatsApp atau email pada bagian Kontak di bawah, dan kami akan bantu atur ulang kata sandi Anda."
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">
                    Pemesanan & Pembayaran
                  </h2>
                  <div>
                    <FaqItem
                      question="Metode pembayaran apa saja yang tersedia?"
                      answer="Kami menerima pembayaran melalui Midtrans, mencakup kartu kredit/debit, transfer bank/Virtual Account, e-wallet, dan QRIS. Kami belum menyediakan pembayaran tunai di tempat (COD)."
                    />
                    <FaqItem
                      question="Berapa lama batas waktu saya harus membayar pesanan?"
                      answer="Pesanan yang belum dibayar dalam batas waktu yang ditentukan sistem akan otomatis kedaluwarsa dan dibatalkan. Silakan buat ulang pesanan apabila hal ini terjadi."
                    />
                    <FaqItem
                      question="Bagaimana cara mengunduh invoice pesanan saya?"
                      answer="Buka halaman Pesanan Saya, pilih pesanan yang dimaksud, lalu unduh invoice dalam format PDF pada halaman detail pesanan."
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">Pengiriman</h2>
                  <div>
                    <FaqItem
                      question="Kurir apa saja yang tersedia?"
                      answer="Pilihan kurir dan estimasi ongkos kirim ditampilkan otomatis saat checkout berdasarkan alamat tujuan Anda, melalui integrasi dengan Biteship."
                    />
                    <FaqItem
                      question="Bagaimana cara melacak paket saya?"
                      answer="Buka halaman Pesanan Saya, pilih pesanan yang sudah dikirim, lalu lihat status dan nomor resi pengiriman pada halaman detail pesanan."
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">
                    Pembatalan, Retur & Komplain
                  </h2>
                  <div>
                    <FaqItem
                      question="Bisakah saya membatalkan pesanan yang sudah dibuat?"
                      answer='Bisa, selama status pesanan masih "Menunggu Pembayaran" atau "Diproses". Setelah pesanan berstatus "Dikirim", pembatalan mandiri tidak dapat lagi dilakukan.'
                    />
                    <FaqItem
                      question="Berapa lama batas waktu mengajukan komplain atau retur?"
                      answer={
                        <>
                          3 (tiga) hari kalender sejak pesanan berstatus "Diterima". Lihat{' '}
                          <Link
                            to="/kebijakan-pengembalian"
                            className="text-primary underline hover:text-primary-dark"
                          >
                            Kebijakan Pengembalian
                          </Link>{' '}
                          untuk ketentuan lengkap.
                        </>
                      }
                    />
                    <FaqItem
                      question="Apa yang terjadi setelah saya mengajukan retur?"
                      answer="Tim kami akan meninjau pengajuan Anda, dan bila disetujui, Anda perlu mengirimkan kembali produk lalu melaporkan kurir dan nomor resi. Setelah barang diterima dan diverifikasi, kami akan memproses pengembalian dana atau penggantian barang."
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">
                    Voucher & Promosi
                  </h2>
                  <div>
                    <FaqItem
                      question="Bagaimana cara menggunakan kode voucher?"
                      answer="Masukkan kode voucher pada halaman Keranjang atau Checkout sebelum menyelesaikan pembayaran. Diskon akan otomatis diterapkan pada total pesanan jika kode valid."
                    />
                    <FaqItem
                      question="Apakah voucher saya hangus jika pesanan dibatalkan?"
                      answer="Tidak hangus permanen — voucher yang telah digunakan akan otomatis dilepas kembali dan dapat digunakan kembali apabila pesanan yang menggunakannya dibatalkan."
                    />
                  </div>
                </div>

                <div className="text-center pt-6">
                  <p className="text-lg text-black/80 leading-relaxed mb-4">
                    Tidak menemukan jawaban yang Anda cari?
                  </p>
                  <Link
                    to="/kontak"
                    className="inline-flex items-center px-10 py-4 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full shadow-[0_10px_20px_rgba(79,104,175,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-sm tracking-wide"
                  >
                    Hubungi Kami
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

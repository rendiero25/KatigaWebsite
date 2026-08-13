import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';

import Header from '../components/Header';
import Footer from '../components/Footer';

interface FaqItemProps {
  question: string;
  answer: ReactNode;
}

function FaqItem({ question, answer }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E9E9EA]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left py-4"
      >
        <span className="uppercase text-[13px] text-[#1E1E1E]">{question}</span>
        <FiChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-[#6F6F71] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-[#6F6F71] leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-6">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">FAQ</h1>
        </div>

        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <span className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-4 block">
                Butuh Bantuan?
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-black leading-tight mb-4">
                Pertanyaan yang Sering Diajukan
              </h2>
              <p className="text-sm text-[#6F6F71]">Terakhir diperbarui: 10 Juli 2026</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
              <div>
                <h3 className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] mb-2">
                  Akun & Pendaftaran
                </h3>
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
                <h3 className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] mb-2">
                  Pemesanan & Pembayaran
                </h3>
                <div>
                  <FaqItem
                    question="Metode pembayaran apa saja yang tersedia?"
                    answer="Kami menerima pembayaran melalui Mayar, mencakup QRIS, transfer bank/Virtual Account, e-wallet, dan pembayaran di gerai mini market. Kami belum menyediakan pembayaran tunai di tempat (COD)."
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
                <h3 className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] mb-2">
                  Pengiriman
                </h3>
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
                <h3 className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] mb-2">
                  Pembatalan, Retur & Komplain
                </h3>
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
                <h3 className="uppercase tracking-[0.18em] text-[13px] text-[#1E1E1E] mb-2">
                  Voucher & Promosi
                </h3>
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
                <p className="text-sm text-[#6F6F71] leading-relaxed mb-4">
                  Tidak menemukan jawaban yang Anda cari?
                </p>
                <Link
                  to="/kontak"
                  className="inline-flex items-center border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-3 hover:bg-[#1E1E1E] hover:text-white transition-colors"
                >
                  Hubungi Kami
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { Link } from 'react-router-dom';

import { useContactInfo } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function KebijakanPengembalian() {
  const { data: contact } = useContactInfo();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Kebijakan Pengembalian</h1>
        </div>
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <div className="max-w-3xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-12">Terakhir diperbarui: 10 Juli 2026</p>
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">1. Ketentuan Umum</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Kebijakan Pengembalian ini berlaku untuk seluruh produk fisik yang dibeli melalui katiga.id dan dikirimkan menggunakan layanan Biteship. Kami ingin memastikan Anda menerima produk sesuai pesanan dan dalam kondisi baik.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">2. Jangka Waktu Pengajuan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Pengajuan komplain atau retur hanya dapat dilakukan dalam waktu 3 (tiga) hari kalender sejak status pesanan Anda berubah menjadi "Diterima". Pengajuan yang diajukan setelah batas waktu tersebut tidak dapat kami proses. Setiap pesanan hanya dapat diajukan satu kali komplain/retur.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">3. Syarat Pengajuan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Untuk mengajukan komplain atau retur melalui halaman Pesanan Saya, Anda perlu melampirkan:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-[#6F6F71] leading-relaxed space-y-2 mt-4">
                    <li>Foto bukti kondisi produk yang diterima</li>
                    <li>Alasan pengajuan (minimal 10 karakter) yang menjelaskan masalah secara jelas</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">4. Jenis Pengajuan: Komplain vs Retur</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Komplain diajukan untuk melaporkan masalah pada produk yang diterima (contoh: produk cacat/rusak, tidak sesuai deskripsi). Retur diajukan apabila Anda ingin mengembalikan produk secara fisik untuk ditukar atau dikembalikan dananya. Tim kami akan meninjau pengajuan Anda dan menentukan tindak lanjut yang sesuai.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">5. Alur Proses Pengajuan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Setelah pengajuan dikirim, status akan berjalan sebagai berikut:
                  </p>
                  <ol className="list-decimal pl-6 text-sm text-[#6F6F71] leading-relaxed space-y-2 mt-4">
                    <li>"Menunggu"</li>
                    <li>"Diproses"</li>
                    <li>(khusus retur) "Retur disetujui, menunggu kamu kirim barang"</li>
                    <li>"Barang retur dalam perjalanan"</li>
                    <li>"Barang retur diterima, menunggu resolusi"</li>
                    <li>"Selesai" (atau "Ditolak" apabila pengajuan tidak memenuhi syarat)</li>
                  </ol>
                  <p className="text-sm text-[#6F6F71] leading-relaxed mt-4">
                    Anda dapat memantau status pengajuan melalui halaman Pesanan Saya.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">6. Pengiriman Barang Retur</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Apabila retur disetujui, Anda bertanggung jawab untuk mengirimkan kembali produk menggunakan jasa kurir pilihan Anda dan melaporkan nama kurir beserta nomor resi pengiriman melalui halaman Pesanan Saya, agar tim kami dapat memantau proses pengembalian barang.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">7. Opsi Resolusi</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Setelah barang retur diterima dan diverifikasi, atau untuk kasus komplain yang disetujui tanpa pengiriman balik fisik, tim kami akan menawarkan salah satu dari dua opsi resolusi: pengembalian dana (refund) penuh melalui transfer bank ke rekening yang Anda konfirmasikan kepada tim kami, atau penggantian barang (replace) dengan produk yang sama.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">8. Pengecualian</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Kami berhak menolak pengajuan komplain/retur apabila:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-[#6F6F71] leading-relaxed space-y-2 mt-4">
                    <li>Kerusakan produk terbukti disebabkan oleh kesalahan penggunaan setelah barang diterima</li>
                    <li>Produk telah digunakan/dipakai di luar keperluan pemeriksaan wajar</li>
                    <li>Kelengkapan (kemasan, label, aksesori) tidak dikembalikan secara utuh</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">9. Pembatalan Sebelum Pengiriman</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Apabila pesanan Anda belum dikirim, silakan gunakan fitur Batalkan Pesanan di halaman Pesanan Saya, bukan fitur komplain/retur. Lihat ketentuan lengkap pada{' '}
                    <Link to="/syarat-ketentuan" className="text-primary underline hover:text-primary-dark">Syarat &amp; Ketentuan</Link>{' '}
                    bagian Pembatalan Pesanan.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">10. Kontak</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">Jika Anda memiliki pertanyaan lebih lanjut, silakan hubungi kami melalui:</p>
                  <ul className="list-disc pl-6 text-sm text-[#6F6F71] leading-relaxed space-y-2 mt-4">
                    <li>Telepon: {contact?.phone || '021-535-7450'}</li>
                    <li>WhatsApp: {contact?.whatsapp || '0821-2233-8226'}</li>
                    <li>Email: {contact?.email || 'info@kusumakencana.co.id'}</li>
                    <li>Alamat: {contact?.address || 'Grha KATIGA, Jalan Kebon Jeruk Raya 18B, Kebon Jeruk, Jakarta, Indonesia 11530'}</li>
                  </ul>
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

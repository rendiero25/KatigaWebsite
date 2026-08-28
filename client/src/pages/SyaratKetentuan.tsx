import { Link } from 'react-router-dom';

import { useContactInfo, useSiteSettings } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function SyaratKetentuan() {
  const { data: contact } = useContactInfo();
  const { data: settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Syarat & Ketentuan</h1>
        </div>
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <div className="max-w-3xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-12">Terakhir diperbarui: 10 Juli 2026</p>
              <div className="space-y-12">
                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">1. Definisi & Penerimaan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Selamat datang di KATIGA (katiga.id), platform belanja daring yang dioperasikan oleh{' '}
                    {settings?.companyName || 'PT Kusuma Kencana Khatulistiwa'} ("KATIGA", "kami"). Dengan mengakses,
                    mendaftar, atau melakukan transaksi di katiga.id, Anda ("Pengguna") dianggap telah membaca,
                    memahami, dan menyetujui seluruh Syarat & Ketentuan ini beserta{' '}
                    <Link to="/kebijakan-privasi" className="text-primary underline hover:text-primary-dark">
                      Kebijakan Privasi
                    </Link>{' '}
                    dan{' '}
                    <Link to="/kebijakan-pengembalian" className="text-primary underline hover:text-primary-dark">
                      Kebijakan Pengembalian
                    </Link>{' '}
                    kami. Jika Anda tidak setuju dengan salah satu ketentuan di sini, mohon untuk tidak menggunakan
                    layanan kami.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">2. Akun Pengguna</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Untuk berbelanja, Anda perlu membuat akun dengan mendaftarkan nama, alamat email, dan nomor
                    telepon, atau masuk menggunakan akun Google Anda. Anda bertanggung jawab penuh atas kerahasiaan
                    kata sandi dan seluruh aktivitas yang terjadi melalui akun Anda. Segera hubungi kami apabila Anda
                    menduga akun Anda diakses tanpa izin. KATIGA berhak menangguhkan atau menonaktifkan akun yang
                    terindikasi melanggar Syarat & Ketentuan ini.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">3. Produk & Harga</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Seluruh produk yang dipasarkan di katiga.id ditampilkan beserta deskripsi, harga, dan
                    ketersediaan stok yang kami usahakan seakurat mungkin. Harga dapat berubah sewaktu-waktu tanpa
                    pemberitahuan sebelumnya, namun harga yang berlaku adalah harga yang tercantum pada saat pesanan
                    dibuat dan dibayar. Apabila terjadi kehabisan stok setelah pesanan dibuat, kami akan menghubungi
                    Anda untuk penggantian produk atau pembatalan dan pengembalian dana penuh.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">4. Pemesanan & Pembayaran</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Pembayaran pada katiga.id diproses melalui Mayar sebagai penyedia payment gateway resmi,
                    mencakup metode QRIS, transfer bank/Virtual Account, dompet digital (e-wallet), dan
                    pembayaran di gerai mini market, sesuai metode yang tersedia pada saat checkout. Kami tidak
                    menyediakan metode pembayaran tunai di tempat (Cash on Delivery/COD). Pesanan dianggap sah
                    setelah pembayaran dikonfirmasi berhasil oleh Mayar. Apabila pembayaran tidak diselesaikan dalam batas waktu yang ditentukan,
                    pesanan akan otomatis kedaluwarsa dan dibatalkan oleh sistem.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">5. Pengiriman</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Pengiriman pesanan dilakukan melalui mitra jasa kirim yang terintegrasi dengan Biteship dari satu
                    titik gudang KATIGA. Ongkos kirim dan estimasi waktu tiba dihitung otomatis berdasarkan kurir
                    yang Anda pilih dan area pengiriman tujuan pada saat checkout. Estimasi waktu pengiriman bersifat
                    perkiraan dari mitra kurir dan dapat berubah karena faktor di luar kendali kami (cuaca, kondisi
                    lalu lintas, gangguan operasional kurir, dan lain-lain).
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">6. Pembatalan Pesanan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Anda dapat mengajukan pembatalan mandiri melalui halaman Pesanan Saya selama status pesanan masih
                    Menunggu Pembayaran atau Diproses (sebelum pesanan dikirim). Setelah pesanan berstatus Dikirim,
                    pembatalan mandiri tidak dapat lagi dilakukan — silakan menunggu pesanan diterima dan ajukan
                    retur/komplain sesuai{' '}
                    <Link to="/kebijakan-pengembalian" className="text-primary underline hover:text-primary-dark">
                      Kebijakan Pengembalian
                    </Link>
                    . Untuk pesanan yang telah dibayar dan dibatalkan sebelum dikirim, dana akan dikembalikan penuh
                    melalui transfer bank ke rekening yang Anda konfirmasikan kepada tim kami, paling lambat
                    7 hari kerja setelah pembatalan disetujui.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">7. Retur, Komplain & Pengembalian Dana</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Ketentuan lengkap mengenai pengajuan komplain, retur barang, dan pengembalian dana diatur dalam{' '}
                    <Link to="/kebijakan-pengembalian" className="text-primary underline hover:text-primary-dark">
                      Kebijakan Pengembalian
                    </Link>{' '}
                    kami.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">8. Voucher & Promosi</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    KATIGA dapat sewaktu-waktu menerbitkan kode voucher atau promosi dengan syarat dan masa berlaku
                    tertentu. Voucher yang telah diterapkan pada suatu pesanan akan otomatis dilepas kembali apabila
                    pesanan tersebut dibatalkan. Kami berhak membatalkan voucher atau promosi yang digunakan secara
                    tidak wajar atau melanggar ketentuan promosi terkait.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">9. Hak Kekayaan Intelektual</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Seluruh konten pada katiga.id, termasuk namun tidak terbatas pada logo, nama merek, teks, gambar
                    produk, dan tata letak situs, adalah milik {settings?.companyName || 'PT Kusuma Kencana Khatulistiwa'}{' '}
                    atau pemberi lisensinya dan dilindungi oleh hukum hak kekayaan intelektual yang berlaku. Dilarang
                    menyalin, mereproduksi, atau menggunakan konten kami untuk tujuan komersial tanpa izin tertulis.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">10. Batasan Tanggung Jawab</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Kami berupaya menjaga akurasi informasi dan kelancaran layanan katiga.id, namun tidak menjamin
                    situs akan selalu bebas dari gangguan, kesalahan, atau kondisi force majeure (bencana alam,
                    gangguan sistem pihak ketiga seperti Mayar/Biteship, dan sejenisnya). Tanggung jawab kami atas
                    kerugian yang timbul dari penggunaan layanan ini dibatasi sesuai ketentuan hukum yang berlaku di
                    Indonesia.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">11. Hukum yang Berlaku & Penyelesaian Sengketa</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Syarat & Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Negara Republik Indonesia. Setiap
                    perselisihan yang timbul akan diupayakan penyelesaiannya secara musyawarah; apabila tidak
                    tercapai kesepakatan, sengketa akan diselesaikan melalui Pengadilan Negeri yang berwenang di
                    wilayah domisili {settings?.companyName || 'PT Kusuma Kencana Khatulistiwa'} (Jakarta).
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">12. Perubahan Ketentuan</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Kami dapat memperbarui Syarat & Ketentuan ini dari waktu ke waktu. Perubahan berlaku efektif
                    sejak tanggal dipublikasikan pada halaman ini. Penggunaan layanan katiga.id secara berkelanjutan
                    setelah perubahan dipublikasikan dianggap sebagai persetujuan Anda atas ketentuan yang telah
                    diperbarui.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl mb-4">13. Kontak</h2>
                  <p className="text-sm text-[#6F6F71] leading-relaxed">
                    Jika Anda memiliki pertanyaan lebih lanjut, silakan hubungi kami melalui:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-[#6F6F71] leading-relaxed space-y-2 mt-4">
                    <li>Telepon: {contact?.phone || '021-535-7450'}</li>
                    <li>WhatsApp: {contact?.whatsapp || '+62 821-7402-8363'}</li>
                    <li>Email: {contact?.email || 'info@kusumakencana.co.id'}</li>
                    <li>
                      Alamat:{' '}
                      {contact?.address || 'Grha KATIGA, Jalan Kebon Jeruk Raya 18B, Kebon Jeruk, Jakarta, Indonesia 11530'}
                    </li>
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

import { Link } from 'react-router-dom';

import { useContactInfo, useSiteSettings } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';

export default function KebijakanPrivasi() {
  const { data: contact } = useContactInfo();
  const { data: settings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-6">
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-normal leading-tight text-[#1e1e1e] mb-4">Kebijakan Privasi</h1>
              <p className="text-sm text-black/60 mb-12">Terakhir diperbarui: 10 Juli 2026</p>
              <div className="space-y-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">1. Pendahuluan</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Kebijakan Privasi ini menjelaskan bagaimana {settings?.companyName || 'PT Kusuma Kencana Khatulistiwa'}, pengelola katiga.id, mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi Anda saat menggunakan layanan kami. Kebijakan ini berlaku bersama dengan{' '}
                    <Link to="/syarat-ketentuan" className="text-primary underline hover:text-primary-dark">Syarat &amp; Ketentuan</Link>{' '}
                    kami sebagai satu kesatuan ketentuan penggunaan layanan.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">2. Data yang Kami Kumpulkan</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Kami mengumpulkan data yang Anda berikan secara langsung, meliputi:
                  </p>
                  <ul className="list-disc pl-6 text-lg text-black/80 leading-relaxed space-y-2 mt-4">
                    <li>Nama lengkap, alamat email, dan nomor telepon</li>
                    <li>Kata sandi (tersimpan dalam bentuk terenkripsi/hash)</li>
                    <li>Foto profil (opsional)</li>
                    <li>Alamat pengiriman (nama penerima, nomor telepon, alamat jalan, kota, provinsi, kode pos, dan area pengiriman)</li>
                    <li>Riwayat pesanan dan transaksi</li>
                    <li>Daftar produk favorit (wishlist)</li>
                    <li>Ulasan produk yang Anda tulis</li>
                  </ul>
                  <p className="text-lg text-black/80 leading-relaxed mt-4">
                    Apabila Anda masuk menggunakan Google Sign-In, kami menerima identitas akun Google Anda untuk keperluan autentikasi.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">3. Cara Kami Menggunakan Data</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Data Anda digunakan untuk memproses dan mengirimkan pesanan, memverifikasi pembayaran, berkomunikasi terkait status pesanan, komplain, atau retur, mengelola akun dan preferensi Anda (wishlist, alamat tersimpan), serta meningkatkan kualitas layanan katiga.id. Kami tidak menjual data pribadi Anda kepada pihak ketiga mana pun.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">4. Pembagian Data kepada Pihak Ketiga</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Untuk memproses transaksi Anda, kami membagikan sebagian data yang relevan kepada mitra tepercaya berikut:
                  </p>
                  <ul className="list-disc pl-6 text-lg text-black/80 leading-relaxed space-y-2 mt-4">
                    <li>Midtrans, sebagai penyedia payment gateway, menerima data pesanan dan data kontak yang diperlukan untuk memproses pembayaran Anda.</li>
                    <li>Biteship, sebagai penyedia integrasi layanan pengiriman, menerima data alamat dan kontak penerima untuk mengatur pengambilan dan pengiriman paket melalui mitra kurir.</li>
                    <li>Google, apabila Anda memilih masuk melalui Google Sign-In, memproses autentikasi identitas Anda.</li>
                  </ul>
                  <p className="text-lg text-black/80 leading-relaxed mt-4">
                    Masing-masing pihak ketiga tersebut memiliki kebijakan privasi sendiri dan bertanggung jawab atas pemrosesan data sesuai kebijakan mereka.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">5. Keamanan Data</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Kata sandi akun Anda disimpan dalam bentuk terenkripsi (hashed) dan tidak pernah kami simpan dalam bentuk teks biasa. Sesi masuk Anda diautentikasi menggunakan token yang tersimpan secara lokal di perangkat Anda. Kami menerapkan langkah-langkah teknis dan organisasi yang wajar untuk melindungi data Anda dari akses, perubahan, atau pengungkapan yang tidak sah.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">6. Penyimpanan Lokal &amp; Cookie</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    katiga.id menggunakan penyimpanan lokal (local storage) pada peramban Anda untuk menyimpan sesi login agar Anda tidak perlu masuk berulang kali. Kami saat ini tidak menggunakan cookie pelacak pihak ketiga atau alat analitik iklan pada situs ini.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">7. Hak Anda atas Data Pribadi</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Anda berhak untuk mengakses, memperbarui, atau menghapus data pribadi pada akun Anda melalui halaman Pengaturan Akun, atau dengan menghubungi kami langsung. Anda juga dapat meminta penghapusan akun beserta data terkait, dengan catatan data transaksi tertentu dapat kami simpan lebih lama sesuai kewajiban pembukuan dan hukum yang berlaku.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">8. Retensi Data</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Kami menyimpan data pribadi Anda selama akun Anda aktif atau selama diperlukan untuk memenuhi tujuan sebagaimana dijelaskan dalam kebijakan ini, termasuk untuk memenuhi kewajiban hukum, perpajakan, dan penyelesaian sengketa.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">9. Perubahan Kebijakan</h2>
                  <p className="text-lg text-black/80 leading-relaxed">
                    Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diinformasikan melalui pembaruan tanggal "Terakhir diperbarui" pada halaman ini. Kami menyarankan Anda meninjau kebijakan ini secara berkala bersama dengan{' '}
                    <Link to="/syarat-ketentuan" className="text-primary underline hover:text-primary-dark">Syarat &amp; Ketentuan</Link>{' '}
                    kami.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight mb-4">10. Kontak</h2>
                  <p className="text-lg text-black/80 leading-relaxed">Jika Anda memiliki pertanyaan lebih lanjut, silakan hubungi kami melalui:</p>
                  <ul className="list-disc pl-6 text-lg text-black/80 leading-relaxed space-y-2 mt-4">
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

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Katalog = lazy(() => import('./pages/Katalog'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminHero = lazy(() => import('./pages/admin/Hero'));
const AdminPartners = lazy(() => import('./pages/admin/Partners'));
const AdminAdvantages = lazy(() => import('./pages/admin/Advantages'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminAbout = lazy(() => import('./pages/admin/About'));
const AdminCertifications = lazy(() => import('./pages/admin/Certifications'));
const AdminCatalog = lazy(() => import('./pages/admin/Catalog'));
const AdminContact = lazy(() => import('./pages/admin/Contact'));
const AdminFooter = lazy(() => import('./pages/admin/Footer'));
const AdminNews = lazy(() => import('./pages/admin/News'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminMessages = lazy(() => import('./pages/admin/Messages'));
const AdminCertificationTech = lazy(() => import('./pages/admin/CertificationTech'));
const AdminDistribution = lazy(() => import('./pages/admin/Distribution'));
const AdminManufacturing = lazy(() => import('./pages/admin/Manufacturing'));
const AdminProductPageContent = lazy(() => import('./pages/admin/ProductPageContent'));
const AdminContactPageContent = lazy(() => import('./pages/admin/ContactPageContent'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminPromotions = lazy(() => import('./pages/admin/Promotions'));
const AdminPromosiTampilan = lazy(() => import('./pages/admin/PromosiTampilan'));
const AdminLaporan = lazy(() => import('./pages/admin/Laporan'));
const AdminShippingSettings = lazy(() => import('./pages/admin/ShippingSettings'));
const Daftar = lazy(() => import('./pages/Daftar'));
const Masuk = lazy(() => import('./pages/Masuk'));
const Keranjang = lazy(() => import('./pages/Keranjang'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Pesanan = lazy(() => import('./pages/Pesanan'));
const PesananDetail = lazy(() => import('./pages/PesananDetail'));
const Profil = lazy(() => import('./pages/Profil'));
const PengaturanAkun = lazy(() => import('./pages/PengaturanAkun'));
const AlamatSaya = lazy(() => import('./pages/AlamatSaya'));
const WishlistSaya = lazy(() => import('./pages/WishlistSaya'));
const LaporanKeuangan = lazy(() => import('./pages/LaporanKeuangan'));
const UlasanSaya = lazy(() => import('./pages/UlasanSaya'));
const Notifikasi = lazy(() => import('./pages/Notifikasi'));
const AdminNotifikasi = lazy(() => import('./pages/admin/Notifikasi'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/tentang-kami" element={<AboutUs />} />
        <Route path="/katalog" element={<Katalog />} />
        <Route path="/produk" element={<Products />} />
        <Route path="/produk/:id" element={<ProductDetail />} />
        <Route path="/berita" element={<News />} />
        <Route path="/berita/:id" element={<NewsDetail />} />
        

        <Route path="/kontak" element={<ContactPage />} />
        <Route path="/daftar" element={<Daftar />} />
        <Route path="/masuk" element={<Masuk />} />
        <Route path="/keranjang" element={<Keranjang />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pesanan" element={<Pesanan />} />
        <Route path="/pesanan/:id" element={<PesananDetail />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/profil/pengaturan" element={<PengaturanAkun />} />
        <Route path="/profil/alamat" element={<AlamatSaya />} />
        <Route path="/profil/wishlist" element={<WishlistSaya />} />
        <Route path="/profil/laporan-keuangan" element={<LaporanKeuangan />} />
        <Route path="/profil/ulasan" element={<UlasanSaya />} />
        <Route path="/notifikasi" element={<Notifikasi />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/hero" element={<AdminHero />} />
        <Route path="/admin/partners" element={<AdminPartners />} />
        <Route path="/admin/advantages" element={<AdminAdvantages />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/about" element={<AdminAbout />} />
        <Route path="/admin/certifications" element={<AdminCertifications />} />
        <Route path="/admin/catalog" element={<AdminCatalog />} />
        <Route path="/admin/contact" element={<AdminContact />} />
        <Route path="/admin/footer" element={<AdminFooter />} />
        <Route path="/admin/news" element={<AdminNews />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/shipping" element={<AdminShippingSettings />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/admin/certification-tech" element={<AdminCertificationTech />} />
        <Route path="/admin/distribution" element={<AdminDistribution />} />
        <Route path="/admin/manufacturing" element={<AdminManufacturing />} />

        <Route path="/admin/product-page-content" element={<AdminProductPageContent />} />
        <Route path="/admin/contact-page-content" element={<AdminContactPageContent />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/laporan" element={<AdminLaporan />} />
        <Route path="/admin/promosi" element={<AdminPromotions />} />
        <Route path="/admin/promosi/tampilan" element={<AdminPromosiTampilan />} />
        <Route path="/admin/notifikasi" element={<AdminNotifikasi />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

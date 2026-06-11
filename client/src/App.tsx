import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import Katalog from './pages/Katalog';
import ContactPage from './pages/ContactPage';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminHero from './pages/admin/Hero';
import AdminPartners from './pages/admin/Partners';
import AdminAdvantages from './pages/admin/Advantages';
import AdminCategories from './pages/admin/Categories';
import AdminAbout from './pages/admin/About';
import AdminCertifications from './pages/admin/Certifications';
import AdminCatalog from './pages/admin/Catalog';
import AdminContact from './pages/admin/Contact';
import AdminFooter from './pages/admin/Footer';
import AdminNews from './pages/admin/News';
import AdminSettings from './pages/admin/Settings';
import AdminMessages from './pages/admin/Messages';
import AdminCertificationTech from './pages/admin/CertificationTech';
import AdminDistribution from './pages/admin/Distribution';
import AdminManufacturing from './pages/admin/Manufacturing';
import AdminProductPageContent from './pages/admin/ProductPageContent';
import AdminContactPageContent from './pages/admin/ContactPageContent';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminUsers from './pages/admin/Users';
import AdminReviews from './pages/admin/Reviews';
import AdminPromotions from './pages/admin/Promotions';
import AdminPromosiTampilan from './pages/admin/PromosiTampilan';
import Daftar from './pages/Daftar';
import Masuk from './pages/Masuk';
import Keranjang from './pages/Keranjang';
import Checkout from './pages/Checkout';
import Pesanan from './pages/Pesanan';
import PesananDetail from './pages/PesananDetail';
import Profil from './pages/Profil';
import PengaturanAkun from './pages/PengaturanAkun'
import AlamatSaya from './pages/AlamatSaya'
import WishlistSaya from './pages/WishlistSaya'

function App() {
  return (
    <BrowserRouter>
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
        <Route path="/admin/promosi" element={<AdminPromotions />} />
        <Route path="/admin/promosi/tampilan" element={<AdminPromosiTampilan />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

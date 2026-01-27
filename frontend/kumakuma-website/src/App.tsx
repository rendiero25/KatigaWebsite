import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/produk" element={<Products />} />
        <Route path="/produk/:id" element={<ProductDetail />} />
        <Route path="/berita" element={<News />} />
        <Route path="/berita/:id" element={<NewsDetail />} />
        
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;

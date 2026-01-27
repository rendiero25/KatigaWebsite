import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import AdvantagesSection from '../components/AdvantagesSection';
import ProductsSection from '../components/ProductsSection';
import ManufacturingSection from '../components/ManufacturingSection';
import CertificationTechSection from '../components/CertificationTechSection';
import DistributionSection from '../components/DistributionSection';
import NewsSection from '../components/NewsSection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <AdvantagesSection />
        {/* <CertificationTechSection /> */}
        <ProductsSection />
        <ManufacturingSection />
        {/* <DistributionSection /> */}
        <NewsSection />
      </main>
      <Footer />
    </div>
  );
}

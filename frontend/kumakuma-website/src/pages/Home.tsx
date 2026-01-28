import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import PartnersSection from '../components/PartnersSection';
import AdvantagesSection from '../components/AdvantagesSection';
import ProductsSection from '../components/ProductsSection';
import ManufacturingSection from '../components/ManufacturingSection';
import NewsSection from '../components/NewsSection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className='flex flex-col gap-20 mb-20'>
        <HeroSection />
        <PartnersSection />
        <AdvantagesSection />
        <ProductsSection />
        <ManufacturingSection />
        <NewsSection />
      </main>
      <Footer />
    </div>
  );
}

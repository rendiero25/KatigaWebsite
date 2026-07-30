import { motion } from 'motion/react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import CategoriesSection from '../components/CategoriesSection';
import PromosiSection from '../components/PromosiSection';
import ShopTheLookSection from '../components/ShopTheLookSection';
import ProductsSection from '../components/ProductsSection';
import ManufacturingSection from '../components/ManufacturingSection';
import AdvantagesSection from '../components/AdvantagesSection';
import InstagramSection from '../components/InstagramSection';
import NewsSection from '../components/NewsSection';

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
  viewport: { once: true },
} as const;

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex flex-col gap-15 md:gap-24 mb-15 md:mb-24">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <HeroSection />
        </motion.div>

        <motion.div {...reveal}>
          <CategoriesSection />
        </motion.div>

        <motion.div {...reveal}>
          <PromosiSection />
        </motion.div>

        <motion.div {...reveal}>
          <ShopTheLookSection />
        </motion.div>

        <motion.div {...reveal}>
          <ProductsSection />
        </motion.div>

        <motion.div {...reveal}>
          <ManufacturingSection />
        </motion.div>

        <motion.div {...reveal}>
          <AdvantagesSection />
        </motion.div>

        <motion.div {...reveal}>
          <InstagramSection />
        </motion.div>

        <motion.div {...reveal}>
          <NewsSection />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

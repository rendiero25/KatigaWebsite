import { motion } from 'motion/react';

import { useAboutContent } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';
import PartnersSection from '../components/PartnersSection';
import AboutBanner from '../components/about/AboutBanner';
import AboutStorySection from '../components/about/AboutStorySection';
import AboutValuesSection from '../components/about/AboutValuesSection';
import AboutTechSection from '../components/about/AboutTechSection';
import AboutBehindBrandSection from '../components/about/AboutBehindBrandSection';
import AboutDistributionSection from '../components/about/AboutDistributionSection';

interface AboutContent {
  images?: string[];
  history?: string;
  mission?: { title?: string; points?: string[] };
  vision?: { title?: string; content?: string; backgroundImage?: string };
}

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.8 },
  viewport: { once: true },
} as const;

export default function AboutUs() {
  const { data } = useAboutContent();
  const content = (data as AboutContent | null) ?? null;
  const images = content?.images ?? [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex flex-col gap-8 md:gap-12 mb-8 md:mb-12">
        <AboutBanner image={images[0]} />

        <motion.div {...reveal}>
          <AboutStorySection history={content?.history} />
        </motion.div>

        <AboutBanner image={images[1]} />

        <motion.div {...reveal}>
          <AboutValuesSection title={content?.mission?.title} points={content?.mission?.points} />
        </motion.div>

        <motion.div {...reveal}>
          <AboutTechSection />
        </motion.div>

        {/* Banner visi dibatasi lebar container seperti section lain; dua banner gambar
            di atas sengaja tetap full-bleed. */}
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <AboutBanner
            image={content?.vision?.backgroundImage}
            label={content?.vision?.title}
            quote={content?.vision?.content}
          />
        </div>

        <motion.div {...reveal}>
          <AboutBehindBrandSection />
        </motion.div>

        <motion.div {...reveal}>
          <AboutDistributionSection />
        </motion.div>

        <motion.div {...reveal}>
          <PartnersSection />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

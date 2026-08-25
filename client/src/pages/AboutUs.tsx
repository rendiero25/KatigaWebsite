import { motion } from 'motion/react';

import { useAboutContent } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';
import PartnersSection from '../components/PartnersSection';
import AboutBanner from '../components/about/AboutBanner';
import AboutStorySection from '../components/about/AboutStorySection';
import AboutVisionSection from '../components/about/AboutVisionSection';
import AboutValuesSection from '../components/about/AboutValuesSection';
import AboutTechSection from '../components/about/AboutTechSection';
import AboutBehindBrandSection from '../components/about/AboutBehindBrandSection';
import AboutDistributionSection from '../components/about/AboutDistributionSection';

interface AboutContent {
  bannerTop?: string;
  bannerBottom?: string;
  history?: string;
  mission?: { title?: string; points?: string[]; backgroundImage?: string };
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex flex-col gap-8 md:gap-12 mb-8 md:mb-12">
        <AboutBanner image={content?.bannerTop} />

        <motion.div {...reveal}>
          <AboutStorySection history={content?.history} />
        </motion.div>

        <AboutBanner image={content?.bannerBottom} />

        <motion.div {...reveal}>
          <section className="pt-10 pb-20">
            <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
              <div className="grid gap-6 md:grid-cols-2">
                <AboutVisionSection
                  title={content?.vision?.title}
                  content={content?.vision?.content}
                  backgroundImage={content?.vision?.backgroundImage}
                />
                <AboutValuesSection
                  title={content?.mission?.title}
                  points={content?.mission?.points}
                  backgroundImage={content?.mission?.backgroundImage}
                />
              </div>
            </div>
          </section>
        </motion.div>

        <motion.div {...reveal}>
          <AboutTechSection />
        </motion.div>

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

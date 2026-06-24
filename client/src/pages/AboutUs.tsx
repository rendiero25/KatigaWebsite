import { useEffect, useState } from "react";
import { motion } from "motion/react";
import api from "../services/api";
import Footer from "../components/Footer";
import Header from "../components/Header";
import PartnersSection from "../components/PartnersSection";

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/autoplay';

export default function AboutUs() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [content, setContent] = useState<any>(null);
  const [tech, setTech] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [aboutRes, techRes, distRes] = await Promise.all([
          api.getAboutContent(),
          api.getCertificationTech(),
          api.getDistribution(),
        ]);
        setContent(aboutRes);
        setTech(techRes);
        setDistribution(distRes);
      } catch (e) {
        console.error("Error loading about page data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-20 flex flex-col gap-20 items-center justify-between">
        {/* 1. Header Section */}
        <section className="text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl uppercase font-bold mb-6 text-black tracking-tight"
          >
            {content?.title || "ABOUT US"}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-black text-xl leading-relaxed max-w-2xl mx-auto"
          >
            {content?.subtitle}
          </motion.p>
        </section>

        {/* 2. Partners Loop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="-mt-10"
        >
          <PartnersSection />
        </motion.div>

        {/* 3. Gallery Grid/Marquee */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-5 xl:mb-20 overflow-hidden mt-10 w-full max-w-full"
        >
          <Swiper
            key={content?.images?.length || 0}
            spaceBetween={20}
            slidesPerView={'auto'}
            loop={true}
            speed={5000} // Slower speed for smoother continuous effect
            allowTouchMove={false} // Disable touch to keep it strictly marquee
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            modules={[Autoplay]}
            className="w-full swiper-marquee"
          >
            <style>{`
              .swiper-marquee .swiper-wrapper {
                transition-timing-function: linear !important;
              }
            `}</style>
            {(content?.images || []).map((img: string, idx: number) => (
              <SwiperSlide key={idx} className="!w-auto">
                 <div
                  className="w-64 h-48 md:w-80 md:h-90 shrink-0 rounded-xl overflow-hidden"
                >
                  <img
                    src={api.getImageUrl(img)}
                    alt=""
                    className="w-full h-full object-cover hover:scale-105 transition duration-500 shadow-2xl"
                  />
                </div>
              </SwiperSlide>
            ))}
            {(!content?.images || content.images.length === 0) && (
              <div className="w-full text-center text-gray-400 py-10 bg-gray-50">
                No gallery images uploaded
              </div>
            )}
          </Swiper>
        </motion.section>

        {/* 4. History Content */}
        <motion.section 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="container mx-auto px-4"
        >
          <p className="px-4 sm:px-10 lg:px-20 xl:px-30 text-xl md:text-3xl text-justify text-black leading-relaxed font-normal">
            {content?.history}
          </p>
        </motion.section>

        {/* 5. Mission & Vision */}
        <section className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          {/* Mission Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-cover bg-center text-white h-[600px] xl:h-[400px] flex justify-center items-center w-full shadow-xl mb-8"
            style={{
              backgroundImage: content?.mission?.backgroundImage
                ? `url(${api.getImageUrl(content.mission.backgroundImage)})`
                : "",
            }}
          >
            <div className="flex flex-col lg:flex-row items-center justify-between w-full px-15 md:px-50 gap-10 relative z-10">
              <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">
                {content?.mission?.title || "Mission"}
              </h2>
              <ul className="flex-1 space-y-4 text-lg md:text-xl font-light">
                {content?.mission?.points?.length > 0 ? (
                  content.mission.points.map((pt: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-normal">{i + 1}.</span>
                      <span className="font-medium">{pt}</span>
                    </li>
                  ))
                ) : (
                  <li>Thinking of you...</li>
                )}
              </ul>
            </div>
          </motion.div>

          {/* Vision Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-cover bg-center text-white flex justify-center items-center w-full h-[400px] shadow-xl"
            style={{
              backgroundImage: content?.vision?.backgroundImage
                ? `url(${api.getImageUrl(content.vision.backgroundImage)})`
                : "",
            }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between w-full px-15 md:px-50 gap-10 relative z-10">
              <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">
                {content?.vision?.title || "Vision"}
              </h2>
              <p className="flex-1 text-lg md:text-xl font-medium leading-relaxed">
                {content?.vision?.content}
              </p>
            </div>
          </motion.div>
        </section>

        {/* 6. Certification & Technology (New Layout) */}
        {tech && (
          <section className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 mb-5 xl:mb-24">
            {/* Header */}
            <div className="mb-20">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-lg font-bold text-black mb-4"
              >
                {tech.header?.subtitle}
              </motion.p>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase leading-tight max-w-xl"
              >
                {tech.header?.title}
              </motion.h2>
            </div>

            {/* Section 1: Certificates */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="order-1"
              >
                <div className="rounded-3xl overflow-hidden size-3/4 relative group">
                  {tech.section1?.image ? (
                    <img
                      src={api.getImageUrl(tech.section1.image)}
                      className="w-full h-full object-cover"
                      alt="Certificates"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </motion.div>
              <div className="order-2 space-y-8">
                {tech.section1?.points?.map((pt: any, idx: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <h4 className="font-bold text-2xl uppercase mb-2">
                      {pt.title}
                    </h4>
                    <p className="text-black/80 uppercase leading-tight text-2xl text-normal">
                      {pt.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-6 text-3xl md:text-4xl font-bold text-gray-900 uppercase leading-tight max-w-xl"
              >
                {tech.section2?.title}
              </motion.h3>
            </div>

            {/* Section 2: Forest to Fashion */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="order-2 md:order-1"
              >
                <div className="rounded-3xl overflow-hidden size-3/4 relative group">
                  {tech.section2?.image ? (
                    <img
                      src={api.getImageUrl(tech.section2.image)}
                      className="w-full h-full object-cover"
                      alt="Forest to Fashion"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="order-1 md:order-2">
                
                <motion.span 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="block text-gray-400 text-xl font-medium mb-8 uppercase"
                >
                  {tech.section2?.subtitle}
                </motion.span>

                <ul className="space-y-4">
                  {(tech.section2?.points || []).map(
                    (pt: string, idx: number) => (
                      <motion.li 
                        key={idx} 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-4"
                      >
                        <span className="font-normal text-2xl text-black/80">
                          {idx + 1}.
                        </span>
                        <span className="text-black uppercase leading-tight text-2xl text-normal">
                          {pt}
                        </span>
                      </motion.li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 7. Distribution Channel */}
        {distribution && (
          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mx-auto text-center"
          >
            <p className="text-lg font-bold text-black mb-4">
              {distribution.title}
            </p>
            <h2 className="text-2xl md:text-3xl font-normal text-black mb-10 max-w-3xl mx-auto">
              {distribution.description}
            </h2>
            <div className="relative w-full aspect-2/1 rounded-3xl overflow-hidden">
              {distribution.mapImage ? (
                <img
                  src={api.getImageUrl(distribution.mapImage)}
                  alt="Map"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Map Visualization Placeholder
                </div>
              )}
            </div>
          </motion.section>
        )}
      </main>
      <Footer />
    </div>
  );
}

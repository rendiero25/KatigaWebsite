import { useEffect, useState } from "react";
import { usePartners } from "../hooks/useApi";
import api from "../services/api";
import Footer from "../components/Footer";
import Header from "../components/Header";

export default function AboutUs() {
  const [content, setContent] = useState<any>(null);
  const [tech, setTech] = useState<any>(null);
  const [distribution, setDistribution] = useState<any>(null);
  const { data: partners } = usePartners();
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

      <main className="pt-10">
        {/* 1. Header Section */}
        <section className="text-center px-4 max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6 text-black tracking-tight">
            {content?.title || "ABOUT US"}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
            {content?.subtitle}
          </p>
        </section>

        {/* 2. Partners Loop */}
        <div className="container mx-auto px-4 flex flex-row flex-wrap items-center justify-between gap-8 md:gap-12">
          <div className="w-full md:w-48 shrink-0 text-center md:text-left">
            <h3 className="text-black text-lg leading-relaxed font-medium">
              Trusted by several big
              <br className="hidden md:block" /> company in Indonesia
            </h3>
          </div>

          <div className="flex-1 w-full overflow-hidden relative">
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-8 md:gap-16 opacity-80 transition-all duration-500">
              {partners.map((partner) => (
                <div
                  key={partner._id}
                  className="shrink-0 h-8 md:h-10 w-auto flex items-center justify-between group"
                >
                  <img
                    src={`http://localhost:5000${partner.logo}`}
                    alt={partner.name}
                    className="h-full object-contain  transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Gallery Grid/Marquee */}
        <section className="mb-20 overflow-hidden mt-12">
          <div className="flex gap-4 animate-scroll whitespace-nowrap">
            {(content?.images || []).map((img: string, idx: number) => (
              <div
                key={idx}
                className="w-64 h-48 md:w-80 md:h-60 shrink-0 rounded-xl overflow-hidden"
              >
                <img
                  src={`http://localhost:5000${img}`}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition duration-500"
                />
              </div>
            ))}
            {(!content?.images || content.images.length === 0) && (
              <div className="w-full text-center text-gray-400 py-10 bg-gray-50">
                No gallery images uploaded
              </div>
            )}
          </div>
        </section>

        {/* 4. History Content */}
        <section className="max-w-4xl mx-auto px-4 mb-24 text-center">
          <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium">
            {content?.history}
          </p>
        </section>

        {/* 5. Mission & Vision */}
        <section className="max-w-6xl mx-auto px-4 mb-24 space-y-8">
          {/* Mission Card */}
          <div
            className="relative rounded-3xl overflow-hidden bg-cover bg-center text-white p-8 md:p-16 shadow-xl"
            style={{
              backgroundImage: content?.mission?.backgroundImage
                ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(http://localhost:5000${content.mission.backgroundImage})`
                : "linear-gradient(to right, #2F4F3D, #5C8D6D)",
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">
                {content?.mission?.title || "Mission"}
              </h2>
              <ul className="flex-1 space-y-4 text-lg md:text-xl font-light">
                {content?.mission?.points?.length > 0 ? (
                  content.mission.points.map((pt: string, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-bold">{i + 1}.</span>
                      <span>{pt}</span>
                    </li>
                  ))
                ) : (
                  <li>Thinking of you...</li>
                )}
              </ul>
            </div>
          </div>

          {/* Vision Card */}
          <div
            className="relative rounded-3xl overflow-hidden bg-cover bg-center text-white p-8 md:p-16 shadow-xl"
            style={{
              backgroundImage: content?.vision?.backgroundImage
                ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(http://localhost:5000${content.vision.backgroundImage})`
                : "linear-gradient(to right, #3A6B46, #2F4F3D)",
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">
                {content?.vision?.title || "Vision"}
              </h2>
              <p className="flex-1 text-lg md:text-xl font-light leading-relaxed">
                {content?.vision?.content}
              </p>
            </div>
          </div>
        </section>

        {/* 6. Certification & Technology (New Layout) */}
        {tech && (
          <section className="max-w-7xl mx-auto px-4 mb-24">
            {/* Header */}
            <div className="mb-12">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                {tech.header?.subtitle || "Certificates & Technology"}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase leading-tight max-w-3xl">
                {tech.header?.title}
              </h2>
            </div>

            {/* Section 1: Certificates */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
              <div className="order-1">
                <div className="rounded-3xl shadow-xl overflow-hidden aspect-square md:aspect-[4/3] relative group">
                  {tech.section1?.image ? (
                    <img
                      src={`http://localhost:5000${tech.section1.image}`}
                      className="w-full h-full object-cover"
                      alt="Certificates"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </div>
              <div className="order-2 space-y-8">
                {tech.section1?.points?.map((pt: any, idx: number) => (
                  <div key={idx}>
                    <h4 className="font-bold text-lg uppercase mb-2">
                      {pt.title}
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm lg:text-base">
                      {pt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Forest to Fashion */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="rounded-3xl shadow-xl overflow-hidden aspect-square md:aspect-[4/3]">
                  {tech.section2?.image ? (
                    <img
                      src={`http://localhost:5000${tech.section2.image}`}
                      className="w-full h-full object-cover"
                      alt="Forest to Fashion"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-3xl font-bold mb-2 text-gray-900 uppercase leading-none">
                  {tech.section2?.title}
                </h3>
                <span className="block text-gray-400 text-xl font-medium mb-8 uppercase">
                  {tech.section2?.subtitle}
                </span>

                <ul className="space-y-4">
                  {(tech.section2?.points || []).map(
                    (pt: string, idx: number) => (
                      <li key={idx} className="flex gap-4">
                        <span className="font-bold text-gray-800">
                          {idx + 1}.
                        </span>
                        <span className="text-gray-700 uppercase font-medium">
                          {pt}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 7. Distribution Channel */}
        {distribution && (
          <section className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              {distribution.title}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10 max-w-3xl mx-auto">
              {distribution.description}
            </h2>
            <div className="relative w-full aspect-2/1 bg-gray-50 rounded-3xl overflow-hidden">
              {distribution.mapImage ? (
                <img
                  src={`http://localhost:5000${distribution.mapImage}`}
                  alt="Map"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Map Visualization Placeholder
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

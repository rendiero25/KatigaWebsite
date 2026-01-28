import { useEffect, useState } from 'react';
import { usePartners } from '../hooks/useApi';
import api from '../services/api';
import Footer from '../components/Footer';
import Header from '../components/Header';

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
                api.getDistribution()
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
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-10">
        {/* 1. Header Section */}
        <section className="text-center px-4 max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl font-bold mb-6 text-black tracking-tight">{content?.title || 'ABOUT US'}</h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                {content?.subtitle || "From a family's passion to timeless creations — Kusuma Kencana was born to blend technology, comfort, and modern design for every mama and baby."}
            </p>
        </section>

        {/* 2. Partners Loop */}
        <div className="container mx-auto px-4 flex flex-row flex-wrap items-center justify-between gap-8 md:gap-12">
            <div className="w-full md:w-48 shrink-0 text-center md:text-left">
            <h3 className="text-black text-lg leading-relaxed font-medium">
              Trusted by several big<br className="hidden md:block" /> company in Indonesia
            </h3>
          </div>

          <div className="flex-1 w-full overflow-hidden relative">
            {/* 
              We use a flex container for logos. 
              On mobile they might wrap or scroll depending on preference.
              Based on the image, it looks like a single row. 
            */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-8 md:gap-16 opacity-80 transition-all duration-500">
              {partners.map((partner) => (
                <div key={partner._id} className="shrink-0 h-8 md:h-10 w-auto flex items-center justify-between group">
                  <img
                    src={`http://localhost:5000${partner.logo}`}
                    alt={partner.name}
                    className="h-full object-contain  transition-all duration-300"
                    onError={(e) => {
                       (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Gallery Grid/Marquee */}
        {/* Using a marquee effect or simple grid as per image? The image shows a strip of photos. Let's do a scrolling strip. */}
        <section className="mb-20 overflow-hidden">
            <div className="flex gap-4 animate-scroll whitespace-nowrap">
                {/* Duplicate logic for infinite scroll illusion if needed, for now just mapping images */}
                {(content?.images || []).map((img: string, idx: number) => (
                    <div key={idx} className="w-64 h-48 md:w-80 md:h-60 shrink-0 rounded-xl overflow-hidden">
                        <img src={`http://localhost:5000${img}`} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                    </div>
                ))}
                 {/* Fallback if no images */}
                 {(!content?.images || content.images.length === 0) && (
                    <div className="w-full text-center text-gray-400 py-10 bg-gray-50">No gallery images uploaded</div>
                 )}
            </div>
             {/* Note: User might need custom CSS for 'animate-scroll' or we can use Swiper. Swiper is safer given existing dependencies. */}
        </section>

        {/* 4. History Content */}
        <section className="max-w-4xl mx-auto px-4 mb-24 text-center">
            <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium">
                {content?.history || "Didirikan pada tahun 2001, kami memulai perjalanan sebagai produsen lokal yang peduli pada kualitas tidur bayi. Dari meja toko serba ada (department store) pertama di tahun 2002, kini kami telah hadir di lebih dari 600 gerai dari Sabang hingga Merauke."}
            </p>
        </section>

        {/* 5. Mission & Vision */}
        <section className="max-w-6xl mx-auto px-4 mb-24 space-y-8">
            {/* Mission Card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#2F4F3D] to-[#5C8D6D] text-white p-8 md:p-16 shadow-xl">
                 <div className="flex flex-col md:flex-row items-center gap-10">
                     <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">{content?.mission?.title || 'Mission'}</h2>
                     <ul className="flex-1 space-y-4 text-lg md:text-xl font-light">
                        {content?.mission?.points?.length > 0 ? content.mission.points.map((pt: string, i: number) => (
                            <li key={i} className="flex gap-3">
                                <span className="font-bold">{i+1}.</span>
                                <span>{pt}</span>
                            </li>
                        )) : (
                            <>
                                <li>1. Through <strong>PRODUCTS</strong> that serve as <strong>EXPRESSIONS OF FAMILY AFFECTION</strong></li>
                                <li>2. Creating <strong>PRODUCTS</strong> that meet standards of <strong>COMFORT, SAFETY</strong>, and <strong>QUALITY</strong></li>
                            </>
                        )}
                     </ul>
                 </div>
            </div>

             {/* Vision Card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#3A6B46] to-[#2F4F3D] text-white p-8 md:p-16 shadow-xl">
                <div className="flex flex-col md:flex-row items-center gap-10">
                     <h2 className="text-4xl font-bold w-full md:w-1/3 text-center md:text-left">{content?.vision?.title || 'Vision'}</h2>
                     <p className="flex-1 text-lg md:text-xl font-light leading-relaxed">
                        {content?.vision?.content || "To serve THE WORLD by providing PRODUCTS that enhance THE BONDS OF FAMILY LOVE"}
                     </p>
                </div>
            </div>
        </section>

        {/* 6. Certifications & Tech Section (Reusing data structure if flexible, or custom layout) */}
        {/* Layout: Left Text, Right Image/Grid */}
        {tech && (
            <section className="max-w-7xl mx-auto px-4 mb-24">
                <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Certificates & Technology</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase leading-tight">
                            {tech.title || "KAMI MENJAMIN PRODUK KAMI BEBAS DARI ZAT BERBAHAYA"}
                        </h2>
                        <div className="space-y-6">
                             {tech.certificates?.map((cert: any, idx: number) => (
                                 <div key={idx}> 
                                     <h4 className="font-bold text-lg">{cert.title}</h4>
                                     <p className="text-gray-600 text-sm">{cert.description}</p>
                                 </div>
                             ))}
                        </div>
                    </div>
                    <div className="relative">
                        {/* Assuming tech has an image field or using first cert image */}
                        <div className="grid grid-cols-2 gap-4">
                             {tech.certificates?.slice(0, 4).map((cert: any, idx: number) => (
                                 cert.image && <img key={idx} src={`http://localhost:5000${cert.image}`} className="w-full h-40 object-cover rounded-xl shadow-md" alt={cert.title} />
                             ))}
                        </div>
                    </div>
                </div>

                {/* From Forest To Fashion Section - part of Tech? Or hardcoded as per image? 
                    Assuming it's hardcoded decoration or part of tech content. I'll add a section for it.
                */}
                <div className="grid md:grid-cols-2 gap-16 items-center"> 
                     <div className="order-2 md:order-1">
                         <img src="https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800" alt="Fabric" className="rounded-3xl shadow-2xl w-full object-cover h-[400px]" />
                     </div>
                     <div className="order-1 md:order-2">
                        <h3 className="text-3xl font-bold mb-6 text-gray-900 uppercase">
                            DARI HUTAN UNTUK<br/>KENYAMANAN ANDA<br/>
                            <span className="text-gray-400 text-xl">(FROM FOREST TO FASHION)</span>
                        </h3>
                        <ul className="space-y-4 text-gray-700">
                            <li className="flex gap-3">
                                <span className="font-bold">1.</span>
                                <span>BERASAL DARI KAYU BERSERTIFIKAT DAN TERKONTROL</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold">2.</span>
                                <span>DAPAT TERURAI SECARA HAYATI (BIODEGRADABLE)</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold">3.</span>
                                <span>MENDUKUNG PENGATURAN KELEMBAPAN ALAMI AGAR KULIT TETAP KERING DAN SEJUK</span>
                            </li>
                             <li className="flex gap-3">
                                <span className="font-bold">4.</span>
                                <span>TAHAN LAMA DAN LEMBUT DI KULIT</span>
                            </li>
                        </ul>
                     </div>
                </div>
            </section>
        )}

        {/* 7. Distribution Channel */}
        {distribution && (
            <section className="max-w-7xl mx-auto px-4 text-center">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Distribution Channel</p>
                 <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10 max-w-3xl mx-auto">
                    {distribution.title || "Our distribution network spans nearly the entire Indonesian Archipelago..."}
                 </h2>
                 <div className="relative w-full aspect-[2/1] bg-gray-50 rounded-3xl overflow-hidden">
                     {distribution.image ? (
                        <img 
                            src={`http://localhost:5000${distribution.mapImage || distribution.image}`} 
                            alt="Map" 
                            className="w-full h-full object-contain" 
                        />
                     ) : (
                         <div className="flex items-center justify-center h-full text-gray-400">Map Visualization Placeholder</div>
                     )}
                 </div>
            </section>
        )}

      </main>
      <Footer />
    </div>
  );
}

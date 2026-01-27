import { useHero, usePartners } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  const { data: hero, loading } = useHero();
  const { data: partners } = usePartners();

  if (loading) {
    return (
      <section className="min-h-[500px] bg-gray-100 animate-pulse flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </section>
    );
  }

  return (
    <section className="relative bg-[#F9F7F2]"> {/* Warm off-white background */}
      {/* Hero Content */}
      <div className="relative pt-16 pb-0 lg:pt-24 overflow-hidden">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            {/* Tagline */}
            <p className="text-sm md:text-base font-medium text-gray-600 italic mb-4">
              Kenyamanan Cinta untuk Keluarga Indonesia
            </p>
            
            {/* Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {hero?.title || 'Menghadirkan perlengkapan tidur bayi dan handuk keluarga berkualitas premium sejak tahun 2001.'}
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {hero?.subtitle || 'Bersertifikat SNI, OEKO-TEX®, dan K3L.'}
            </p>
            
            {/* CTA Button */}
            {hero?.buttonName && (
              <div className="mb-12">
                <Link 
                  to={hero?.buttonLink || '/produk'}
                  className="inline-flex items-center px-8 py-3 bg-[#2D3340] text-white font-medium rounded-full hover:bg-gray-800 transition shadow-lg text-sm tracking-wide"
                >
                  {hero.buttonName}
                </Link>
              </div>
            )}
         </div>

         {/* Hero Image - Centered and Large */}
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-t-[3rem] overflow-hidden shadow-2xl mx-auto">
               <img 
                  src={api.getImageUrl(hero?.image)}
                  alt="Hero Family"
                  className="w-full h-auto object-cover min-h-[400px] max-h-[600px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600';
                  }}
               />
               
               {/* Floating Elements (Decorations from ref) */}
               <div className="absolute top-1/4 left-10 text-4xl text-gray-800 font-light">+</div>
               <div className="absolute top-1/4 right-10 text-4xl text-gray-800 font-light">+</div>
            </div>
         </div>
      </div>

      {/* Partners Strip */}
      <div className="bg-white py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-auto text-center md:text-left">
               <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trusted by several big company in Indonesia</span>
            </div>
            <div className="flex-1 flex flex-wrap items-center justify-center md:justify-end gap-x-8 gap-y-4">
              {partners?.map((partner: any) => (
                <img 
                  key={partner._id}
                  src={api.getImageUrl(partner.logo)}
                  alt={partner.name}
                  className="h-6 sm:h-7 object-contain grayscale hover:grayscale-0 transition opacity-70 hover:opacity-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

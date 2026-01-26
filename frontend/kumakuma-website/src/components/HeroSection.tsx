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
    <section className="relative">
      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <p className="text-sm font-medium text-pink-600 mb-3">
              Kenyamanan Cinta Keluarga Indonesia
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {hero?.title || 'Menghadirkan perlengkapan tidur bayi dan handuk keluarga berkualitas premium sejak tahun 2001.'}
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              {hero?.subtitle || 'Bersertifikat SNI, OEKO-TEX®, dan K3L.'}
            </p>
            {hero?.buttonName && (
              <Link 
                to={hero?.buttonLink || '/produk'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-full hover:bg-gray-800 transition shadow-lg"
              >
                {hero.buttonName}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {/* Hero Image */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br from-pink-100 to-orange-50">
                <img 
                  src={api.getImageUrl(hero?.image)}
                  alt="Hero"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800';
                  }}
                />
              </div>
              {/* Decorative Elements */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-pink-200 rounded-full opacity-50 blur-xl"></div>
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-orange-200 rounded-full opacity-50 blur-xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Banner */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs text-gray-500">Trusted by several big company in Indonesia</span>
          </div>
          <div className="flex flex-wrap items-center gap-8">
            {partners?.map((partner: any) => (
              <img 
                key={partner._id}
                src={api.getImageUrl(partner.logo)}
                alt={partner.name}
                className="h-6 sm:h-8 object-contain grayscale hover:grayscale-0 transition"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

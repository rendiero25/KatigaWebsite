import { useHero } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  const { data: hero, loading } = useHero();

  if (loading) {
    return (
      <section className="min-h-screen bg-[#F9F7F2] animate-pulse flex items-center justify-center">
        {/* Loading State matching bg color */}
      </section>
    );
  }

  return (
    <section className="relative bg-[#F9F7F2] overflow-hidden min-h-screen flex flex-col justify-between items-center"> 
      {/* 
         pt-32 to push content down below header location (visually). 
         The header itself is likely fixed or sticky, but this ensures spacing.
      */}

      {/* Decorative Sparkles (Absolute Positioned) */}
      <svg className="absolute top-40 left-10 md:left-32 w-8 h-8 text-black animate-pulse" viewBox="0 0 24 24" fill="currentColor">
         <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
      </svg>
      <svg className="absolute bottom-1/3 left-20 w-6 h-6 text-black/60 animate-pulse delay-700" viewBox="0 0 24 24" fill="currentColor">
         <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
      </svg>
      <svg className="absolute top-32 right-20 md:right-40 w-4 h-4 text-black/40 animate-pulse delay-300" viewBox="0 0 24 24" fill="currentColor">
         <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
      </svg>
      <svg className="absolute bottom-1/2 right-32 w-6 h-6 text-black/70 animate-pulse delay-500" viewBox="0 0 24 24" fill="currentColor">
         <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
      </svg>


      {/* Styles for "Gradient Primary" requested by user.
          "di atas foto ada gradient-primary dari atas ke bawah"
          Interpretation: A gradient overlay ON TOP of the photo, going from [Color] to Transparent.
          Matching the image: It fades from the Background Color (#F9F7F2) to Transparent, 
          making the image look like it's emerging from the fog.
      */}

      {/* Hero Text Content */}
      <div className="absolute z-20 container mx-auto px-4 text-center mt-10 pt-5">
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-[#1e1e1e] mb-2">
          {hero?.subtitle || 'Bersertifikat SNI, OEKO-TEX®, dan K3L.'}
        </p>

        {/* Main Title */}
        <h1 className="text-3xl md:text-5xl leading-tight font-normal text-[#1e1e1e] max-w-7xl mx-auto mb-10">
          {hero?.title || 'Menghadirkan perlengkapan tidur bayi\ndan handuk keluarga berkualitas premium sejak tahun 2001.'}
        </h1>

        {/* CTA Button */}
        {hero?.buttonName && (
          <div className="mb-20">
            <Link 
              to={hero?.buttonLink || '/produk'}
              className="inline-flex items-center px-10 py-4 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full shadow-[0_10px_20px_rgba(79,104,175,0.3)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-sm tracking-wide"
            >
              {hero.buttonName}
            </Link>
          </div>
        )}
      </div>

      {/* Hero Image Container at Bottom */}
      <div className="relative w-full h-screen z-10">
         {/* The Image */}
         <div className="w-full h-full">
             <img 
               src={api.getImageUrl(hero?.image)}
               alt="Hero Family"
               className="w-full h-full object-cover object-top"
               style={{
                  maxHeight: 'fit-content',
                  minHeight: '400px'
               }}
               onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1600';
               }}
            />
         </div>

         {/* Gradient Overlay - "Gradient Primary dari Atas ke Bawah" matches the background */}
         <div className="absolute inset-0 bg-gradient-to-b from-[#F9F7F2] via-[#F9F7F2]/60 to-transparent pointer-events-none h-1/2"></div>
      </div>

    </section>
  );
}

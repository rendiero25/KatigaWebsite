import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHero } from '../hooks/useApi';

import api from '../services/api';

interface HeroSlide {
  media: string;
  mediaType: 'image' | 'video';
  title: string;
  subtitle: string;
  buttonName: string;
  buttonLink: string;
}

const SLIDE_INTERVAL_MS = 6000;

export default function HeroSection() {
  const { data: hero, loading } = useHero();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides: HeroSlide[] = Array.isArray(hero?.slides) ? hero.slides : [];
  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0;

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (slides.length <= 1 || isPaused) {
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [slides.length, isPaused]);

  if (loading) {
    return (
      <section className="h-[calc(100vh-80px)] min-h-[560px] bg-[#F9F7F2] animate-pulse" />
    );
  }

  if (slides.length === 0) {
    return <section className="h-[calc(100vh-80px)] min-h-[560px] bg-[#F9F7F2]" />;
  }

  const activeSlide = slides[safeIndex];

  return (
    <section
      className="relative h-[calc(100vh-80px)] min-h-[560px] overflow-hidden bg-[#F9F7F2]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === safeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {slide.mediaType === 'video' ? (
            <video
              src={api.getImageUrl(slide.media)}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={api.getImageUrl(slide.media)}
              alt={slide.title || 'Hero'}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
        </div>
      ))}

      <div className="absolute z-20 bottom-10 left-4 sm:left-10 lg:left-20 xl:left-30 right-4 sm:right-10 max-w-2xl">
        {activeSlide.title && (
          <h1 className="text-xl md:text-[2rem] font-normal uppercase tracking-[0.05em] leading-tight text-white mb-4">
            {activeSlide.title}
          </h1>
        )}
        {activeSlide.subtitle && (
          <p className="text-sm text-white/80 leading-relaxed mb-8">
            {activeSlide.subtitle}
          </p>
        )}
        {activeSlide.buttonName && (
          <Link
            to={activeSlide.buttonLink || '/produk'}
            className="inline-flex items-center uppercase tracking-[0.18em] text-[13px] px-8 py-4 border border-white text-white hover:bg-white hover:text-[#1E1E1E] transition-colors duration-300"
          >
            {activeSlide.buttonName}
          </Link>
        )}
      </div>

      {slides.length > 1 && (
        <div className="absolute z-20 bottom-10 right-4 sm:right-10 lg:right-20 xl:right-30 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                index === safeIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

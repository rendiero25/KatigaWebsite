import { Link } from 'react-router-dom';

import { useManufacturing } from '../hooks/useApi';

import ResponsiveBanner from './ResponsiveBanner';

interface ManufacturingData {
  tagline?: string;
  backgroundImage?: string;
  label?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

const BANNER_HEIGHT = 'h-[320px] md:h-[440px]';

export default function ManufacturingSection() {
  const { data, loading } = useManufacturing();
  const manufacturing = data as ManufacturingData | null;

  if (loading) {
    return <section className={`${BANNER_HEIGHT} bg-[#F9F7F2] animate-pulse`} />;
  }

  const tagline = manufacturing?.tagline;
  const backgroundImage = manufacturing?.backgroundImage;
  const label = manufacturing?.label;
  const ctaLabel = manufacturing?.ctaLabel;
  const ctaUrl = manufacturing?.ctaUrl;

  if (!tagline && !backgroundImage) {
    return <section className={`${BANNER_HEIGHT} bg-[#F9F7F2]`} />;
  }

  return (
    <ResponsiveBanner image={backgroundImage} alt="Tentang Kami">
      {backgroundImage && <div className="absolute inset-0 bg-black/30" />}

      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 gap-8">
        {label && (
          <span
            className={`uppercase tracking-[0.18em] text-[13px] ${
              backgroundImage ? 'text-white/70' : 'text-[#6F6F71]'
            }`}
          >
            {label}
          </span>
        )}
        {tagline && (
          <h2
            className={`text-2xl md:text-3xl max-w-3xl ${
              backgroundImage ? 'text-white' : 'text-[#1E1E1E]'
            }`}
          >
            {tagline}
          </h2>
        )}
        {ctaLabel && ctaUrl && (
          <Link
            to={ctaUrl}
            className={
              backgroundImage
                ? 'border border-white text-white uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-white hover:text-[#1E1E1E] transition'
                : 'border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition'
            }
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </ResponsiveBanner>
  );
}

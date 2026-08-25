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

  // Below xl the copy sits under the photo on the page background, so it only turns
  // white from xl up where it becomes an overlay.
  const onPhoto = Boolean(backgroundImage);

  return (
    <ResponsiveBanner image={backgroundImage} alt="Tentang Kami">
      {onPhoto && <div className="hidden xl:block absolute inset-0 bg-black/30" />}

      <div className="relative xl:absolute xl:inset-0 flex flex-col items-center justify-center text-center gap-4 md:gap-8 px-4 py-10 xl:py-0">
        {label && (
          <span
            className={`uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] ${
              onPhoto ? 'xl:text-white/70' : ''
            }`}
          >
            {label}
          </span>
        )}
        {tagline && (
          <h2
            className={`text-2xl md:text-3xl max-w-3xl text-[#1E1E1E] ${
              onPhoto ? 'xl:text-white' : ''
            }`}
          >
            {tagline}
          </h2>
        )}
        {ctaLabel && ctaUrl && (
          <Link
            to={ctaUrl}
            className={`border border-[#1E1E1E] text-[#1E1E1E] hover:bg-[#1E1E1E] hover:text-white uppercase tracking-[0.18em] text-[13px] px-8 py-4 transition ${
              onPhoto ? 'xl:border-white xl:text-white xl:hover:bg-white xl:hover:text-[#1E1E1E]' : ''
            }`}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </ResponsiveBanner>
  );
}

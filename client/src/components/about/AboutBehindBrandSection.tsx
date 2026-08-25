import { useManufacturing } from '../../hooks/useApi';

import api from '../../services/api';

interface ManufacturingFeature {
  title: string;
  icon?: string;
}

interface ManufacturingData {
  tagline?: string;
  description?: string;
  backgroundImage?: string;
  features?: ManufacturingFeature[];
}

export default function AboutBehindBrandSection() {
  const { data, loading } = useManufacturing();
  const manufacturing = data as ManufacturingData | null;

  if (loading) {
    return (
      <section className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-3 bg-gray-200 w-32 mx-auto mb-4 animate-pulse" />
            <div className="h-8 bg-gray-200 w-2/3 mx-auto mb-6 animate-pulse" />
            <div className="h-4 bg-gray-200 w-full mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 w-5/6 mx-auto animate-pulse" />
          </div>
          <div className="flex flex-wrap justify-center gap-10 mt-12">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-32 flex flex-col items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 animate-pulse" />
                <div className="h-3 bg-gray-200 w-20 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!manufacturing || (!manufacturing.tagline && !manufacturing.description)) {
    return null;
  }

  const features = manufacturing.features ?? [];

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-4">
            Di Balik Brand
          </p>
          {manufacturing.tagline && (
            <h2 className="text-2xl md:text-3xl text-[#1E1E1E] mb-6">{manufacturing.tagline}</h2>
          )}
          {manufacturing.description && (
            <p className="text-sm text-[#6F6F71] leading-relaxed">{manufacturing.description}</p>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-10 mt-12">
            {features.map((feature, index) => (
              <div key={index} className="w-32 flex flex-col items-center gap-3 text-center">
                {feature.icon ? (
                  // The CMS icons are white PNGs drawn for the dark hero banner;
                  // inverting them makes the same asset readable on this white section.
                  <img
                    src={api.getImageUrl(feature.icon)}
                    alt={feature.title}
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 object-contain invert"
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#F9F7F2]" />
                )}
                <p className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E] whitespace-pre-line">
                  {feature.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

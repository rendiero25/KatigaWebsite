import { useDistribution } from '../../hooks/useApi';

import api from '../../services/api';

interface DistributionData {
  title?: string;
  description?: string;
  mapImage?: string;
}

export default function AboutDistributionSection() {
  const { data, loading } = useDistribution();
  const distribution = data as DistributionData | null;

  if (loading) {
    return (
      <section className="py-16 bg-[#F9F7F2]">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <div className="h-3 bg-gray-200 w-24 mb-4 animate-pulse" />
              <div className="h-8 bg-gray-200 w-2/3 mb-6 animate-pulse" />
              <div className="h-4 bg-gray-200 w-full mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 w-5/6 animate-pulse" />
            </div>
            <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (!distribution || (!distribution.title && !distribution.description)) {
    return null;
  }

  return (
    <section className="py-16 bg-[#F9F7F2]">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-4">
              Distribusi
            </p>
            {distribution.title && (
              <h2 className="text-2xl md:text-3xl text-[#1E1E1E] mb-6">{distribution.title}</h2>
            )}
            {distribution.description && (
              <p className="text-sm text-[#6F6F71] leading-relaxed">{distribution.description}</p>
            )}
          </div>

          {distribution.mapImage ? (
            <img
              src={api.getImageUrl(distribution.mapImage)}
              alt={distribution.title ?? 'Peta distribusi'}
              className="w-full h-auto object-contain"
            />
          ) : (
            <div className="aspect-[4/3] bg-white/60" />
          )}
        </div>
      </div>
    </section>
  );
}

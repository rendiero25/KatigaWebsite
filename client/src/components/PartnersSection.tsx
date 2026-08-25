import { usePartners } from '../hooks/useApi';
import api from '../services/api';

export default function PartnersSection() {
  const { data: partners, loading } = usePartners();

  if (loading) {
    return (
      <section className="bg-white pt-10 pb-20">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-3 bg-gray-200 w-40 mx-auto mb-12 animate-pulse" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-8 md:flex-nowrap md:gap-x-8">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-10 w-[104px] bg-gray-200 animate-pulse md:w-auto md:min-w-0 md:flex-1 md:basis-0"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-white pt-10 pb-20">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] text-center mb-12">
          Dipercaya Oleh
        </p>

        {/* One row from md up, each logo taking an equal share of the width.
            getLogoUrl trims the transparent padding first, otherwise object-contain
            scales each mark by its canvas rather than by the mark itself. */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-8 md:flex-nowrap md:gap-x-8">
          {partners.map((partner) => (
            <img
              key={partner._id}
              src={api.getLogoUrl(partner.logo)}
              alt={partner.name}
              loading="lazy"
              decoding="async"
              className="h-10 w-[104px] object-contain md:w-auto md:min-w-0 md:flex-1 md:basis-0"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

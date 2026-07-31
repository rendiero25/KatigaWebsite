import { usePartners } from '../hooks/useApi';
import api from '../services/api';

export default function PartnersSection() {
  const { data: partners, loading } = usePartners();

  if (loading) {
    return (
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-3 bg-gray-200 rounded w-40 mx-auto mb-10 animate-pulse" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] text-center mb-10">
          Dipercaya Oleh
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center">
          {partners.map((partner) => (
            <img
              key={partner._id}
              src={api.getImageUrl(partner.logo)}
              alt={partner.name}
              className="max-h-10 w-auto object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition mx-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

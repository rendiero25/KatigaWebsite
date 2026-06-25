import { usePartners } from '../hooks/useApi';
import api from '../services/api';

export default function PartnersSection() {
  const { data: partners, loading } = usePartners();

  if (loading) return null;
  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-white py-8 w-full">
      <div className="container mx-auto px-6">
        <div className="flex flex-col xl:flex-row items-center justify-start xl:justify-center gap-8 md:gap-10">

          {/* Text Section */}
          <div className="w-full md:w-48 shrink-0 text-center md:text-left">
            <h3 className="text-black text-lg leading-relaxed font-medium">
              Trusted by several big<br className="md:block" /> company in Indonesia
            </h3>
          </div>

          {/* Logos Scroll/Grid Section */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-wrap 2xl:flex-nowrap items-center justify-center xl:justify-between gap-x-8 gap-y-6 transition-all duration-500">
              {partners.map((partner) => (
                <div key={partner._id} className="h-10 md:h-14 flex items-center justify-center">
                  <img
                    src={api.getImageUrl(partner.logo)}
                    alt={partner.name}
                    className="h-full w-auto max-w-[120px] md:max-w-[160px] object-contain transition-all duration-300"
                    onError={(e) => {
                       (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}

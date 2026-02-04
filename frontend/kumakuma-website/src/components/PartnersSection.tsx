import { usePartners } from '../hooks/useApi';
import api from '../services/api';

export default function PartnersSection() {
  const { data: partners, loading } = usePartners();

  if (loading) return null;
  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-whiteflex items-center justify-center w-full">
      <div className="container mx-auto px-6">
        <div className="flex flex-col xl:flex-row items-center justify-start xl:justify-center gap-8 md:gap-10">
          
          {/* Text Section */}
          <div className="w-full md:w-48 shrink-0 text-center md:text-left">
            <h3 className="text-black text-lg leading-relaxed font-medium">
              Trusted by several big<br className="md:block" /> company in Indonesia
            </h3>
          </div>

          {/* Logos Scroll/Grid Section */}
          <div className="flex-1 w-full overflow-hidden relative">
            {/* 
              We use a flex container for logos. 
              On mobile they might wrap or scroll depending on preference.
              Based on the image, it looks like a single row. 
            */}
            <div className="flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-8 transition-all duration-500">
              {partners.map((partner) => (
                <div key={partner._id} className="shrink-0 h-8 md:h-20 w-auto flex items-center justify-between group">
                  <img
                    src={api.getImageUrl(partner.logo)}
                    alt={partner.name}
                    className="w-full 2xl:w-35 object-cover transition-all duration-300"
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

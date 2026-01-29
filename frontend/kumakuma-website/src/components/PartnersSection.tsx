import { usePartners } from '../hooks/useApi';

export default function PartnersSection() {
  const { data: partners, loading } = usePartners();

  if (loading) return null;
  if (!partners || partners.length === 0) return null;

  return (
    <section className="bg-whiteflex items-center justify-center w-full">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
          
          {/* Text Section */}
          <div className="w-full md:w-48 shrink-0 text-center md:text-left">
            <h3 className="text-black text-lg leading-relaxed font-medium">
              Trusted by several big<br className="hidden md:block" /> company in Indonesia
            </h3>
          </div>

          {/* Logos Scroll/Grid Section */}
          <div className="flex-1 w-full overflow-hidden relative">
            {/* 
              We use a flex container for logos. 
              On mobile they might wrap or scroll depending on preference.
              Based on the image, it looks like a single row. 
            */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-8 transition-all duration-500">
              {partners.map((partner) => (
                <div key={partner._id} className="shrink-0 h-8 md:h-20 w-auto flex items-center justify-between group">
                  <img
                    src={`http://localhost:5000${partner.logo}`}
                    alt={partner.name}
                    className="w-full object-contain transition-all duration-300"
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

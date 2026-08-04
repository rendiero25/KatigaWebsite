import { useCertificationTech } from '../../hooks/useApi';

import api from '../../services/api';

interface TechPoint {
  title: string;
  description: string;
}

interface TechHeader {
  title?: string;
  subtitle?: string;
}

interface TechSection1 {
  title?: string;
  image?: string;
  points?: TechPoint[];
}

interface TechSection2 {
  title?: string;
  subtitle?: string;
  image?: string;
  points?: string[];
}

interface CertificationTechnology {
  header?: TechHeader;
  section1?: TechSection1;
  section2?: TechSection2;
}

export default function AboutTechSection() {
  const { data, loading } = useCertificationTech();
  const certTech = data as CertificationTechnology | null;

  if (loading) {
    return (
      <section className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-16 animate-pulse" />
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-24">
            <div className="aspect-[4/5] bg-gray-200 animate-pulse" />
            <div className="flex flex-col gap-4 pt-4">
              <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!certTech) return null;

  const header = certTech.header;
  const section1 = certTech.section1;
  const section2 = certTech.section2;

  const hasSection1 = Boolean(
    section1 && (section1.title || section1.image || (section1.points && section1.points.length > 0)),
  );
  const hasSection2 = Boolean(
    section2 && (section2.title || section2.image || (section2.points && section2.points.length > 0)),
  );

  if (!header?.title && !header?.subtitle && !hasSection1 && !hasSection2) return null;

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        {(header?.title || header?.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-16">
            {header?.title && (
              <h2 className="text-2xl md:text-3xl text-[#1E1E1E] leading-tight">{header.title}</h2>
            )}
            {header?.subtitle && (
              <p className="text-sm text-[#6F6F71] leading-relaxed mt-4">{header.subtitle}</p>
            )}
          </div>
        )}

        {hasSection1 && (
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start mb-24">
            <div className="aspect-[4/5] bg-[#F9F7F2] overflow-hidden">
              {section1?.image ? (
                <img
                  src={api.getImageUrl(section1.image)}
                  alt={section1.title || ''}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div>
              {section1?.title && (
                <h3 className="text-2xl md:text-3xl text-[#1E1E1E] leading-tight mb-6">{section1.title}</h3>
              )}
              {section1?.points && section1.points.length > 0 && (
                <div className="flex flex-col">
                  {section1.points.map((point, idx) => (
                    <div key={idx} className="py-5 border-b border-[#E9E9EA] first:border-t">
                      <h4 className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E] mb-1">
                        {point.title}
                      </h4>
                      <p className="text-sm text-[#6F6F71] leading-relaxed">{point.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {hasSection2 && (
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="aspect-[4/5] bg-[#F9F7F2] overflow-hidden md:order-2">
              {section2?.image ? (
                <img
                  src={api.getImageUrl(section2.image)}
                  alt={section2.title || ''}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="md:order-1">
              {section2?.subtitle && (
                <p className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-4">
                  {section2.subtitle}
                </p>
              )}
              {section2?.title && (
                <h3 className="text-2xl md:text-3xl text-[#1E1E1E] leading-tight mb-6">{section2.title}</h3>
              )}
              {section2?.points && section2.points.length > 0 && (
                <div className="flex flex-col">
                  {section2.points.map((point, idx) => (
                    <div key={idx} className="py-5 border-b border-[#E9E9EA] first:border-t">
                      <p className="text-sm text-[#6F6F71] leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useAdvantages, useAdvantagesSection } from '../hooks/useApi';

export default function AdvantagesSection() {
  const { data: advantages, loading: loadingList } = useAdvantages();
  const { data: sectionContent, loading: loadingContent } = useAdvantagesSection();

  const loading = loadingList || loadingContent;

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-10 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Intro Text */}
        <div className="w-full">
          <p className="text-lg font-bold text-black mb-4">{sectionContent?.subtitle || 'Tumbuh Bersama 4 Juta Bayi di Indonesia.'}</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-black leading-tight">
            {sectionContent?.content || 'PT Kusuma Kencana Khatulistiwa hadir untuk menjawab kekhawatiran orang tua akan kenyamanan dan keamanan si kecil.'}
          </h2>
        </div>

        <div className="pt-20 flex flex-col lg:flex-row gap-12 items-end">
          {/* Left Side - Vertical Title */}
          <div className="hidden lg:flex w-24 shrink-0 flex-row items-center justify-start">
             <div className="[writing-mode:vertical-rl] text-[80px] xl:text-9xl font-black text-black leading-none h-auto tracking-tighter opacity-90 rotate-180">
                <span className="uppercase">{sectionContent?.title || 'KEUNGGULAN KAMI'}</span>
             </div>
          </div>

          {/* Right Side - Advantages List */}
          <div className="flex-1 space-y-12 lg:pl-45">
            {advantages?.map((advantage: any, index: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <div key={advantage._id} className="group">
                <div className="flex items-baseline gap-6">
                  <span className="text-3xl font-normal text-black/70 group-hover:text-gray-900 transition">
                    {advantage.number || `0${index + 1}`}
                  </span>
                  
                  <div>
                    <h4 className="text-3xl font-bold text-black mb-3">
                      {advantage.title}
                    </h4>
                    <p className="text-black leading-relaxed text-sm md:text-2xl">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

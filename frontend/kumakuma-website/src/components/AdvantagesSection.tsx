import { useAdvantages } from '../hooks/useApi';

export default function AdvantagesSection() {
  const { data: advantages, loading } = useAdvantages();

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
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Intro Text */}
        <div className="max-w-4xl mb-16">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Tumbuh Bersama 4 Juta Bayi di Indonesia.</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900">PT Kusuma Kencana Khatulistiwa hadir untuk menjawab kekhawatiran orang tua akan kenyamanan dan keamanan si kecil.</span> Kami memproduksi perlengkapan bayi dan handuk keluarga yang aman, nyaman, dan berkualitas tinggi untuk mempererat ikatan kasih sayang keluarga.
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Side - Vertical Title */}
          <div className="hidden lg:block w-32 shrink-0 relative">
             <div className="absolute top-0 left-0 origin-top-left -rotate-90 translate-y-[400px]">
                <h3 className="text-[120px] font-black text-gray-900 leading-none whitespace-nowrap tracking-tighter opacity-90">
                  KEUNGGULAN
                </h3>
                <h3 className="text-[120px] font-black text-gray-900 leading-none whitespace-nowrap tracking-tighter ml-20">
                  KAMI
                </h3>
             </div>
          </div>

          {/* Right Side - Advantages List */}
          <div className="flex-1 space-y-12 lg:pl-20">
            {advantages?.map((advantage: any, index: number) => (
              <div key={advantage._id} className="group">
                <div className="flex items-baseline gap-6 border-b border-gray-200 pb-10">
                  <span className="text-lg font-bold text-gray-400 group-hover:text-gray-900 transition">
                    {advantage.number || `0${index + 1}`}
                  </span>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">
                      {advantage.title}
                    </h4>
                    <p className="text-gray-500 leading-relaxed text-sm md:text-base">
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

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
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Title */}
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-medium text-pink-600 mb-3">
              Temukan Keuntungan Beli di KumaKuma
            </p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              PT Kusuma Kencana Khatulistiwa hadir untuk menjawab kekhawatiran orang tua akan kenyamanan dan keamanan si kecil.
            </h2>
            <p className="text-lg text-gray-600">
              Kami memproduksi perlengkapan bayi dan handuk keluarga yang aman, nyaman, dan berkualitas tinggi untuk mempererat ikatan kasih sayang keluarga.
            </p>
          </div>

          {/* Right Side - Advantages List */}
          <div className="space-y-8">
            <div className="text-right">
              <h3 className="text-7xl sm:text-8xl lg:text-9xl font-black text-gray-100 leading-none">
                KEUNGGULAN<br/>KAMI
              </h3>
            </div>

            <div className="space-y-8">
              {advantages?.map((advantage: any, index: number) => (
                <div 
                  key={advantage._id}
                  className="border-l-4 border-pink-500 pl-6 py-2"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl font-bold text-pink-500">
                      {advantage.number || `0${index + 1}`}
                    </span>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {advantage.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {advantage.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

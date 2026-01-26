import { useDistribution } from '../hooks/useApi';
import api from '../services/api';

export default function DistributionSection() {
  const { data, loading } = useDistribution();

  if (loading || !data) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {data.title || 'Jangkauan Distribusi Kami'}
          </h2>
          <p className="text-lg text-gray-600">
            {data.description}
          </p>
        </div>

        <div className="relative bg-white rounded-3xl shadow-sm p-4 sm:p-8 overflow-hidden">
          <div className="aspect-[2/1] relative">
            <img 
              src={api.getImageUrl(data.mapImage)}
              alt="Distribution Map"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Indonesia_location_map.svg';
              }}
            />
            
            {/* Animated Dots (Dummy locations) */}
            <div className="absolute top-[30%] left-[20%] w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-[30%] left-[20%] w-3 h-3 bg-red-500 rounded-full"></div>

            <div className="absolute top-[45%] left-[30%] w-3 h-3 bg-red-500 rounded-full animate-ping delay-100"></div>
            <div className="absolute top-[45%] left-[30%] w-3 h-3 bg-red-500 rounded-full"></div>

            <div className="absolute top-[40%] left-[50%] w-3 h-3 bg-red-500 rounded-full animate-ping delay-300"></div>
            <div className="absolute top-[40%] left-[50%] w-3 h-3 bg-red-500 rounded-full"></div>
            
            <div className="absolute top-[35%] left-[70%] w-3 h-3 bg-red-500 rounded-full animate-ping delay-500"></div>
            <div className="absolute top-[35%] left-[70%] w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          
          <div className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 bg-white/90 backdrop-blur px-6 py-4 rounded-xl shadow-lg border border-gray-100">
            <p className="text-3xl font-bold text-gray-900 mb-1">600+</p>
            <p className="text-sm text-gray-600 font-medium">Outlets across Indonesia</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useCertificationTech } from '../hooks/useApi';
import api from '../services/api';

export default function CertificationTechSection() {
  const { data, loading } = useCertificationTech();

  if (loading || !data) {
    return null;
  }

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden">
              <img 
                src={api.getImageUrl(data.image)}
                alt="Technology from Forest"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800';
                }}
              />
            </div>
            {/* Decorative */}
            <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-green-50 rounded-3xl"></div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold tracking-wide uppercase">
              Technology
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              {data.title || 'DARI HUTAN UNTUK KENYAMANAN ANDA (FROM FOREST TO FASHION)'}
            </h2>
            <p className="text-lg text-gray-600">
              {data.content}
            </p>
            
            <ul className="space-y-4 pt-4">
              {data.points?.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

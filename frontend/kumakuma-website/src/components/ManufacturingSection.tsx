import { useManufacturing } from '../hooks/useApi';

export default function ManufacturingSection() {
  const { data: manufacturing, loading } = useManufacturing();

  if (loading) {
    return (
        <section className="py-20 lg:py-28 relative overflow-hidden bg-[#2C331F]">
             <div className="max-w-7xl mx-auto px-4 text-center">
                 <div className="h-8 w-64 bg-white/10 mx-auto rounded mb-8 animate-pulse"></div>
                 <div className="h-4 w-full bg-white/10 mx-auto rounded animate-pulse"></div>
             </div>
        </section>
    );
  }

  // Backup/Default content if api fails or data empty
  const tagline = manufacturing?.tagline || 'Kualitas yang Kami Jaga dari Hulu ke Hilir';
  const description = manufacturing?.description || 'Sebagai produsen langsung (direct manufacturer), kami mengawasi setiap detik proses pembuatan. Mulai dari pemintalan benang (Spinning), penjahitan (Sewing), hingga inspeksi ketat (Inspection) untuk memastikan hanya kelembutan terbaik yang menyentuh kulit bayi Anda.';
  const features = manufacturing?.features?.length > 0 ? manufacturing.features : [
    { title: 'Benang\nberkualitas tinggi', icon: '' },
    { title: 'Penjahitan presisi\noleh tenaga ahli', icon: '' },
    { title: 'Kontrol kualitas\nberlapis', icon: '' }
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden bg-[#2C331F]"> {/* Dark Olive/Green Background */}
      
      {/* Background Gradient/Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f12] to-[#2C331F] opacity-90"></div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs font-bold text-[#A4B193] uppercase tracking-widest mb-4">
            {tagline}
          </p>
          <h2 className="text-2xl sm:text-3xl font-medium text-white leading-relaxed">
            {description}
          </h2>
        </div>

        {/* Features Icons */}
        <div className="grid sm:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {features.map((feature: any, index: number) => (
                <div key={index} className="text-center group">
                  <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                     {feature.icon ? (
                         <img 
                            src={`http://localhost:5000${feature.icon}`} 
                            alt={feature.title} 
                            className="w-16 h-16 object-contain brightness-0 invert" 
                            onError={(e) => {
                                // Fallback if image fails
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                         />
                     ) : (
                         // Generic fallback icon if no icon uploaded
                         <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                         </svg>
                     )}
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight whitespace-pre-line">
                    {feature.title}
                  </h3>
                </div>
            ))}
        </div>
      </div>
    </section>
  );
}

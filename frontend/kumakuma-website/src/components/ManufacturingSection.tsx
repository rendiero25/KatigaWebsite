export default function ManufacturingSection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden bg-[#2C331F]"> {/* Dark Olive/Green Background */}
      
      {/* Background Gradient/Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f12] to-[#2C331F] opacity-90"></div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-xs font-bold text-[#A4B193] uppercase tracking-widest mb-4">
            Kualitas yang Kami Jaga dari Hulu ke Hilir
          </p>
          <h2 className="text-2xl sm:text-3xl font-medium text-white leading-relaxed">
            Sebagai produsen langsung (direct manufacturer), kami mengawasi setiap detik proses pembuatan. Mulai dari pemintalan benang (Spinning), penjahitan (Sewing), hingga inspeksi ketat (Inspection) untuk memastikan hanya kelembutan terbaik yang menyentuh kulit bayi Anda.
          </h2>
        </div>

        {/* Features Icons */}
        <div className="grid sm:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {/* Icon 1 - Spinning */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                 {/* Replace with actual icon or SVG */}
                 <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" stroke="none"/> 
                   {/* Using a generic icon for now, ideally strictly SVG form the design */}
                 </svg>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">
                Benang<br/>berkualitas tinggi
              </h3>
            </div>

            {/* Icon 2 - Sewing (Needle/Thread) */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                 <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.6 15.6L12 18l6-6-8.4-8.4c-.8-.8-2-.8-2.8 0L4 6.4c-.8.8-.8 2 0 2.8l5.6 6.4zm-1.8-8.2l1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4zM20 18c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-3h16v3z"/>
                 </svg>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">
                Penjahitan presisi<br/>oleh tenaga ahli
              </h3>
            </div>

            {/* Icon 3 - Control/Check */}
            <div className="text-center group">
               <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                 <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                 </svg>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">
                Kontrol kualitas<br/>berlapis
              </h3>
            </div>
        </div>
      </div>
    </section>
  );
}

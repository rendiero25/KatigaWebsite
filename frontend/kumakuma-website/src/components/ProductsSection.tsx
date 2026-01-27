import { useState } from 'react';
import { useProducts } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import 'swiper/css';
import 'swiper/css/navigation';

export default function ProductsSection() {
  const { data: products, loading } = useProducts();
  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null);

  // Get featured products or latest 8
  const featuredProducts = products?.filter((p: any) => p.isFeatured) 
    || products?.slice(0, 8) 
    || [];

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">Loading...</div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
           {/* Section title hidden for cleaner look or could be added back */}
           <div className="hidden"></div> 
        </div>

        {/* Swiper Carousel */}
        <div className="relative group/section">
           <Swiper
             modules={[Navigation]}
             spaceBetween={24}
             slidesPerView={1.2}
             navigation={{
               prevEl,
               nextEl,
             }}
             breakpoints={{
               640: { slidesPerView: 2.2 },
               1024: { slidesPerView: 3.2 },
               1280: { slidesPerView: 4 },
             }}
             className="!pb-12"
           >
             {featuredProducts.map((product: any) => (
               <SwiperSlide key={product._id}>
                 <div className="group h-full flex flex-col">
                   {/* Image Card */}
                   <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 mb-4 relative">
                     <img 
                       src={api.getImageUrl(product.image)}
                       alt={product.name}
                       className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                       onError={(e) => {
                         (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400';
                       }}
                     />
                     {/* Navigation Arrow Overlay */}
                     <Link 
                       to={`/produk/${product._id}`}
                       className="absolute bottom-4 right-4 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition duration-300 hover:bg-white"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                     </Link>
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1 flex flex-col items-start">
                     <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                       {product.name}
                     </h3>
                     <p className="text-sm text-gray-500 line-clamp-3 mb-4 leading-relaxed">
                       {product.description || 'Deskripsi singkat produk akan muncul di sini untuk memberikan informasi awal.'}
                     </p>
                     
                     <div className="mt-auto">
                        <Link 
                          to={`/produk/${product._id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition block mb-1"
                        >
                          Lihat Selengkapnya
                        </Link>
                     </div>
                   </div>
                 </div>
               </SwiperSlide>
             ))}
           </Swiper>
           
           {/* Custom Navigation Arrows (Outside) */}
           <button ref={(node) => setPrevEl(node)} className="absolute top-1/2 -left-4 md:-left-12 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition disabled:opacity-0">
              <FaChevronLeft />
           </button>
           <button ref={(node) => setNextEl(node)} className="absolute top-1/2 -right-4 md:-right-12 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition disabled:opacity-0">
              <FaChevronRight />
           </button>
        </div>
      </div>
    </section>
  );
}

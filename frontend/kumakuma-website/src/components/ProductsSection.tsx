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
    <section className="bg-white">
      <div className="flex flex-col items-center gap-15 w-full overflow-hidden">
        

        {/* Swiper Carousel */}
        <div className="relative group/section w-full">
           <Swiper
             modules={[Navigation]}
             slidesPerView={1.2}
             navigation={{
               prevEl,
               nextEl,
             }}
             spaceBetween={35}
             breakpoints={{
               640: { slidesPerView: 2, spaceBetween: 20 },
               1024: { slidesPerView: 3.2, spaceBetween: 30 },
               1280: { slidesPerView: 4, spaceBetween: 40 },
             }}
           >
             {featuredProducts.map((product: any) => (
               <SwiperSlide key={product._id} className="w-auto!">
                 <div className="group h-full flex flex-col">
                   {/* Image Card */}
                   <div className="w-[600px] h-[550px] rounded-2xl bg-gray-100 mb-8 relative">
                     <img 
                       src={api.getImageUrl(product.image)}
                       alt={product.name}
                       className="w-full h-full object-cover group-hover:scale-105 rounded-3xl transition duration-500"
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
                     <h3 className="text-2xl font-bold text-black mb-2 leading-tight">
                       {product.name}
                     </h3>
                     <p className="text-lg text-black/80 line-clamp-3 mb-4 leading-relaxed">
                       {product.description || 'Deskripsi singkat produk akan muncul di sini untuk memberikan informasi awal.'}
                     </p>
                     
                     <div className="mt-auto">
                        <Link 
                          to={`/produk/${product._id}`}
                          className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition block mb-1"
                        >
                          Lihat Selengkapnya
                        </Link>
                     </div>
                   </div>
                 </div>
               </SwiperSlide>
             ))}
           </Swiper>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-end mb-10 gap-4 px-4 sm:px-0">
           {/* Custom Navigation Arrows (Moved here) */}
           <div className="flex gap-2">
             <button ref={(node) => setPrevEl(node)} className="cursor-pointer w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-primary hover:border-0 hover:text-white transition disabled:opacity-50">
                <FaChevronLeft className="w-4 h-4" />
             </button>
             <button ref={(node) => setNextEl(node)} className="cursor-pointer w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-primary hover:border-0 hover:text-white transition disabled:opacity-50">
                <FaChevronRight className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>
    </section>
  );
}

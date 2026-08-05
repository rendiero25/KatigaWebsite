import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import api from '../services/api';
import { resolveProductPrice } from '../utils/price';

interface RelatedProduct {
  _id: string;
  name: string;
  image: string;
  price?: string;
  priceNumeric: number;
  activePromotion: { discountPercent: number } | null;
}

interface Props {
  categoryIds: string[];
  excludeIds: string[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function RelatedProductsCarousel({ categoryIds, excludeIds }: Props) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const swiperRef = useRef<SwiperType | null>(null);
  const categoryKey = categoryIds.join(',');
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    if (!categoryKey) return;
    api.getProducts({
      categories: categoryKey,
      exclude: excludeKey,
      limit: 12,
    })
      .then((data: RelatedProduct[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, [categoryKey, excludeKey]);

  if (!products.length) return null;

  return (
    <section className="bg-white border-t border-[#E9E9EA] pt-10 pb-16">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl text-[#1E1E1E]">Produk Terkait</h2>
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              aria-label="Sebelumnya"
              className="p-1 text-[#1E1E1E]/60 hover:text-[#1E1E1E] transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-5" strokeWidth={1.25} />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              aria-label="Berikutnya"
              className="p-1 text-[#1E1E1E]/60 hover:text-[#1E1E1E] transition-colors cursor-pointer"
            >
              <ChevronRight className="size-5" strokeWidth={1.25} />
            </button>
          </div>
        </div>
        <Swiper
          modules={[Navigation]}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          spaceBetween={16}
          slidesPerView={1.3}
          breakpoints={{
            480:  { slidesPerView: 2.2 },
            768:  { slidesPerView: 3.2 },
            1024: { slidesPerView: 4 },
            1280: { slidesPerView: 5 },
          }}
        >
          {products.map((p) => {
            const basePrice = resolveProductPrice(p);
            const discount = p.activePromotion?.discountPercent;
            const discountedPrice = discount
              ? Math.round(basePrice * (1 - discount / 100))
              : basePrice;
            return (
              <SwiperSlide key={p._id}>
                <Link to={`/produk/${p._id}`} className="group block">
                  <div className="bg-[#F9F7F2] overflow-hidden aspect-square mb-3">
                    <img
                      src={api.getImageUrl(p.image)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <p className="uppercase text-[13px] text-[#1E1E1E] leading-tight mb-1 line-clamp-2">{p.name}</p>
                  {discount ? (
                    <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
                      <span className="text-[#6F6F71]">{fmt(discountedPrice)}</span>
                      <span className="text-[#6F6F71]/60 line-through">{fmt(basePrice)}</span>
                      <span className="text-[11px] text-[#AE4B4B]">-{discount}%</span>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#6F6F71]">{fmt(basePrice)}</p>
                  )}
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}

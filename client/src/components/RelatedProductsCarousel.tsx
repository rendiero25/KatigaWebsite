import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import api from '../services/api';

interface RelatedProduct {
  _id: string;
  name: string;
  image: string;
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
    <section className="bg-white border-t border-gray-100 pt-10 pb-16">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-2xl font-bold text-black mb-6">Produk Lainnya</h2>
        <Swiper
          modules={[Navigation]}
          navigation
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
            const discount = p.activePromotion?.discountPercent;
            const discountedPrice = discount
              ? Math.round(p.priceNumeric * (1 - discount / 100))
              : p.priceNumeric;
            return (
              <SwiperSlide key={p._id}>
                <Link to={`/produk/${p._id}`} className="group block">
                  <div className="rounded-2xl bg-gray-100 overflow-hidden aspect-square mb-3">
                    <img
                      src={api.getImageUrl(p.image)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <p className="text-sm font-bold text-black leading-tight mb-1 line-clamp-2">{p.name}</p>
                  {discount ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{discount}%</span>
                      <span className="text-xs text-black/40 line-through">{fmt(p.priceNumeric)}</span>
                      <span className="text-sm font-semibold text-primary">{fmt(discountedPrice)}</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-primary">{fmt(p.priceNumeric)}</p>
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

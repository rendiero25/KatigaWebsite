import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import api from '../services/api';
import StarRating from './StarRating';

interface ActivePromotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  discountPercent: number;
  type: 'products' | 'category';
  productIds: string[];
  categoryId: string | null;
}

interface Product {
  _id: string;
  name: string;
  image: string;
  priceNumeric: number;
  description: string;
  ratingAvg: number;
  reviewCount: number;
  category: { _id: string; name: string } | null;
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

interface PromoTabProps {
  promo: ActivePromotion;
  products: Product[];
}

function PromoTab({ promo, products }: PromoTabProps) {
  const promoProducts = products.filter(p => p.activePromotion?._id === promo._id);

  return (
    <div>
      {/* Banner */}
      <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
        {promo.bannerImage ? (
          <img
            src={api.getImageUrl(promo.bannerImage)}
            alt={promo.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-[#2B3A67]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-full mb-2">
            -{promo.discountPercent}%
          </span>
          <h3 className="text-2xl md:text-3xl font-bold text-white">{promo.name}</h3>
          {promo.description && (
            <p className="text-white/80 text-sm mt-1 max-w-md line-clamp-2">{promo.description}</p>
          )}
        </div>
      </div>

      {/* Product Carousel */}
      {promoProducts.length > 0 && (
        <Swiper
          modules={[Navigation]}
          spaceBetween={20}
          navigation
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 },
          }}
        >
          {promoProducts.map(product => {
            const discounted = Math.round(product.priceNumeric * (1 - promo.discountPercent / 100));
            return (
              <SwiperSlide key={product._id}>
                <Link to={`/produk/${product._id}`} className="group block">
                  <div className="rounded-2xl bg-gray-100 overflow-hidden aspect-square mb-4 relative">
                    <img
                      src={api.getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400';
                      }}
                    />
                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      -{promo.discountPercent}%
                    </span>
                  </div>
                  <div className="px-1">
                    <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h4>
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <StarRating value={product.ratingAvg ?? 0} size="sm" />
                        <span className="text-xs text-gray-400">({product.reviewCount})</span>
                      </div>
                    )}
                    {product.priceNumeric > 0 && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 line-through">{formatRp(product.priceNumeric)}</span>
                        <span className="text-sm font-bold text-red-600">{formatRp(discounted)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}
    </div>
  );
}

export default function PromosiSection() {
  const [promos, setPromos] = useState<ActivePromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getActivePromotions(), api.getProducts()])
      .then(([p, prods]) => {
        setPromos(p);
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || promos.length === 0) return null;

  return (
    <section className="pt-10 bg-[#F9F7F2]">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl md:text-3xl font-normal text-black leading-tight">Promosi Spesial</h2>
          {promos.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {promos.map((promo, idx) => (
                <button
                  key={promo._id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    activeTab === idx
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {promo.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <PromoTab promo={promos[activeTab]} products={products} />
      </div>
    </section>
  );
}

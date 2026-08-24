import { Link } from 'react-router-dom';

import { useActivePromotions } from '../hooks/useApi';

import ResponsiveBanner from './ResponsiveBanner';

interface ActivePromotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
}

const BANNER_HEIGHT = 'h-[320px] md:h-[440px]';

export default function PromosiSection() {
  const { data: promosData, loading } = useActivePromotions();

  if (loading) {
    return <section className={`${BANNER_HEIGHT} bg-[#F9F7F2] animate-pulse`} />;
  }

  const promo = (promosData as ActivePromotion[] | null)?.[0];

  if (!promo?.bannerImage) {
    return null;
  }

  return (
    <ResponsiveBanner image={promo.bannerImage} alt={promo.name}>
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 gap-8">
        <h2 className="text-2xl md:text-3xl text-white">{promo.name}</h2>
        {promo.description && promo.description.trim() !== promo.name.trim() && (
          <p className="text-sm md:text-base text-white/85 max-w-2xl leading-relaxed">
            {promo.description}
          </p>
        )}
        <Link
          to="/produk"
          className="border border-white text-white uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-white hover:text-[#1E1E1E] transition"
        >
          Lihat Produk
        </Link>
      </div>
    </ResponsiveBanner>
  );
}

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
      <div className="hidden xl:block absolute inset-0 bg-black/25" />

      <div className="relative xl:absolute xl:inset-0 flex flex-col items-center justify-center text-center gap-4 md:gap-8 px-4 py-10 xl:py-0">
        <h2 className="text-2xl md:text-3xl text-[#1E1E1E] xl:text-white">{promo.name}</h2>
        {promo.description && promo.description.trim() !== promo.name.trim() && (
          <p className="text-sm md:text-base text-[#6F6F71] xl:text-white/85 max-w-2xl leading-relaxed">
            {promo.description}
          </p>
        )}
        <Link
          to="/produk"
          className="border border-[#1E1E1E] text-[#1E1E1E] hover:bg-[#1E1E1E] hover:text-white xl:border-white xl:text-white xl:hover:bg-white xl:hover:text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 transition"
        >
          Lihat Produk
        </Link>
      </div>
    </ResponsiveBanner>
  );
}

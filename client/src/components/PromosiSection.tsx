import { FaInstagram, FaTiktok } from 'react-icons/fa';

import { useActivePromotions, useSiteSettings } from '../hooks/useApi';
import api from '../services/api';

interface ActivePromotion {
  _id: string;
  name: string;
  description: string;
  bannerImage: string;
}

interface SiteSettingsData {
  instagramUrl?: string;
}

export default function PromosiSection() {
  const { data: promosData, loading: promosLoading } = useActivePromotions();
  const { data: siteSettingsData, loading: settingsLoading } = useSiteSettings();

  const loading = promosLoading || settingsLoading;

  if (loading) {
    return <section className="h-[320px] bg-[#F9F7F2] animate-pulse" />;
  }

  const promos = promosData as ActivePromotion[];
  const promo = promos?.[0];
  const siteSettings = siteSettingsData as SiteSettingsData | null;

  // TODO(cms): foto banner + kalimat quote final menyusul
  const hasContent = Boolean(promo?.bannerImage && promo?.description);

  if (!hasContent) {
    return <section className="h-[320px] bg-[#F9F7F2]" />;
  }

  const instagramUrl = siteSettings?.instagramUrl || '#';

  return (
    <section className="h-[320px] relative overflow-hidden">
      <img
        src={api.getImageUrl(promo.bannerImage)}
        alt={promo.name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 gap-6">
        <p className="text-xl md:text-2xl italic text-white max-w-2xl">
          {promo.description}
        </p>
        <div className="flex items-center gap-5">
          <span className="uppercase tracking-[0.12em] text-[13px] text-white/80">Ikuti Kami</span>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition text-sm"
          >
            <FaInstagram className="w-4 h-4" />
            <span>@katiga.id</span>
          </a>
          <a
            href="#"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition text-sm"
          >
            <FaTiktok className="w-4 h-4" />
            <span>@katiga.id</span>
          </a>
        </div>
      </div>
    </section>
  );
}

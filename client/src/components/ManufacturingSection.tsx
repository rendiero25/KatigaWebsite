import { Link } from 'react-router-dom';

import { useManufacturing } from '../hooks/useApi';
import api from '../services/api';

interface ManufacturingData {
  tagline?: string;
  backgroundImage?: string;
}

export default function ManufacturingSection() {
  const { data, loading } = useManufacturing();
  const manufacturing = data as ManufacturingData | null;

  if (loading) {
    return <section className="h-[480px] bg-[#F9F7F2] animate-pulse" />;
  }

  const tagline = manufacturing?.tagline || 'Kualitas yang Kami Jaga dari Hulu ke Hilir';

  return (
    <section className="h-[480px] relative overflow-hidden">
      {manufacturing?.backgroundImage ? (
        <img
          src={api.getImageUrl(manufacturing.backgroundImage)}
          alt="Tentang Kami"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#F9F7F2]" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4 gap-6">
        <span className="uppercase tracking-[0.18em] text-[13px] text-white/70">Tentang Kami</span>
        <h2 className="text-2xl md:text-3xl text-white max-w-3xl">{tagline}</h2>
        <Link
          to="/tentang-kami"
          className="border border-white text-white uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-white hover:text-[#1E1E1E] transition"
        >
          Baca Cerita Kami
        </Link>
      </div>
    </section>
  );
}

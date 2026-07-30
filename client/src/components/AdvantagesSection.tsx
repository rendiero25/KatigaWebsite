import type { IconType } from 'react-icons';
import { FiAward, FiHeart, FiShield, FiTruck } from 'react-icons/fi';

import { useAdvantages } from '../hooks/useApi';
import api from '../services/api';

interface Advantage {
  _id: string;
  title: string;
  icon?: string;
}

const FALLBACK_ICONS: IconType[] = [FiShield, FiTruck, FiAward, FiHeart];

export default function AdvantagesSection() {
  const { data, loading } = useAdvantages();
  const advantages = (data as Advantage[])?.slice(0, 4) ?? [];

  if (loading) {
    return (
      <section className="h-36 bg-white grid grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="grid grid-cols-2 md:grid-cols-4 h-36">
          {advantages.map((advantage, index) => {
            const Icon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
            return (
              <div key={advantage._id} className="flex flex-col items-center justify-center gap-3 text-center px-2">
                {advantage.icon ? (
                  <img
                    src={api.getImageUrl(advantage.icon)}
                    alt={advantage.title}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Icon className="w-8 h-8 text-[#4F68AF]" strokeWidth={1} />
                )}
                <span className="uppercase text-[13px] tracking-[0.12em] text-[#6F6F71]">
                  {advantage.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

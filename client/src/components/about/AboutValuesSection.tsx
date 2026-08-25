import type { IconType } from 'react-icons';
import { FiAward, FiHeart, FiShield, FiStar, FiTarget } from 'react-icons/fi';

import api from '../../services/api';

interface Props {
  title?: string;
  points?: string[];
  backgroundImage?: string;
}

const FALLBACK_ICONS: IconType[] = [FiShield, FiHeart, FiAward, FiTarget, FiStar];

// Renders the panel only. AboutUs pairs it with AboutVisionSection in one grid
// row, so the section wrapper and container live there.
export default function AboutValuesSection({ title, points, backgroundImage }: Props) {
  if (!points || points.length === 0) return null;

  const onPanel = Boolean(backgroundImage);

  return (
    <div className="relative flex h-full items-center overflow-hidden rounded-md md:min-h-[400px]">
      {backgroundImage && (
        <img
          src={api.getImageUrl(backgroundImage)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="relative w-full px-6 py-14 md:px-10">
        <span
          className={`uppercase tracking-[0.18em] text-[13px] mb-8 block text-center ${
            onPanel ? 'text-white/80' : 'text-[#6F6F71]'
          }`}
        >
          {title || 'Nilai Kami'}
        </span>

        <div className="mx-auto flex max-w-xl flex-col gap-6">
          {points.map((point, index) => {
            const Icon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
            return (
              <div key={point} className="flex items-start gap-4">
                <Icon
                  className={`w-6 h-6 shrink-0 ${onPanel ? 'text-white' : 'text-[#4F68AF]'}`}
                  strokeWidth={1}
                />
                <span
                  className={`uppercase text-[13px] tracking-[0.12em] leading-relaxed ${
                    onPanel ? 'text-white' : 'text-[#1E1E1E]'
                  }`}
                >
                  {point}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

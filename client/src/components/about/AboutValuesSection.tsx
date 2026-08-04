import type { IconType } from 'react-icons';
import { FiAward, FiHeart, FiShield, FiStar, FiTarget } from 'react-icons/fi';

interface Props {
  title?: string;
  points?: string[];
}

const FALLBACK_ICONS: IconType[] = [FiShield, FiHeart, FiAward, FiTarget, FiStar];

export default function AboutValuesSection({ title, points }: Props) {
  if (!points || points.length === 0) return null;

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <span className="uppercase tracking-[0.18em] text-[13px] text-[#6F6F71] mb-10 block text-center">
          {title || 'Nilai Kami'}
        </span>

        <div className="flex flex-wrap justify-center">
          {points.map((point, index) => {
            const Icon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
            return (
              <div
                key={point}
                className="w-1/2 md:w-1/5 flex flex-col items-center justify-center gap-3 text-center px-4 py-6"
              >
                <Icon className="w-8 h-8 text-[#4F68AF]" strokeWidth={1} />
                <span className="uppercase text-[13px] tracking-[0.12em] text-center text-[#1E1E1E]">
                  {point}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

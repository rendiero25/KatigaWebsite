import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  value: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' };

export default function StarRating({ value, interactive = false, onChange, size = 'md' }: Props) {
  const cls = sizeMap[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s;
        const half   = !filled && value >= s - 0.5;
        return (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(s)}
            className={cn(
              'p-0 bg-transparent border-0 focus:outline-none',
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            )}
            aria-label={`${s} bintang`}
          >
            <Star
              className={cn(
                cls,
                filled || half
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

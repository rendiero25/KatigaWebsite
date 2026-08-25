import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../services/api';
import { resolveProductPrice } from '../../utils/price';
import WishlistButton from '../WishlistButton';
import StarRating from '../StarRating';

// Exported as a named type (not a component) so ProductGrid and the parent
// page can share the shape of a catalog product via `import type`.
export interface CatalogProduct {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  price?: string;
  priceNumeric: number;
  stock?: number;
  reviewCount?: number;
  ratingAvg?: number;
  category?: { _id: string; name?: string } | string | null;
  variants?: { _id?: string; name?: string; stock?: number }[];
  activePromotion?: { discountPercent: number } | null;
}

interface Props {
  product: CatalogProduct;
  inWishlist: boolean;
  onToggleWishlist: (productId: string) => void;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const coverOf = (product: CatalogProduct) => product.image || product.images?.[0] || '';

// Matches gap-1.5 on the variant row.
const VARIANT_GAP = 6;

export default function ProductCard({ product, inWishlist, onToggleWishlist }: Props) {
  const basePrice = resolveProductPrice(product);
  const discount = product.activePromotion?.discountPercent ?? 0;
  const finalPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
  const cover = coverOf(product);
  const variants = product.variants ?? [];

  // Variant chips stay on one line: however many fit are shown, the rest
  // collapse into a +N counter. Chip widths depend on the variant names and on
  // the card width, so they have to be measured rather than assumed.
  const rowRef = useRef<HTMLDivElement>(null);
  const chipWidths = useRef<number[]>([]);
  const moreWidth = useRef(34);
  const [visibleCount, setVisibleCount] = useState(variants.length);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || variants.length === 0) return;

    let alive = true;

    const measure = () => {
      if (!alive || !rowRef.current) return;
      const current = rowRef.current;

      current.querySelectorAll<HTMLElement>('[data-chip]').forEach((chip) => {
        chipWidths.current[Number(chip.dataset.chip)] = chip.offsetWidth;
      });
      const more = current.querySelector<HTMLElement>('[data-more]');
      if (more) moreWidth.current = more.offsetWidth;

      const widths = chipWidths.current;
      if (widths.length < variants.length) return;

      const available = current.clientWidth;
      let used = 0;
      let fit = 0;
      for (let i = 0; i < variants.length; i += 1) {
        const next = used + (i > 0 ? VARIANT_GAP : 0) + widths[i];
        if (next > available) break;
        used = next;
        fit += 1;
      }

      // Showing a counter costs a slot of its own; give it room.
      while (fit > 0 && fit < variants.length && used + VARIANT_GAP + moreWidth.current > available) {
        fit -= 1;
        used -= widths[fit] + (fit > 0 ? VARIANT_GAP : 0);
      }

      setVisibleCount((prev) => (prev === fit ? prev : fit));
    };

    measure();
    // Web-font swap changes chip widths after first paint.
    void document.fonts?.ready.then(measure);

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [variants.length]);

  const visibleVariants = variants.slice(0, visibleCount);
  const extraVariantCount = variants.length - visibleCount;

  return (
    <Link to={`/produk/${product._id}`} className="group block">
      <div className="relative w-full aspect-square bg-[#F9F7F2] overflow-hidden mb-4">
        {cover ? (
          <img
            src={api.getImageUrl(cover)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : null}
        <WishlistButton
          variant="bare"
          productId={product._id}
          inWishlist={inWishlist}
          onToggle={() => onToggleWishlist(product._id)}
          redirectTo={`/produk/${product._id}`}
        />
      </div>

      <h3 className="uppercase text-[13px] text-[#1E1E1E] mb-1">{product.name}</h3>

      {basePrice > 0 && (
        <p className="text-[13px] mb-2 flex flex-wrap items-baseline gap-2">
          <span className="text-[#6F6F71] text-base">{formatRp(finalPrice)}</span>
          {discount > 0 && (
            <>
              <span className="text-[#6F6F71]/60 line-through">{formatRp(basePrice)}</span>
              <span className="text-[11px] text-[#AE4B4B]">-{discount}%</span>
            </>
          )}
        </p>
      )}

      {variants.length > 0 && (
        <div ref={rowRef} className="flex flex-nowrap items-start gap-1.5 mb-2 overflow-hidden">
          {visibleVariants.map((variant, i) => (
            <span
              key={variant._id ?? `${variant.name}-${i}`}
              data-chip={i}
              className="shrink-0 border border-[#E9E9EA] text-[11px] px-2 py-1 text-[#6F6F71] whitespace-nowrap"
            >
              {variant.name}
            </span>
          ))}
          {extraVariantCount > 0 && (
            <span
              data-more
              className="shrink-0 border border-[#E9E9EA] text-[11px] px-2 py-1 text-[#6F6F71] whitespace-nowrap"
            >
              +{extraVariantCount}
            </span>
          )}
        </div>
      )}

      {(product.reviewCount ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <StarRating value={product.ratingAvg ?? 0} size="sm" />
          <span className="text-[11px] text-[#6F6F71]">({product.reviewCount})</span>
        </div>
      )}
    </Link>
  );
}

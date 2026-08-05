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

export default function ProductCard({ product, inWishlist, onToggleWishlist }: Props) {
  const basePrice = resolveProductPrice(product);
  const discount = product.activePromotion?.discountPercent ?? 0;
  const finalPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
  const cover = coverOf(product);
  const variants = product.variants ?? [];
  const visibleVariants = variants.slice(0, 4);
  const extraVariantCount = variants.length - visibleVariants.length;

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
          <span className="text-[#6F6F71]">{formatRp(finalPrice)}</span>
          {discount > 0 && (
            <>
              <span className="text-[#6F6F71]/60 line-through">{formatRp(basePrice)}</span>
              <span className="text-[11px] text-[#AE4B4B]">-{discount}%</span>
            </>
          )}
        </p>
      )}

      {visibleVariants.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {visibleVariants.map((variant, i) => (
            <span
              key={variant._id ?? `${variant.name}-${i}`}
              className="border border-[#E9E9EA] text-[11px] px-2 py-1 text-[#6F6F71]"
            >
              {variant.name}
            </span>
          ))}
          {extraVariantCount > 0 && (
            <span className="border border-[#E9E9EA] text-[11px] px-2 py-1 text-[#6F6F71]">
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

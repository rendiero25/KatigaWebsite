import type { CatalogProduct } from './ProductCard';

import ProductCard from './ProductCard';

interface Props {
  products: CatalogProduct[];
  loading: boolean;
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onClearFilters: () => void;
}

// Multiple of the widest column count so the skeleton never renders a ragged row.
const SKELETON_COUNT = 8;

export default function ProductGrid({ products, loading, wishlistIds, onToggleWishlist, onClearFilters }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-square bg-gray-200 mb-4" />
            <div className="h-3 bg-gray-200 w-2/3 mb-2" />
            <div className="h-3 bg-gray-200 w-1/3 mb-2" />
            <div className="flex gap-1.5">
              <div className="h-5 bg-gray-200 w-10" />
              <div className="h-5 bg-gray-200 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24">
        <p className="text-[13px] text-[#6F6F71] mb-6">
          Tidak ada produk yang cocok dengan filter yang dipilih.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
        >
          Hapus Semua Filter
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          inWishlist={wishlistIds.has(product._id)}
          onToggleWishlist={onToggleWishlist}
        />
      ))}
    </div>
  );
}

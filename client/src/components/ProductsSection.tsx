import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useProducts } from '../hooks/useApi';
import api from '../services/api';
import { resolveProductPrice } from '../utils/price';

interface ProductVariant {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  image: string;
  price: string;
  priceNumeric: number;
  isFeatured: boolean;
  variants?: ProductVariant[];
  activePromotion?: { discountPercent: number } | null;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function ProductsSection() {
  const { data, loading } = useProducts();
  const [brokenImages, setBrokenImages] = useState<string[]>([]);
  const products = data as Product[];

  const filtered = products?.filter((p) => p.isFeatured) ?? [];
  const featuredProducts = (filtered.length > 0 ? filtered : (products ?? [])).slice(0, 6);

  if (loading) {
    return (
      <section className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-12 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-square bg-gray-200 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-center text-2xl md:text-3xl mb-12">Produk Terbaru</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
          {featuredProducts.map((product) => {
            const basePrice = resolveProductPrice(product);
            const discount = product.activePromotion?.discountPercent ?? 0;
            const finalPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
            return (
              <Link key={product._id} to={`/produk/${product._id}`} className="group block">
                <div className="w-full aspect-square bg-[#F9F7F2] overflow-hidden mb-4">
                  {product.image && !brokenImages.includes(product._id) && (
                    <img
                      src={api.getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                      onError={() =>
                        setBrokenImages((prev) =>
                          prev.includes(product._id) ? prev : [...prev, product._id]
                        )
                      }
                    />
                  )}
                </div>
                <h3 className="uppercase text-[13px] text-[#1E1E1E] mb-1">{product.name}</h3>
                {basePrice > 0 && (
                  <p className="text-[13px] mb-2 flex flex-wrap items-baseline gap-2">
                    <span className="text-[#6F6F71] text-base">{formatRp(finalPrice)}</span>
                    {discount > 0 && (
                      <>
                        <span className="text-[#6F6F71]/50 line-through">{formatRp(basePrice)}</span>
                        <span className="text-[#AE4B4B]">-{discount}%</span>
                      </>
                    )}
                  </p>
                )}
                {product.variants && product.variants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.variants.slice(0, 4).map((variant) => (
                      <span
                        key={variant._id}
                        className="border border-[#E9E9EA] text-[11px] px-2 py-1 text-[#6F6F71]"
                      >
                        {variant.name}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex justify-center mt-16">
          <Link
            to="/produk"
            className="border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
          >
            Lihat Semua
          </Link>
        </div>
      </div>
    </section>
  );
}

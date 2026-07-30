import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useShopTheLook } from '../hooks/useApi';

import api from '../services/api';

interface HotspotProduct {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  priceNumeric?: number;
  price?: string;
}

interface Hotspot {
  x: number;
  y: number;
  product: HotspotProduct | null;
}

interface ShopTheLookData {
  _id: string;
  title?: string;
  image?: string;
  active?: boolean;
  hotspots?: Hotspot[];
}

const formatPrice = (product: HotspotProduct): string => {
  if (typeof product.priceNumeric === 'number' && product.priceNumeric > 0) {
    return `Rp ${product.priceNumeric.toLocaleString('id-ID')}`;
  }
  return product.price || '';
};

const productImage = (product: HotspotProduct): string =>
  product.image || product.images?.[0] || '';

function ProductCard({ product }: { product: HotspotProduct }) {
  return (
    <div className="flex gap-4">
      <div className="w-24 aspect-square bg-[#F9F7F2] overflow-hidden shrink-0">
        {productImage(product) && (
          <img
            src={api.getImageUrl(productImage(product))}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-2">
        <h3 className="uppercase text-[13px] text-[#1E1E1E]">{product.name}</h3>
        <p className="text-[#6F6F71]">{formatPrice(product)}</p>
        <Link
          to={`/produk/${product._id}`}
          className="inline-block w-fit bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] transition"
        >
          View Product
        </Link>
      </div>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-10 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/5] bg-[#F9F7F2] animate-pulse"></div>
          <div className="flex items-center">
            <div className="flex gap-4 w-full">
              <div className="w-24 aspect-square bg-gray-200 animate-pulse shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ShopTheLookSection() {
  const { data, loading } = useShopTheLook();
  const look: ShopTheLookData | null = data ?? null;
  const hotspots: Hotspot[] = look?.hotspots?.filter((h) => h.product) ?? [];
  const [activeIndex, setActiveIndex] = useState(0);

  if (loading) {
    return <LoadingPlaceholder />;
  }

  if (!look || !look.image || hotspots.length === 0) {
    return null;
  }

  const activeHotspot = hotspots[Math.min(activeIndex, hotspots.length - 1)];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-h2 uppercase tracking-[0.05em] text-[#1E1E1E] text-center mb-10">
          Shop the Look
        </h2>

        <div className="hidden lg:grid lg:grid-cols-2 gap-8">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#F9F7F2]">
            <img
              src={api.getImageUrl(look.image)}
              alt={look.title || 'Shop the Look'}
              className="w-full h-full object-cover"
            />
            {hotspots.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Lihat produk ${h.product?.name ?? ''}`}
                className={`absolute w-3 h-3 rounded-full bg-white shadow ring-1 ring-black/10 -translate-x-1/2 -translate-y-1/2 transition ${
                  i === activeIndex ? 'ring-2 ring-white scale-125' : ''
                }`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
              />
            ))}
          </div>

          <div className="flex items-center">
            {activeHotspot?.product && <ProductCard product={activeHotspot.product} />}
          </div>
        </div>

        <div className="lg:hidden">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#F9F7F2] mb-6">
            <img
              src={api.getImageUrl(look.image)}
              alt={look.title || 'Shop the Look'}
              className="w-full h-full object-cover"
            />
            {hotspots.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Lihat produk ${h.product?.name ?? ''}`}
                className={`absolute w-3 h-3 rounded-full bg-white shadow ring-1 ring-black/10 -translate-x-1/2 -translate-y-1/2 transition ${
                  i === activeIndex ? 'ring-2 ring-white scale-125' : ''
                }`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
              />
            ))}
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar -mx-4 px-4">
            {hotspots.map((h, i) => (
              h.product && (
                <div key={i} className="min-w-[85%] snap-start bg-white">
                  <ProductCard product={h.product} />
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

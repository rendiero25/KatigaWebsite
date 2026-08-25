import { Link } from 'react-router-dom';

import { useBestSellers } from '../hooks/useApi';

import api from '../services/api';
import { resolveProductPrice } from '../utils/price';

interface SpotlightProduct {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  price?: string;
  priceNumeric: number;
  soldQuantity?: number;
  activePromotion?: { discountPercent: number } | null;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const priceLabel = (product: SpotlightProduct) => {
  const base = resolveProductPrice(product);
  if (base <= 0) return null;
  const discount = product.activePromotion?.discountPercent ?? 0;
  return discount > 0 ? formatRp(Math.round(base * (1 - discount / 100))) : formatRp(base);
};

const coverOf = (product: SpotlightProduct) => product.image || product.images?.[0] || '';

export default function ProductSpotlightSection() {
  const { data, loading } = useBestSellers(4);
  const products = (data as SpotlightProduct[]) ?? [];

  if (loading) {
    return (
      <section className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-8 bg-gray-200 w-1/3 mx-auto mb-12 animate-pulse" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-[4/5] bg-gray-200 animate-pulse" />
            <div className="flex flex-col gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 shrink-0" />
                  <div className="flex-1 pt-2">
                    <div className="h-3 bg-gray-200 w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  const [lead, ...rest] = products;
  const leadCover = coverOf(lead);

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-center text-2xl md:text-3xl mb-12">Paling Banyak Dibeli</h2>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
          <Link to={`/produk/${lead._id}`} className="group block">
            <div className="aspect-[4/5] bg-[#F9F7F2] overflow-hidden">
              {leadCover ? (
                <img
                  src={api.getImageUrl(leadCover)}
                  alt={lead.name}
                  className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : null}
            </div>
            <h3 className="uppercase text-[13px] text-[#1E1E1E] mt-4">{lead.name}</h3>
            {priceLabel(lead) && (
              <p className="text-[#6F6F71] text-base mt-1">{priceLabel(lead)}</p>
            )}
          </Link>

          <div className="flex flex-col">
            {rest.map((product) => {
              const cover = coverOf(product);
              return (
                <Link
                  key={product._id}
                  to={`/produk/${product._id}`}
                  className="group flex gap-5 py-5 border-b border-[#E9E9EA] first:border-t"
                >
                  <div className="w-24 h-24 shrink-0 bg-[#F9F7F2] overflow-hidden">
                    {cover ? (
                      <img
                        src={api.getImageUrl(cover)}
                        alt={product.name}
                        className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 pt-1">
                    <h3 className="uppercase text-[13px] text-[#1E1E1E] mb-1">{product.name}</h3>
                    {priceLabel(product) && (
                      <p className="text-[#6F6F71] text-base">{priceLabel(product)}</p>
                    )}
                  </div>
                </Link>
              );
            })}

            <Link
              to="/produk"
              className="self-start mt-8 border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
            >
              Lihat Semua
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

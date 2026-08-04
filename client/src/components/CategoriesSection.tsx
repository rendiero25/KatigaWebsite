import { Link } from 'react-router-dom';

import { useCategories, useProducts } from '../hooks/useApi';

import api from '../services/api';

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  displayOrder?: number;
  featured?: boolean;
}

interface CategoryProduct {
  _id: string;
  image?: string;
  images?: string[];
  category?: { _id: string; name?: string } | string | null;
}

const MAX_CATEGORIES = 3;

// Kalau admin belum mengunggah foto kategori, pinjam foto produk pertama
// dari kategori tersebut supaya kartunya tidak kosong.
function buildFallbackImages(products: CategoryProduct[]): Record<string, string> {
  const byCategory: Record<string, string> = {};
  for (const product of products) {
    const categoryId =
      typeof product.category === 'string' ? product.category : product.category?._id;
    if (!categoryId || byCategory[categoryId]) continue;
    const image = product.image || product.images?.[0];
    if (image) byCategory[categoryId] = image;
  }
  return byCategory;
}

function pickCategories(categories: Category[]): Category[] {
  const sorted = [...categories].sort((a, b) => {
    const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  const featured = sorted.filter((c) => c.featured);
  if (featured.length > 0) {
    return featured.slice(0, MAX_CATEGORIES);
  }

  return sorted.slice(0, MAX_CATEGORIES);
}

export default function CategoriesSection() {
  const { data, loading } = useCategories();
  const { data: productData } = useProducts();
  const categories: Category[] = Array.isArray(data) ? data : [];
  const displayedCategories = pickCategories(categories);
  const fallbackImages = buildFallbackImages(
    Array.isArray(productData) ? (productData as CategoryProduct[]) : []
  );

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (displayedCategories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="hidden md:grid md:grid-cols-3 gap-1 lg:gap-2">
          {displayedCategories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              fallbackImage={fallbackImages[category._id]}
            />
          ))}
        </div>

        <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-2 no-scrollbar -mx-4 px-4">
          {displayedCategories.map((category) => (
            <div key={category._id} className="min-w-[80%] snap-start">
              <CategoryCard category={category} fallbackImage={fallbackImages[category._id]} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface CategoryCardProps {
  category: Category;
  fallbackImage?: string;
}

function CategoryCard({ category, fallbackImage }: CategoryCardProps) {
  const imagePath = category.image || fallbackImage;
  const hasImage = Boolean(imagePath);

  return (
    <Link
      to={`/produk?category=${category.slug}`}
      className="group relative aspect-[3/4] overflow-hidden block"
    >
      {hasImage ? (
        <img
          src={api.getImageUrl(imagePath ?? '')}
          alt={category.name}
          className="object-cover w-full h-full transition duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-[#F9F7F2]"></div>
      )}

      {hasImage && (
        <div className="absolute inset-0 bg-black/50"></div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex min-h-[3.75rem] md:min-h-[4.5rem] items-center">
          <h3
            className={`text-2xl md:text-3xl uppercase tracking-wide text-center ${
              hasImage ? 'text-white' : 'text-[#1E1E1E]'
            }`}
          >
            {category.name}
          </h3>
        </div>
        <span className="bg-white text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3">
          View Products
        </span>
      </div>
    </Link>
  );
}

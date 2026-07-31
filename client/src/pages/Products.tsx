import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useProducts, useCategories, useWishlist, useProductPageSettings } from '../hooks/useApi';

import api from '../services/api';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductFilterBar from '../components/products/ProductFilterBar';
import ProductGrid from '../components/products/ProductGrid';
import ProductPagination from '../components/products/ProductPagination';
import type { SortKey, FilterOption } from '../components/products/ProductFilterBar';
import type { CatalogProduct } from '../components/products/ProductCard';

const PRODUCTS_PER_PAGE = 12;

type Availability = 'all' | 'in-stock' | 'out-of-stock';

const resolvePrice = (product: CatalogProduct): number => {
  if (product.priceNumeric > 0) return product.priceNumeric;
  const parsed = Number(String(product.price ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isInStock = (product: CatalogProduct): boolean => {
  if ((product.stock ?? 0) > 0) return true;
  return (product.variants ?? []).some((variant) => (variant.stock ?? 0) > 0);
};

export default function Products() {
  const { data: settings } = useProductPageSettings();
  const { data: categories } = useCategories();
  const { wishlistIds, add, remove } = useWishlist();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [activeCategory, setActiveCategory] = useState('');
  const [activeVariants, setActiveVariants] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const gridRef = useRef<HTMLDivElement>(null);

  // Kartu kategori di homepage menautkan ?category=<slug>; backend memfilter by nama,
  // jadi slug diterjemahkan ke nama begitu daftar kategori tersedia.
  useEffect(() => {
    if (!categoryParam || !Array.isArray(categories) || categories.length === 0) return;
    const match = categories.find(
      (cat: { slug?: string; name?: string }) =>
        cat.slug === categoryParam || cat.name === categoryParam
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match?.name) setActiveCategory(match.name);
  }, [categoryParam, categories]);

  const { data: productData, loading } = useProducts({
    category: activeCategory || undefined,
  });

  const products = useMemo(
    () => (Array.isArray(productData) ? (productData as CatalogProduct[]) : []),
    [productData]
  );

  const categoryOptions: FilterOption[] = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).map((cat: { _id: string; name?: string }) => ({
        value: cat.name ?? '',
        label: cat.name ?? '',
      })),
    [categories]
  );

  const variantOptions: FilterOption[] = useMemo(() => {
    const names = new Set<string>();
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        if (variant.name) names.add(variant.name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (activeVariants.length > 0) {
        const names = (product.variants ?? []).map((v) => v.name).filter(Boolean) as string[];
        if (!activeVariants.some((name) => names.includes(name))) return false;
      }
      if (availability === 'in-stock' && !isInStock(product)) return false;
      if (availability === 'out-of-stock' && isInStock(product)) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sort === 'az') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'za') sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'price-asc') sorted.sort((a, b) => resolvePrice(a) - resolvePrice(b));
    else if (sort === 'price-desc') sorted.sort((a, b) => resolvePrice(b) - resolvePrice(a));
    return sorted;
  }, [products, activeVariants, availability, sort]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeCategory, activeVariants, availability, sort]);

  const totalPages = Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE);
  const pagedProducts = visibleProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handleToggleWishlist = (productId: string) => {
    if (wishlistIds.has(productId)) remove(productId);
    else add(productId);
  };

  const handleClearAll = () => {
    setActiveCategory('');
    setActiveVariants([]);
    setAvailability('all');
    setSort('newest');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Produk</h1>
        </div>

        <div className="w-full h-[320px] md:h-[440px] bg-[#F9F7F2] overflow-hidden">
          {settings?.bannerImage && (
            <img
              src={api.getImageUrl(settings.bannerImage)}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <ProductFilterBar
          sort={sort}
          onSortChange={setSort}
          categories={categoryOptions}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          variants={variantOptions}
          activeVariants={activeVariants}
          onVariantsChange={setActiveVariants}
          availability={availability}
          onAvailabilityChange={setAvailability}
          resultCount={visibleProducts.length}
          onClearAll={handleClearAll}
        />

        <div ref={gridRef} className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 pt-12 pb-20">
          <ProductGrid
            products={pagedProducts}
            loading={loading}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onClearFilters={handleClearAll}
          />

          <ProductPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

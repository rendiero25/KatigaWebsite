import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Share2, Heart } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import type { ItemDimensions } from '../types/ecommerce';
import api from '../services/api';
import { addToCart, buildCartItemId, normalizeDimensions } from '../utils/cart';
import { cn } from '../lib/utils';
import { useWishlist, useProductReviews } from '../hooks/useApi';

import Header from '../components/Header';
import WishlistButton from '../components/WishlistButton';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import StarRating from '../components/StarRating';
import ReviewCard from '../components/ReviewCard';
import { Spinner } from '../components/ui/spinner';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

interface Variant {
  _id: string;
  name: string;
  price: number;
  weightGrams: number;
  dimensions: ItemDimensions;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  category: { _id: string; name: string } | null;
  price: string;
  isFeatured: boolean;
  priceNumeric: number;
  weightGrams: number;
  dimensions: ItemDimensions;
  variants: Variant[];
  ratingAvg: number;
  reviewCount: number;
  activePromotion: { _id: string; name: string; discountPercent: number } | null;
}

interface FeaturedProduct {
  _id: string;
  name: string;
  image: string;
  category: { name: string } | null;
  priceNumeric: number;
}

const formatRp = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const { wishlistIds, add, remove } = useWishlist();
  const { reviews, meta, loading: reviewsLoading, loadingMore, loadMore } = useProductReviews(id ?? '');

  const handleToggleWishlist = (productId: string, currentlyInWishlist: boolean) => {
    if (currentlyInWishlist) {
      remove(productId);
    } else {
      add(productId);
    }
  };

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((data: Product) => {
        setProduct(data);
        if (data.images.length > 0) setActiveImage(data.images[0]);
        else if (data.image) setActiveImage(data.image);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex items-center justify-center">
          <Spinner className="size-10 text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Produk tidak ditemukan</h2>
          <Link to="/produk" className="text-primary hover:underline">
            &larr; Kembali ke daftar produk
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const variants: Variant[] = product.variants ?? [];
  const effectivePrice =
    selectedVariant !== null && selectedVariant.price > 0
      ? selectedVariant.price
      : (product.priceNumeric ?? 0);
  const hasPrice = effectivePrice > 0;

  const handleAddToCart = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }
    setAdding(true);

    const promo = product.activePromotion;
    const basePrice = selectedVariant !== null && selectedVariant.price > 0
      ? selectedVariant.price
      : (product.priceNumeric ?? 0);
    const discountedPrice = promo
      ? Math.round(basePrice * (1 - promo.discountPercent / 100))
      : basePrice;
    const weightGrams =
      selectedVariant !== null && selectedVariant.weightGrams > 0
        ? selectedVariant.weightGrams
        : (product.weightGrams ?? 0);

    addToCart({
      cartItemId: buildCartItemId(product._id, selectedVariant?._id),
      productId: product._id,
      variantId: selectedVariant?._id,
      variantName: selectedVariant?.name,
      name: selectedVariant
        ? `${product.name} - ${selectedVariant.name}`
        : product.name,
      image: activeImage || product.image || '',
      priceNumeric: discountedPrice,
      weightGrams,
      dimensions: normalizeDimensions(selectedVariant?.dimensions, product.dimensions),
      quantity: qty,
      originalPrice: promo ? basePrice : undefined,
      discountPercent: promo ? promo.discountPercent : undefined,
      categoryId: product.category?._id ?? undefined,
    });
    setTimeout(() => setAdding(false), 600);
  };

  const inWishlist = wishlistIds.has(product._id);

  const handleShare = async () => {
    const url = window.location.href;
    const sharePayload = {
      title: product.name,
      text: `Lihat ${product.name} di Katiga`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Salin tautan produk:', url);
    }
  };

  const handleLoveClick = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }
    handleToggleWishlist(product._id, inWishlist);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow pt-20 pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/" />}>Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/produk" />}>Produk</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row gap-12">
            {/* Image Gallery */}
            <div className="flex flex-col gap-4 md:w-1/2 md:shrink-0 md:sticky md:top-24 md:self-start">
              <div className="bg-gray-50 rounded-2xl overflow-hidden relative aspect-square">
                <img
                  src={
                    activeImage
                      ? api.getImageUrl(activeImage)
                      : api.getImageUrl(product.image)
                  }
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800';
                  }}
                />
                {product && (
                  <WishlistButton
                    productId={product._id}
                    inWishlist={wishlistIds.has(product._id)}
                    onToggle={handleToggleWishlist}
                    size="md"
                    redirectTo={`/produk/${product._id}`}
                  />
                )}
                {product.isFeatured && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-pink-500 text-white font-medium rounded-full text-sm">
                    Featured
                  </span>
                )}
              </div>

              {product.images.length > 1 && (
                <Swiper
                  modules={[Navigation]}
                  spaceBetween={10}
                  slidesPerView={4}
                  navigation
                  className="w-full"
                >
                  {product.images.map((img, idx) => (
                    <SwiperSlide key={idx}>
                      <button
                        onClick={() => setActiveImage(img)}
                        className={cn(
                          'cursor-pointer w-full aspect-square rounded-lg overflow-hidden border-2 transition',
                          activeImage === img
                            ? 'border-primary ring-2 ring-primary ring-offset-2'
                            : 'border-transparent hover:border-gray-300'
                        )}
                      >
                        <img
                          src={api.getImageUrl(img)}
                          alt={`${product.name} ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-5 md:flex-1">
              <span className="text-primary font-medium bg-primary/10 px-3 py-1 rounded-full text-sm w-fit">
                {product.category?.name || 'Kategori Umum'}
              </span>

              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-2">
                <StarRating value={product.ratingAvg} size="sm" />
                <span className="text-sm text-gray-400">
                  {product.reviewCount > 0 ? `${product.reviewCount} ulasan` : 'Belum ada ulasan'}
                </span>
              </div>

              {variants.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Varian</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v._id}
                        onClick={() =>
                          setSelectedVariant(selectedVariant?._id === v._id ? null : v)
                        }
                        className={cn(
                          'px-4 py-2 rounded-lg border text-sm font-medium transition',
                          selectedVariant?._id === v._id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        )}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasPrice ? (
                product.activePromotion ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        {formatRp(Math.round(effectivePrice * (1 - product.activePromotion.discountPercent / 100)))}
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        -{product.activePromotion.discountPercent}%
                      </span>
                    </div>
                    <span className="text-sm text-gray-400 line-through">{formatRp(effectivePrice)}</span>
                    <span className="text-xs text-primary mt-0.5">{product.activePromotion.name}</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{formatRp(effectivePrice)}</p>
                )
              ) : (
                <p className="text-2xl font-bold text-gray-900">Hubungi untuk harga</p>
              )}

              <div>
                <p
                  className={cn(
                    'text-sm text-gray-600 leading-relaxed whitespace-pre-line',
                    !descExpanded && 'line-clamp-[10]'
                  )}
                >
                  {product.description || 'Tidak ada deskripsi.'}
                </p>
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  {descExpanded ? 'Lihat lebih sedikit' : 'Lihat lebih lanjut'}
                </button>
              </div>

              {hasPrice && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="rounded-none border-r border-gray-200"
                      >
                        <Minus />
                      </Button>
                      <span className="px-4 text-sm font-semibold text-gray-900 select-none min-w-[2.5rem] text-center">
                        {qty}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setQty((q) => q + 1)}
                        className="rounded-none border-l border-gray-200"
                      >
                        <Plus />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Subtotal:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatRp(effectivePrice * qty)}
                      </span>
                    </p>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="w-full h-12 rounded-xl bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-semibold shadow-[0_10px_20px_rgba(79,104,175,0.3)] hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {adding ? (
                      <>
                        <Spinner className="text-white mr-2" />
                        Menambahkan...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2" />
                        Tambah ke Keranjang
                      </>
                    )}
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleShare}
                      className="flex-1 h-11 rounded-xl border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                    >
                      <Share2 className="mr-2 size-4" />
                      {shareCopied ? 'Tersalin!' : 'Bagikan'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleLoveClick}
                      className={cn(
                        'flex-1 h-11 rounded-xl font-medium hover:bg-gray-50',
                        inWishlist
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-gray-200 text-gray-700'
                      )}
                    >
                      <Heart className={cn('mr-2 size-4', inWishlist && 'fill-red-500')} />
                      {inWishlist ? 'Disukai' : 'Suka'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rating & Reviews */}
        <section className="py-16 mt-12 bg-[#F9F7F2]">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
              Ulasan Pembeli
            </h2>
            <p className="text-sm text-gray-400 mb-8">{product.reviewCount} ulasan</p>

            {reviewsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
              </div>
            ) : meta && meta.total > 0 ? (
              <>
                {/* Summary */}
                <div className="flex flex-col sm:flex-row gap-8 mb-10 p-6 bg-white rounded-2xl">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <p className="text-5xl font-bold text-gray-900">{meta.ratingAvg.toFixed(1)}</p>
                    <StarRating value={meta.ratingAvg} size="md" />
                    <p className="text-sm text-gray-400 mt-1">{meta.total} ulasan</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = meta.ratingDistribution[star] ?? 0;
                      const pct   = meta.total > 0 ? Math.round((count / meta.total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-6 text-right">{star}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-amber-400 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review list */}
                <div className="bg-white rounded-2xl px-6">
                  {reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>

                {/* Load more */}
                {meta.page < meta.pages && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <StarRating value={0} size="lg" />
                <p className="text-gray-400 text-sm">Belum ada ulasan untuk produk ini.</p>
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Produk Unggulan</h2>
            <FeaturedProducts />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FeaturedProducts() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    api.getProducts({ featured: true }).then((data: FeaturedProduct[]) => {
      if (Array.isArray(data)) setProducts(data);
    });
  }, []);

  if (products.length === 0) return null;

  return (
    <Swiper
      modules={[Navigation]}
      spaceBetween={24}
      slidesPerView={1}
      navigation
      breakpoints={{
        640: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1024: { slidesPerView: 4 },
      }}
      className="pb-12"
    >
      {products.map((p) => (
        <SwiperSlide key={p._id} className="h-auto">
          <Link
            to={`/produk/${p._id}`}
            className="block h-full bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group"
          >
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
              <img
                src={api.getImageUrl(p.image)}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition">
                {p.name}
              </h3>
              <p className="text-gray-500 text-sm mb-3">{p.category?.name}</p>
              <p className="font-bold text-primary">
                {p.priceNumeric > 0 ? formatRp(p.priceNumeric) : 'Hubungi Kami'}
              </p>
            </div>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

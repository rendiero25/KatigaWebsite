import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Share2, Zap, ChevronDown } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { toast } from 'sonner';
import 'swiper/css';
import 'swiper/css/navigation';

import type { ItemDimensions, CartItem } from '../types/ecommerce';
import api, { UnauthorizedError } from '../services/api';
import { addToCart, buildCartItemId, normalizeDimensions } from '../utils/cart';
import { cn } from '../lib/utils';
import { useWishlist, useProductReviews } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';
import WishlistButton from '../components/WishlistButton';
import StarRating from '../components/StarRating';
import ReviewCard from '../components/ReviewCard';
import RelatedProductsCarousel from '../components/RelatedProductsCarousel';
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
  image?: string;
  price: number | null;
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

const formatRp = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;
const BUY_NOW_ITEM_KEY = 'kk_buy_now_item';

interface AccordionSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, open, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="border-b border-[#E9E9EA]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer"
      >
        <span className="uppercase text-[13px] tracking-[0.12em] text-[#1E1E1E]">{title}</span>
        <ChevronDown
          className={cn('size-4 text-[#6F6F71] transition-transform', open && 'rotate-180')}
          strokeWidth={1.5}
        />
      </button>
      {open && <div className="pb-5 text-[13px] text-[#6F6F71] leading-relaxed">{children}</div>}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [openSection, setOpenSection] = useState<'info' | 'shipping' | 'returns' | null>('info');

  const { wishlistIds, add, remove } = useWishlist();
  const { reviews, meta, loading: reviewsLoading, loadingMore, loadMore } = useProductReviews(id ?? '');

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((data: Product) => {
        setProduct(data);
        const firstWithPrice = data.variants?.find((v: Variant) => (v.price ?? 0) > 0);
        const autoVariant = firstWithPrice ?? data.variants?.[0] ?? null;
        if (autoVariant?.image) {
          setActiveImage(autoVariant.image);
        } else if (data.images.length > 0) {
          setActiveImage(data.images[0]);
        } else if (data.image) {
          setActiveImage(data.image);
        }
        if (data.variants?.length > 0) setSelectedVariant(autoVariant);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow pt-6 pb-16 bg-white">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 animate-pulse">
            <div className="h-4 w-48 bg-gray-200 mb-8" />
            <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
              <div className="md:w-1/2 md:shrink-0">
                <div className="aspect-square bg-gray-100" />
                <div className="flex gap-2 mt-4">
                  <div className="w-16 h-16 bg-gray-100" />
                  <div className="w-16 h-16 bg-gray-100" />
                  <div className="w-16 h-16 bg-gray-100" />
                </div>
              </div>
              <div className="md:flex-1 flex flex-col gap-4">
                <div className="h-3 w-24 bg-gray-200" />
                <div className="h-8 w-3/4 bg-gray-200" />
                <div className="h-4 w-32 bg-gray-200" />
                <div className="h-5 w-40 bg-gray-200" />
                <div className="h-12 w-full bg-gray-100 mt-4" />
              </div>
            </div>
          </div>
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
          <h2 className="text-2xl text-[#1E1E1E]">Produk tidak ditemukan</h2>
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
    selectedVariant !== null && (selectedVariant.price ?? 0) > 0
      ? (selectedVariant.price as number)
      : (product.priceNumeric ?? 0);
  const hasPrice = effectivePrice > 0;
  const activeWeightGrams =
    selectedVariant !== null && selectedVariant.weightGrams > 0
      ? selectedVariant.weightGrams
      : (product.weightGrams ?? 0);
  const activeDimensions = normalizeDimensions(selectedVariant?.dimensions, product.dimensions);
  const hasDimensions = activeDimensions.length > 0 || activeDimensions.width > 0 || activeDimensions.height > 0;

  const handleAddToCart = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }
    setAdding(true);

    const promo = product.activePromotion;
    const basePrice = selectedVariant !== null && (selectedVariant.price ?? 0) > 0
      ? (selectedVariant.price as number)
      : (product.priceNumeric ?? 0);
    const discountedPrice = promo
      ? Math.round(basePrice * (1 - promo.discountPercent / 100))
      : basePrice;

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
      weightGrams: activeWeightGrams,
      dimensions: activeDimensions,
      quantity: qty,
      originalPrice: promo ? basePrice : undefined,
      discountPercent: promo ? promo.discountPercent : undefined,
      categoryId: product.category?._id ?? undefined,
    });
    window.dispatchEvent(new Event('cartDrawerOpen'));
    setTimeout(() => setAdding(false), 600);
  };

  const handleBuyNow = () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }

    const promo = product.activePromotion;
    const basePrice = selectedVariant !== null && (selectedVariant.price ?? 0) > 0
      ? (selectedVariant.price as number)
      : (product.priceNumeric ?? 0);
    const discountedPrice = promo
      ? Math.round(basePrice * (1 - promo.discountPercent / 100))
      : basePrice;

    const buyNowItem: CartItem = {
      cartItemId: buildCartItemId(product._id, selectedVariant?._id),
      productId: product._id,
      variantId: selectedVariant?._id,
      variantName: selectedVariant?.name,
      name: selectedVariant
        ? `${product.name} - ${selectedVariant.name}`
        : product.name,
      image: activeImage || product.image || '',
      priceNumeric: discountedPrice,
      weightGrams: activeWeightGrams,
      dimensions: activeDimensions,
      quantity: qty,
      originalPrice: promo ? basePrice : undefined,
      discountPercent: promo ? promo.discountPercent : undefined,
      categoryId: product.category?._id ?? undefined,
    };

    sessionStorage.setItem(BUY_NOW_ITEM_KEY, JSON.stringify(buyNowItem));
    navigate('/checkout', { state: { buyNowItem } });
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

  const handleToggleWishlist = async () => {
    if (!localStorage.getItem('customerToken')) {
      navigate(`/masuk?redirect=/produk/${id}`);
      return;
    }
    const wasInWishlist = inWishlist;
    try {
      if (wasInWishlist) {
        await remove(product._id);
      } else {
        await add(product._id);
      }
      toast.success(wasInWishlist ? 'Dihapus dari Suka' : 'Ditambahkan ke Suka');
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customerName');
        localStorage.removeItem('customerAvatar');
        toast.error('Sesi berakhir. Silakan masuk kembali.');
        navigate(`/masuk?redirect=/produk/${id}`);
      } else {
        toast.error('Gagal menyimpan. Silakan coba lagi.');
      }
    }
  };

  const toggleSection = (section: 'info' | 'shipping' | 'returns') => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow pt-6 pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <Breadcrumb className="mb-8">
            <BreadcrumbList className="uppercase text-[12px] tracking-[0.08em] text-[#6F6F71]">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/" />}>Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/produk" />}>Produk</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[#1E1E1E] normal-case">{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
            {/* Image Gallery */}
            <div className="flex flex-col gap-3 md:w-1/2 md:shrink-0">
              <div className="bg-[#F9F7F2] overflow-hidden relative aspect-square">
                <img
                  src={
                    activeImage
                      ? api.getImageUrl(activeImage)
                      : api.getImageUrl(product.image)
                  }
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800';
                  }}
                />
                {product.isFeatured && (
                  <span className="absolute top-4 left-4 px-2.5 py-1 bg-white/90 text-[#1E1E1E] uppercase text-[11px] tracking-[0.1em]">
                    Featured
                  </span>
                )}
                <WishlistButton
                  variant="bare"
                  productId={product._id}
                  inWishlist={inWishlist}
                  onToggle={handleToggleWishlist}
                  redirectTo={`/produk/${id}`}
                />
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
                          'cursor-pointer w-full aspect-square overflow-hidden border transition',
                          activeImage === img
                            ? 'border-[#1E1E1E]'
                            : 'border-[#E9E9EA] hover:border-[#1E1E1E]/40'
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
            <div className="flex flex-col gap-4 md:flex-1 md:sticky md:top-24 md:self-start">
              <span className="uppercase text-[12px] tracking-[0.12em] text-[#6F6F71]">
                {product.category?.name || 'Kategori Umum'}
              </span>

              <h1 className="text-2xl md:text-3xl text-[#1E1E1E] leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-2">
                <StarRating value={product.ratingAvg} size="sm" />
                <span className="text-[12px] text-[#6F6F71]">
                  {product.reviewCount > 0 ? `${product.reviewCount} ulasan` : 'Belum ada ulasan'}
                </span>
              </div>

              {hasPrice ? (
                product.activePromotion ? (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg text-[#1E1E1E]">
                        {formatRp(Math.round(effectivePrice * (1 - product.activePromotion.discountPercent / 100)))}
                      </span>
                      <span className="text-[#6F6F71]/60 line-through text-[13px]">{formatRp(effectivePrice)}</span>
                      <span className="text-[11px] text-[#AE4B4B]">-{product.activePromotion.discountPercent}%</span>
                    </div>
                    <span className="text-[12px] text-[#6F6F71]">{product.activePromotion.name}</span>
                  </div>
                ) : (
                  <p className="text-lg text-[#1E1E1E]">{formatRp(effectivePrice)}</p>
                )
              ) : (
                <p className="text-lg text-[#1E1E1E]">Hubungi untuk harga</p>
              )}

              {variants.length > 0 && (
                <div>
                  <p className="uppercase text-[12px] tracking-[0.12em] text-[#6F6F71] mb-2">Varian</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v._id}
                        onClick={() => {
                          const next = selectedVariant?._id === v._id ? null : v;
                          setSelectedVariant(next);
                          if (next?.image) {
                            setActiveImage(next.image);
                          } else {
                            if (product.images.length > 0) setActiveImage(product.images[0]);
                            else if (product.image) setActiveImage(product.image);
                          }
                        }}
                        className={cn(
                          'border text-[12px] px-3 py-1.5 uppercase tracking-[0.04em] transition cursor-pointer',
                          selectedVariant?._id === v._id
                            ? 'border-[#1E1E1E] text-[#1E1E1E]'
                            : 'border-[#E9E9EA] text-[#6F6F71] hover:border-[#1E1E1E]/40'
                        )}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasPrice && (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-[#E9E9EA]">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="flex items-center justify-center w-9 h-10 text-[#1E1E1E] border-r border-[#E9E9EA] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="px-4 text-[13px] text-[#1E1E1E] select-none min-w-[2.5rem] text-center">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => q + 1)}
                        className="flex items-center justify-center w-9 h-10 text-[#1E1E1E] border-l border-[#E9E9EA] cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-[12px] text-[#6F6F71]">
                      Subtotal:{' '}
                      <span className="text-[#1E1E1E]">
                        {formatRp(effectivePrice * qty)}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="w-full flex items-center justify-center gap-2 bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3.5 hover:bg-[#2B3A67] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {adding ? (
                      <>
                        <Spinner className="size-4" />
                        Menambahkan...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="size-4" />
                        Tambah ke Keranjang
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 border border-[#1E1E1E] text-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-6 py-3.5 hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer"
                  >
                    <Zap className="size-4" />
                    Beli Langsung
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 text-[#6F6F71] hover:text-[#1E1E1E] uppercase tracking-[0.12em] text-[12px] transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" />
                    {shareCopied ? 'Tersalin!' : 'Bagikan Produk'}
                  </button>
                </div>
              )}

              {/* Accordion */}
              <div className="mt-4 border-t border-[#E9E9EA]">
                <AccordionSection
                  title="Info"
                  open={openSection === 'info'}
                  onToggle={() => toggleSection('info')}
                >
                  <p className="whitespace-pre-line">
                    {product.description || 'Tidak ada deskripsi.'}
                  </p>
                </AccordionSection>

                <AccordionSection
                  title="Pengiriman & Pembayaran"
                  open={openSection === 'shipping'}
                  onToggle={() => toggleSection('shipping')}
                >
                  <ul className="flex flex-col gap-1.5">
                    {activeWeightGrams > 0 && <li>Berat paket: {activeWeightGrams} gram</li>}
                    {hasDimensions && (
                      <li>
                        Dimensi: {activeDimensions.length} x {activeDimensions.width} x{' '}
                        {activeDimensions.height} cm
                      </li>
                    )}
                    <li>Ongkos kirim dihitung otomatis saat checkout melalui integrasi Biteship.</li>
                    <li>Pembayaran diproses melalui Midtrans: kartu kredit/debit, transfer bank/VA, e-wallet, dan QRIS.</li>
                  </ul>
                </AccordionSection>

                <AccordionSection
                  title="Pengembalian"
                  open={openSection === 'returns'}
                  onToggle={() => toggleSection('returns')}
                >
                  <p>
                    Pengajuan komplain atau retur dapat dilakukan maksimal 3 hari kalender sejak
                    pesanan berstatus &quot;Diterima&quot;. Lihat{' '}
                    <Link to="/kebijakan-pengembalian" className="text-[#1E1E1E] underline underline-offset-2">
                      Kebijakan Pengembalian
                    </Link>{' '}
                    untuk ketentuan lengkap.
                  </p>
                </AccordionSection>
              </div>
            </div>
          </div>
        </div>

        {/* Rating & Reviews */}
        <section className="py-16 mt-12 bg-[#F9F7F2]">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
            <h2 className="text-2xl md:text-3xl text-[#1E1E1E] mb-1">
              Ulasan Pembeli
            </h2>
            <p className="text-[12px] text-[#6F6F71] mb-8">{product.reviewCount} ulasan</p>

            {reviewsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse h-6 w-40 bg-gray-200" />
              </div>
            ) : meta && meta.total > 0 ? (
              <>
                {/* Summary */}
                <div className="flex flex-col sm:flex-row gap-8 mb-10 p-6 bg-white">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <p className="text-4xl text-[#1E1E1E]">{meta.ratingAvg.toFixed(1)}</p>
                    <StarRating value={meta.ratingAvg} size="md" />
                    <p className="text-[12px] text-[#6F6F71] mt-1">{meta.total} ulasan</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const count = meta.ratingDistribution[star] ?? 0;
                      const pct   = meta.total > 0 ? Math.round((count / meta.total) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-[11px] text-[#6F6F71] w-6 text-right">{star}★</span>
                          <div className="flex-1 bg-[#E9E9EA] h-1.5">
                            <div
                              className="bg-[#1E1E1E] h-1.5 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-[#6F6F71] w-6">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review list */}
                <div className="bg-white px-6">
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
                      className="px-8 py-2.5 border border-[#E9E9EA] uppercase text-[12px] tracking-[0.1em] text-[#1E1E1E] hover:bg-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <StarRating value={0} size="lg" />
                <p className="text-[#6F6F71] text-[13px]">Belum ada ulasan untuk produk ini.</p>
              </div>
            )}
          </div>
        </section>

        {/* Related Products */}
        <RelatedProductsCarousel
          categoryIds={product.category ? [product.category._id] : []}
          excludeIds={[product._id]}
        />
      </main>
      <Footer />
    </div>
  );
}

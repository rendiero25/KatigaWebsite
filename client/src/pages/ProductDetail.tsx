import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import api from '../services/api';
import { addToCart } from '../utils/cart';
import { cn } from '../lib/utils';
import { useWishlist } from '../hooks/useApi';

import Header from '../components/Header';
import WishlistButton from '../components/WishlistButton';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
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
  dimensions: { length: number; width: number; height: number };
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
  variants: Variant[];
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

  const { wishlistIds, add, remove } = useWishlist();

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
    addToCart({
      productId: product._id,
      name: selectedVariant
        ? `${product.name} - ${selectedVariant.name}`
        : product.name,
      image: activeImage || product.image || '',
      priceNumeric: effectivePrice,
      weightGrams: selectedVariant?.weightGrams ?? product.weightGrams ?? 0,
      quantity: qty,
    });
    setTimeout(() => setAdding(false), 600);
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
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-4 fill-gray-200 text-gray-200" />
                  ))}
                </div>
                <span className="text-sm text-gray-400">0 ulasan</span>
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

              <p className="text-2xl font-bold text-gray-900">
                {hasPrice ? formatRp(effectivePrice) : 'Hubungi untuk harga'}
              </p>

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
            <p className="text-sm text-gray-400 mb-10">0 ulasan</p>
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-8 fill-gray-200 text-gray-200" />
                ))}
              </div>
              <p className="text-gray-400 text-sm">Belum ada ulasan untuk produk ini.</p>
            </div>
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

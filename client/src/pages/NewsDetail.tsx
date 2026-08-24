import { useParams, Link } from 'react-router-dom';

import { useNewsDetail } from '../hooks/useApi';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ResponsiveBanner from '../components/ResponsiveBanner';

interface NewsArticle {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  author?: string;
}

export default function NewsDetail() {
  const { id } = useParams();
  const { data, loading } = useNewsDetail(id);
  const newsItem = (data as NewsArticle | null) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow">
          <div className="h-[320px] md:h-[440px] w-full bg-gray-200 animate-pulse" />
          <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8" />
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="grow flex flex-col items-center justify-center gap-6 py-24">
          <h2 className="text-2xl text-[#1E1E1E]">Artikel tidak ditemukan</h2>
          <Link
            to="/berita"
            className="border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
          >
            Kembali ke Berita
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="grow pb-20">
        <ResponsiveBanner image={newsItem.image} alt={newsItem.title} />

        <div className="max-w-3xl mx-auto px-4 py-16">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] mb-4">
            {newsItem.author ? `${newsItem.author} • ` : ''}
            {new Date(newsItem.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
          <h1 className="text-2xl md:text-3xl text-[#1E1E1E] leading-tight mb-8">
            {newsItem.title}
          </h1>

          {newsItem.excerpt && (
            <p className="text-sm text-[#6F6F71] leading-relaxed mb-8 border-l border-[#1E1E1E] pl-4">
              {newsItem.excerpt}
            </p>
          )}

          <div className="text-sm text-[#6F6F71] leading-relaxed whitespace-pre-wrap">
            {newsItem.content}
          </div>

          <div className="mt-16 pt-8 border-t border-[#E9E9EA]">
            <Link
              to="/berita"
              className="inline-block border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
            >
              Kembali ke Berita
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

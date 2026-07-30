import { Link } from 'react-router-dom';

import { useNews } from '../hooks/useApi';
import api from '../services/api';

interface NewsArticle {
  _id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
}

export default function NewsSection() {
  const { data, loading } = useNews();
  const news = data as NewsArticle[];
  const latestNews = news?.slice(0, 3) || [];

  if (loading) {
    return (
      <section className="pt-10 pb-20 bg-white">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-12 animate-pulse" />
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-[16/10] bg-gray-200 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (latestNews.length === 0) return null;

  return (
    <section className="pt-10 pb-20 bg-white">
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <h2 className="text-center text-2xl md:text-3xl mb-12">Berita</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {latestNews.map((article) => (
            <Link key={article._id} to={`/berita/${article._id}`} className="group block">
              <div className="aspect-[16/10] overflow-hidden mb-4">
                <img
                  src={api.getImageUrl(article.image)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400';
                  }}
                />
              </div>
              <p className="text-[11px] text-[#6F6F71] tracking-[0.12em] uppercase mb-2">
                {new Date(article.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <h3 className="uppercase text-[13px] text-[#1E1E1E]">{article.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useNews } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function NewsSection() {
  const { data: news, loading } = useNews();
  const latestNews = news?.slice(0, 3) || [];

  if (loading || latestNews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-medium text-pink-300 mb-2">E-info Kuma & Tips Update</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Rangkuman berita dan sorotan utama<br/>
              <span className="text-pink-400">yang relevan untuk Anda.</span>
            </h2>
          </div>
          <Link 
            to="/berita"
            className="inline-flex items-center gap-2 text-pink-300 font-medium hover:text-white transition"
          >
            Lihat Semua Berita
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* News Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {latestNews.map((article: any) => (
            <Link 
              key={article._id}
              to={`/berita/${article._id}`}
              className="block bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/20 transition group"
            >
              <div className="aspect-video overflow-hidden">
                <img 
                  src={api.getImageUrl(article.image)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400';
                  }}
                />
              </div>
              <div className="p-5">
                <p className="text-pink-300 text-sm mb-2">
                  {new Date(article.date).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
                <h3 className="text-white font-semibold mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-300 text-sm line-clamp-2">
                  {article.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


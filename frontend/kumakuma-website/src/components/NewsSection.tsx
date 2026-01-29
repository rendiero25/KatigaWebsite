import { useNews, useNewsSection } from '../hooks/useApi';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function NewsSection() {
  const { data: news, loading: loadingList } = useNews();
  const { data: sectionContent, loading: loadingContent } = useNewsSection();
  
  const loading = loadingList || loadingContent;
  const latestNews = news?.slice(0, 3) || [];

  if (loading || latestNews.length === 0) {
    return null;
  }

  return (
    <section className="bg-white pt-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className="w-2 h-2 rounded-full bg-gray-400"></span>
               <p className="text-lg font-bold text-black">{sectionContent?.subtitle || 'Certificates & Technologi'}</p>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-black leading-tight max-w-2xl">
              {sectionContent?.title || 'Rangkuman berita dan sorotan utama yang relevan untuk Anda.'}
            </h2>
          </div>
          {/* Optional: Add 'View All' link here if needed, keeping it simple for now as per image */}
        </div>

        {/* News Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {latestNews.map((article: any) => (
            <Link 
              key={article._id}
              to={`/berita/${article._id}`}
              className="group block relative overflow-hidden"
            >
              <div className="aspect-[4/3] rounded-sm overflow-hidden mb-4 relative">
                <img 
                  src={api.getImageUrl(article.image)}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400';
                  }}
                />
                {/* Date Badge */}
                <div className="absolute top-0 right-0 bg-red-600 text-white p-3 text-center min-w-[60px]">
                    <span className="block text-2xl font-bold leading-none">
                        {new Date(article.date).getDate()}
                    </span>
                    <span className="block text-xs uppercase font-medium">
                        {new Date(article.date).toLocaleDateString('id-ID', { month: 'short' })}
                    </span>
                </div>
              </div>

              <div className="relative">
                 <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent flex flex-col justify-end p-6 -mt-20 pointer-events-none">
                     {/* Overlay Text Style */}
                     <span className="text-xs text-white/80 uppercase font-bold tracking-wider mb-1">
                        Apex Textile Kreasindo
                     </span>
                     <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                        {article.title}
                     </h3>
                     <p className="text-white/60 text-xs mt-2 line-clamp-1">
                        {article.excerpt}
                     </p>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


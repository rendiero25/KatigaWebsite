// import { useState, useEffect } from 'react'; // Removed unused
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNews } from '../hooks/useApi';
import api from '../services/api';

export default function News() {
  const { data: news, loading } = useNews();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Berita & Artikel</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Dapatkan informasi terbaru seputar produk, teknologi, dan kegiatan KumaKuma.
            </p>
          </div>

          {loading ? (
             <div className="grid md:grid-cols-3 gap-8">
               {[1, 2, 3].map(i => (
                 <div key={i} className="animate-pulse">
                   <div className="bg-gray-200 aspect-video rounded-xl mb-4"></div>
                   <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                   <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                 </div>
               ))}
             </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Belum ada berita yang diterbitkan.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((item: any) => (
                <Link 
                  key={item._id}
                  to={`/berita/${item._id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col h-full"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={api.getImageUrl(item.image)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800';
                      }}
                    />
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 text-sm font-medium rounded-bl-xl">
                      {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3 text-sm flex-grow">
                      {item.excerpt}
                    </p>
                    <div className="text-indigo-600 font-medium text-sm">
                      Baca Selengkapnya &rarr;
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

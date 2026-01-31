import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

export default function NewsDetail() {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // setLoading(true);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/news/${id}`)
        .then(res => res.json())
        .then(setNewsItem)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center">
           <h2 className="text-2xl font-bold text-gray-900 mb-4">Artikel tidak ditemukan</h2>
           <Link to="/berita" className="text-indigo-600 hover:text-indigo-800">
             &larr; Kembali ke daftar berita
           </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow pb-16">
         {/* Hero / Header Image */}
         <div className="h-64 sm:h-96 w-full relative mb-8 sm:mb-12">
            <img 
               src={api.getImageUrl(newsItem.image)}
               alt={newsItem.title}
               className="w-full h-full object-cover"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200';
               }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full p-4 sm:p-8 md:p-12">
               <div className="container mx-auto text-white">
                  <div className="flex items-center gap-4 text-sm sm:text-base font-medium mb-2 opacity-90">
                     <span>{newsItem.author || 'Admin'}</span>
                     <span>&bull;</span>
                     <span>{new Date(newsItem.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                     {newsItem.title}
                  </h1>
               </div>
            </div>
         </div>

         {/* Content */}
         <div className="container mx-auto px-4 sm:px-6">
            <div className="prose prose-lg prose-indigo text-gray-700 mx-auto">
               <p className="lead text-xl text-gray-500 font-medium mb-8 border-l-4 border-indigo-500 pl-4 italic">
                  {newsItem.excerpt}
               </p>
               <div className="whitespace-pre-wrap">
                  {newsItem.content}
               </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center">
               <Link to="/berita" className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-2">
                  &larr; Kembali ke Berita
               </Link>
            </div>
         </div>
      </main>
      <Footer />
    </div>
  );
}

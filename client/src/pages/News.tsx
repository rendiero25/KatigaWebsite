import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

import { useNews, useNewsSection } from '../hooks/useApi';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductPagination from '../components/products/ProductPagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NewsArticle {
  _id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
}

type SortKey = 'newest' | 'oldest' | 'az' | 'za';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
];

export default function News() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const { data, pagination, loading } = useNews(page, 12, searchQuery, '', sort);
  const news = data as NewsArticle[];
  const { data: sectionContent } = useNewsSection();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [searchQuery, sort]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Berita</h1>
        </div>

        <div className="w-full h-[320px] md:h-[440px] bg-[#F9F7F2] overflow-hidden">
          {sectionContent?.bannerImage && (
            <img
              src={api.getImageUrl(sectionContent.bannerImage)}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="sticky top-20 z-30 bg-white border-y border-[#E9E9EA]">
          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 py-4">
            <div className="relative w-full md:w-72">
              <FiSearch className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F6F71]" />
              <input
                type="text"
                placeholder="CARI BERITA"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1 border-b border-[#E9E9EA] bg-transparent uppercase tracking-[0.12em] text-[13px] text-[#1E1E1E] placeholder:text-[#6F6F71] focus:outline-none focus:border-[#1E1E1E] transition-colors"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 uppercase tracking-[0.12em] text-[13px] text-[#6F6F71] hover:text-[#1E1E1E] transition-colors cursor-pointer focus:outline-none self-start md:self-auto">
                {SORT_OPTIONS.find((opt) => opt.value === sort)?.label}
                <FiChevronDown className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none p-1 min-w-40 shadow-none ring-1 ring-[#E9E9EA]">
                <DropdownMenuRadioGroup value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="rounded-none uppercase tracking-[0.08em] text-[12px] text-[#1E1E1E]"
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full aspect-[16/10] bg-gray-200 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <p className="text-center text-sm text-[#6F6F71] py-20">
              Belum ada berita yang cocok dengan pencarian Anda.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-12">
              {news.map((item) => (
                <Link key={item._id} to={`/berita/${item._id}`} className="group block">
                  <div className="aspect-[16/10] overflow-hidden mb-4 bg-[#F9F7F2]">
                    <img
                      src={api.getImageUrl(item.image)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />
                  </div>
                  <p className="text-[11px] text-[#6F6F71] tracking-[0.12em] uppercase mb-2">
                    {new Date(item.date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <h3 className="uppercase text-[13px] text-[#1E1E1E]">{item.title}</h3>
                </Link>
              ))}
            </div>
          )}

          <ProductPagination
            currentPage={page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { useCatalog } from '../hooks/useApi';

import api from '../services/api';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ResponsiveBanner from '../components/ResponsiveBanner';

interface CatalogData {
  title?: string;
  description?: string;
  backgroundImage?: string;
  cardImage?: string;
  fileUrl?: string;
}

// Admin dapat mengunggah PDF ke `fileUrl`; sampai itu terisi, halaman memakai
// berkas statis di client/public yang selama ini menjadi satu-satunya sumber.
const STATIC_CATALOG_PDF = '/Catalogue-KumaKuma.pdf';

export default function Katalog() {
  const { data, loading } = useCatalog();
  const catalog = (data as CatalogData | null) ?? null;
  const pdfHref = catalog?.fileUrl ? api.getImageUrl(catalog.fileUrl) : STATIC_CATALOG_PDF;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="grow">
          <div className="border-b border-[#E9E9EA] py-6">
            <h1 className="text-center text-2xl md:text-3xl">Katalog</h1>
          </div>

          <div className="w-full h-[320px] md:h-[440px] bg-[#F9F7F2] animate-pulse" />

          <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
            <div className="max-w-3xl space-y-4 animate-pulse">
              <div className="h-8 bg-gray-200 w-1/3" />
              <div className="h-4 bg-gray-200 w-full" />
              <div className="h-4 bg-gray-200 w-2/3" />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const hasCatalog = Boolean(catalog?.title || catalog?.description || catalog?.backgroundImage || catalog?.cardImage);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Katalog</h1>
        </div>

        <ResponsiveBanner image={catalog?.backgroundImage} alt="" />

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
          <div className="max-w-3xl">
            {hasCatalog ? (
              <>
                {catalog?.title && (
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-normal text-black leading-tight mb-6">
                    {catalog.title}
                  </h2>
                )}

                {catalog?.description && (
                  <p className="text-sm text-[#6F6F71] leading-relaxed mb-10">
                    {catalog.description}
                  </p>
                )}

                {catalog?.cardImage && (
                  <img
                    src={api.getImageUrl(catalog.cardImage)}
                    alt={catalog?.title || 'Sampul katalog'}
                    className="w-full max-w-sm mb-10 object-cover"
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-[#6F6F71] leading-relaxed mb-10">
                Katalog belum tersedia saat ini.
              </p>
            )}

            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border border-[#1E1E1E] uppercase tracking-[0.18em] text-[13px] px-8 py-4 hover:bg-[#1E1E1E] hover:text-white transition"
            >
              Unduh Katalog
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

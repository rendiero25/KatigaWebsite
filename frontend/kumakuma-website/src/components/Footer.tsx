import { Link } from 'react-router-dom';
import { useFooter, useContactInfo } from '../hooks/useApi';
import { FaPhone, FaWhatsapp, FaEnvelope, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  const { data: footer } = useFooter();
  const { data: contact } = useContactInfo();

  return (
    <footer className="bg-white pt-10">
      
      {/* Consultation CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="flex flex-col md:flex-row gap-12 items-start">
           <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Gratis Konsultasi:</p>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {footer?.consultationText || 'Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi bagian dari Keluarga Kuma Kuma? Tim kami siap membantu Anda menemukan kenyamanan terbaik untuk keluarga.'}
              </h3>
           </div>
           <div className="shrink-0">
             <Link 
                to="/kontak"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#3B4465] text-white font-medium rounded-full hover:bg-gray-800 transition shadow-lg text-sm"
              >
                Hubungi Kami
              </Link>
           </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-gray-100">
        <div className="grid md:grid-cols-2 gap-10">
          
          {/* Left Column: Address */}
          <div>
            <p className="text-sm font-bold text-gray-900 leading-relaxed mb-2">
               {contact?.address?.split(',')[0]}
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
               {contact?.address?.split(',').slice(1).join(',')}
            </p>
             
             {/* Contact Details */}
             <div className="flex flex-wrap gap-6 mt-6">
                <a href={`tel:${contact?.phone}`} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900">
                   <FaPhone className="w-3 h-3" /> {contact?.phone}
                </a>
                <a href={`https://wa.me/${contact?.whatsapp}`} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900">
                   <FaWhatsapp className="w-3 h-3" /> {contact?.whatsapp}
                </a>
                <a href={`mailto:${contact?.email}`} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900">
                   <FaEnvelope className="w-3 h-3" /> {contact?.email}
                </a>
             </div>
          </div>

          {/* Right Column: Links */}
          <div className="flex justify-start md:justify-end gap-8 text-xs font-medium text-gray-600">
              <Link to="/" className="hover:text-gray-900">Beranda</Link>
              <Link to="/tentang-kami" className="hover:text-gray-900">Tentang Kami</Link>
              <Link to="/produk" className="hover:text-gray-900">Produk</Link>
              <Link to="/lokasi-toko" className="hover:text-gray-900">Lokasi Toko</Link>
              <Link to="/kontak" className="hover:text-gray-900">Kontak</Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-400">
           <p>{footer?.copyright || '© 2026 Kusuma Kencana Khatulistiwa. All rights reserved.'}</p>
           <a href="#" className="flex items-center gap-1 hover:text-gray-600">
              <FaInstagram /> Instagram
           </a>
        </div>
      </div>
    </footer>
  );
}

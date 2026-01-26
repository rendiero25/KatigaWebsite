import { Link } from 'react-router-dom';
import { useFooter, useContactInfo, usePartners } from '../hooks/useApi';
import api from '../services/api';
import { FaPhone, FaWhatsapp, FaEnvelope, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  const { data: footer } = useFooter();
  const { data: contact } = useContactInfo();
  const { data: partners } = usePartners();

  return (
    <footer className="bg-gradient-to-b from-green-50 to-green-100">
      {/* Partners */}
      <div className="border-b border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">Trusted by several big company in Indonesia</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {partners?.slice(0, 7).map((partner: any) => (
              <img 
                key={partner._id}
                src={api.getImageUrl(partner.logo)}
                alt={partner.name}
                className="h-6 object-contain grayscale hover:grayscale-0 transition"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Consultation CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-green-600 mb-2">{footer?.consultationTitle || 'Gratis Konsultasi'}</p>
            <p className="text-lg font-bold text-gray-900">
              {footer?.consultationText || 'Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi bagian dari Keluarga Kuma Kuma?'}
            </p>
          </div>
          <Link 
            to="/kontak"
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Hubungi Kami
          </Link>
        </div>
      </div>

      {/* Contact & Links */}
      <div className="border-t border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Address */}
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-900">{contact?.address?.split(',')[0] || 'Grha KATIGA, Jalan Kebon Jeruk Raya 18B'}</p>
              <p>{contact?.address?.split(',').slice(1).join(',') || 'Kebon Jeruk, Jakarta, Indonesia 11530'}</p>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <a href={`tel:${contact?.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <FaPhone className="w-4 h-4" />
                {contact?.phone || '021-535-7450'}
              </a>
              <a href={`https://wa.me/${contact?.whatsapp?.replace(/\D/g, '')}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <FaWhatsapp className="w-4 h-4" />
                {contact?.whatsapp || '0821-2233-8226'}
              </a>
              <a href={`mailto:${contact?.email}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <FaEnvelope className="w-4 h-4" />
                {contact?.email || 'info@kusumakencana.co.id'}
              </a>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-wrap gap-4 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Beranda</Link>
              <Link to="/tentang-kami" className="text-gray-600 hover:text-gray-900">Tentang Kami</Link>
              <Link to="/produk" className="text-gray-600 hover:text-gray-900">Produk</Link>
              <Link to="/lokasi-toko" className="text-gray-600 hover:text-gray-900">Lokasi Toko</Link>
              <Link to="/kontak" className="text-gray-600 hover:text-gray-900">Kontak</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-green-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-500">
            <p>{footer?.copyright || '2026 Kusuma Kencana Khatulistiwa. All rights Reserved. Developed by rendiero'}</p>
            <a href="#" className="flex items-center gap-2 hover:text-gray-900">
              <FaInstagram className="w-4 h-4" />
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

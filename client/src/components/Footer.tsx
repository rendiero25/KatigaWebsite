import { Link } from "react-router-dom";
import { useFooter, useContactInfo } from "../hooks/useApi";
import { FaPhone, FaWhatsapp, FaEnvelope, FaInstagram } from "react-icons/fa";

export default function Footer() {
  const { data: footer } = useFooter();
  const { data: contact } = useContactInfo();

  return (
    <footer className="bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] pt-10">
      {/* Consultation CTA */}
      <div className="mb-10 container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1">
            <p className="text-lg font-bold text-white mb-2">
              Gratis Konsultasi
            </p>
            <h3 className="text-4xl font-bold text-white mb-4 max-w-5xl">
              Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi
              bagian dari Keluarga Kuma Kuma?{" "}
              <span className="text-white/70 font-normal">
                Tim kami siap membantu Anda menemukan kenyamanan terbaik untuk
                keluarga.
              </span>
            </h3>
          </div>

          <div className="shrink-0">
            <Link
              to="/kontak"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#212B49] text-white font-semibold rounded-full hover:bg-[#2B3A67] transition shadow-lg text-lg"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="pb-10 container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30">
        <div className="gap-10">
          {/* Left Column: Address */}
          <div>
            <p className="text-xl font-bold text-white leading-relaxed mb-2 max-w-md">
              {contact?.address}
            </p>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
              {/* Contact Details */}
              <div className="flex flex-col md:flex-row flex-wrap gap-6 w-full lg:w-auto">
                <a
                  href={`tel:${contact?.phone}`}
                  className="flex items-center gap-2 text-lg font-medium text-white/90 hover:text-white transition"
                >
                  <FaPhone className="w-5 h-5 shrink-0" /> {contact?.phone}
                </a>
                <a
                  href={`https://wa.me/${contact?.whatsapp}`}
                  className="flex items-center gap-2 text-lg font-medium text-white/90 hover:text-white transition"
                >
                  <FaWhatsapp className="w-6 h-6 shrink-0" />{" "}
                  {contact?.whatsapp}
                </a>
                <a
                  href={`mailto:${contact?.email}`}
                  className="flex items-center gap-2 text-lg font-medium text-white/90 hover:text-white transition"
                >
                  <FaEnvelope className="w-5 h-5 shrink-0" /> {contact?.email}
                </a>
              </div>

              {/* Right Column: Links */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:justify-between gap-x-8 gap-y-4 text-lg font-medium text-white/90 w-full lg:w-auto">
                <Link to="/" className="hover:text-white hover:font-bold transition">
                  Beranda
                </Link>
                <Link to="/tentang-kami" className="hover:text-white hover:font-bold transition">
                  Tentang Kami
                </Link>
                <Link to="/produk" className="hover:text-white hover:font-bold transition">
                  Produk
                </Link>
                <Link to="/berita" className="hover:text-white hover:font-bold transition">
                  Berita
                </Link>
                <Link to="/katalog" className="hover:text-white hover:font-bold transition">
                  Katalog
                </Link>
                <Link to="/kontak" className="hover:text-white hover:font-bold transition">
                  Kontak
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-start xl:items-center text-md text-white/60">
          <p>
            {footer?.copyright ||
              "© 2026 Kusuma Kencana Khatulistiwa. All rights reserved."}
          </p>
          <a
            href="#"
            className="mt-2 xl:mt-0 flex items-center gap-1 hover:text-white transition"
          >
            <FaInstagram /> Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

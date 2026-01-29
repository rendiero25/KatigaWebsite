import { Link } from "react-router-dom";
import { useFooter, useContactInfo } from "../hooks/useApi";
import { FaPhone, FaWhatsapp, FaEnvelope, FaInstagram } from "react-icons/fa";

export default function Footer() {
  const { data: footer } = useFooter();
  const { data: contact } = useContactInfo();

  return (
    <footer className="bg-white pt-10 container mx-auto">
      {/* Consultation CTA */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1">
            <p className="text-lg font-bold text-black mb-2">
              Gratis Konsultasi
            </p>
            <h3 className="text-4xl font-bold text-black mb-4 max-w-5xl">
              Punya Pertanyaan Seputar Produk Si Kecil? atau Ingin menjadi
              bagian dari Keluarga Kuma Kuma?
              <span className="text-black/80 font-normal">
                Tim kami siap membantu Anda menemukan kenyamanan terbaik untuk
                keluarga.
              </span>
            </h3>
          </div>

          <div className="shrink-0">
            <Link
              to="/kontak"
              className="inline-flex items-center justify-center px-8 py-4 bg-linear-to-b from-primary to-[#212B49] text-white font-medium rounded-full hover:bg-primary transition shadow-lg text-lg"
            >
              Hubungi Kami
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="pb-10">
        <div className=" gap-10">
          {/* Left Column: Address */}
          <div>
            <p className="text-xl font-bold text-black leading-relaxed mb-2 max-w-md">
              {contact?.address}
            </p>

            <div className="flex flex-wrap justify-between items-end gap-2">
              {/* Contact Details */}
              <div className="flex flex-wrap gap-6 w-1/2">
                <a
                  href={`tel:${contact?.phone}`}
                  className="flex items-center gap-2 text-lg font-medium text-black"
                >
                  <FaPhone className="w-5 h-5" /> {contact?.phone}
                </a>
                <a
                  href={`https://wa.me/${contact?.whatsapp}`}
                  className="flex items-center gap-2 text-lg font-medium text-black"
                >
                  <FaWhatsapp className="w-6 h-6" /> {contact?.whatsapp}
                </a>
                <a
                  href={`mailto:${contact?.email}`}
                  className="flex items-center gap-2 text-lg font-medium text-black"
                >
                  <FaEnvelope className="w-5 h-5" /> {contact?.email}
                </a>
              </div>

              {/* Right Column: Links */}
              <div className="flex justify-between gap-8 text-lg font-medium text-black">
                <Link to="/" className="hover:font-bold">
                  Beranda
                </Link>
                <Link to="/tentang-kami" className="hover:font-bold">
                  Tentang Kami
                </Link>
                <Link to="/produk" className="hover:font-bold">
                  Produk
                </Link>
                <Link to="/news" className="hover:font-bold">
                  Berita
                </Link>
                <Link to="/katalog" className="hover:font-bold">
                  Katalog
                </Link>
                <Link to="/kontak" className="hover:font-bold">
                  Kontak
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col md:flex-row justify-between items-center text-md text-black/80">
          <p>
            {footer?.copyright ||
              "© 2026 Kusuma Kencana Khatulistiwa. All rights reserved."}
          </p>
          <a href="#" className="flex items-center gap-1 hover:text-gray-600">
            <FaInstagram /> Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}

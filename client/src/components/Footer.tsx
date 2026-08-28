import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FaPhone, FaWhatsapp, FaEnvelope, FaInstagram, FaTiktok } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";

import { useFooter, useContactInfo, useSiteSettings } from "../hooks/useApi";

import api from "../services/api";
import { toWaNumber } from "../utils/whatsapp";

import WhatsAppFab from "./WhatsAppFab";

// Dipakai selama field-nya belum diisi di Pengaturan, supaya ikon sosial tidak
// pernah jadi tautan mati seperti sebelumnya (href="#").
const INSTAGRAM_FALLBACK = "https://www.instagram.com/kumakuma.katalog/";
const TIKTOK_FALLBACK = "https://www.tiktok.com/@housekumakumaofficial";

// TODO(cms): pindahkan blurb perusahaan ini ke model FooterContent
const COMPANY_BLURB =
  "Katiga menghadirkan produk berkualitas untuk kenyamanan si kecil dan keluarga, dibuat dengan perhatian pada setiap detail.";

interface FooterColumnProps {
  title: string;
  children: ReactNode;
}

function FooterColumn({ title, children }: FooterColumnProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/15 md:border-0 py-4 md:py-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full md:pointer-events-none"
      >
        <span className="text-white uppercase tracking-[0.05em] text-[13px]">{title}</span>
        <FiChevronDown
          className={`w-4 h-4 text-white md:hidden transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`flex-col gap-3 mt-4 ${isOpen ? "flex" : "hidden"} md:flex`}>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const { data: footer } = useFooter();
  const { data: contact } = useContactInfo();
  const { data: site } = useSiteSettings();

  const instagramUrl = site?.instagramUrl?.trim() || INSTAGRAM_FALLBACK;
  const tiktokUrl = site?.tiktokUrl?.trim() || TIKTOK_FALLBACK;

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  // Routed through the contact endpoint: it stores the request in /admin/messages
  // and forwards it to the team inbox, same path as the contact page form.
  const handleNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = newsletterEmail.trim();
    if (!address || subscribing) return;

    setSubscribing(true);
    try {
      await api.submitContact({
        name: address,
        email: address,
        phone: "",
        subject: "Berlangganan newsletter",
        message: `${address} ingin berlangganan newsletter Katiga.`,
      });
      toast.success("Terima kasih, email kamu sudah kami terima.");
      setNewsletterEmail("");
    } catch {
      toast.error("Gagal mengirim. Coba lagi sebentar.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-[#2B3A67]">
      {/* Consultation CTA */}
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-10 border-b border-white/15">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <h3 className="text-h2 md:text-2xl font-normal uppercase text-white max-w-2xl">
            {footer?.consultationTitle || "Gratis Konsultasi"}
          </h3>
          <Link
            to="/kontak"
            className="shrink-0 inline-flex items-center justify-center border border-white text-white uppercase tracking-[0.18em] text-[13px] px-8 py-3 hover:bg-white hover:text-[#2B3A67] transition-colors"
          >
            Hubungi Kami
          </Link>
        </div>
        {footer?.consultationText && (
          <p className="mt-3 text-white/70 text-sm max-w-2xl">{footer.consultationText}</p>
        )}
      </div>

      {/* Main columns */}
      <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8">
          {/* Company */}
          <FooterColumn title="Katiga">
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">{COMPANY_BLURB}</p>
            <div className="flex items-center gap-4 mt-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Katiga"
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok Katiga"
                className="text-white/70 hover:text-white transition-colors"
              >
                <FaTiktok className="w-5 h-5" />
              </a>
            </div>
          </FooterColumn>

          {/* Navigation */}
          <FooterColumn title="Navigasi">
            <Link to="/" className="text-white/70 hover:text-white text-sm transition-colors">
              Beranda
            </Link>
            <Link to="/tentang-kami" className="text-white/70 hover:text-white text-sm transition-colors">
              Tentang Kami
            </Link>
            <Link to="/produk" className="text-white/70 hover:text-white text-sm transition-colors">
              Produk
            </Link>
            <Link to="/katalog" className="text-white/70 hover:text-white text-sm transition-colors">
              Katalog
            </Link>
            <Link to="/berita" className="text-white/70 hover:text-white text-sm transition-colors">
              Berita
            </Link>
            <Link to="/kontak" className="text-white/70 hover:text-white text-sm transition-colors">
              Kontak
            </Link>
          </FooterColumn>

          {/* Help */}
          <FooterColumn title="Bantuan">
            <Link to="/faq" className="text-white/70 hover:text-white text-sm transition-colors">
              FAQ
            </Link>
            <Link to="/syarat-ketentuan" className="text-white/70 hover:text-white text-sm transition-colors">
              Syarat & Ketentuan
            </Link>
            <Link to="/kebijakan-privasi" className="text-white/70 hover:text-white text-sm transition-colors">
              Kebijakan Privasi
            </Link>
            <Link to="/kebijakan-pengembalian" className="text-white/70 hover:text-white text-sm transition-colors">
              Kebijakan Pengembalian
            </Link>
          </FooterColumn>

          {/* Contact */}
          <FooterColumn title="Kontak">
            {contact?.address && (
              <p className="text-white/70 text-sm leading-relaxed max-w-xs">{contact.address}</p>
            )}
            {contact?.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                <FaPhone className="w-3.5 h-3.5 shrink-0" /> {contact.phone}
              </a>
            )}
            {contact?.whatsapp && (
              <a
                href={`https://wa.me/${toWaNumber(contact.whatsapp)}`}
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                <FaWhatsapp className="w-4 h-4 shrink-0" /> {contact.whatsapp}
              </a>
            )}
            {contact?.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                <FaEnvelope className="w-3.5 h-3.5 shrink-0" /> {contact.email}
              </a>
            )}

            <form onSubmit={handleNewsletterSubmit} className="mt-2 flex">
              <input
                type="email"
                required
                name="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Email Anda"
                aria-label="Email untuk berlangganan"
                className="flex-1 min-w-0 bg-transparent border border-white/30 text-white placeholder:text-white/50 text-sm px-3 py-2 focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="shrink-0 bg-white text-[#2B3A67] uppercase tracking-[0.18em] text-[13px] px-4 hover:bg-white/90 disabled:opacity-60 transition-colors"
              >
                {subscribing ? "Mengirim" : "Kirim"}
              </button>
            </form>
          </FooterColumn>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-sm text-white/60">
          <p>{footer?.copyright || "© 2026 Kusuma Kencana Khatulistiwa. All rights reserved."}</p>
        </div>
      </div>

      {/* Rendered here because the footer is the one component every public page
          mounts; the button itself is fixed to the viewport, not to the footer. */}
      <WhatsAppFab />
    </footer>
  );
}

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FaPhone, FaWhatsapp, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";

import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../services/api";

interface ContactPageContent {
  title?: string;
  subtitle1?: string;
  subtitle2?: string;
}

interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
}

const inputClass =
  "w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors";
const labelClass = "uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]";

export default function ContactPage() {
  const [content, setContent] = useState<ContactPageContent>({});
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getContactPageContent().then(setContent).catch(console.error);
    api.getContactInfo().then(setContactInfo).catch(console.error);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.submitContact(formData);
      toast.success("Pesan berhasil dikirim!");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim pesan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="grow">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
          {(content.subtitle1 || content.subtitle2) && (
            <div className="max-w-2xl mx-auto text-center mb-12">
              {content.subtitle1 && (
                <p className="text-lg text-black/80 leading-relaxed">{content.subtitle1}</p>
              )}
              {content.subtitle2 && (
                <p className="mt-2 text-sm text-[#6F6F71] leading-relaxed">{content.subtitle2}</p>
              )}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 max-w-5xl mx-auto">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:w-1/2 space-y-6">
              <div className="space-y-1">
                <label htmlFor="contact-name" className={labelClass}>
                  Nama
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className={labelClass}>
                  E-mail
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-phone" className={labelClass}>
                  Telepon
                </label>
                <input
                  id="contact-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-subject" className={labelClass}>
                  Subjek
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-message" className={labelClass}>
                  Pesan
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Mengirim..." : "Kirim Pesan"}
              </button>
            </form>

            {/* Contact Info */}
            <div className="lg:w-1/2 space-y-8">
              {contactInfo.address && (
                <div className="flex items-start gap-4">
                  <FaMapMarkerAlt className="w-4 h-4 mt-1 text-[#6F6F71] shrink-0" />
                  <div>
                    <p className={`${labelClass} mb-1`}>Alamat</p>
                    <p className="text-sm text-black/80 leading-relaxed">{contactInfo.address}</p>
                  </div>
                </div>
              )}

              {contactInfo.phone && (
                <div className="flex items-start gap-4">
                  <FaPhone className="w-4 h-4 mt-1 text-[#6F6F71] shrink-0" />
                  <div>
                    <p className={`${labelClass} mb-1`}>Telepon</p>
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-sm text-black/80 leading-relaxed hover:text-[#4F68AF] transition-colors"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>
              )}

              {contactInfo.whatsapp && (
                <div className="flex items-start gap-4">
                  <FaWhatsapp className="w-4 h-4 mt-1 text-[#6F6F71] shrink-0" />
                  <div>
                    <p className={`${labelClass} mb-1`}>WhatsApp</p>
                    <a
                      href={`https://wa.me/${contactInfo.whatsapp}`}
                      className="text-sm text-black/80 leading-relaxed hover:text-[#4F68AF] transition-colors"
                    >
                      {contactInfo.whatsapp}
                    </a>
                  </div>
                </div>
              )}

              {contactInfo.email && (
                <div className="flex items-start gap-4">
                  <FaEnvelope className="w-4 h-4 mt-1 text-[#6F6F71] shrink-0" />
                  <div>
                    <p className={`${labelClass} mb-1`}>Email</p>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-sm text-black/80 leading-relaxed hover:text-[#4F68AF] transition-colors"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

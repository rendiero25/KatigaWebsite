import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../services/api";

export default function ContactPage() {
  const [content, setContent] = useState<any>({});
  const [contactInfo, setContactInfo] = useState<any>({});

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch Page Content
    fetch("http://localhost:5000/api/contact-page")
      .then((res) => res.json())
      .then(setContent)
      .catch(console.error);

    // Fetch Contact Info (Phone, Email, etc.)
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
      await api.submitContactForm(formData);
      alert("Pesan berhasil dikirim!");
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      console.error(error);
      alert("Gagal mengirim pesan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow pt-32 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          {/* Left Column: Text & Info */}
          <div className="lg:w-1/2">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-8">
              {content.title || "Let’s get\nin touch"}
            </h1>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {content.subtitle1 || "Don’t be afraid to say hello with us!"}
            </h2>

            {/* Dynamic Contact Info */}
            <div className="space-y-6 mb-12">
              <div>
                <p className="text-gray-400 font-medium mb-1">Phone</p>
                <p className="text-lg font-semibold text-gray-900">
                  {contactInfo.phone || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium mb-1">Whatsapp</p>
                <p className="text-lg font-semibold text-gray-900">
                  {contactInfo.whatsapp || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-400 font-medium mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-900">
                  {contactInfo.email || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:w-1/2">
            <p className="font-medium text-gray-900 mb-8 leading-relaxed">
              {content.subtitle2 ||
                "Great! we’re excited to hear from you and let’s start something special together. Call us for any inquery."}
            </p>

            <div className="bg-[#1a1a1a] text-white p-8 md:p-12 rounded-none md:rounded-lg">
              <h3 className="text-2xl font-bold mb-8">Contact</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-600 focus:border-white py-2 outline-none transition"
                      placeholder=""
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-600 focus:border-white py-2 outline-none transition"
                      placeholder=""
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-600 focus:border-white py-2 outline-none transition"
                      placeholder=""
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-gray-600 focus:border-white py-2 outline-none transition"
                      placeholder=""
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Tell us about your interested in
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full bg-transparent border-b border-gray-600 focus:border-white py-2 outline-none transition resize-none"
                    placeholder=""
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#c81920] hover:bg-[#a01217] text-white font-bold py-4 mt-4 transition duration-300 shadow-lg disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send to us"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

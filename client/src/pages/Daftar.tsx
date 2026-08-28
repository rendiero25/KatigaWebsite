import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import api from '../services/api';

import Header from '../components/Header';
import Footer from '../components/Footer';

const inputClass =
  'w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors';
const labelClass = 'uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]';

export default function Daftar() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({ password: false, confirmPassword: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      const data = await api.customerRegister({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      if (data.token) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerName', data.customer.name);
        localStorage.setItem('customerAvatar', data.customer.avatar || '');
        navigate('/profil');
      } else {
        setError(data.message || 'Pendaftaran gagal');
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  type FormField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';

  const textFields: { id: string; label: string; type: string; placeholder: string; field: FormField; required: boolean }[] = [
    { id: 'name', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama kamu', field: 'name', required: true },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'email@kamu.com', field: 'email', required: true },
    { id: 'phone', label: 'Nomor HP (opsional)', type: 'tel', placeholder: '08xxxxxxxxxx', field: 'phone', required: false },
  ];

  const passwordFields: { id: string; label: string; placeholder: string; field: 'password' | 'confirmPassword' }[] = [
    { id: 'password', label: 'Password', placeholder: 'Min. 6 karakter', field: 'password' },
    { id: 'confirmPassword', label: 'Konfirmasi Password', placeholder: 'Ulangi password', field: 'confirmPassword' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Daftar</h1>
        </div>

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
          <div className="max-w-md mx-auto">
            <p className="text-sm text-black/60 text-center mb-8">
              Buat akun untuk mulai berbelanja di Katiga
            </p>

            {error && (
              <p className="text-[13px] text-[#AE4B4B] mb-5 text-center" aria-live="polite">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {textFields.map((f) => (
                <div key={f.id} className="space-y-1">
                  <label htmlFor={f.id} className={labelClass}>
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    type={f.type}
                    value={form[f.field]}
                    onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                    required={f.required}
                    placeholder={f.placeholder}
                    className={inputClass}
                  />
                </div>
              ))}

              {passwordFields.map((f) => {
                const visible = showPw[f.field];
                return (
                  <div key={f.id} className="space-y-1">
                    <label htmlFor={f.id} className={labelClass}>
                      {f.label}
                    </label>
                    <div className="relative">
                      <input
                        id={f.id}
                        type={visible ? 'text' : 'password'}
                        value={form[f.field]}
                        onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                        required
                        placeholder={f.placeholder}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((prev) => ({ ...prev, [f.field]: !prev[f.field] }))}
                        aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6F71] hover:text-[#1E1E1E] transition-colors"
                      >
                        {visible ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </button>
            </form>

            <p className="mt-8 text-center text-[13px] text-[#6F6F71]">
              Sudah punya akun?{' '}
              <Link to="/masuk" className="text-[#6F6F71] hover:text-[#1E1E1E] underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

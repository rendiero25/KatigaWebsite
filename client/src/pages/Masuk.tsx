import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import api from '../services/api';

import Header from '../components/Header';
import Footer from '../components/Footer';

const inputClass =
  'w-full border border-[#E9E9EA] px-4 py-3 text-sm outline-none focus:border-[#1E1E1E] transition-colors';
const labelClass = 'uppercase tracking-[0.12em] text-[11px] text-[#6F6F71]';

export default function Masuk() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/produk';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.customerLogin(form.email, form.password);
      if (data.token) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerName', data.customer.name);
        localStorage.setItem('customerAvatar', data.customer.avatar || '');
        navigate(redirect);
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="grow">
        <div className="border-b border-[#E9E9EA] py-6">
          <h1 className="text-center text-2xl md:text-3xl">Masuk</h1>
        </div>

        <div className="container mx-auto px-4 sm:px-10 lg:px-20 xl:px-30 py-16">
          <div className="max-w-md mx-auto">
            <p className="text-sm text-black/60 text-center mb-8">
              Masuk ke akun kamu untuk melanjutkan
            </p>

            {error && (
              <p className="text-[13px] text-[#AE4B4B] mb-5 text-center" aria-live="polite">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="email@kamu.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="Password kamu"
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6F71] hover:text-[#1E1E1E] transition-colors"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4F68AF] text-white uppercase tracking-[0.18em] text-[13px] px-6 py-3 hover:bg-[#2B3A67] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <p className="mt-8 text-center text-[13px] text-[#6F6F71]">
              Belum punya akun?{' '}
              <Link to="/daftar" className="text-[#6F6F71] hover:text-[#1E1E1E] underline">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

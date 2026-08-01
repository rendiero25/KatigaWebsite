import { useState, useEffect, useCallback } from 'react';
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

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.customerGoogleAuth(response.credential);
      if (data.token) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerName', data.customer.name);
        localStorage.setItem('customerAvatar', data.customer.avatar || '');
        navigate(redirect);
      } else {
        setError(data.message || 'Login dengan Google gagal');
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  }, [navigate, redirect]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
  }, [handleGoogleResponse]);

  const handleGoogleClick = () => {
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In tidak tersedia, muat ulang halaman');
      return;
    }
    window.google.accounts.id.prompt();
  };

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

            <div className="relative flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-[#E9E9EA]" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-[#6F6F71] whitespace-nowrap">
                atau lanjutkan dengan
              </span>
              <div className="flex-1 h-px bg-[#E9E9EA]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              className="w-full border border-[#E9E9EA] px-6 py-3 text-sm text-black hover:border-[#1E1E1E] transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Masuk dengan Google
            </button>

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

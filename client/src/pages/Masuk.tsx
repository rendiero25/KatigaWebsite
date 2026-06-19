import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../services/api';

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

  const fields = [
    { id: 'email', label: 'Email', type: 'email', placeholder: 'email@kamu.com', value: form.email, field: 'email' as const },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Password kamu', value: form.password, field: 'password' as const },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden min-h-screen overflow-hidden lg:block">
        <img
          src="/login-image.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center min-h-screen px-8 py-16 bg-[#F9F7F2]">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-3xl font-bold text-black mb-2">Masuk</h1>
            <p className="text-black/50 mb-8">Masuk ke akun kamu untuk melanjutkan</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <label htmlFor={f.id} className="block text-sm font-medium text-black mb-1.5">
                  {f.label}
                </label>
                {f.type === 'password' ? (
                  <div className="relative">
                    <input
                      id={f.id}
                      type={showPassword ? 'text' : 'password'}
                      value={f.value}
                      onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                      required
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <input
                    id={f.id}
                    type={f.type}
                    value={f.value}
                    onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                    required
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 text-sm"
                  />
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="pt-1"
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full shadow-[0_10px_20px_rgba(79,104,175,0.25)] hover:shadow-[0_14px_28px_rgba(79,104,175,0.35)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-sm tracking-wide"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </motion.button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38, duration: 0.4 }}
            className="mt-5"
          >
            <div className="relative flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-black/40 whitespace-nowrap">atau lanjutkan dengan</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <motion.button
              type="button"
              onClick={handleGoogleClick}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-white border border-gray-200 text-black font-medium rounded-full hover:border-gray-300 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3 text-sm cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Masuk dengan Google
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.46, duration: 0.4 }}
            className="mt-8 text-center text-sm text-black/50"
          >
            Belum punya akun?{' '}
            <Link to="/daftar" className="text-primary font-medium hover:underline">
              Daftar
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

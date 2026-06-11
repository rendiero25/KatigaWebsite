import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../services/api';

export default function Daftar() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({ password: false, confirmPassword: false });
  const [coverOffset, setCoverOffset] = useState({ x: 0, y: 0 });
  const coverRef = useRef<HTMLDivElement>(null);

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      const data = await api.customerGoogleAuth(response.credential);
      if (data.token) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerName', data.customer.name);
        localStorage.setItem('customerAvatar', data.customer.avatar || '');
        navigate('/profil');
      } else {
        setError(data.message || 'Daftar dengan Google gagal');
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });
  }, [handleGoogleResponse]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!coverRef.current) return;
    const rect = coverRef.current.getBoundingClientRect();
    setCoverOffset({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 16,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 16,
    });
  };

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

  const fields: { id: string; label: string; type: string; placeholder: string; field: FormField; required?: boolean }[] = [
    { id: 'name', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama kamu', field: 'name' },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'email@kamu.com', field: 'email' },
    { id: 'phone', label: 'Nomor HP (opsional)', type: 'tel', placeholder: '08xxxxxxxxxx', field: 'phone', required: false },
    { id: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter', field: 'password' },
    { id: 'confirmPassword', label: 'Konfirmasi Password', type: 'password', placeholder: 'Ulangi password', field: 'confirmPassword' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand cover */}
      <div
        ref={coverRef}
        className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] items-center justify-center"
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <motion.div
          className="relative text-center text-white px-12 select-none"
          animate={{ x: coverOffset.x, y: coverOffset.y }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-white text-2xl font-black tracking-tight">K</span>
          </motion.div>
          <motion.h2
            className="text-4xl font-bold mb-4 leading-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Bergabung Sekarang
          </motion.h2>
          <motion.p
            className="text-white/70 text-lg leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Buat akun untuk mulai<br />berbelanja di Katiga
          </motion.p>
        </motion.div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center min-h-screen px-8 py-16 bg-[#F9F7F2]">
        <div className="w-full max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-3xl font-bold text-black mb-2">Daftar Akun</h1>
            <p className="text-black/50 mb-8">Buat akun untuk mulai berbelanja</p>
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
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <label htmlFor={f.id} className="block text-sm font-medium text-black mb-1.5">
                  {f.label}
                </label>
                {f.type === 'password' ? (
                  <div className="relative">
                    <input
                      id={f.id}
                      type={(f.field === 'password' ? showPw.password : showPw.confirmPassword) ? 'text' : 'password'}
                      value={form[f.field]}
                      onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                      required={f.required !== false}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPw((prev) =>
                          f.field === 'password'
                            ? { ...prev, password: !prev.password }
                            : { ...prev, confirmPassword: !prev.confirmPassword }
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {(f.field === 'password' ? showPw.password : showPw.confirmPassword)
                        ? <FiEyeOff className="w-4 h-4" />
                        : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <input
                    id={f.id}
                    type={f.type}
                    value={form[f.field]}
                    onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                    required={f.required !== false}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 text-sm"
                  />
                )}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="pt-1"
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full shadow-[0_10px_20px_rgba(79,104,175,0.25)] hover:shadow-[0_14px_28px_rgba(79,104,175,0.35)] transition-all duration-300 disabled:opacity-60 text-sm tracking-wide"
              >
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </motion.button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.52, duration: 0.4 }}
            className="mt-5"
          >
            <div className="relative flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-black/40 whitespace-nowrap">atau daftar dengan</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <motion.button
              type="button"
              onClick={handleGoogleClick}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-white border border-gray-200 text-black font-medium rounded-full hover:border-gray-300 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Daftar dengan Google
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-8 text-center text-sm text-black/50"
          >
            Sudah punya akun?{' '}
            <Link to="/masuk" className="text-primary font-medium hover:underline">
              Masuk
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Daftar() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        navigate('/');
      } else {
        setError(data.message || 'Pendaftaran gagal');
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-black mb-2">Daftar Akun</h1>
          <p className="text-black/60 text-sm mb-6">Buat akun untuk mulai berbelanja</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama kamu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="email@kamu.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Nomor HP</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Min. 6 karakter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Konfirmasi Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ulangi password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
            >
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-black/60">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="text-primary font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

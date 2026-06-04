import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Masuk() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.customerLogin(form.email, form.password);
      if (data.token) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerName', data.customer.name);
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
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4 py-20">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-black mb-2">Masuk</h1>
          <p className="text-black/60 text-sm mb-6">Masuk ke akun kamu untuk melanjutkan</p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="email@kamu.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Password kamu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-black/60">
            Belum punya akun?{' '}
            <Link to="/daftar" className="text-primary font-medium hover:underline">
              Daftar
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

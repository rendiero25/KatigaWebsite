import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface CustomerData {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export default function Profil() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) {
      navigate('/masuk');
      return;
    }
    api.getCustomerProfile()
      .then((data: CustomerData & { message?: string }) => {
        if (data._id) setCustomer(data);
        else navigate('/masuk');
      })
      .catch(() => navigate('/masuk'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerName');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F9F7F2] pt-32 pb-16">
        <div className="container mx-auto px-4 sm:px-10 lg:px-20 max-w-2xl">
          <motion.div
            className="bg-white rounded-2xl shadow-sm p-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-2xl font-bold text-black mb-6">Profil Saya</h1>
            {customer && (
              <div className="space-y-5">
                {[
                  { label: 'Nama', value: customer.name },
                  { label: 'Email', value: customer.email },
                  ...(customer.phone ? [{ label: 'No. HP', value: customer.phone }] : []),
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                  >
                    <p className="text-xs font-medium text-black/40 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-base text-black">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-8 pt-6 border-t border-gray-100"
            >
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-gradient-to-br from-[#4F68AF] to-[#2B3A67] text-white font-medium rounded-full hover:shadow-lg transition-all duration-300 text-sm tracking-wide"
              >
                Keluar
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://katiga.id' // Fallback
];

// Add FRONTEND_URL from env if it exists
if (process.env.FRONTEND_URL) {
  // Support comma-separated URLs and remove trailing slashes
  const envUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
  allowedOrigins.push(...envUrls);
}

console.log('Allowed Origins configuration:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || (process.env.NODE_ENV !== 'production' && isLocalhost)) {
      return callback(null, true);
    }

    console.log('BLOCKED BY CORS - Origin:', origin);
    var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));
// Midtrans webhook needs raw body for signature verification — must come before express.json()
app.post('/api/orders/webhook/midtrans', express.raw({ type: '*/*' }), require('./routes/orderRoutes').webhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files with loose CORS (Images are usually public)
app.use('/uploads', cors({ origin: '*', credentials: false }), express.static(path.join(__dirname, 'uploads')));

// Import Routes
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');
const heroRoutes = require('./routes/heroRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const advantageRoutes = require('./routes/advantageRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const aboutRoutes = require('./routes/aboutRoutes');
const certificationRoutes = require('./routes/certificationRoutes');
const certificationTechRoutes = require('./routes/certificationTechRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const contactRoutes = require('./routes/contactRoutes');
const footerRoutes = require('./routes/footerRoutes');
const newsRoutes = require('./routes/newsRoutes');
const authRoutes = require('./routes/authRoutes');
const manufacturingRoutes = require('./routes/manufacturingRoutes');

// Use Routes
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/advantages', advantageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/certification-tech', certificationTechRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/footer', footerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/manufacturing', manufacturingRoutes);

app.use('/api/product-page', require('./routes/productPageRoutes'));
app.use('/api/contact-page', require('./routes/contactPageRoutes'));

// Ecommerce routes
app.use('/api/customers/me/addresses', require('./routes/customerAddresses'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/customers', require('./routes/customerAuthRoutes'));
app.use('/api/shipping', require('./routes/shippingRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin/customers', require('./routes/adminCustomerRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/admin/reviews', require('./routes/adminReviewRoutes'));
app.use('/api/promotions', require('./routes/promotionRoutes'));

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to KumaKuma API' });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'https://kumakuma-website.vercel.app' // Fallback or env var
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && !origin.includes('vercel.app')) {
       // Optional: Allow all vercel deploy previews via .includes('vercel.app') check if needed, 
       // or keep it strict. For now, strict check against list + flexible vercel.
       // flexible check for vercel previews:
       if (origin.endsWith('.vercel.app')) {
           return callback(null, true);
       }
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to KumaKuma API' });
});

app.use('/api/product-page', require('./routes/productPageRoutes'));
app.use('/api/contact-page', require('./routes/contactPageRoutes'));

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

const mongoose = require('mongoose');

const manufacturingSchema = new mongoose.Schema({
  tagline: {
    type: String,
    required: true,
    default: 'Kualitas yang Kami Jaga dari Hulu ke Hilir'
  },
  description: {
    type: String,
    required: true,
    default: 'Sebagai produsen langsung (direct manufacturer), kami mengawasi setiap detik proses pembuatan. Mulai dari pemintalan benang (Spinning), penjahitan (Sewing), hingga inspeksi ketat (Inspection) untuk memastikan hanya kelembutan terbaik yang menyentuh kulit bayi Anda.'
  },
  backgroundImage: {
    type: String, // URL to uploaded image
    required: false
  },
  label: {
    type: String,
    default: 'Tentang Kami'
  },
  ctaLabel: {
    type: String,
    default: 'Baca Cerita Kami'
  },
  ctaUrl: {
    type: String,
    default: '/tentang-kami'
  },
  features: [{
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String, // URL to uploaded image
      required: false
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Manufacturing', manufacturingSchema);

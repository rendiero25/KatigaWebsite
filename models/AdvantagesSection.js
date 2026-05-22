const mongoose = require('mongoose');

const advantagesSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'KEUNGGULAN KAMI'
  },
  subtitle: {
    type: String,
    default: 'Tumbuh Bersama 4 Juta Bayi di Indonesia.'
  },
  content: {
    type: String, // For the longer description paragraph
    default: 'PT Kusuma Kencana Khatulistiwa hadir untuk menjawab kekhawatiran orang tua akan kenyamanan dan keamanan si kecil. Kami memproduksi perlengkapan bayi dan handuk keluarga yang aman, nyaman, dan berkualitas tinggi untuk mempererat ikatan kasih sayang keluarga.'
  }
}, { timestamps: true });

module.exports = mongoose.model('AdvantagesSection', advantagesSectionSchema);

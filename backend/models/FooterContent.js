const mongoose = require('mongoose');

const footerContentSchema = new mongoose.Schema({
  consultationTitle: {
    type: String,
    default: 'Gratis Konsultasi'
  },
  consultationText: {
    type: String,
    default: ''
  },
  copyright: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('FooterContent', footerContentSchema);

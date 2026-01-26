const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  logo: {
    type: String,
    default: ''
  },
  companyName: {
    type: String,
    default: 'PT Kusuma Kencana Khatulistiwa'
  },
  tagline: {
    type: String,
    default: ''
  },
  shopNowUrl: {
    type: String,
    default: ''
  },
  tokopediaUrl: {
    type: String,
    default: ''
  },
  shopeeUrl: {
    type: String,
    default: ''
  },
  instagramUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);

const mongoose = require('mongoose');

const heroSectionSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  buttonName: {
    type: String,
    default: ''
  },
  buttonLink: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('HeroSection', heroSectionSchema);

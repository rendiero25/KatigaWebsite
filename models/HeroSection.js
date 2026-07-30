const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
  media: {
    type: String,
    default: ''
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  title: {
    type: String,
    default: ''
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
}, { _id: false });

const heroSectionSchema = new mongoose.Schema({
  // Legacy single-slide fields — kept for backward compatibility with
  // documents created before the multi-slide slideshow. Do not remove:
  // production data may still only have these fields populated.
  image: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
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
  },
  slides: {
    type: [heroSlideSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('HeroSection', heroSectionSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: false
  },
  images: {
    type: [String],
    default: []
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true
  },
  price: {
    type: String,
    default: ''
  },
  link: {
    type: String,
    default: ''
  },
  linkTokopedia: {
    type: String,
    default: ''
  },
  linkShopee: {
    type: String,
    default: ''
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  priceNumeric: {
    type: Number,
    default: 0
  },
  weightGrams: {
    type: Number,
    default: 0
  },
  dimensions: {
    length: { type: Number, default: 1 },
    width:  { type: Number, default: 1 },
    height: { type: Number, default: 1 }
  },
  variants: [{
    name:       { type: String, default: '' },
    image:      { type: String, default: '' },
    price:      { type: Number, default: 0 },
    weightGrams:{ type: Number, default: 0 },
    dimensions: {
      length: { type: Number, default: 1 },
      width:  { type: Number, default: 1 },
      height: { type: Number, default: 1 }
    }
  }],
  ratingAvg:   { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

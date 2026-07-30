const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }
}, { _id: false });

const shopTheLookSchema = new mongoose.Schema({
  title: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  hotspots: {
    type: [hotspotSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('ShopTheLook', shopTheLookSchema);

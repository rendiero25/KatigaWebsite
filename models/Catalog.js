const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  backgroundImage: {
    type: String,
    default: ''
  },
  cardImage: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Catalog', catalogSchema);

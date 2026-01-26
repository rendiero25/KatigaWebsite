const mongoose = require('mongoose');

const certificationTechnologySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  points: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('CertificationTechnology', certificationTechnologySchema);

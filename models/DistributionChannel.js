const mongoose = require('mongoose');

const distributionChannelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  mapImage: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('DistributionChannel', distributionChannelSchema);

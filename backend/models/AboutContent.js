const mongoose = require('mongoose');

const aboutContentSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['history', 'mission', 'vision', 'teamwork']
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('AboutContent', aboutContentSchema);

const mongoose = require('mongoose');

const newsArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    default: 'Uncategorized'
  }
}, { timestamps: true });

module.exports = mongoose.model('NewsArticle', newsArticleSchema);

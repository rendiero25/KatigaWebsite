const mongoose = require('mongoose');

const contactPageSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "Let's get in touch"
  },
  subtitle1: {
    type: String,
    default: "Don't be afraid to say hello with us!"
  },
  subtitle2: {
    type: String,
    default: "Great! we're excited to hear from you and let's start something special together. Call us for any inquery."
  }
}, { timestamps: true });

module.exports = mongoose.model('ContactPage', contactPageSchema);

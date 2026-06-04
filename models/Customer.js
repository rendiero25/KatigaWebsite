const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, trim: true },
  defaultAddress: {
    recipientName: { type: String, default: '' },
    phone:         { type: String, default: '' },
    street:        { type: String, default: '' },
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    postalCode:    { type: String, default: '' },
    areaId:        { type: String, default: '' },
    areaName:      { type: String, default: '' },
  }
}, { timestamps: true });

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

customerSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);

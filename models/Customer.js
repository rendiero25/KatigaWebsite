const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedAddressSchema = new mongoose.Schema({
  label:         { type: String, default: '' },
  recipientName: { type: String, default: '' },
  phone:         { type: String, default: '' },
  street:        { type: String, default: '' },
  city:          { type: String, default: '' },
  province:      { type: String, default: '' },
  postalCode:    { type: String, default: '' },
  areaId:        { type: String, default: '' },
  areaName:      { type: String, default: '' },
  isDefault:     { type: Boolean, default: false },
});

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: '' },
  phone: { type: String, default: '', trim: true },
  avatar: { type: String, default: '' },
  googleId: { type: String, default: '', index: true },
  suspended: { type: Boolean, default: false },
  defaultAddress: {
    recipientName: { type: String, default: '' },
    phone:         { type: String, default: '' },
    street:        { type: String, default: '' },
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    postalCode:    { type: String, default: '' },
    areaId:        { type: String, default: '' },
    areaName:      { type: String, default: '' },
  },
  addresses: [savedAddressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

customerSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

customerSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);

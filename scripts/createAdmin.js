require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const existing = await Admin.findOne();
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = new Admin({ email: 'admin@kumakuma.com', password: 'admin123' });
  await admin.save();
  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });

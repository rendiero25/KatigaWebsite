const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
  },
  type: { type: String, enum: ['complaint', 'return'], required: true },
  reason: { type: String, required: true },
  photos: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'processing', 'awaiting_return_shipment', 'return_shipped', 'return_received', 'resolved', 'rejected'],
    default: 'open',
  },
  adminNote: { type: String, default: '' },
  resolvedAt: { type: Date },
  // Barang dari pembeli menuju gudang. bookedBy 'merchant' berarti Katiga yang memesan
  // penjemputan lewat Biteship; 'customer' berarti pembeli memakai kurir sendiri dan
  // mengisi resi plus foto bukti secara manual.
  returnShipment: {
    bookedBy: { type: String, enum: ['merchant', 'customer'], default: 'customer' },
    courier: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    biteshipOrderId: { type: String, default: '' },
    waybillId: { type: String, default: '' },
    // Ongkir yang ditagih Biteship untuk leg penjemputan. Hanya terisi saat kita yang
    // memesan; kalau pembeli pakai kurir sendiri, nominalnya tidak kita ketahui.
    cost: { type: Number, default: 0 },
    photos: [{ type: String }],
    shippedAt: { type: Date },
  },
  resolution: {
    type: { type: String, enum: ['refund', 'replace'] },
    note: { type: String, default: '' },
    // Nominal yang benar-benar ditransfer ke pembeli: total pesanan, dikurangi ongkir
    // penjemputan bila retur terjadi karena kesalahan pembeli.
    refundAmount: { type: Number, default: 0 },
    returnShippingDeducted: { type: Number, default: 0 },
  },
  // Barang dari gudang menuju pembeli: barang pengganti saat resolusi 'replace', atau
  // barang yang dipulangkan saat retur ditolak.
  outboundShipment: {
    kind: { type: String, enum: ['replacement', 'return_to_buyer'] },
    biteshipOrderId: { type: String, default: '' },
    trackingCode:    { type: String, default: '' },
    waybillId:       { type: String, default: '' },
    courier:         { type: String, default: '' },
    service:         { type: String, default: '' },
    shippedAt:       { type: Date },
  },
}, { timestamps: true });

complaintSchema.index({ customer: 1 });
complaintSchema.index({ order: 1 });
complaintSchema.index({ status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);

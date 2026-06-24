const Notification = require('../models/Notification');
const Customer = require('../models/Customer');

const connections = new Map(); // 'admin' | `customer:<id>` -> Set<res>

const keyFor = (recipientType, recipientId) =>
  recipientType === 'admin' ? 'admin' : `customer:${recipientId}`;

function registerConnection(recipientType, recipientId, res) {
  const key = keyFor(recipientType, recipientId);
  if (!connections.has(key)) connections.set(key, new Set());
  connections.get(key).add(res);
  return () => connections.get(key)?.delete(res);
}

function pushToConnections(recipientType, recipientId, doc) {
  const set = connections.get(keyFor(recipientType, recipientId));
  if (!set?.size) return;
  const data = `data: ${JSON.stringify(doc)}\n\n`;
  for (const res of set) res.write(data);
}

async function notifyAdmin({ type, title, message, link = '', relatedId = null }) {
  const doc = await Notification.create({ recipientType: 'admin', type, title, message, link, relatedId });
  pushToConnections('admin', null, doc);
  return doc;
}

async function notifyCustomer({ customerId, type, title, message, link = '', relatedId = null }) {
  const doc = await Notification.create({ recipientType: 'customer', recipientId: customerId, type, title, message, link, relatedId });
  pushToConnections('customer', customerId, doc);
  return doc;
}

async function broadcastToAllCustomers({ type, title, message, link = '', relatedId = null }) {
  const customers = await Customer.find().select('_id');
  if (!customers.length) return;
  const docs = await Notification.insertMany(
    customers.map((c) => ({ recipientType: 'customer', recipientId: c._id, type, title, message, link, relatedId }))
  );
  for (const doc of docs) pushToConnections('customer', doc.recipientId.toString(), doc);
}

module.exports = { registerConnection, notifyAdmin, notifyCustomer, broadcastToAllCustomers };

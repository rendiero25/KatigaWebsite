require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const orders = mongoose.connection.collection('orders');

  const renamed = await orders.updateMany({}, {
    $rename: {
      midtransOrderId: 'orderCode',
      midtransPaymentType: 'paymentMethod',
    },
  });
  console.error(`[Migrate] renamed on ${renamed.modifiedCount} orders`);

  const unset = await orders.updateMany(
    { midtransFraudStatus: { $exists: true } },
    { $unset: { midtransFraudStatus: '' } }
  );
  console.error(`[Migrate] dropped midtransFraudStatus on ${unset.modifiedCount} orders`);

  try {
    await orders.dropIndex('midtransOrderId_1');
    console.error('[Migrate] dropped index midtransOrderId_1');
  } catch (err) {
    console.error(`[Migrate] dropIndex skipped: ${err.message}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[Migrate] failed:', err);
  process.exit(1);
});

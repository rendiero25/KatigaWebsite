const axios = require('axios');

const BASE_URL = 'https://api.biteship.com';

const headers = () => ({
  Authorization: `Bearer ${process.env.BITESHIP_API_KEY}`,
  'Content-Type': 'application/json',
});

async function searchAreas(keyword) {
  const res = await axios.get(`${BASE_URL}/v1/maps/areas`, {
    headers: headers(),
    params: { input: keyword, type: 'single' },
  });
  return res.data.areas ?? [];
}

async function getRates({ destinationAreaId, items }) {
  const payload = {
    origin_area_id: process.env.BITESHIP_ORIGIN_AREA_ID,
    destination_area_id: destinationAreaId,
    couriers: 'jne,jnt,sicepat,anteraja,pos',
    items: items.map((item) => ({
      name: item.name,
      description: item.name,
      value: item.priceNumeric,
      length: item.dimensions?.length ?? 1,
      width: item.dimensions?.width ?? 1,
      height: item.dimensions?.height ?? 1,
      weight: item.weightGrams ?? 100,
      quantity: item.quantity,
    })),
  };
  const res = await axios.post(`${BASE_URL}/v1/rates/couriers`, payload, { headers: headers() });
  return res.data.pricing ?? [];
}

async function createOrder(order) {
  const payload = {
    shipper_contact_name: process.env.SHIPPER_NAME || 'Katiga',
    shipper_contact_phone: process.env.SHIPPER_PHONE,
    shipper_contact_email: process.env.SHIPPER_EMAIL,
    shipper_organization: process.env.SHIPPER_NAME || 'Katiga',
    origin_contact_name: process.env.SHIPPER_NAME || 'Katiga',
    origin_contact_phone: process.env.SHIPPER_PHONE,
    origin_address: process.env.ORIGIN_ADDRESS,
    origin_area_id: process.env.BITESHIP_ORIGIN_AREA_ID,
    destination_contact_name: order.shippingAddress.recipientName,
    destination_contact_phone: order.shippingAddress.phone,
    destination_address: order.shippingAddress.street,
    destination_postal_code: order.shippingAddress.postalCode,
    destination_area_id: order.shippingAddress.areaId,
    courier_company: order.shippingCourier,
    courier_type: order.shippingService,
    delivery_type: 'now',
    order_note: `Order ID: ${order._id}`,
    items: order.items.map((item) => ({
      id: item.product?.toString() ?? '',
      name: item.name,
      description: item.name,
      value: item.priceNumeric,
      length: 1,
      width: 1,
      height: 1,
      weight: item.weightGrams ?? 100,
      quantity: item.quantity,
    })),
  };
  const res = await axios.post(`${BASE_URL}/v1/orders`, payload, { headers: headers() });
  return res.data;
}

module.exports = { searchAreas, getRates, createOrder };

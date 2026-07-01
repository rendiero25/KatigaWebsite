const axios = require('axios');

const BASE_URL = 'https://api.biteship.com';

const getApiKey = () => process.env.BITESHIP_API_KEY || process.env.BITESHIP_API_KEY_SANDBOX;

const headers = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Biteship API key is not configured');
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
};

const resolvePositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveShippingWeight = (value) => resolvePositiveNumber(value) ?? 100;

const normalizeDimensions = (dimensions) => ({
  length: resolvePositiveNumber(dimensions?.length) ?? 1,
  width: resolvePositiveNumber(dimensions?.width) ?? 1,
  height: resolvePositiveNumber(dimensions?.height) ?? 1,
});

async function searchAreas(keyword) {
  const res = await axios.get(`${BASE_URL}/v1/maps/areas`, {
    headers: headers(),
    params: { input: keyword, type: 'single' },
  });
  return (res.data.areas ?? []).map((area) => ({
    ...area,
    area_id: area.area_id || area.id || '',
    postal_code: area.postal_code ? String(area.postal_code) : '',
  }));
}

async function getCouriers() {
  const res = await axios.get(`${BASE_URL}/v1/couriers`, { headers: headers() });
  const couriers = res.data.couriers ?? [];
  const seen = new Map();
  for (const c of couriers) {
    if (!seen.has(c.courier_code)) {
      seen.set(c.courier_code, { code: c.courier_code, label: c.courier_name });
    }
  }
  return [...seen.values()];
}

async function getRates({ destinationAreaId, items, courierCodes }) {
  const payload = {
    origin_area_id: process.env.BITESHIP_ORIGIN_AREA_ID,
    destination_area_id: destinationAreaId,
    couriers: courierCodes.join(','),
    items: items.map((item) => {
      const dimensions = normalizeDimensions(item.dimensions);

      return {
        name: item.name,
        description: item.name,
        value: item.priceNumeric,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        weight: resolveShippingWeight(item.weightGrams),
        quantity: item.quantity,
      };
    }),
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
    items: order.items.map((item) => {
      const dimensions = normalizeDimensions(item.dimensions);

      return {
        id: item.product?.toString() ?? '',
        name: item.name,
        description: item.name,
        value: item.priceNumeric,
        length: dimensions.length,
        width: dimensions.width,
        height: dimensions.height,
        weight: resolveShippingWeight(item.weightGrams),
        quantity: item.quantity,
      };
    }),
  };
  const res = await axios.post(`${BASE_URL}/v1/orders`, payload, { headers: headers() });
  return res.data;
}

async function getOrderTracking(biteshipOrderId) {
  const res = await axios.get(`${BASE_URL}/v1/orders/${biteshipOrderId}`, { headers: headers() });
  return res.data;
}

async function cancelBiteshipOrder(biteshipOrderId) {
  const res = await axios.delete(`${BASE_URL}/v1/orders/${biteshipOrderId}`, { headers: headers() });
  return res.data;
}

module.exports = { searchAreas, getCouriers, getRates, createOrder, getOrderTracking, cancelBiteshipOrder };

const BASE_URL = process.env.MAYAR_API_URL;
const API_KEY = process.env.MAYAR_API_KEY;

class MayarError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'MayarError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  if (!BASE_URL || !API_KEY) {
    throw new MayarError('MAYAR_API_URL / MAYAR_API_KEY belum diset', 0, null);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = body?.messages ?? `Mayar ${path} gagal (${res.status})`;
    throw new MayarError(message, res.status, body);
  }

  return body?.data ?? body;
}

async function createPayment({ name, amount, email, mobile, description, expiredAt, redirectUrl, extraData }) {
  const data = await request('/payments/create', {
    method: 'POST',
    body: JSON.stringify({
      name,
      amount,
      email,
      mobile,
      description,
      expiredAt,
      redirectUrl,
      extraData,
    }),
  });

  return {
    id: data.id,
    transactionId: data.transactionId,
    link: data.link,
  };
}

async function getTransaction(transactionId) {
  const data = await request(`/transactions/${transactionId}`, { method: 'GET' });

  return {
    status: data.status,
    paymentMethod: data.paymentMethod ?? '',
    amount: data.amount,
  };
}

module.exports = { createPayment, getTransaction, MayarError };

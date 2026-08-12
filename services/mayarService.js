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

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch (err) {
    throw new MayarError(`Network error calling ${path}: ${err.message}`, 0, null);
  }

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

  if (!data?.transactionId || !data?.link) {
    // 502 indicates a malformed upstream response, not a client/auth error
    throw new MayarError('Invalid createPayment response: missing transactionId or link', 502, data);
  }

  return {
    id: data.id,
    transactionId: data.transactionId,
    link: data.link,
  };
}

async function getTransaction(transactionId) {
  const data = await request(`/transactions/${transactionId}`, { method: 'GET' });

  if (!data?.status) {
    // 502 indicates a malformed upstream response, not a client/auth error
    throw new MayarError('Invalid getTransaction response: missing status', 502, data);
  }

  return {
    status: data.status,
    paymentMethod: data.paymentMethod ?? '',
    amount: data.amount,
  };
}

module.exports = { createPayment, getTransaction, MayarError };

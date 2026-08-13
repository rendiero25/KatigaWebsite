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

  // Mayar memakai dua status yang bergerak sendiri-sendiri. Diverifikasi di sandbox
  // 2026-08-13: data.status TIDAK pernah menjadi 'expired' saat pembayaran kedaluwarsa —
  // ia tetap 'created', dan yang berubah hanya paymentLink.status (unpaid → closed).
  // Tanpa linkStatus, pesanan kedaluwarsa akan macet 'pending' selamanya.
  return {
    status: data.status,
    linkStatus: data.paymentLink?.status ?? '',
    paymentMethod: data.paymentMethod ?? '',
    amount: data.amount,
  };
}

// Mayar tidak punya endpoint hapus transaksi — catatan transaksi permanen. Yang bisa
// dilakukan hanya menutup payment request-nya, efeknya sama seperti kedaluwarsa:
// link mati, transaksi tetap tercatat. Butuh paymentLinkId, bukan transactionId.
async function closePayment(paymentLinkId) {
  await request(`/payments/${paymentLinkId}/close`, { method: 'POST' });
}

module.exports = { createPayment, getTransaction, closePayment, MayarError };

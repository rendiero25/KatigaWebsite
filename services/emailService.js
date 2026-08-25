const { Resend } = require('resend');

const sendWelcomeEmail = async (name, email) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Katiga <noreply@katiga.id>',
      to: email,
      subject: 'Selamat datang di Katiga!',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h1 style="color: #4f68af; margin-bottom: 8px;">Halo, ${name}!</h1>
          <p style="color: #374151; line-height: 1.6;">
            Terima kasih sudah mendaftar di <strong>Katiga</strong>.
            Akun kamu sudah aktif dan siap digunakan.
          </p>
          <a href="https://katiga.id/produk"
             style="display: inline-block; margin-top: 24px; padding: 12px 28px;
                    background: linear-gradient(135deg, #4f68af, #2b3a67);
                    color: white; border-radius: 999px; text-decoration: none;
                    font-weight: 500;">
            Mulai Belanja
          </a>
        </div>
      `,
    });
  } catch (err) {
    console.error('sendWelcomeEmail failed:', err.message);
  }
};

const CONTACT_INBOX = process.env.CONTACT_INBOX || 'admin@katiga.id';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const row = (label, value) =>
  value
    ? `<tr>
         <td style="padding: 6px 16px 6px 0; color: #6f6f71; vertical-align: top; white-space: nowrap;">${label}</td>
         <td style="padding: 6px 0; color: #1e1e1e;">${escapeHtml(value)}</td>
       </tr>`
    : '';

// Forwards a contact-form submission to the team inbox. Returns false instead of
// throwing so a mail outage can never fail the visitor's submission: the message
// is already persisted and surfaced in /admin/messages either way.
const sendContactNotification = async ({ name, email, phone, subject, message }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set, contact notification skipped');
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Katiga <noreply@katiga.id>',
      to: CONTACT_INBOX,
      replyTo: email || undefined,
      subject: subject ? `Pesan kontak: ${subject}` : `Pesan kontak baru dari ${name || 'pengunjung'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 18px; color: #1e1e1e; margin: 0 0 16px;">Pesan kontak baru</h1>
          <table style="border-collapse: collapse; font-size: 14px; width: 100%;">
            ${row('Nama', name)}
            ${row('Email', email)}
            ${row('Telepon', phone)}
            ${row('Subjek', subject)}
          </table>
          <p style="margin: 20px 0 6px; color: #6f6f71; font-size: 14px;">Pesan</p>
          <p style="white-space: pre-line; color: #1e1e1e; font-size: 14px; line-height: 1.6; margin: 0;">${escapeHtml(message)}</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] sendContactNotification rejected:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Email] sendContactNotification failed:', err.message);
    return false;
  }
};

module.exports = { sendWelcomeEmail, sendContactNotification, CONTACT_INBOX };

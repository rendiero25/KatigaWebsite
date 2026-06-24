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

module.exports = { sendWelcomeEmail };

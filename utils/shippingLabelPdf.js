const PDFDocument = require('pdfkit');

// Label 10 x 15 cm — ukuran standar kertas thermal sticker yang dipakai admin.
const PAGE = { width: 283.46, height: 425.2 };
const PAD = 10;
const CONTENT = PAGE.width - PAD * 2;
const MAX_ITEM_ROWS = 6;

// Tabel lebar bar/spasi Code 128 (nilai 0–106). Tiap pola: bar, spasi, bar, spasi, bar, spasi
// — total 11 modul, kecuali pola stop (106) yang 13 modul karena punya bar penutup tambahan.
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const CODE128_START_B = 104;
const CODE128_STOP = 106;

const fmtIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Code 128 subset B: satu nilai per karakter ASCII 32–126, ditutup checksum modulo 103.
const encodeCode128B = (raw) => {
  const chars = String(raw ?? '')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126);
  if (chars.length === 0) return null;

  const values = chars.map((c) => c.charCodeAt(0) - 32);
  let checksum = CODE128_START_B;
  values.forEach((value, i) => { checksum += value * (i + 1); });

  return [CODE128_START_B, ...values, checksum % 103, CODE128_STOP]
    .map((value) => CODE128_PATTERNS[value]);
};

const drawBarcode = (doc, raw, { x, y, width, height }) => {
  const patterns = encodeCode128B(raw);
  if (!patterns) return false;

  const modules = patterns.join('').split('').map(Number);
  // Quiet zone 10 modul di kiri dan kanan — tanpa itu scanner sering gagal membaca ujung kode.
  const totalModules = modules.reduce((sum, n) => sum + n, 0) + 20;
  const unit = width / totalModules;

  let cursor = x + unit * 10;
  modules.forEach((moduleWidth, i) => {
    const barWidth = moduleWidth * unit;
    if (i % 2 === 0) doc.rect(cursor, y, barWidth, height).fill('#000');
    cursor += barWidth;
  });
  doc.fillColor('#000');
  return true;
};

const boxedSection = (doc, y, height) => {
  doc.lineWidth(0.5).rect(PAD, y, CONTENT, height).stroke('#000');
};

const labelText = (doc, text, x, y, size = 6.5) => {
  doc.font('Helvetica').fontSize(size).fillColor('#666').text(text, x, y, { width: CONTENT - 12 });
  doc.fillColor('#000');
};

const totalWeightGrams = (order) =>
  order.items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0);

const formatWeight = (grams) =>
  grams >= 1000 ? `${(grams / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${grams} g`;

const drawLabel = (doc, order) => {
  const address = order.shippingAddress ?? {};
  const resi = order.biteshipTrackingCode || '';

  // ── Kurir ──
  let y = PAD;
  doc.font('Helvetica-Bold').fontSize(14)
    .text((order.shippingCourier || '-').toUpperCase(), PAD, y, { width: CONTENT * 0.55 });
  doc.font('Helvetica').fontSize(8)
    .text(order.shippingServiceName || order.shippingService || '', PAD + CONTENT * 0.55, y + 4, {
      width: CONTENT * 0.45,
      align: 'right',
    });
  y += 22;
  doc.lineWidth(1).moveTo(PAD, y).lineTo(PAGE.width - PAD, y).stroke('#000');
  y += 8;

  // ── Resi + barcode ──
  if (resi) {
    drawBarcode(doc, resi, { x: PAD, y, width: CONTENT, height: 42 });
    y += 45;
    doc.font('Helvetica-Bold').fontSize(11)
      .text(resi, PAD, y, { width: CONTENT, align: 'center', characterSpacing: 1 });
    y += 16;
  } else {
    doc.font('Helvetica-Bold').fontSize(9)
      .text('RESI BELUM TERSEDIA', PAD, y + 14, { width: CONTENT, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#666')
      .text('Tulis nomor resi manual setelah paket diserahkan ke kurir.', PAD, y + 27, {
        width: CONTENT,
        align: 'center',
      });
    doc.fillColor('#000');
    y += 45;
  }

  doc.lineWidth(1).moveTo(PAD, y).lineTo(PAGE.width - PAD, y).stroke('#000');
  y += 8;

  // ── Penerima ──
  const recipientTop = y;
  labelText(doc, 'PENERIMA', PAD + 6, y + 5);
  y += 15;
  doc.font('Helvetica-Bold').fontSize(10)
    .text(address.recipientName || order.customerSnapshot?.name || '-', PAD + 6, y, { width: CONTENT - 12 });
  y = doc.y + 1;
  doc.font('Helvetica').fontSize(8).text(address.phone || '-', PAD + 6, y, { width: CONTENT - 12 });
  y = doc.y + 2;
  doc.fontSize(8).text(address.street || '-', PAD + 6, y, { width: CONTENT - 12 });
  y = doc.y;
  doc.fontSize(8).text(
    [address.areaName, address.postalCode].filter(Boolean).join(' '),
    PAD + 6,
    y,
    { width: CONTENT - 12 },
  );
  y = doc.y + 6;
  boxedSection(doc, recipientTop, y - recipientTop);
  y += 6;

  // ── Pengirim ──
  const senderTop = y;
  labelText(doc, 'PENGIRIM', PAD + 6, y + 5);
  y += 15;
  doc.font('Helvetica-Bold').fontSize(9)
    .text(process.env.SHIPPER_NAME || 'Katiga', PAD + 6, y, { width: CONTENT - 12 });
  y = doc.y + 1;
  doc.font('Helvetica').fontSize(7.5).text(process.env.SHIPPER_PHONE || '-', PAD + 6, y, { width: CONTENT - 12 });
  y = doc.y + 1;
  doc.fontSize(7.5).text(
    [process.env.ORIGIN_ADDRESS, process.env.ORIGIN_POSTAL_CODE].filter(Boolean).join(' ') || '-',
    PAD + 6,
    y,
    { width: CONTENT - 12 },
  );
  y = doc.y + 6;
  boxedSection(doc, senderTop, y - senderTop);
  y += 6;

  // ── Isi paket ──
  const itemsTop = y;
  labelText(doc, 'ISI PAKET', PAD + 6, y + 5);
  y += 15;
  const rows = order.items.slice(0, MAX_ITEM_ROWS);
  rows.forEach((item) => {
    doc.font('Helvetica').fontSize(7.5)
      .text(item.name, PAD + 6, y, { width: CONTENT - 40, ellipsis: true, height: 10 });
    doc.font('Helvetica-Bold').fontSize(7.5)
      .text(`x${item.quantity}`, PAD + CONTENT - 34, y, { width: 28, align: 'right' });
    y += 10;
  });
  if (order.items.length > rows.length) {
    doc.font('Helvetica').fontSize(7).fillColor('#666')
      .text(`+${order.items.length - rows.length} produk lainnya`, PAD + 6, y, { width: CONTENT - 12 });
    doc.fillColor('#000');
    y += 10;
  }
  const weight = totalWeightGrams(order);
  if (weight > 0) {
    doc.font('Helvetica').fontSize(7.5)
      .text(`Berat total: ${formatWeight(weight)}`, PAD + 6, y, { width: CONTENT - 12 });
    y += 11;
  }
  y += 2;
  boxedSection(doc, itemsTop, y - itemsTop);
  y += 6;

  // ── Footer ──
  doc.font('Helvetica').fontSize(7).fillColor('#666');
  doc.text(`Order #${order._id.toString().slice(-8).toUpperCase()}`, PAD, y, { width: CONTENT * 0.5 });
  doc.text(
    new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    PAD + CONTENT * 0.5,
    y,
    { width: CONTENT * 0.5, align: 'right' },
  );
  y += 10;
  doc.text(`Nilai barang: ${fmtIDR(order.subtotal)}`, PAD, y, { width: CONTENT });
  doc.fillColor('#000');
};

// Satu order = satu halaman. Dipakai untuk cetak satuan maupun batch dari daftar pesanan.
const buildShippingLabelPdf = (orders, res, filename) => {
  const doc = new PDFDocument({ size: [PAGE.width, PAGE.height], margin: 0, autoFirstPage: false });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);

  orders.forEach((order) => {
    doc.addPage({ size: [PAGE.width, PAGE.height], margin: 0 });
    drawLabel(doc, order);
  });

  doc.end();
};

module.exports = { buildShippingLabelPdf };

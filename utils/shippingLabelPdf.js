const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const SiteSettings = require('../models/SiteSettings');

// Label dicetak di kertas A6 (105 x 148 mm), satu pesanan satu halaman.
const PAGE = { width: 297.64, height: 419.53 };
const PAD = 10;
const CONTENT = PAGE.width - PAD * 2;
const GAP = 6;
const COL_LEFT = CONTENT * 0.56 - GAP / 2;
const COL_RIGHT = CONTENT - COL_LEFT - GAP;
const COL_RIGHT_X = PAD + COL_LEFT + GAP;
const INSET = 5;
const MAX_ITEM_ROWS = 7;

// Banner penanganan dan footer dipaku ke dasar halaman.
const FOOTER_Y = PAGE.height - PAD - 7;
const UNBOXING_Y = FOOTER_Y - 11;
const BANNER_HEIGHT = 16;
const BANNER_TOP = UNBOXING_Y - 12 - BANNER_HEIGHT;

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

// Sama persis dengan client/src/utils/courierLogos.ts — backend CommonJS tidak bisa mengimpor
// modul TypeScript itu, jadi tabelnya disalin. Kalau satu sisi bertambah, tambahkan juga di sisi lain.
const COURIER_LOGOS = {
  gojek: 'gojek.png',
  grab: 'grab.png',
  deliveree: 'deliveree.png',
  jne: 'jne.png',
  tiki: 'tiki.png',
  ninja: 'ninjaexpress.png',
  lion: 'lionparcel.png',
  sicepat: 'sicepat.png',
  sentralcargo: 'sentralcargo.png',
  jnt: 'j&t.png',
  idexpress: 'idexpress.png',
  rpx: 'rpx.png',
  wahana: 'wahana.png',
  pos: 'posindonesia.png',
  tlx: 'tlx.jpeg',
  anteraja: 'antaraja.png',
  sap: 'sap.png',
  paxel: 'paxel.png',
  borzo: 'borzo.png',
  lalamove: 'lalamove.png',
  dash_express: 'dash.png',
};

// Di lokal berkasnya ada di client/public; setelah `npm run build` ikut tersalin ke client/dist.
const COURIER_DIRS = [
  path.join(__dirname, '..', 'client', 'public', 'couriers'),
  path.join(__dirname, '..', 'client', 'dist', 'couriers'),
];

const courierLogoCache = new Map();

const loadCourierLogo = (courierCode) => {
  const file = COURIER_LOGOS[String(courierCode || '').toLowerCase()];
  if (!file) return null;
  if (courierLogoCache.has(file)) return courierLogoCache.get(file);

  const found = COURIER_DIRS
    .map((dir) => path.join(dir, file))
    .find((full) => fs.existsSync(full));
  const buffer = found ? fs.readFileSync(found) : null;
  courierLogoCache.set(file, buffer);
  return buffer;
};

// PDFKit hanya menerima PNG dan JPEG. Logo brand disimpan di Cloudinary dan bisa berformat
// apa saja (webp, svg), jadi URL-nya dilewatkan transformasi f_png dulu.
const asCloudinaryPng = (url) =>
  url.includes('/upload/') ? url.replace('/upload/', '/upload/f_png,w_400/') : url;

// Di-cache sepuluh menit, bukan selamanya: proses `npm start` hidup terus, dan admin yang
// mengganti logo di CMS harus melihat hasilnya tanpa menunggu restart.
const BRAND_CACHE_MS = 10 * 60 * 1000;
let brandCache = null;
let brandCachedAt = 0;

const loadBrand = async () => {
  if (brandCache && Date.now() - brandCachedAt < BRAND_CACHE_MS) return brandCache;

  const settings = await SiteSettings.findOne().lean().catch(() => null);
  let logo = null;
  if (settings?.logo?.startsWith('http')) {
    try {
      const response = await fetch(asCloudinaryPng(settings.logo));
      if (response.ok) logo = Buffer.from(await response.arrayBuffer());
    } catch {
      logo = null;
    }
  }

  brandCache = { logo, companyName: settings?.companyName || '' };
  brandCachedAt = Date.now();
  return brandCache;
};

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

const boxedSection = (doc, x, y, width, height) => {
  doc.lineWidth(0.5).rect(x, y, width, height).stroke('#000');
};

const labelText = (doc, text, x, y, width, size = 6) => {
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#666')
    .text(text, x, y, { width, characterSpacing: 0.6 });
  doc.fillColor('#000');
};

const totalWeightGrams = (order) =>
  order.items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0);

// Berat volumetrik kurir Indonesia: panjang x lebar x tinggi (cm) dibagi 6000, hasilnya kg.
const volumetricKg = (order) =>
  order.items.reduce((sum, item) => {
    const d = item.dimensions ?? {};
    return sum + ((d.length ?? 0) * (d.width ?? 0) * (d.height ?? 0) * item.quantity) / 6000;
  }, 0);

// ORIGIN_ADDRESS versi Google Maps sudah memuat kode pos di ujungnya. Menambahkan
// ORIGIN_POSTAL_CODE begitu saja membuat angkanya tercetak dua kali.
const originAddress = () => {
  const street = (process.env.ORIGIN_ADDRESS || '').trim();
  const postal = (process.env.ORIGIN_POSTAL_CODE || '').trim();
  if (!street) return postal || '-';
  return postal && !street.endsWith(postal) ? `${street} ${postal}` : street;
};

const formatWeight = (grams) =>
  grams >= 1000 ? `${(grams / 1000).toFixed(2).replace(/\.?0+$/, '')} kg` : `${grams} g`;

const drawLabel = (doc, order, brand) => {
  const address = order.shippingAddress ?? {};
  const resi = order.biteshipTrackingCode || '';
  const orderCode = order.orderCode || `#${order._id.toString().slice(-8).toUpperCase()}`;

  // ── Kurir ──
  let y = PAD;
  const courierLogo = loadCourierLogo(order.shippingCourier);
  if (courierLogo) {
    doc.image(courierLogo, PAD, y, { fit: [80, 24] });
  } else {
    doc.font('Helvetica-Bold').fontSize(16)
      .text((order.shippingCourier || '-').toUpperCase(), PAD, y + 5, { width: CONTENT * 0.55 });
  }
  doc.font('Helvetica').fontSize(7.5)
    .text(order.shippingServiceName || order.shippingService || '', PAD + CONTENT * 0.55, y + 9, {
      width: CONTENT * 0.45,
      align: 'right',
    });
  y += 28;
  doc.lineWidth(1).moveTo(PAD, y).lineTo(PAGE.width - PAD, y).stroke('#000');
  y += 6;

  // ── Resi + barcode ──
  if (resi) {
    drawBarcode(doc, resi, { x: PAD, y, width: CONTENT, height: 46 });
    y += 50;
    doc.font('Helvetica-Bold').fontSize(11)
      .text(resi, PAD, y, { width: CONTENT, align: 'center', characterSpacing: 1.5 });
    y += 15;
  } else {
    doc.font('Helvetica-Bold').fontSize(9)
      .text('RESI BELUM TERSEDIA', PAD, y + 20, { width: CONTENT, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#666')
      .text('Tulis nomor resi manual setelah paket diserahkan ke kurir.', PAD, y + 33, {
        width: CONTENT,
        align: 'center',
      });
    doc.fillColor('#000');
    y += 65;
  }

  doc.lineWidth(1).moveTo(PAD, y).lineTo(PAGE.width - PAD, y).stroke('#000');
  y += 6;

  // ── Penerima ──
  const recipientTop = y;
  labelText(doc, 'PENERIMA', PAD + INSET, y + 4, CONTENT - INSET * 2);
  y += 13;
  doc.font('Helvetica-Bold').fontSize(11)
    .text(address.recipientName || order.customerSnapshot?.name || '-', PAD + INSET, y, {
      width: CONTENT - INSET * 2,
    });
  y = doc.y + 1;
  doc.font('Helvetica-Bold').fontSize(8)
    .text(address.phone || order.customerSnapshot?.phone || '-', PAD + INSET, y, { width: CONTENT - INSET * 2 });
  y = doc.y + 2;
  doc.font('Helvetica').fontSize(8)
    .text(address.street || '-', PAD + INSET, y, { width: CONTENT - INSET * 2 });
  y = doc.y;
  const areaLine = [address.areaName, address.city, address.province].filter(Boolean).join(', ');
  if (areaLine) {
    doc.fontSize(8).text(areaLine, PAD + INSET, y, { width: CONTENT - INSET * 2 });
    y = doc.y;
  }
  if (address.postalCode) {
    doc.font('Helvetica-Bold').fontSize(8.5)
      .text(`Kode Pos ${address.postalCode}`, PAD + INSET, y, { width: CONTENT - INSET * 2 });
    y = doc.y;
  }
  y += 5;
  boxedSection(doc, PAD, recipientTop, CONTENT, y - recipientTop);
  y += 5;

  // ── Pengirim ──
  const senderTop = y;
  const brandLogoWidth = brand?.logo ? 54 : 0;
  const senderTextWidth = CONTENT - INSET * 2 - brandLogoWidth;
  labelText(doc, 'PENGIRIM', PAD + INSET, y + 4, senderTextWidth);
  y += 13;
  doc.font('Helvetica-Bold').fontSize(8.5)
    .text(process.env.SHIPPER_NAME || 'Katiga', PAD + INSET, y, { width: senderTextWidth });
  y = doc.y;
  if (brand?.companyName) {
    doc.font('Helvetica').fontSize(6.5).fillColor('#666')
      .text(brand.companyName, PAD + INSET, y, { width: senderTextWidth });
    doc.fillColor('#000');
    y = doc.y + 1;
  }
  doc.font('Helvetica').fontSize(7.5)
    .text(process.env.SHIPPER_PHONE || '-', PAD + INSET, y, { width: senderTextWidth });
  y = doc.y;
  doc.fontSize(7.5).text(originAddress(), PAD + INSET, y, { width: senderTextWidth });
  y = doc.y + 5;
  if (brand?.logo) {
    doc.image(brand.logo, PAGE.width - PAD - INSET - brandLogoWidth, senderTop + 8, {
      fit: [brandLogoWidth, Math.max(16, y - senderTop - 16)],
    });
  }
  boxedSection(doc, PAD, senderTop, CONTENT, y - senderTop);
  y += 5;

  // ── Isi paket (kiri) + data paket (kanan) ──
  // Banner dan footer dipaku ke dasar halaman: blok ini mengisi sisa ruang, tidak memanjang
  // ke bawah. Tanpa itu alamat yang panjang mendorong footer melewati batas halaman dan
  // PDFKit diam-diam menambah halaman kedua.
  const detailTop = y;
  const detailBottom = Math.max(detailTop + 70, BANNER_TOP - 6);
  const itemRoom = Math.floor((detailBottom - detailTop - 16) / 10);

  let leftY = detailTop;
  labelText(doc, 'ISI PAKET', PAD + INSET, leftY + 4, COL_LEFT - INSET * 2);
  leftY += 13;
  const rows = order.items.slice(0, Math.max(1, Math.min(MAX_ITEM_ROWS, itemRoom)));
  rows.forEach((item) => {
    const name = item.variantName ? `${item.name} (${item.variantName})` : item.name;
    doc.font('Helvetica').fontSize(7)
      .text(name, PAD + INSET, leftY, { width: COL_LEFT - INSET * 2 - 22, ellipsis: true, height: 9 });
    doc.font('Helvetica-Bold').fontSize(7)
      .text(`x${item.quantity}`, PAD + COL_LEFT - INSET - 20, leftY, { width: 20, align: 'right' });
    leftY += 10;
  });
  if (order.items.length > rows.length) {
    doc.font('Helvetica').fontSize(6.5).fillColor('#666')
      .text(`+${order.items.length - rows.length} produk lainnya`, PAD + INSET, leftY, {
        width: COL_LEFT - INSET * 2,
      });
    doc.fillColor('#000');
  }

  // Kolom kanan pakai baris satu larik — label kiri, nilai rata kanan — karena di A6 tidak
  // ada ruang untuk menaruh nilainya di baris terpisah.
  let rightY = detailTop;
  labelText(doc, 'DATA PAKET', COL_RIGHT_X + INSET, rightY + 4, COL_RIGHT - INSET * 2);
  rightY += 13;
  const weight = totalWeightGrams(order);
  const volume = volumetricKg(order);
  const infoRows = [
    ['Berat', weight > 0 ? formatWeight(weight) : '-'],
    ['Volumetrik', volume > 0 ? `${volume.toFixed(2).replace(/\.?0+$/, '')} kg` : '-'],
    ['Koli', '1 dari 1'],
    ['Nilai barang', fmtIDR(order.subtotal)],
    ['Ongkir', fmtIDR(order.shippingCost ?? 0)],
    ['Pembayaran', order.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM LUNAS'],
  ];
  infoRows.forEach(([key, value]) => {
    doc.font('Helvetica').fontSize(6.5).fillColor('#666')
      .text(key, COL_RIGHT_X + INSET, rightY + 1, { width: (COL_RIGHT - INSET * 2) * 0.45 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000')
      .text(value, COL_RIGHT_X + INSET + (COL_RIGHT - INSET * 2) * 0.45, rightY, {
        width: (COL_RIGHT - INSET * 2) * 0.55,
        align: 'right',
      });
    rightY += 10;
  });

  const detailHeight = detailBottom - detailTop;
  boxedSection(doc, PAD, detailTop, COL_LEFT, detailHeight);
  boxedSection(doc, COL_RIGHT_X, detailTop, COL_RIGHT, detailHeight);

  // ── Instruksi penanganan ──
  doc.lineWidth(0.5).rect(PAD, BANNER_TOP, CONTENT, BANNER_HEIGHT).stroke('#000');
  doc.font('Helvetica-Bold').fontSize(7.5)
    .text('BARANG PECAH BELAH - JANGAN DIBANTING, JAUHKAN DARI AIR', PAD, BANNER_TOP + 5, {
      width: CONTENT,
      align: 'center',
      characterSpacing: 0.3,
    });

  // ── Footer ──
  doc.lineWidth(0.5).moveTo(PAD, UNBOXING_Y - 5).lineTo(PAGE.width - PAD, UNBOXING_Y - 5).stroke('#666');
  doc.font('Helvetica-Bold').fontSize(7)
    .text('WAJIB REKAM VIDEO SAAT MEMBUKA PAKET UNTUK KLAIM', PAD, UNBOXING_Y, {
      width: CONTENT,
      align: 'center',
      lineBreak: false,
    });
  doc.font('Helvetica').fontSize(6.5).fillColor('#666');
  doc.text(`Order ${orderCode}`, PAD, FOOTER_Y, { width: CONTENT * 0.5 });
  doc.text(
    new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    PAD + CONTENT * 0.5,
    FOOTER_Y,
    { width: CONTENT * 0.5, align: 'right' },
  );
  doc.fillColor('#000');
};

// Satu order = satu halaman. Dipakai untuk cetak satuan maupun batch dari daftar pesanan.
// Logo brand diambil sekali di depan, sebelum header respons dikirim — kalau gagal, label
// tetap tercetak tanpa logo.
const buildShippingLabelPdf = async (orders, res, filename) => {
  const brand = await loadBrand();

  const doc = new PDFDocument({ size: [PAGE.width, PAGE.height], margin: 0, autoFirstPage: false });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);

  orders.forEach((order) => {
    doc.addPage({ size: [PAGE.width, PAGE.height], margin: 0 });
    drawLabel(doc, order, brand);
  });

  doc.end();
};

module.exports = { buildShippingLabelPdf };

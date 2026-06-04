require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function uploadFile(filePath, publicId) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const isPdf = ext === 'pdf';
  const isVideo = ['mp4', 'webm'].includes(ext);
  const resourceType = isPdf ? 'raw' : isVideo ? 'video' : 'image';

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'katiga',
    public_id: publicId,
    resource_type: resourceType,
    overwrite: false,
  });
  return result.secure_url;
}

function replaceUploadsInValue(value, urlMap) {
  if (typeof value === 'string' && value.startsWith('/uploads/')) {
    return urlMap[value] !== undefined ? urlMap[value] : value;
  }
  return value;
}

function replaceUploadsInObject(obj, urlMap) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return replaceUploadsInValue(obj, urlMap);
  if (Array.isArray(obj)) {
    return obj.map(item => replaceUploadsInObject(item, urlMap));
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = replaceUploadsInObject(obj[key], urlMap);
    }
    return result;
  }
  return obj;
}

function hasUploadsPath(obj) {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') return obj.startsWith('/uploads/');
  if (Array.isArray(obj)) return obj.some(item => hasUploadsPath(item));
  if (typeof obj === 'object') return Object.values(obj).some(v => hasUploadsPath(v));
  return false;
}

async function migrateCollection(collection, urlMap) {
  const docs = await collection.find({}).toArray();
  let updatedCount = 0;

  for (const doc of docs) {
    const docObj = { ...doc };
    delete docObj._id;
    delete docObj.__v;

    if (!hasUploadsPath(docObj)) continue;

    const updated = replaceUploadsInObject(docObj, urlMap);
    await collection.updateOne({ _id: doc._id }, { $set: updated });
    updatedCount++;
  }

  return updatedCount;
}

async function main() {
  console.log('=== Cloudinary Migration Script ===\n');

  // Step 1: Build URL map from uploads/ directory
  console.log('Reading uploads directory...');
  let files = [];
  try {
    files = fs.readdirSync(UPLOADS_DIR);
  } catch (e) {
    console.error('Could not read uploads/ directory:', e.message);
    process.exit(1);
  }
  console.log(`Found ${files.length} files in uploads/\n`);

  // Step 2: Upload each file to Cloudinary and build the map
  const urlMap = {};
  let uploadedCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  console.log('Uploading files to Cloudinary...');
  for (const filename of files) {
    const filePath = path.join(UPLOADS_DIR, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const publicId = path.basename(filename, path.extname(filename));
    const localKey = `/uploads/${filename}`;

    try {
      const secureUrl = await uploadFile(filePath, publicId);
      urlMap[localKey] = secureUrl;
      uploadedCount++;
      console.log(`  [OK] ${filename} -> ${secureUrl}`);
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        // Already uploaded — fetch the URL
        try {
          const ext = path.extname(filename).toLowerCase().replace('.', '');
          const isPdf = ext === 'pdf';
          const isVideo = ['mp4', 'webm'].includes(ext);
          const resourceType = isPdf ? 'raw' : isVideo ? 'video' : 'image';
          const info = await cloudinary.api.resource(`katiga/${publicId}`, { resource_type: resourceType });
          urlMap[localKey] = info.secure_url;
          skipCount++;
          console.log(`  [SKIP] ${filename} already exists -> ${info.secure_url}`);
        } catch (e2) {
          console.error(`  [ERROR] Could not fetch existing resource for ${filename}:`, e2.message);
          errorCount++;
        }
      } else {
        console.error(`  [ERROR] ${filename}:`, err.message);
        errorCount++;
      }
    }
  }

  console.log(`\nUpload summary: ${uploadedCount} uploaded, ${skipCount} already existed, ${errorCount} errors`);
  console.log(`URL map contains ${Object.keys(urlMap).length} entries\n`);

  if (Object.keys(urlMap).length === 0) {
    console.log('No URLs mapped — skipping DB update.');
    process.exit(0);
  }

  // Step 3: Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  const collectionNames = [
    'herosections',
    'products',
    'partners',
    'advantages',
    'certifications',
    'certificationtechnologies',
    'aboutcontents',
    'catalogs',
    'manufacturings',
    'newsarticles',
    'newssections',
    'productpages',
    'distributionchannels',
    'sitesettings',
  ];

  console.log('Updating MongoDB documents...');
  let totalUpdated = 0;

  for (const name of collectionNames) {
    try {
      const col = db.collection(name);
      const count = await migrateCollection(col, urlMap);
      console.log(`  ${name}: ${count} document(s) updated`);
      totalUpdated += count;
    } catch (err) {
      console.error(`  [ERROR] Collection ${name}:`, err.message);
    }
  }

  console.log(`\nDB update complete. Total documents updated: ${totalUpdated}`);

  await mongoose.disconnect();
  console.log('\nMigration finished successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

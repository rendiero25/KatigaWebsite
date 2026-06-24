const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isPdf = ext === 'pdf';
    const isVideo = ['mp4', 'webm'].includes(ext);

    return {
      folder: 'katiga',
      resource_type: isPdf ? 'raw' : isVideo ? 'video' : 'image',
      allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'webm'],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and videos are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;

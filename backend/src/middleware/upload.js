const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { uploadRoot, ensureUploadDir } = require('../utils/files');

ensureUploadDir();

const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  // Random file names: original names are never trusted or reused.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new AppError(400, 'Signature must be a PNG, JPG or WEBP image.', { signature: 'Use a PNG, JPG or WEBP image.' }));
    }
    cb(null, true);
  },
});

// Expects a single file in the multipart field named "signature".
const uploadSignature = upload.single('signature');

module.exports = { uploadSignature };

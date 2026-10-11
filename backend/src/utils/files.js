const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const uploadRoot = path.resolve(env.uploadDir);

function ensureUploadDir() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// Removes an uploaded file; never throws (cleanup is best-effort).
function removeUpload(filename) {
  if (!filename) return;
  const target = path.join(uploadRoot, path.basename(filename));
  fs.unlink(target, () => {});
}

module.exports = { uploadRoot, ensureUploadDir, removeUpload };

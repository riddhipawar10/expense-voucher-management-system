const multer = require('multer');
const { ZodError } = require('zod');
const env = require('../config/env');
const { removeUpload } = require('../utils/files');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // A request that failed after a file was saved must not leave an orphan file.
  if (req.file) removeUpload(req.file.filename);

  if (err instanceof ZodError) {
    const errors = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'form';
      if (!errors[key]) errors[key] = issue.message;
    }
    return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Signature image must be smaller than ${env.maxFileSizeMb} MB.`
        : 'Invalid file upload.';
    return res.status(400).json({ message, errors: { signature: message } });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message, ...(err.errors && { errors: err.errors }) });
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server. Please try again.' });
}

module.exports = { notFound, errorHandler };

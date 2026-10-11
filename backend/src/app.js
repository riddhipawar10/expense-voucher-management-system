const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { uploadRoot } = require('./utils/files');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '100kb' }));

// Signature images. File names are random UUIDs, so they cannot be guessed.
app.use(
  '/uploads',
  express.static(uploadRoot, {
    index: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

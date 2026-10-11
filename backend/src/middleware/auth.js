const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer token and attaches the current user to req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required. Please log in.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session is invalid or has expired. Please log in again.');
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, role, employee_code FROM users WHERE id = $1',
    [payload.sub]
  );
  if (!rows[0]) throw new AppError(401, 'This account no longer exists.');

  req.user = rows[0];
  next();
});

// Restricts a route to the given roles.
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

module.exports = { authenticate, authorize };

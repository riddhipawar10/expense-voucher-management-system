const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { loginSchema } = require('../validators/auth.validator');

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  employeeCode: u.employee_code,
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  const user = rows[0];
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  // Same message for unknown email and wrong password so accounts cannot be probed.
  if (!valid) throw new AppError(401, 'Incorrect email or password.');

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.json({ token, user: publicUser(user) });
});

exports.me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

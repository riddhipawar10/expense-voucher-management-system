// Creates the demo users (safe to run more than once).
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEMO_PASSWORD = 'Password@123';

const users = [
  { name: 'Rahul Sharma', email: 'employee@example.com', role: 'EMPLOYEE', code: 'EMP001' },
  { name: 'Neha Verma', email: 'employee2@example.com', role: 'EMPLOYEE', code: 'EMP002' },
  { name: 'Anita Desai', email: 'director@example.com', role: 'DIRECTOR', code: null },
  { name: 'Vikram Rao', email: 'accounts@example.com', role: 'ACCOUNTS', code: null },
];

async function seed() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, employee_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role, u.code]
    );
    console.log(`user ready: ${u.email} (${u.role})`);
  }
  console.log(`\nAll demo users share the password: ${DEMO_PASSWORD}`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    pool.end().finally(() => process.exit(1));
  });

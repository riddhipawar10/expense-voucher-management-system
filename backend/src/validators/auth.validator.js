const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

module.exports = { loginSchema };

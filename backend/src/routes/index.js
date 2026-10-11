const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getMeta } = require('../controllers/meta.controller');
const { getDashboard } = require('../controllers/dashboard.controller');

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth.routes'));
router.get('/meta', authenticate, getMeta);
router.get('/dashboard', authenticate, getDashboard);
router.use('/vouchers', require('./voucher.routes'));

module.exports = router;

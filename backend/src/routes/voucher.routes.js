const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSignature } = require('../middleware/upload');
const { ROLES } = require('../constants');
const c = require('../controllers/voucher.controller');

router.use(authenticate);

// Everyone (scoped by role inside the controller)
router.get('/', c.listVouchers);
router.get('/:id', c.getVoucher);

// Employee only
router.post('/', authorize(ROLES.EMPLOYEE), uploadSignature, c.createVoucher);
router.put('/:id', authorize(ROLES.EMPLOYEE), uploadSignature, c.updateVoucher);
router.delete('/:id', authorize(ROLES.EMPLOYEE), c.deleteVoucher);
router.post('/:id/submit', authorize(ROLES.EMPLOYEE), c.submitVoucher);

// Director only
router.post('/:id/approve', authorize(ROLES.DIRECTOR), uploadSignature, c.approveVoucher);
router.post('/:id/reject', authorize(ROLES.DIRECTOR), c.rejectVoucher);

module.exports = router;

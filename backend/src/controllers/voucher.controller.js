const pool = require('../config/db');
const { ROLES, STATUS } = require('../constants');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { removeUpload } = require('../utils/files');
const { voucherSchema, rejectSchema, listQuerySchema } = require('../validators/voucher.validator');

const BASE_SELECT = `
  SELECT v.*,
         e.name  AS employee_name,
         e.employee_code,
         d.name  AS director_name
    FROM vouchers v
    JOIN users e      ON e.id = v.employee_id
    LEFT JOIN users d ON d.id = v.director_id
`;

const fileUrl = (name) => (name ? `/uploads/${name}` : null);

function toVoucher(r) {
  return {
    id: r.id,
    voucherNumber: r.voucher_number,
    voucherDate: r.voucher_date,
    expenseDate: r.expense_date,
    department: r.department,
    expenseTitle: r.expense_title,
    expenseCategory: r.expense_category,
    expenseDescription: r.expense_description,
    amount: Number(r.amount),
    status: r.status,
    employee: { id: r.employee_id, name: r.employee_name, employeeCode: r.employee_code },
    employeeSignatureUrl: fileUrl(r.employee_signature),
    director: r.director_id ? { id: r.director_id, name: r.director_name } : null,
    directorSignatureUrl: fileUrl(r.director_signature),
    submittedAt: r.submitted_at,
    approvalDate: r.approval_date,
    rejectedDate: r.rejected_date,
    rejectionReason: r.rejection_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Fetches a voucher the current user is allowed to see, otherwise throws 404.
//  - Employee: only their own vouchers (any status)
//  - Director / Accounts: every voucher that has been submitted (drafts are private)
async function findVisibleVoucher(id, user) {
  const params = [id];
  let scope = '';
  if (user.role === ROLES.EMPLOYEE) {
    params.push(user.id);
    scope = 'AND v.employee_id = $2';
  } else {
    scope = `AND v.status <> '${STATUS.DRAFT}'`;
  }
  const { rows } = await pool.query(`${BASE_SELECT} WHERE v.id = $1 ${scope}`, params);
  if (!rows[0]) throw new AppError(404, 'Voucher not found.');
  return rows[0];
}

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(404, 'Voucher not found.');
  return id;
};

// ---------- List / search / filter / sort ----------
const SORT_COLUMNS = {
  voucherNumber: 'v.voucher_number',
  voucherDate: 'v.voucher_date',
  expenseDate: 'v.expense_date',
  employeeName: 'e.name',
  department: 'v.department',
  amount: 'v.amount',
  status: 'v.status',
  createdAt: 'v.created_at',
  updatedAt: 'v.updated_at',
};

exports.listVouchers = asyncHandler(async (req, res) => {
  const q = listQuerySchema.parse(req.query);
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (req.user.role === ROLES.EMPLOYEE) add('v.employee_id = ?', req.user.id);
  else where.push(`v.status <> '${STATUS.DRAFT}'`);

  if (q.voucherNumber) add('v.voucher_number ILIKE ?', `%${q.voucherNumber}%`);
  if (q.employeeName) add('e.name ILIKE ?', `%${q.employeeName}%`);
  if (q.department) add('v.department = ?', q.department);
  if (q.category) add('v.expense_category = ?', q.category);
  if (q.status) add('v.status = ?', q.status);
  if (q.dateFrom) add('v.voucher_date >= ?', q.dateFrom);
  if (q.dateTo) add('v.voucher_date <= ?', q.dateTo);
  if (q.minAmount !== undefined) add('v.amount >= ?', q.minAmount);
  if (q.maxAmount !== undefined) add('v.amount <= ?', q.maxAmount);

  const sortColumn = SORT_COLUMNS[q.sortBy] || SORT_COLUMNS.createdAt;
  const direction = q.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const sql = `${BASE_SELECT}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${sortColumn} ${direction}, v.id DESC`;

  const { rows } = await pool.query(sql, params);
  res.json({ vouchers: rows.map(toVoucher), count: rows.length });
});

exports.getVoucher = asyncHandler(async (req, res) => {
  const row = await findVisibleVoucher(parseId(req.params.id), req.user);
  res.json({ voucher: toVoucher(row) });
});

// ---------- Employee actions ----------
exports.createVoucher = asyncHandler(async (req, res) => {
  const data = voucherSchema.parse(req.body);

  const { rows } = await pool.query(
    `INSERT INTO vouchers
       (employee_id, expense_date, department, expense_title, expense_category,
        expense_description, amount, employee_signature, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
     RETURNING id`,
    [
      req.user.id,
      data.expenseDate,
      data.department,
      data.expenseTitle,
      data.expenseCategory || null,
      data.expenseDescription || null,
      data.amount,
      req.file ? req.file.filename : null,
    ]
  );

  const row = await findVisibleVoucher(rows[0].id, req.user);
  res.status(201).json({ message: 'Voucher saved as draft.', voucher: toVoucher(row) });
});

exports.updateVoucher = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = voucherSchema.parse(req.body);
  const existing = await findVisibleVoucher(id, req.user);

  if (existing.status !== STATUS.DRAFT) {
    throw new AppError(409, 'Only vouchers in Draft status can be edited.');
  }

  const { rowCount } = await pool.query(
    `UPDATE vouchers
        SET expense_date = $1, department = $2, expense_title = $3, expense_category = $4,
            expense_description = $5, amount = $6,
            employee_signature = COALESCE($7, employee_signature),
            updated_at = NOW()
      WHERE id = $8 AND employee_id = $9 AND status = 'DRAFT'`,
    [
      data.expenseDate,
      data.department,
      data.expenseTitle,
      data.expenseCategory || null,
      data.expenseDescription || null,
      data.amount,
      req.file ? req.file.filename : null,
      id,
      req.user.id,
    ]
  );
  if (!rowCount) throw new AppError(409, 'Only vouchers in Draft status can be edited.');

  if (req.file) removeUpload(existing.employee_signature); // replaced signature

  const row = await findVisibleVoucher(id, req.user);
  res.json({ message: 'Draft updated.', voucher: toVoucher(row) });
});

exports.deleteVoucher = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await findVisibleVoucher(id, req.user);

  if (existing.status !== STATUS.DRAFT) {
    throw new AppError(409, 'Only vouchers in Draft status can be deleted.');
  }

  const { rowCount } = await pool.query(
    `DELETE FROM vouchers WHERE id = $1 AND employee_id = $2 AND status = 'DRAFT'`,
    [id, req.user.id]
  );
  if (!rowCount) throw new AppError(409, 'Only vouchers in Draft status can be deleted.');

  removeUpload(existing.employee_signature);
  res.json({ message: 'Draft deleted.' });
});

exports.submitVoucher = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await findVisibleVoucher(id, req.user);

  if (existing.status !== STATUS.DRAFT) {
    throw new AppError(409, 'This voucher has already been submitted.');
  }
  if (!existing.employee_signature) {
    throw new AppError(400, 'Upload your signature before submitting.', {
      signature: 'Employee signature is required before submission',
    });
  }

  const { rowCount } = await pool.query(
    `UPDATE vouchers
        SET status = 'PENDING_APPROVAL', submitted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND employee_id = $2 AND status = 'DRAFT'`,
    [id, req.user.id]
  );
  if (!rowCount) throw new AppError(409, 'This voucher has already been submitted.');

  const row = await findVisibleVoucher(id, req.user);
  res.json({ message: 'Voucher submitted for approval.', voucher: toVoucher(row) });
});

// ---------- Director actions ----------
exports.approveVoucher = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await findVisibleVoucher(id, req.user);

  if (!req.file) {
    throw new AppError(400, 'Upload your signature to approve this voucher.', {
      signature: 'Director signature is required before approval',
    });
  }
  if (existing.status !== STATUS.PENDING_APPROVAL) {
    throw new AppError(409, 'Only vouchers pending approval can be approved.');
  }

  // The status check in WHERE keeps this safe if two approvals race.
  const { rowCount } = await pool.query(
    `UPDATE vouchers
        SET status = 'APPROVED', director_id = $1, director_signature = $2,
            approval_date = NOW(), rejection_reason = NULL, updated_at = NOW()
      WHERE id = $3 AND status = 'PENDING_APPROVAL'`,
    [req.user.id, req.file.filename, id]
  );
  if (!rowCount) throw new AppError(409, 'Only vouchers pending approval can be approved.');

  const row = await findVisibleVoucher(id, req.user);
  res.json({ message: 'Voucher approved.', voucher: toVoucher(row) });
});

exports.rejectVoucher = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const { reason } = rejectSchema.parse(req.body);
  const existing = await findVisibleVoucher(id, req.user);

  if (existing.status !== STATUS.PENDING_APPROVAL) {
    throw new AppError(409, 'Only vouchers pending approval can be rejected.');
  }

  const { rowCount } = await pool.query(
    `UPDATE vouchers
        SET status = 'REJECTED', director_id = $1, rejection_reason = $2,
            rejected_date = NOW(), updated_at = NOW()
      WHERE id = $3 AND status = 'PENDING_APPROVAL'`,
    [req.user.id, reason, id]
  );
  if (!rowCount) throw new AppError(409, 'Only vouchers pending approval can be rejected.');

  const row = await findVisibleVoucher(id, req.user);
  res.json({ message: 'Voucher rejected.', voucher: toVoucher(row) });
});

module.exports.toVoucher = toVoucher;
module.exports.BASE_SELECT = BASE_SELECT;

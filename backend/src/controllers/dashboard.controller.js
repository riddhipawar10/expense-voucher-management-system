const pool = require('../config/db');
const { ROLES } = require('../constants');
const asyncHandler = require('../utils/asyncHandler');
const { toVoucher, BASE_SELECT } = require('./voucher.controller');

const num = (v) => Number(v || 0);

async function employeeDashboard(user) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)                                               AS total,
            COUNT(*) FILTER (WHERE status = 'DRAFT')               AS drafts,
            COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')    AS pending,
            COUNT(*) FILTER (WHERE status = 'APPROVED')            AS approved,
            COUNT(*) FILTER (WHERE status = 'REJECTED')            AS rejected,
            COALESCE(SUM(amount) FILTER (WHERE status <> 'DRAFT'), 0) AS claimed
       FROM vouchers WHERE employee_id = $1`,
    [user.id]
  );
  const r = rows[0];
  return {
    totalVouchers: num(r.total),
    draftVouchers: num(r.drafts),
    pendingApproval: num(r.pending),
    approvedVouchers: num(r.approved),
    rejectedVouchers: num(r.rejected),
    totalAmountClaimed: num(r.claimed),
  };
}

async function directorDashboard() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')                          AS pending,
            COUNT(*) FILTER (WHERE status = 'APPROVED' AND approval_date::date = CURRENT_DATE) AS approved_today,
            COUNT(*) FILTER (WHERE status = 'REJECTED' AND rejected_date::date = CURRENT_DATE) AS rejected_today,
            COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING_APPROVAL'), 0)          AS pending_amount
       FROM vouchers WHERE status <> 'DRAFT'`
  );
  const recent = await pool.query(
    `${BASE_SELECT} WHERE v.status <> 'DRAFT'
      ORDER BY v.updated_at DESC, v.id DESC LIMIT 8`
  );
  const r = rows[0];
  return {
    pendingApprovalCount: num(r.pending),
    approvedToday: num(r.approved_today),
    rejectedToday: num(r.rejected_today),
    totalPendingAmount: num(r.pending_amount),
    recentActivity: recent.rows.map(toVoucher),
  };
}

async function accountsDashboard() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') AS pending,
            COUNT(*) FILTER (WHERE status = 'APPROVED')         AS approved,
            COUNT(*) FILTER (WHERE status = 'REJECTED')         AS rejected,
            COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS approved_amount
       FROM vouchers WHERE status <> 'DRAFT'`
  );
  const recent = await pool.query(
    `${BASE_SELECT} WHERE v.status = 'APPROVED'
      ORDER BY v.approval_date DESC, v.id DESC LIMIT 8`
  );
  const r = rows[0];
  return {
    totalVouchers: num(r.total),
    pendingApproval: num(r.pending),
    approvedVouchers: num(r.approved),
    rejectedVouchers: num(r.rejected),
    totalApprovedAmount: num(r.approved_amount),
    recentApproved: recent.rows.map(toVoucher),
  };
}

exports.getDashboard = asyncHandler(async (req, res) => {
  const { role } = req.user;
  let stats;
  if (role === ROLES.EMPLOYEE) stats = await employeeDashboard(req.user);
  else if (role === ROLES.DIRECTOR) stats = await directorDashboard();
  else stats = await accountsDashboard();
  res.json({ role, stats });
});

const ROLES = Object.freeze({
  EMPLOYEE: 'EMPLOYEE',
  DIRECTOR: 'DIRECTOR',
  ACCOUNTS: 'ACCOUNTS',
});

// "Submitted" is a momentary step: submitting a voucher moves it straight to
// PENDING_APPROVAL and stamps submitted_at (see README, "Assumptions").
const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

const DEPARTMENTS = [
  'Accounts',
  'Compliance',
  'Finance',
  'Human Resources',
  'Information Technology',
  'Marketing',
  'Operations',
  'Sales',
];

const EXPENSE_CATEGORIES = [
  'Travel',
  'Food & Meals',
  'Accommodation',
  'Office Supplies',
  'Client Entertainment',
  'Training',
  'Communication',
  'Other',
];

module.exports = { ROLES, STATUS, DEPARTMENTS, EXPENSE_CATEGORIES };

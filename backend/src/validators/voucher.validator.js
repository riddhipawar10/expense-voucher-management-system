const { z } = require('zod');
const { DEPARTMENTS, EXPENSE_CATEGORIES, STATUS } = require('../constants');

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const isRealDate = (value) => {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

const dateString = (requiredMessage) =>
  z
    .string({ required_error: requiredMessage, invalid_type_error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .refine(isRealDate, 'Enter a valid date (YYYY-MM-DD)');

// Used for both creating and editing a draft.
// Rules: department, title, expense date, amount are mandatory; amount > 0.
const voucherSchema = z.object({
  department: z
    .string({ required_error: 'Department is required' })
    .trim()
    .min(1, 'Department is required')
    .refine((v) => DEPARTMENTS.includes(v), 'Select a valid department'),

  expenseTitle: z
    .string({ required_error: 'Expense title is required' })
    .trim()
    .min(1, 'Expense title is required')
    .max(150, 'Expense title must be 150 characters or fewer'),

  expenseDate: dateString('Expense date is required'),

  expenseCategory: z.preprocess(
    emptyToUndefined,
    z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Select a valid category' }) }).optional()
  ),

  expenseDescription: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000, 'Description must be 2000 characters or fewer').optional()
  ),

  amount: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z
      .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
      .gt(0, 'Amount must be greater than zero')
      .lte(9999999999.99, 'Amount is too large')
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Amount can have at most 2 decimal places')
  ),
});

const rejectSchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .trim()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Rejection reason must be 1000 characters or fewer'),
});

const SORT_FIELDS = [
  'voucherNumber',
  'voucherDate',
  'expenseDate',
  'employeeName',
  'department',
  'amount',
  'status',
  'createdAt',
  'updatedAt',
];

const optional = (schema) => z.preprocess(emptyToUndefined, schema.optional());

const listQuerySchema = z.object({
  voucherNumber: optional(z.string().trim().max(50)),
  employeeName: optional(z.string().trim().max(100)),
  department: optional(z.string().trim().max(100)),
  category: optional(z.string().trim().max(50)),
  status: optional(z.enum(Object.values(STATUS))),
  dateFrom: optional(z.string().refine(isRealDate, 'dateFrom must be YYYY-MM-DD')),
  dateTo: optional(z.string().refine(isRealDate, 'dateTo must be YYYY-MM-DD')),
  minAmount: optional(z.coerce.number().min(0)),
  maxAmount: optional(z.coerce.number().min(0)),
  sortBy: optional(z.enum(SORT_FIELDS)),
  sortOrder: optional(z.enum(['asc', 'desc'])),
});

module.exports = { voucherSchema, rejectSchema, listQuerySchema };

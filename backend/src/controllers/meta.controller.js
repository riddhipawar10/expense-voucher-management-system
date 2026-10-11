const { DEPARTMENTS, EXPENSE_CATEGORIES, STATUS } = require('../constants');

exports.getMeta = (req, res) => {
  res.json({ departments: DEPARTMENTS, categories: EXPENSE_CATEGORIES, statuses: Object.values(STATUS) });
};

import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { formatCurrency, formatDate, initials } from '../utils.js';

// `columns` controls what is shown; sorting is delegated to the parent (server-side).
export default function VoucherTable({ vouchers, showEmployee = true, sort, onSort, extraActions }) {
  const columns = [
    { key: 'voucherNumber', label: 'Voucher no.', sortable: true },
    { key: 'voucherDate', label: 'Voucher date', sortable: true },
    ...(showEmployee ? [{ key: 'employeeName', label: 'Employee', sortable: true }] : []),
    { key: 'department', label: 'Department', sortable: true },
    { key: 'expenseTitle', label: 'Expense', sortable: false },
    { key: 'amount', label: 'Amount', sortable: true, numeric: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  const ariaSort = (key) => (sort?.by === key ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none');

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? 'num' : ''} aria-sort={col.sortable && onSort ? ariaSort(col.key) : undefined}>
                {col.sortable && onSort ? (
                  <button type="button" className="sort-btn" onClick={() => onSort(col.key)}>
                    {col.label}
                    <span className="sort-mark" aria-hidden="true">
                      {sort?.by === col.key ? (sort.order === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {extraActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={v.id}>
              <td>
                <Link to={`/vouchers/${v.id}`} className="link-strong">
                  {v.voucherNumber}
                </Link>
              </td>
              <td>{formatDate(v.voucherDate)}</td>
              {showEmployee && (
                <td>
                  <span className="person">
                    <span className="avatar avatar-sm" aria-hidden="true">
                      {initials(v.employee.name)}
                    </span>
                    {v.employee.name}
                  </span>
                </td>
              )}
              <td>{v.department}</td>
              <td className="cell-title">{v.expenseTitle}</td>
              <td className="num">{formatCurrency(v.amount)}</td>
              <td>
                <StatusBadge status={v.status} />
              </td>
              {extraActions && <td className="cell-actions">{extraActions(v)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

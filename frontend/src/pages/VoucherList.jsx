import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import VoucherTable from '../components/VoucherTable.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { STATUS_LABEL } from '../utils.js';

const EMPTY_FILTERS = {
  voucherNumber: '',
  employeeName: '',
  department: '',
  category: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
};

export default function VoucherList({ pendingOnly = false }) {
  const { user } = useAuth();
  const isEmployee = user.role === 'EMPLOYEE';

  const [meta, setMeta] = useState({ departments: [], categories: [] });
  const [form, setForm] = useState(EMPTY_FILTERS); // what the person is typing
  const [applied, setApplied] = useState(EMPTY_FILTERS); // what was last searched
  const [sort, setSort] = useState({ by: 'createdAt', order: 'desc' });
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filterError, setFilterError] = useState('');

  const title = pendingOnly ? 'Pending approvals' : isEmployee ? 'My vouchers' : 'All vouchers';
  const statusOptions = isEmployee ? ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] : ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];

  useEffect(() => {
    api.get('/meta').then((res) => setMeta(res.data)).catch(() => {});
  }, []);

  // Reset filters when moving between "All vouchers" and "Pending approvals".
  useEffect(() => {
    setForm(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setFilterError('');
  }, [pendingOnly]);

  const params = useMemo(() => {
    const p = { sortBy: sort.by, sortOrder: sort.order };
    Object.entries(applied).forEach(([k, v]) => v !== '' && (p[k] = v));
    if (pendingOnly) p.status = 'PENDING_APPROVAL';
    return p;
  }, [applied, sort, pendingOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/vouchers', { params });
      setVouchers(res.data.vouchers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const applyFilters = (e) => {
    e.preventDefault();
    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo) {
      setFilterError('"From" date must be on or before the "To" date.');
      return;
    }
    if (form.minAmount !== '' && form.maxAmount !== '' && Number(form.minAmount) > Number(form.maxAmount)) {
      setFilterError('Minimum amount cannot be greater than the maximum amount.');
      return;
    }
    setFilterError('');
    setApplied(form);
  };

  const resetFilters = () => {
    setForm(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setFilterError('');
  };

  const handleSort = (key) =>
    setSort((s) => (s.by === key ? { by: key, order: s.order === 'asc' ? 'desc' : 'asc' } : { by: key, order: 'asc' }));

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/vouchers/${toDelete.id}`);
      setNotice(`${toDelete.voucherNumber} was deleted.`);
      setToDelete(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Object.values(applied).some((v) => v !== '');

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        {isEmployee && (
          <Link to="/vouchers/new" className="btn btn-primary">
            Create voucher
          </Link>
        )}
      </div>

      <form className="filters panel" onSubmit={applyFilters} aria-label="Search and filter vouchers">
        <h2 className="panel-title">
          <Icon name="search" size={18} />
          Search and filter
        </h2>
        <div className="filter-grid">
          <div className="field">
            <label htmlFor="f-number">Voucher number</label>
            <input id="f-number" name="voucherNumber" value={form.voucherNumber} onChange={handleChange} placeholder="EV-2026-00001" />
          </div>
          {!isEmployee && (
            <div className="field">
              <label htmlFor="f-employee">Employee name</label>
              <input id="f-employee" name="employeeName" value={form.employeeName} onChange={handleChange} />
            </div>
          )}
          <div className="field">
            <label htmlFor="f-dept">Department</label>
            <select id="f-dept" name="department" value={form.department} onChange={handleChange}>
              <option value="">All departments</option>
              {meta.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-cat">Expense category</label>
            <select id="f-cat" name="category" value={form.category} onChange={handleChange}>
              <option value="">All categories</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {!pendingOnly && (
            <div className="field">
              <label htmlFor="f-status">Status</label>
              <select id="f-status" name="status" value={form.status} onChange={handleChange}>
                <option value="">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="f-from">Voucher date from</label>
            <input id="f-from" type="date" name="dateFrom" value={form.dateFrom} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="f-to">Voucher date to</label>
            <input id="f-to" type="date" name="dateTo" value={form.dateTo} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="f-min">Minimum amount</label>
            <input id="f-min" type="number" min="0" step="0.01" name="minAmount" value={form.minAmount} onChange={handleChange} />
          </div>
          <div className="field">
            <label htmlFor="f-max">Maximum amount</label>
            <input id="f-max" type="number" min="0" step="0.01" name="maxAmount" value={form.maxAmount} onChange={handleChange} />
          </div>
        </div>
        {filterError && <p className="error-text">{filterError}</p>}
        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
          <button type="button" className="btn" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      </form>

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <section className="panel panel-flush">
        {loading ? (
          <div className="page-loading">Loading vouchers…</div>
        ) : vouchers.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <Icon name="file" size={26} />
            </span>
            {hasFilters ? (
              <>
                <h2>No vouchers match these filters</h2>
                <p>Change or clear the filters to see more results.</p>
              </>
            ) : pendingOnly ? (
              <>
                <h2>No vouchers are waiting for approval</h2>
                <p>New submissions will appear here.</p>
              </>
            ) : isEmployee ? (
              <>
                <h2>You have not created any vouchers yet</h2>
                <p>Create your first voucher to start a reimbursement claim.</p>
                <Link to="/vouchers/new" className="btn btn-primary">
                  Create voucher
                </Link>
              </>
            ) : (
              <>
                <h2>No vouchers yet</h2>
                <p>Submitted vouchers will appear here.</p>
              </>
            )}
          </div>
        ) : (
          <VoucherTable
            vouchers={vouchers}
            showEmployee={!isEmployee}
            sort={sort}
            onSort={handleSort}
            extraActions={
              isEmployee
                ? (v) =>
                    v.status === 'DRAFT' ? (
                      <>
                        <Link to={`/vouchers/${v.id}/edit`} className="btn btn-small">
                          Edit
                        </Link>
                        <button type="button" className="btn btn-small btn-danger-quiet" onClick={() => setToDelete(v)}>
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="muted">Read-only</span>
                    )
                : undefined
            }
          />
        )}
      </section>

      {toDelete && (
        <Modal
          title="Delete this draft?"
          onClose={() => !deleting && setToDelete(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setToDelete(null)} disabled={deleting}>
                Keep draft
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete draft'}
              </button>
            </>
          }
        >
          <p>
            {toDelete.voucherNumber} ({toDelete.expenseTitle}) will be permanently deleted. This cannot be undone.
          </p>
        </Modal>
      )}
    </>
  );
}

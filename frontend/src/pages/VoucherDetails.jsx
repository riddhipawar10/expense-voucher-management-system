import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { assetUrl, getErrorMessage, getFieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusTrack from '../components/StatusTrack.jsx';
import SignatureInput from '../components/SignatureInput.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../utils.js';

function SignatureBlock({ title, url, name, dateLabel, date, emptyText }) {
  return (
    <div className="sig-block">
      <div className="sig-image">
        {url ? <img src={assetUrl(url)} alt={`${title} of ${name}`} /> : <span className="signature-empty">{emptyText}</span>}
      </div>
      <p className="sig-title">{title}</p>
      {name && <p className="sig-name">{name}</p>}
      {date && (
        <p className="muted">
          {dateLabel}: {formatDateTime(date)}
        </p>
      )}
    </div>
  );
}

export default function VoucherDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [actionError, setActionError] = useState('');
  const [modal, setModal] = useState(null); // 'approve' | 'reject' | 'delete' | 'submit'
  const [busy, setBusy] = useState(false);

  const [signature, setSignature] = useState(null);
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/vouchers/${id}`)
      .then((res) => active && setVoucher(res.data.voucher))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setSignature(null);
    setReason('');
    setFieldErrors({});
    setActionError('');
  };

  const run = async (request, successMessage, { leave } = {}) => {
    setBusy(true);
    setActionError('');
    setFieldErrors({});
    try {
      const res = await request();
      if (leave) {
        navigate('/vouchers', { replace: true });
        return;
      }
      setVoucher(res.data.voucher);
      setNotice(successMessage);
      setModal(null);
      setSignature(null);
      setReason('');
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    if (!signature) {
      setFieldErrors({ signature: 'Upload your signature to approve this voucher' });
      return;
    }
    const fd = new FormData();
    fd.append('signature', signature);
    run(() => api.post(`/vouchers/${id}/approve`, fd), 'Voucher approved.');
  };

  const reject = () => {
    if (!reason.trim()) {
      setFieldErrors({ reason: 'Enter a reason for rejecting this voucher' });
      return;
    }
    run(() => api.post(`/vouchers/${id}/reject`, { reason: reason.trim() }), 'Voucher rejected.');
  };

  if (loading) return <div className="page-loading">Loading voucher…</div>;
  if (error || !voucher) {
    return (
      <div className="empty">
        <h1>Voucher not available</h1>
        <p>{error || 'This voucher could not be found.'}</p>
        <Link to="/vouchers" className="btn btn-primary">
          Back to vouchers
        </Link>
      </div>
    );
  }

  const v = voucher;
  const isEmployee = user.role === 'EMPLOYEE';
  const isDirector = user.role === 'DIRECTOR';
  const canEditDraft = isEmployee && v.status === 'DRAFT';
  const canDecide = isDirector && v.status === 'PENDING_APPROVAL';
  const stamp =
    v.status === 'APPROVED'
      ? { tone: 'approved', label: 'Approved', date: v.approvalDate }
      : v.status === 'REJECTED'
      ? { tone: 'rejected', label: 'Rejected', date: v.rejectedDate }
      : null;

  return (
    <>
      <div className="page-head no-print">
        <h1>Voucher details</h1>
        <div className="head-actions">
          <Link to="/vouchers" className="btn">
            <Icon name="back" size={17} />
            Back to list
          </Link>
          <button type="button" className="btn" onClick={() => window.print()}>
            <Icon name="printer" size={17} />
            Print voucher
          </button>
          {canEditDraft && (
            <>
              <Link to={`/vouchers/${v.id}/edit`} className="btn">
                Edit draft
              </Link>
              <button type="button" className="btn btn-danger-quiet" onClick={() => setModal('delete')}>
                Delete draft
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setModal('submit')}>
                Submit for approval
              </button>
            </>
          )}
          {canDecide && (
            <>
              <button type="button" className="btn btn-danger" onClick={() => setModal('reject')}>
                Reject
              </button>
              <button type="button" className="btn btn-success" onClick={() => setModal('approve')}>
                Approve
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div className="alert alert-success no-print" role="status">
          {notice}
        </div>
      )}
      {!modal && actionError && (
        <div className="alert alert-error no-print" role="alert">
          {actionError}
        </div>
      )}

      <div className="no-print">
        <StatusTrack status={v.status} />
      </div>

      <article className="voucher">
        <header className="voucher-head">
          <div>
            <p className="voucher-kind">Expense voucher</p>
            <p className="voucher-number">{v.voucherNumber}</p>
          </div>
          <StatusBadge status={v.status} />
        </header>

        <dl className="voucher-grid">
          <div>
            <dt>Voucher date</dt>
            <dd>{formatDate(v.voucherDate)}</dd>
          </div>
          <div>
            <dt>Expense date</dt>
            <dd>{formatDate(v.expenseDate)}</dd>
          </div>
          <div>
            <dt>Employee</dt>
            <dd>{v.employee.name}</dd>
          </div>
          <div>
            <dt>Employee ID</dt>
            <dd>{v.employee.employeeCode || '—'}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{v.department}</dd>
          </div>
          <div>
            <dt>Expense category</dt>
            <dd>{v.expenseCategory || '—'}</dd>
          </div>
        </dl>

        <section className={`voucher-body ${stamp ? 'has-stamp' : ''}`}>
          {stamp && (
            <div className={`stamp stamp-${stamp.tone} voucher-stamp`}>
              {stamp.label}
              <small>{formatDate(stamp.date)}</small>
            </div>
          )}
          <h2>{v.expenseTitle}</h2>
          <p className="voucher-description">{v.expenseDescription || 'No description provided.'}</p>
          <p className="voucher-amount">
            <span>Amount</span>
            {formatCurrency(v.amount)}
          </p>
        </section>

        {v.status === 'REJECTED' && (
          <section className="rejection" aria-label="Rejection reason">
            <h3>Rejected by {v.director?.name || 'the Director'}</h3>
            <p>{v.rejectionReason}</p>
            <p className="muted">Rejected on {formatDateTime(v.rejectedDate)}</p>
          </section>
        )}

        <section className="signatures">
          <SignatureBlock
            title="Employee signature"
            url={v.employeeSignatureUrl}
            name={v.employee.name}
            dateLabel="Submitted"
            date={v.submittedAt}
            emptyText="Not uploaded yet"
          />
          <SignatureBlock
            title="Director signature"
            url={v.directorSignatureUrl}
            name={v.status === 'APPROVED' ? v.director?.name : ''}
            dateLabel="Approved"
            date={v.approvalDate}
            emptyText={v.status === 'REJECTED' ? 'Not signed (rejected)' : 'Awaiting approval'}
          />
        </section>

        <footer className="voucher-foot">
          <span>Created {formatDateTime(v.createdAt)}</span>
          <span>Last updated {formatDateTime(v.updatedAt)}</span>
        </footer>
      </article>

      {modal === 'approve' && (
        <Modal
          title={`Approve ${v.voucherNumber}`}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={approve} disabled={busy}>
                {busy ? 'Approving…' : 'Approve voucher'}
              </button>
            </>
          }
        >
          <p>
            Approving {formatCurrency(v.amount)} for {v.employee.name}. Your signature is required and becomes part of the voucher.
          </p>
          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}
          <SignatureInput id="d-signature" label="Director signature" file={signature} error={fieldErrors.signature} onChange={setSignature} hint="PNG, JPG or WEBP, up to 2 MB." />
        </Modal>
      )}

      {modal === 'reject' && (
        <Modal
          title={`Reject ${v.voucherNumber}`}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={reject} disabled={busy}>
                {busy ? 'Rejecting…' : 'Reject voucher'}
              </button>
            </>
          }
        >
          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}
          <div className={`field ${fieldErrors.reason ? 'field-error' : ''}`}>
            <label htmlFor="reject-reason">Reason for rejection</label>
            <textarea id="reject-reason" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(fieldErrors.reason)} />
            {fieldErrors.reason ? <p className="error-text">{fieldErrors.reason}</p> : <p className="hint">{v.employee.name} will see this reason.</p>}
          </div>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal
          title="Delete this draft?"
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn" onClick={closeModal} disabled={busy}>
                Keep draft
              </button>
              <button type="button" className="btn btn-danger" onClick={() => run(() => api.delete(`/vouchers/${id}`), '', { leave: true })} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete draft'}
              </button>
            </>
          }
        >
          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}
          <p>{v.voucherNumber} will be permanently deleted. This cannot be undone.</p>
        </Modal>
      )}

      {modal === 'submit' && (
        <Modal
          title="Submit for approval?"
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => run(() => api.post(`/vouchers/${id}/submit`), 'Voucher submitted for approval.')} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit voucher'}
              </button>
            </>
          }
        >
          {actionError && (
            <div className="alert alert-error" role="alert">
              {actionError}
            </div>
          )}
          <p>Once submitted, the voucher is read-only. Your signature must already be uploaded; edit the draft if it is missing.</p>
        </Modal>
      )}
    </>
  );
}

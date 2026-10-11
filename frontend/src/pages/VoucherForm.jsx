import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api, { assetUrl, getErrorMessage, getFieldErrors } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import SignatureInput from '../components/SignatureInput.jsx';
import Modal from '../components/Modal.jsx';
import { formatCurrency } from '../utils.js';

const EMPTY = {
  department: '',
  expenseTitle: '',
  expenseDate: '',
  expenseCategory: '',
  amount: '',
  expenseDescription: '',
};

// Mirrors the server rules so mistakes are caught before the request is sent.
function validate(values, { needsSignature, hasSignature }) {
  const errors = {};
  if (!values.department) errors.department = 'Select a department';
  if (!values.expenseTitle.trim()) errors.expenseTitle = 'Enter an expense title';
  else if (values.expenseTitle.trim().length > 150) errors.expenseTitle = 'Use 150 characters or fewer';
  if (!values.expenseDate) errors.expenseDate = 'Select the expense date';

  if (values.amount === '') errors.amount = 'Enter the amount';
  else if (Number.isNaN(Number(values.amount))) errors.amount = 'Amount must be a number';
  else if (Number(values.amount) <= 0) errors.amount = 'Amount must be greater than zero';
  else if (!/^\d+(\.\d{1,2})?$/.test(String(values.amount))) errors.amount = 'Use at most 2 decimal places';

  if (values.expenseDescription.length > 2000) errors.expenseDescription = 'Use 2000 characters or fewer';
  if (needsSignature && !hasSignature) errors.signature = 'Upload your signature before submitting';
  return errors;
}

export default function VoucherForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meta, setMeta] = useState({ departments: [], categories: [] });
  const [values, setValues] = useState(EMPTY);
  const [signatureFile, setSignatureFile] = useState(null);
  const [existingSignature, setExistingSignature] = useState(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [notDraft, setNotDraft] = useState(false);

  useEffect(() => {
    api.get('/meta').then((res) => setMeta(res.data)).catch((err) => setFormError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    api
      .get(`/vouchers/${id}`)
      .then((res) => {
        if (!active) return;
        const v = res.data.voucher;
        if (v.status !== 'DRAFT') {
          setNotDraft(true);
          return;
        }
        setVoucherNumber(v.voucherNumber);
        setExistingSignature(assetUrl(v.employeeSignatureUrl));
        setValues({
          department: v.department,
          expenseTitle: v.expenseTitle,
          expenseDate: v.expenseDate,
          expenseCategory: v.expenseCategory || '',
          amount: String(v.amount),
          expenseDescription: v.expenseDescription || '',
        });
      })
      .catch((err) => active && setFormError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  if (notDraft) return <Navigate to={`/vouchers/${id}`} replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, typeof v === 'string' ? v.trim() : v));
    if (signatureFile) fd.append('signature', signatureFile);
    return fd;
  };

  const save = async ({ submit }) => {
    setFormError('');
    const found = validate(values, { needsSignature: submit, hasSignature: Boolean(signatureFile || existingSignature) });
    setErrors(found);
    if (Object.keys(found).length) {
      setConfirmSubmit(false);
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setBusy(true);
    let savedId = id;
    try {
      const res = isEdit ? await api.put(`/vouchers/${id}`, buildFormData()) : await api.post('/vouchers', buildFormData());
      savedId = res.data.voucher.id;
      if (submit) await api.post(`/vouchers/${savedId}/submit`);
      navigate(`/vouchers/${savedId}`, {
        replace: true,
        state: { notice: submit ? 'Voucher submitted for approval.' : 'Draft saved.' },
      });
    } catch (err) {
      setConfirmSubmit(false);
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      // The draft was saved even though submitting failed; continue editing that draft.
      if (!isEdit && savedId) navigate(`/vouchers/${savedId}/edit`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const onDraftClick = (e) => {
    e.preventDefault();
    save({ submit: false });
  };

  const onSubmitClick = (e) => {
    e.preventDefault();
    const found = validate(values, { needsSignature: true, hasSignature: Boolean(signatureFile || existingSignature) });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setConfirmSubmit(true);
  };

  if (loading) return <div className="page-loading">Loading voucher…</div>;

  const fieldProps = (name) => ({
    id: `v-${name}`,
    name,
    value: values[name],
    onChange: handleChange,
    'aria-invalid': Boolean(errors[name]),
  });

  return (
    <>
      <div className="page-head">
        <h1>{isEdit ? `Edit draft ${voucherNumber}` : 'Create voucher'}</h1>
        <Link to="/vouchers" className="btn">
          Back to my vouchers
        </Link>
      </div>

      <form className="panel form" noValidate>
        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}

        <div className="form-grid">
          <h2 className="form-section-title">Voucher information</h2>
          <div className="field">
            <label htmlFor="v-employee">Employee</label>
            <input id="v-employee" value={user.employeeCode ? `${user.name} (${user.employeeCode})` : user.name} readOnly />
          </div>

          <div className="field">
            <label htmlFor="v-number">Voucher number</label>
            <input id="v-number" value={voucherNumber || 'Generated when you save'} readOnly />
          </div>

          <div className={`field ${errors.department ? 'field-error' : ''}`}>
            <label htmlFor="v-department">Department</label>
            <select {...fieldProps('department')}>
              <option value="">Select department</option>
              {meta.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.department && <p className="error-text">{errors.department}</p>}
          </div>

          <div className={`field ${errors.expenseCategory ? 'field-error' : ''}`}>
            <label htmlFor="v-expenseCategory">Expense category</label>
            <select {...fieldProps('expenseCategory')}>
              <option value="">Select category</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.expenseCategory && <p className="error-text">{errors.expenseCategory}</p>}
          </div>

          <h2 className="form-section-title">Expense details</h2>
          <div className={`field field-wide ${errors.expenseTitle ? 'field-error' : ''}`}>
            <label htmlFor="v-expenseTitle">Expense title</label>
            <input type="text" maxLength={150} {...fieldProps('expenseTitle')} />
            {errors.expenseTitle && <p className="error-text">{errors.expenseTitle}</p>}
          </div>

          <div className={`field ${errors.expenseDate ? 'field-error' : ''}`}>
            <label htmlFor="v-expenseDate">Expense date</label>
            <input type="date" {...fieldProps('expenseDate')} />
            {errors.expenseDate && <p className="error-text">{errors.expenseDate}</p>}
          </div>

          <div className={`field ${errors.amount ? 'field-error' : ''}`}>
            <label htmlFor="v-amount">Amount (INR)</label>
            <input type="number" inputMode="decimal" min="0" step="0.01" {...fieldProps('amount')} />
            {errors.amount ? (
              <p className="error-text">{errors.amount}</p>
            ) : (
              values.amount !== '' && Number(values.amount) > 0 && <p className="hint">{formatCurrency(values.amount)}</p>
            )}
          </div>

          <div className={`field field-wide ${errors.expenseDescription ? 'field-error' : ''}`}>
            <label htmlFor="v-expenseDescription">Expense description</label>
            <textarea rows={4} {...fieldProps('expenseDescription')} />
            {errors.expenseDescription && <p className="error-text">{errors.expenseDescription}</p>}
          </div>

          <h2 className="form-section-title">Signature</h2>
          <div className="field-wide">
            <SignatureInput
              id="v-signature"
              label="Your signature"
              file={signatureFile}
              existingUrl={existingSignature}
              error={errors.signature}
              onChange={(file) => {
                setSignatureFile(file);
                if (file) setErrors((er) => ({ ...er, signature: undefined }));
              }}
              hint="PNG, JPG or WEBP, up to 2 MB. Required before you submit."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={onDraftClick} disabled={busy}>
            {busy ? 'Saving…' : 'Save as draft'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmitClick} disabled={busy}>
            Submit for approval
          </button>
        </div>
      </form>

      {confirmSubmit && (
        <Modal
          title="Submit for approval?"
          onClose={() => !busy && setConfirmSubmit(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirmSubmit(false)} disabled={busy}>
                Keep editing
              </button>
              <button type="button" className="btn btn-primary" onClick={() => save({ submit: true })} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit voucher'}
              </button>
            </>
          }
        >
          <p>Once submitted, the voucher is read-only. You can still track its status and see the Director&apos;s decision.</p>
        </Modal>
      )}
    </>
  );
}

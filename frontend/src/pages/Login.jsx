import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage, getFieldErrors } from '../api/client.js';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = 'Enter your email address';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!form.password) next.password = 'Enter your password';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <span className="brand-mark">
            <Icon name="receipt" size={20} />
          </span>
          <span>Expense Vouchers</span>
        </div>

        <div className="login-copy">
          <h1>Expense claims, signed and settled without the paperwork.</h1>
          <p>
            Create a voucher, send it to the Director for sign-off, and follow it until Accounts has what it needs to
            reimburse you.
          </p>
        </div>

        <div className="mock" aria-hidden="true">
          <div className="mock-back" />
          <div className="mock-front">
            <div className="mock-head">
              <span className="mock-no">EV-2026-00128</span>
              <span className="badge badge-approved">Approved</span>
            </div>
            <p className="mock-title">Client visit taxi fare</p>
            <p className="mock-meta">
              <span>Sales</span>
              <span>Travel</span>
            </p>
            <p className="mock-amount">₹842.50</p>
            <div className="mock-sigs">
              <svg viewBox="0 0 100 40" className="mock-sig">
                <path d="M6 28 C 14 4, 24 40, 38 16 S 58 6, 70 24 S 88 28, 94 14" />
              </svg>
              <svg viewBox="0 0 100 40" className="mock-sig">
                <path d="M8 22 C 20 36, 26 4, 40 20 S 62 34, 74 12 S 90 22, 94 28" />
              </svg>
            </div>
            <div className="stamp stamp-approved mock-stamp">Approved</div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div>
            <h2>Welcome back</h2>
            <p className="muted">Log in to create, approve or track expense vouchers.</p>
          </div>

          {formError && (
            <div className="alert alert-error" role="alert">
              {formError}
            </div>
          )}

          <div className={`field ${errors.email ? 'field-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" value={form.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div className={`field ${errors.password ? 'field-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} aria-invalid={Boolean(errors.password)} />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </section>
    </div>
  );
}

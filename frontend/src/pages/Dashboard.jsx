import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import VoucherTable from '../components/VoucherTable.jsx';
import { formatCurrency } from '../utils.js';

const CARDS = {
  EMPLOYEE: (s) => [
    { label: 'Total vouchers', value: s.totalVouchers, icon: 'layers' },
    { label: 'Draft vouchers', value: s.draftVouchers, tone: 'draft', icon: 'pen' },
    { label: 'Pending approval', value: s.pendingApproval, tone: 'pending', icon: 'clock' },
    { label: 'Approved vouchers', value: s.approvedVouchers, tone: 'approved', icon: 'check' },
    { label: 'Rejected vouchers', value: s.rejectedVouchers, tone: 'rejected', icon: 'x' },
    { label: 'Total amount claimed', value: formatCurrency(s.totalAmountClaimed), icon: 'wallet' },
  ],
  DIRECTOR: (s) => [
    { label: 'Pending approval', value: s.pendingApprovalCount, tone: 'pending', icon: 'clock' },
    { label: 'Approved today', value: s.approvedToday, tone: 'approved', icon: 'check' },
    { label: 'Rejected today', value: s.rejectedToday, tone: 'rejected', icon: 'x' },
    { label: 'Total pending amount', value: formatCurrency(s.totalPendingAmount), icon: 'wallet' },
  ],
  ACCOUNTS: (s) => [
    { label: 'Total vouchers', value: s.totalVouchers, icon: 'layers' },
    { label: 'Pending approval', value: s.pendingApproval, tone: 'pending', icon: 'clock' },
    { label: 'Approved vouchers', value: s.approvedVouchers, tone: 'approved', icon: 'check' },
    { label: 'Rejected vouchers', value: s.rejectedVouchers, tone: 'rejected', icon: 'x' },
    { label: 'Total approved expense amount', value: formatCurrency(s.totalApprovedAmount), icon: 'wallet' },
  ],
};

// Stacked bar segments (same numbers as the cards, shown as proportions).
const BREAKDOWN = {
  EMPLOYEE: (s) => [
    { label: 'Draft', value: s.draftVouchers, tone: 'draft' },
    { label: 'Pending approval', value: s.pendingApproval, tone: 'pending' },
    { label: 'Approved', value: s.approvedVouchers, tone: 'approved' },
    { label: 'Rejected', value: s.rejectedVouchers, tone: 'rejected' },
  ],
  ACCOUNTS: (s) => [
    { label: 'Pending approval', value: s.pendingApproval, tone: 'pending' },
    { label: 'Approved', value: s.approvedVouchers, tone: 'approved' },
    { label: 'Rejected', value: s.rejectedVouchers, tone: 'rejected' },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get('/dashboard')
      .then((res) => active && setStats(res.data.stats))
      .catch((err) => active && setError(getErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  const cards = stats ? CARDS[user.role](stats) : [];
  const recent = stats && (user.role === 'DIRECTOR' ? stats.recentActivity : user.role === 'ACCOUNTS' ? stats.recentApproved : null);
  const recentTitle = user.role === 'DIRECTOR' ? 'Recent voucher activity' : 'Recent approved vouchers';
  const segments = stats && BREAKDOWN[user.role] ? BREAKDOWN[user.role](stats) : null;
  const segmentTotal = segments ? segments.reduce((sum, s) => sum + s.value, 0) : 0;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const subtitle = {
    EMPLOYEE: 'Track your claims and start a new one when you need to.',
    DIRECTOR: stats
      ? stats.pendingApprovalCount === 0
        ? 'No vouchers are waiting for your decision.'
        : `${stats.pendingApprovalCount} ${stats.pendingApprovalCount === 1 ? 'voucher is' : 'vouchers are'} waiting for your decision.`
      : '',
    ACCOUNTS: 'Every submitted voucher across the organisation.',
  }[user.role];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="page-date">{today}</p>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p className="page-sub">{subtitle}</p>
        </div>
        {user.role === 'EMPLOYEE' && (
          <Link to="/vouchers/new" className="btn btn-primary btn-lg">
            Create voucher
          </Link>
        )}
        {user.role === 'DIRECTOR' && (
          <Link to="/pending" className="btn btn-primary btn-lg">
            Review pending approvals
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {!stats && !error && <div className="page-loading">Loading dashboard…</div>}

      {stats && (
        <>
          <dl className={`stats stats-${cards.length}`}>
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </dl>

          {segments && segmentTotal > 0 && (
            <section className="panel">
              <h2>Status breakdown</h2>
              <div className="bar" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
                {segments
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <span key={s.label} className={`bar-seg bar-${s.tone}`} style={{ flexGrow: s.value }} />
                  ))}
              </div>
              <ul className="legend">
                {segments.map((s) => (
                  <li key={s.label}>
                    <span className={`dot dot-${s.tone}`} />
                    {s.label}
                    <strong>{s.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recent && (
            <section className="panel panel-flush">
              <h2 className="panel-title panel-title-pad">{recentTitle}</h2>
              {recent.length ? <VoucherTable vouchers={recent} /> : <p className="muted pad">Nothing here yet.</p>}
            </section>
          )}
        </>
      )}
    </>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';
import { ROLE_LABEL, initials } from '../utils.js';

const NAV = {
  EMPLOYEE: [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/vouchers', label: 'My vouchers', icon: 'file', end: true },
    { to: '/vouchers/new', label: 'Create voucher', icon: 'plus' },
  ],
  DIRECTOR: [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/pending', label: 'Pending approvals', icon: 'clock' },
    { to: '/vouchers', label: 'All vouchers', icon: 'layers', end: true },
  ],
  ACCOUNTS: [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
    { to: '/vouchers', label: 'All vouchers', icon: 'layers', end: true },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <aside className="sidebar no-print">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Icon name="receipt" size={20} />
          </span>
          <span className="brand-name">Expense Vouchers</span>
        </div>

        <nav className="nav" aria-label="Main">
          {NAV[user.role].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <div className="user-text">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{ROLE_LABEL[user.role]}</span>
          </div>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

import Icon from './Icon.jsx';

export default function StatCard({ label, value, tone = 'neutral', icon = 'file' }) {
  return (
    <div className={`stat stat-${tone}`}>
      <dt>
        <span className="stat-icon">
          <Icon name={icon} size={20} />
        </span>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

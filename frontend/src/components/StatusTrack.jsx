import Icon from './Icon.jsx';
import { STATUS_LABEL } from '../utils.js';

const TONE = { DRAFT: 'draft', PENDING_APPROVAL: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

// Shows where a voucher is in the workflow: Draft, Pending approval, then Approved or Rejected.
export default function StatusTrack({ status }) {
  const final = status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
  const steps = ['DRAFT', 'PENDING_APPROVAL', final];
  const current = steps.indexOf(status);

  return (
    <ol className="stepper" aria-label="Voucher progress">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        let icon = null;
        if (state === 'done') icon = <Icon name="tick" size={14} />;
        if (state === 'current' && step === 'APPROVED') icon = <Icon name="tick" size={14} />;
        if (state === 'current' && step === 'REJECTED') icon = <Icon name="cross" size={14} />;
        return (
          <li key={step} className={`step step-${state} step-${TONE[step]}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-dot">{icon}</span>
            <span className="step-label">{STATUS_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

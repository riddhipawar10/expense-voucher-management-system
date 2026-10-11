import { useEffect, useState } from 'react';
import { checkSignatureFile } from '../utils.js';

// File picker with a live preview. `existingUrl` shows a previously saved signature.
export default function SignatureInput({ id, label, file, existingUrl, error, onChange, hint }) {
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handlePick = (e) => {
    const picked = e.target.files?.[0] || null;
    const problem = checkSignatureFile(picked);
    setLocalError(problem);
    onChange(problem ? null : picked);
    if (problem) e.target.value = '';
  };

  const shown = preview || existingUrl;
  const message = localError || error;

  return (
    <div className={`field ${message ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="signature-box">
        {shown ? <img src={shown} alt="Signature preview" /> : <span className="signature-empty">No signature uploaded</span>}
      </div>
      <input id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePick} aria-invalid={Boolean(message)} />
      {hint && !message && <p className="hint">{hint}</p>}
      {message && <p className="error-text">{message}</p>}
    </div>
  );
}

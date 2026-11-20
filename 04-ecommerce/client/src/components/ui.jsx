import { cloneElement, createContext, useCallback, useContext, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_LABEL } from '../format.js';

export function Field({ label, error, hint, children, className = '' }) {
  const id = useId();
  const msg = `${id}-m`;
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error || hint ? msg : undefined })}
      {(error || hint) && <p id={msg} className={error ? 'f-err' : 'f-hint'}>{error || hint}</p>}
    </div>
  );
}

export const Spinner = ({ big }) => <span className={`spinner ${big ? 'big' : ''}`} aria-hidden="true" />;

export function Loading({ label = 'Loading' }) {
  return (
    <div className="loading" role="status">
      <Spinner big />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="empty error-box" role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export const StatusBadge = ({ status }) => <span className={`badge s-${status}`}>{STATUS_LABEL[status] ?? status}</span>;

export function StockNote({ stock }) {
  if (stock === 0) return <span className="stock out">Out of stock</span>;
  if (stock <= 5) return <span className="stock low">Only {stock} left</span>;
  return <span className="stock ok">In stock</span>;
}

export const Crumbs = ({ items }) => (
  <nav className="crumbs" aria-label="Breadcrumb">
    {items.map(([label, to], i) => (
      <span key={label}>
        {to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}
        {i < items.length - 1 && <span aria-hidden="true"> / </span>}
      </span>
    ))}
  </nav>
);

/* toasts */

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const next = useRef(1);
  const toast = useCallback((message, type = 'info') => {
    const id = next.current++;
    setList((l) => [...l.slice(-2), { id, message, type }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

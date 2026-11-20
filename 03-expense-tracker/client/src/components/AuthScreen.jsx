import { useState } from 'react';
import { api } from '../api.js';
import Field from './Field.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function checkLocal(mode, v) {
  const e = {};
  if (mode === 'register' && v.name.trim().length < 2) e.name = 'Enter your name.';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (mode === 'register') {
    if (v.password.length < 8) e.password = 'Use at least 8 characters.';
    else if (!/[a-zA-Z]/.test(v.password) || !/\d/.test(v.password)) e.password = 'Include a letter and a number.';
    if (v.confirm !== v.password) e.confirm = 'Passwords do not match.';
  } else if (!v.password) e.password = 'Enter your password.';
  return e;
}

export default function AuthScreen({ config, onAuthed }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', currency: 'USD' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setFormError('');
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const local = checkLocal(mode, values);
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const { user } =
        mode === 'login'
          ? await api.login({ email: values.email, password: values.password })
          : await api.register({ name: values.name, email: values.email, password: values.password, currency: values.currency });
      onAuthed(user);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-side" aria-hidden="true">
        <div className="brand light">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          Pocket Ledger
        </div>
        <div>
          <h1>Know where your money went this month.</h1>
          <p>Log income and spending in a few taps, then see the totals, the trend and the categories that add up.</p>
        </div>
        <ul className="auth-points">
          <li>Monthly summary and six-month trend</li>
          <li>Spending by category</li>
          <li>Export to CSV whenever you want</li>
        </ul>
      </section>

      <section className="auth-main">
        <div className="auth-box">
          <div className="brand mobile-only">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            Pocket Ledger
          </div>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => switchMode('login')}>
              Log in
            </button>
            <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => switchMode('register')}>
              Create account
            </button>
          </div>

          <form onSubmit={submit} noValidate className="stack">
            {mode === 'register' && (
              <Field label="Name" error={errors.name}>
                <input value={values.name} onChange={set('name')} autoComplete="name" maxLength={60} />
              </Field>
            )}
            <Field label="Email" error={errors.email}>
              <input type="email" value={values.email} onChange={set('email')} autoComplete="email" maxLength={120} />
            </Field>
            <Field label="Password" error={errors.password} hint={mode === 'register' ? '8+ characters, with a letter and a number' : ''}>
              <input
                type="password"
                value={values.password}
                onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                maxLength={72}
              />
            </Field>
            {mode === 'register' && (
              <div className="row-2">
                <Field label="Confirm password" error={errors.confirm}>
                  <input type="password" value={values.confirm} onChange={set('confirm')} autoComplete="new-password" maxLength={72} />
                </Field>
                <Field label="Currency" error={errors.currency}>
                  <select value={values.currency} onChange={set('currency')}>
                    {config.currencies.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            )}

            {formError && <p className="form-error" role="alert">{formError}</p>}

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy && <span className="spinner" />}
              {mode === 'login' ? (busy ? 'Logging in...' : 'Log in') : busy ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

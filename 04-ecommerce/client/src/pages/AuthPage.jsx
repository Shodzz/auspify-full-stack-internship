import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Spinner, useToast } from '../components/ui.jsx';

// only allow redirects back into this site
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

export default function AuthPage({ mode }) {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  if (auth.user) return <Navigate to={next} replace />;

  const set = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const local = {};
    if (!isLogin && v.name.trim().length < 2) local.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) local.email = 'Enter a valid email address.';
    if (isLogin && !v.password) local.password = 'Enter your password.';
    if (!isLogin && (v.password.length < 8 || !/[a-zA-Z]/.test(v.password) || !/\d/.test(v.password))) {
      local.password = 'At least 8 characters with a letter and a number.';
    }
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const user = isLogin ? await auth.login({ email: v.email, password: v.password }) : await auth.register(v);
      toast(isLogin ? `Welcome back, ${user.name.split(' ')[0]}` : 'Account created', 'success');
      navigate(next, { replace: true });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
      setBusy(false);
    }
  }

  const other = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>{isLogin ? 'Log in' : 'Create an account'}</h1>
        <p className="muted">{isLogin ? 'Log in to check out and see your orders.' : 'You need an account to place orders.'}</p>
        {!isLogin && (
          <Field label="Name" error={errors.name}><input value={v.name} onChange={set('name')} autoComplete="name" maxLength={60} /></Field>
        )}
        <Field label="Email" error={errors.email}><input type="email" value={v.email} onChange={set('email')} autoComplete="email" maxLength={120} /></Field>
        <Field label="Password" error={errors.password} hint={isLogin ? '' : '8+ characters, with a letter and a number'}>
          <input type="password" value={v.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} maxLength={72} />
        </Field>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy && <Spinner />} {isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="muted small center">
          {isLogin ? 'New here? ' : 'Already have an account? '}
          <Link to={other}>{isLogin ? 'Create an account' : 'Log in'}</Link>
        </p>
      </form>
    </div>
  );
}

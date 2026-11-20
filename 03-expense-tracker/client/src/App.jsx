import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import { useToast } from './components/Toast.jsx';

export default function App() {
  // undefined = still checking the session, null = logged out
  const [user, setUser] = useState(undefined);
  const [config, setConfig] = useState(null);
  const [bootError, setBootError] = useState('');
  const toast = useToast();

  const boot = useCallback(async () => {
    setBootError('');
    try {
      setConfig(await api.config());
    } catch (err) {
      setBootError(err.message);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // several requests can 401 at once; only toast for the first one
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const onExpired = () => {
      if (userRef.current) toast('Your session ended. Please log in again.', { type: 'error' });
      userRef.current = null;
      setUser(null);
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, [toast]);

  if (bootError) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <h2>Can't connect</h2>
          <p className="muted">{bootError}</p>
          <button className="btn btn-primary" onClick={boot}>Try again</button>
        </div>
      </div>
    );
  }

  if (user === undefined || !config) {
    return (
      <div className="center-screen" aria-busy="true">
        <div className="spinner big" />
      </div>
    );
  }

  if (!user) return <AuthScreen config={config} onAuthed={setUser} />;

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return <Dashboard user={user} config={config} onUserChange={setUser} onLogout={logout} />;
}

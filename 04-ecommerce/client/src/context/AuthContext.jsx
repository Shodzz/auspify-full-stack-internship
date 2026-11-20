import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined while we ask the server who is logged in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me().then((r) => setUser(r.user)).catch(() => setUser(null));
  }, []);

  const value = {
    user,
    ready: user !== undefined,
    async login(creds) {
      const { user } = await api.login(creds);
      setUser(user);
      return user;
    },
    async register(details) {
      const { user } = await api.register(details);
      setUser(user);
      return user;
    },
    async logout() {
      await api.logout().catch(() => {});
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

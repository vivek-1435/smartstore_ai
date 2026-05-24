import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('smartstore_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('smartstore_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('smartstore_token');
    localStorage.removeItem('smartstore_user');
    localStorage.removeItem('smartstore_temp_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const { data } = await authAPI.me();
          setUser(data.user);
          localStorage.setItem('smartstore_user', JSON.stringify(data.user));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [logout, token]);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('smartstore_token', data.token);
    localStorage.setItem('smartstore_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const loginPreCheck = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('smartstore_temp_token', data.token);
    return data;
  }, []);

  const loginCommit = useCallback((data) => {
    localStorage.setItem('smartstore_token', data.token);
    localStorage.setItem('smartstore_user', JSON.stringify(data.user));
    localStorage.removeItem('smartstore_temp_token');
    setToken(data.token);
    setUser(data.user);
  }, []);

  const loginAbort = useCallback(() => {
    localStorage.removeItem('smartstore_temp_token');
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('smartstore_token', data.token);
    localStorage.setItem('smartstore_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const { data } = await authAPI.updateMe(updates);
    localStorage.setItem('smartstore_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const updateLocalUser = useCallback((updates) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };
      localStorage.setItem('smartstore_user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, updateLocalUser, loginPreCheck, loginCommit, loginAbort }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

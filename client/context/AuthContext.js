import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api';

const TOKEN_KEY = 'auth_token';
const SESSION_KEY = 'auth_session_id';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore session from secure storage
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) return;

        const userData = await api.get('/auth/me', storedToken);
        setToken(storedToken);
        setUser(userData);

        const storedSession = await SecureStore.getItemAsync(SESSION_KEY);
        if (storedSession) setSessionId(storedSession);
      } catch {
        // Token expired or invalid — clear storage
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(role, email, password, courseId) {
    const body = { role, email, password };
    if (role === 'STUDENT') body.courseId = courseId;

    const data = await api.post('/auth/login', body);

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    if (data.sessionId) await SecureStore.setItemAsync(SESSION_KEY, data.sessionId);

    setToken(data.token);
    setUser(data.user);
    setSessionId(data.sessionId ?? null);
  }

  async function signup(role, name, email, password) {
    const data = await api.post('/auth/signup', { role, name, email, password });

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);

    setToken(data.token);
    setUser(data.user);
    setSessionId(null);
  }

  async function logout() {
    try {
      const body = {};
      if (user?.role === 'STUDENT' && sessionId) body.sessionId = sessionId;
      await api.post('/auth/logout', body, token);
    } catch {
      // Proceed with local logout even if server call fails
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setToken(null);
      setUser(null);
      setSessionId(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, sessionId, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

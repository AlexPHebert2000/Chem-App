import { createContext, useContext, useEffect, useState } from 'react';
import { getItem, setItem, deleteItem } from '../lib/storage';
import { api, setAuthCallbacks } from '../lib/api';

const TOKEN_KEY = 'auth_token';
const SESSION_TOKEN_KEY = 'auth_session_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wire up api.js callbacks before the first request fires
    setAuthCallbacks({
      onTokenRefreshed: (newToken, newUser) => {
        setToken(newToken);
        if (newUser) setUser(newUser);
      },
      onSessionExpired: async () => {
        await deleteItem(TOKEN_KEY);
        await deleteItem(SESSION_TOKEN_KEY);
        setToken(null);
        setUser(null);
        setSessionToken(null);
      },
    });

    (async () => {
      try {
        const storedSessionToken = await getItem(SESSION_TOKEN_KEY);
        if (!storedSessionToken) return;

        // Use the auth session to get a fresh JWT (bypasses the 401 interceptor)
        const { token: freshToken, user: freshUser } = await api.post('/auth/refresh', { sessionToken: storedSessionToken });
        await setItem(TOKEN_KEY, freshToken);
        setToken(freshToken);
        setUser(freshUser);
        setSessionToken(storedSessionToken);
      } catch {
        // Auth session expired or invalid — require re-login
        await deleteItem(TOKEN_KEY);
        await deleteItem(SESSION_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(role, email, password, courseId, stayLoggedIn = false) {
    const body = { role, email, password, stayLoggedIn };
    if (role === 'STUDENT') body.courseId = courseId;

    const data = await api.post('/auth/login', body);

    await setItem(TOKEN_KEY, data.token);
    if (data.sessionToken) {
      await setItem(SESSION_TOKEN_KEY, data.sessionToken);
      setSessionToken(data.sessionToken);
    }

    setToken(data.token);
    setUser(data.user);
  }

  async function signup(role, name, email, password) {
    const data = await api.post('/auth/signup', { role, name, email, password });

    await setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    try {
      const storedSessionToken = await getItem(SESSION_TOKEN_KEY);
      const body = storedSessionToken ? { sessionToken: storedSessionToken } : {};
      await api.post('/auth/logout', body, token);
    } catch {
      // Proceed with local logout even if server call fails
    } finally {
      await deleteItem(TOKEN_KEY);
      await deleteItem(SESSION_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setSessionToken(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, sessionToken, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

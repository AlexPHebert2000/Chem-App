import { getItem, setItem } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Injected by AuthContext.initialize() to avoid circular imports
let _onTokenRefreshed = null;
let _onSessionExpired = null;

export function setAuthCallbacks({ onTokenRefreshed, onSessionExpired }) {
  _onTokenRefreshed = onTokenRefreshed;
  _onSessionExpired = onSessionExpired;
}

let isRefreshing = false;
let pendingQueue = [];

function drainQueue(newToken, error) {
  pendingQueue.forEach(({ resolve, reject, fn }) =>
    error ? reject(error) : resolve(fn(newToken))
  );
  pendingQueue = [];
}

async function request(path, { token, body, method = 'GET' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

// Wrapper with automatic JWT refresh on 401
async function requestWithRefresh(path, opts = {}) {
  try {
    return await request(path, opts);
  } catch (err) {
    // Only attempt refresh for 401s on non-auth endpoints
    if (err.status !== 401 || path.startsWith('/auth/')) throw err;

    const sessionToken = await getItem('auth_session_token');
    if (!sessionToken) {
      _onSessionExpired?.();
      throw err;
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, fn: (newToken) => request(path, { ...opts, token: newToken }) });
      });
    }

    isRefreshing = true;
    try {
      const { token: newToken, user } = await request('/auth/refresh', {
        method: 'POST',
        body: { sessionToken },
      });
      await setItem('auth_token', newToken);
      _onTokenRefreshed?.(newToken, user);
      drainQueue(newToken, null);
      return await request(path, { ...opts, token: newToken });
    } catch (refreshErr) {
      drainQueue(null, refreshErr);
      _onSessionExpired?.();
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }
}

export const api = {
  get:   (path, token)       => requestWithRefresh(path, { token }),
  post:  (path, body, token) => requestWithRefresh(path, { method: 'POST',  body, token }),
  patch: (path, body, token) => requestWithRefresh(path, { method: 'PATCH', body, token }),
};

import API_BASE_URL from "../config";

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) setToken(data.token);
  return data;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  if (t) {
    localStorage.setItem('token', t);
    try { scheduleExpiryNotifications(); } catch (_) {}
  } else {
    localStorage.removeItem('token');
    try { clearExpiryTimers(); } catch (_) {}
  }
}


function _nativeLogout() {
  // Clear local token and tell server to clear cookie
  try {
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  } catch (_) {}
  localStorage.removeItem("token");
}

// --- Token expiry notification helpers ---
let __auth_warn_timeout = null;
let __auth_expire_timeout = null;
let __auth_handled_401 = false;

function clearExpiryTimers() {
  if (__auth_warn_timeout) { clearTimeout(__auth_warn_timeout); __auth_warn_timeout = null; }
  if (__auth_expire_timeout) { clearTimeout(__auth_expire_timeout); __auth_expire_timeout = null; }
}

function scheduleExpiryNotifications() {
  clearExpiryTimers();
  const payload = getTokenPayload();
  if (!payload || !payload.exp) return;
  const expMs = payload.exp * 1000;
  const now = Date.now();
  const msUntilExp = expMs - now;
  if (msUntilExp <= 0) return;

  // Warn 60 seconds before expiry (if possible)
  const warnBefore = 60 * 1000;
  if (msUntilExp > warnBefore) {
    __auth_warn_timeout = setTimeout(() => {
      try { alert('Your session will expire in 1 minute. Please save your work.'); } catch (_) {}
    }, msUntilExp - warnBefore);
  }

  // Force logout at expiry (in case server rejects requests)
  __auth_expire_timeout = setTimeout(() => {
    try { _logout_and_clear(); } catch (_) {}
    try { alert('Session expired. Please sign in again.'); } catch (_) {}
    try { window.location.href = '/login'; } catch (_) {}
  }, msUntilExp + 500);
}

// Ensure timers are cleared on logout and when token removed
const _origLogout = _nativeLogout;
export function _logout_and_clear() {
  clearExpiryTimers();
  __auth_handled_401 = false;
  _origLogout();
}

// Replace exported logout reference so other modules calling `logout()` still work
export { _logout_and_clear as logout };

// Monkey-patch global fetch to catch 401 responses and force sign-out
if (typeof window !== 'undefined' && window.fetch) {
  const _origFetch = window.fetch.bind(window);
  window.fetch = async function(...args) {
    const resp = await _origFetch(...args);
      if (resp && resp.status === 401) {
      // Avoid multiple alerts
      if (!__auth_handled_401) {
        __auth_handled_401 = true;
        clearExpiryTimers();
        try { _logout_and_clear(); } catch (_) {}
        try { alert('Session expired. Please sign in again.'); } catch (_) {}
        try { window.location.href = '/login'; } catch (_) {}
      }
    }
    return resp;
  };
}

// Ensure schedule is set when module loads if token already present
try { if (getToken()) scheduleExpiryNotifications(); } catch (_) {}


// Try to decode JWT and return payload object (or null)
export function getTokenPayload() {
  const t = getToken();
  if (!t) return null;
  try {
    const parts = t.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(payload).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function isAdmin() {
  const p = getTokenPayload();
  return p && (p.role === 'admin' || (p.user && p.user.role === 'admin'));
}

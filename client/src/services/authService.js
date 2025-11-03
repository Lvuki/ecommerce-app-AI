import API_BASE_URL from "../config";

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) localStorage.setItem("token", data.token);
  return data;
}

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export function logout() {
  // Clear local token and tell server to clear cookie
  try {
    fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  } catch (_) {}
  localStorage.removeItem("token");
}

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

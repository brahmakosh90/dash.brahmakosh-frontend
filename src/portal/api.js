// HTTP client for the Referral Partner Portal (/api/referral). Partners and staff use separate tokens.
const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/referral`;
const KEYS = { partner: 'pp_partner_token', staff: 'pp_staff_token' };

export const tokens = {
  get: (kind) => { try { return localStorage.getItem(KEYS[kind]); } catch { return null; } },
  set: (kind, v) => { try { localStorage.setItem(KEYS[kind], v); } catch { /* storage unavailable */ } },
  clear: (kind) => { try { localStorage.removeItem(KEYS[kind]); } catch { /* storage unavailable */ } },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}

const request = async (kind, method, path, body) => {
  const token = tokens.get(kind);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('/auth/')) { tokens.clear(kind); onUnauthorized(kind); }
  if (!res.ok || json.success === false) throw new ApiError(json.message || `Request failed (${res.status})`, res.status, json.code);
  return json.data;
};

const make = (kind) => ({
  get: (p) => request(kind, 'GET', p),
  post: (p, b) => request(kind, 'POST', p, b || {}),
  put: (p, b) => request(kind, 'PUT', p, b || {}),
  patch: (p, b) => request(kind, 'PATCH', p, b || {}),
});

export const partnerApi = make('partner');
export const staffApi = make('staff');

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

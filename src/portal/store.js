// Brahmakosh Partner Portal — client state for the partner screens.
// Data is loaded from /api/referral/partner/bootstrap; actions call the API and then refresh.
import { reactive } from 'vue';
import { partnerApi, ApiError } from './api.js';

export const RULES = Object.freeze({
  commission: 1, // USD per eligible registration
  minWithdrawal: 50, // USD of approved payable balance
  attributionDays: 30, // days from an eligible referral click
  holdDays: 7, // fraud-check hold before a commission becomes payable
});

export let ME = ''; // id of the signed-in partner (live binding, set by loadPartner)

/* ---------- dates ---------- */
const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const dayStr = (offset = 0) => {
  const d = midnight(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
export const ageDays = (s) => daysBetween(s, dayStr(0));

/* ---------- reactive state ---------- */
const empty = () => ({
  ready: false, error: '', blocked: null,
  partners: [], campaigns: [], series: [], referrals: [], commissions: [], withdrawals: [], tickets: [],
  payout: { status: 'unset', holder: '', bank: '', last4: '', code: '', country: '', updatedAt: null },
  wallet: { pending: 0, approved: 0, paid: 0, rejected: 0, reversed: 0, reserved: 0, payable: 0, lifetime: 0 },
  totals: { clicks: 0, installs: 0, regs: 0 }, campaignTotals: {},
});
export const state = reactive({ ...empty(), toasts: [] });

/* ---------- toast / clipboard / download ---------- */
let toastSeq = 0;
export const toast = (message, type = 'ok') => {
  const id = ++toastSeq;
  state.toasts.push({ id, message, type });
  setTimeout(() => { state.toasts = state.toasts.filter((t) => t.id !== id); }, 3200);
};
export const copyText = async (text, label = 'Copied to clipboard') => {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(label); }
};
export const download = (filename, content, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};
export const exportCSV = (filename, rows) => {
  if (!rows.length) return toast('Nothing to export', 'err');
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  download(filename, [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n'), 'text/csv');
  toast(`${filename} downloaded`);
};
export const errMsg = (e) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

/* ---------- formatting ---------- */
export const money = (n, d = 2) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
export const num = (n) => Number(n || 0).toLocaleString('en-US');
export const pct = (n, d = 1) => `${(Number(n || 0)).toFixed(d)}%`;
export const rate = (a, b) => (b ? (a / b) * 100 : 0);
export const fmtDate = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const shortDate = (s) => new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export const shortId = (prefix, id) => `${prefix}-${String(id).slice(-6).toUpperCase()}`;
export const partnerOf = (id) => state.partners.find((p) => p.id === id);
export const campaignOf = (id) => state.campaigns.find((c) => c.id === id);

/* ---------- selectors (partner data only) ---------- */
export const inRange = (date, days) => date >= dayStr(-(days - 1));
export const sumSeries = (rows) => rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, installs: a.installs + r.installs, regs: a.regs + r.regs }), { clicks: 0, installs: 0, regs: 0 });

/** Daily rows for a filter, zero-filled across the range. */
export const dailySeries = ({ campaignId, days = 30 } = {}) => {
  const map = {};
  for (let i = days - 1; i >= 0; i--) map[dayStr(-i)] = { date: dayStr(-i), clicks: 0, installs: 0, regs: 0 };
  state.series.forEach((s) => {
    if (campaignId && campaignId !== 'all' && s.campaignId !== campaignId) return;
    const row = map[s.date]; if (!row) return;
    row.clicks += s.clicks; row.installs += s.installs; row.regs += s.regs;
  });
  return Object.values(map);
};

export const bucketSeries = (rows, mode) => {
  if (mode === 'daily') return rows.map((r) => ({ ...r, label: shortDate(r.date) }));
  const out = []; const key = (d) => {
    const dt = new Date(`${d}T00:00:00`);
    if (mode === 'monthly') return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const monday = new Date(dt); monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); return monday.toISOString().slice(0, 10);
  };
  const m = new Map();
  rows.forEach((r) => {
    const k = key(r.date);
    if (!m.has(k)) m.set(k, { date: r.date, k, clicks: 0, installs: 0, regs: 0 });
    const b = m.get(k); b.clicks += r.clicks; b.installs += r.installs; b.regs += r.regs;
  });
  m.forEach((b) => out.push({ ...b, label: mode === 'monthly' ? new Date(`${b.k}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) : `Wk ${shortDate(b.k)}` }));
  return out;
};

export const walletOf = () => state.wallet;

/** All-time totals use the server aggregate; shorter windows come from the 90 days of daily rows. */
export const partnerTotals = (_pid, days = 3650) => {
  const t = days >= 3650 ? state.totals : sumSeries(state.series.filter((s) => inRange(s.date, days)));
  return { ...t, conv: rate(t.regs, t.clicks), installRate: rate(t.installs, t.clicks) };
};

export const campaignTotals = (cid) => state.campaignTotals[cid] || { clicks: 0, installs: 0, regs: 0 };

/* ---------- loading ---------- */
const apply = (d) => {
  ME = d.partner.id;
  Object.assign(state, {
    partners: [d.partner], campaigns: d.campaigns, series: d.series, referrals: d.referrals, commissions: d.commissions, withdrawals: d.withdrawals,
    tickets: d.tickets, payout: d.payout, wallet: d.wallet, totals: d.totals, campaignTotals: d.campaignTotals, ready: true, error: '', blocked: null,
  });
};

export const loadPartner = async () => {
  try { apply(await partnerApi.get('/partner/bootstrap')); }
  catch (e) {
    if (e.status === 403 && e.code?.startsWith('partner_')) { state.blocked = { code: e.code, message: e.message }; state.ready = true; }
    else state.error = errMsg(e);
  }
};

export const resetPartner = () => { ME = ''; Object.assign(state, empty()); };

/* ---------- partner actions (each returns { ok, error }) ---------- */
const act = async (fn) => {
  try { const data = await fn(); await loadPartner(); return { ok: true, data }; }
  catch (e) { return { ok: false, error: errMsg(e) }; }
};

export const requestWithdrawal = (amount) => act(() => partnerApi.post('/partner/withdrawals', { amount: Number(amount) }));
export const updatePayout = (d) => act(() => partnerApi.put('/partner/payout', { holder: d.holder, bank: d.bank, account: d.account, code: d.code, country: d.country }));
export const requestCampaign = (d) => act(() => partnerApi.post('/partner/campaigns', d));
export const createTicket = (d) => act(() => partnerApi.post('/partner/tickets', d));
export const saveProfile = (d) => act(() => partnerApi.patch('/partner/profile', d));

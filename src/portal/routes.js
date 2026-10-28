// Route table and auth guard for the Referral Partner Portal (mounted by src/router/index.js).
import PortalLayout from './PortalLayout.jsx';

const page = (title, loader) => ({ component: loader, meta: { title } });

export const portalRoutes = [
  { path: '/partner-portal/login', component: () => import('./pages/Login.jsx'), meta: { portalPublic: true } },
  { path: '/partner-portal/register', component: () => import('./pages/Register.jsx'), meta: { portalPublic: true } },
  { path: '/partner-portal/admin/login', component: () => import('./admin/Login.jsx'), meta: { portalPublic: true } },
  {
    path: '/partner-portal',
    component: PortalLayout,
    redirect: '/partner-portal/dashboard',
    children: [
      { path: 'dashboard', ...page('Partner Dashboard', () => import('./pages/Dashboard.jsx')) },
      { path: 'links', ...page('Referral Links & Codes', () => import('./pages/Links.jsx')) },
      { path: 'campaigns', ...page('Campaigns', () => import('./pages/Campaigns.jsx')) },
      { path: 'analytics', ...page('Analytics', () => import('./pages/Analytics.jsx')) },
      { path: 'leaderboard', ...page('Spiritual Impact Leaderboard', () => import('./pages/Leaderboard.jsx')) },
      { path: 'wallet', ...page('Earnings & Wallet', () => import('./pages/Wallet.jsx')) },
      { path: 'withdrawals', ...page('Withdrawals & Payouts', () => import('./pages/Withdrawals.jsx')) },
      { path: 'activity', ...page('Referral Activity', () => import('./pages/Activity.jsx')) },
      { path: 'resources', ...page('Marketing Resources', () => import('./pages/Resources.jsx')) },
      { path: 'profile', ...page('My Profile', () => import('./pages/Profile.jsx')) },
      { path: 'settings', ...page('Settings', () => import('./pages/Settings.jsx')) },
      { path: 'help', ...page('Help & Support', () => import('./pages/Help.jsx')) },
      { path: 'admin', redirect: '/partner-portal/admin/overview' },
      { path: 'admin/overview', ...page('Dashboard', () => import('./admin/Overview.jsx')) },
      { path: 'admin/partners', ...page('Partners', () => import('./admin/Partners.jsx')) },
      { path: 'admin/campaigns', ...page('Campaigns', () => import('./admin/Campaigns.jsx')) },
      { path: 'admin/commissions', ...page('Commission Review', () => import('./admin/Commissions.jsx')) },
      { path: 'admin/withdrawals', ...page('Withdrawals & Payouts', () => import('./admin/Withdrawals.jsx')) },
      { path: 'admin/reports', ...page('Reports', () => import('./admin/Reports.jsx')) },
      { path: 'admin/fraud', ...page('Fraud & Security', () => import('./admin/Fraud.jsx')) },
      { path: 'admin/roles', ...page('Roles & Access', () => import('./admin/Roles.jsx')) },
      { path: 'admin/audit', ...page('Audit Logs', () => import('./admin/Audit.jsx')) },
      { path: 'admin/profile', ...page('My Profile', () => import('./admin/Profile.jsx')) },
      { path: 'admin/settings', ...page('Settings', () => import('./admin/Settings.jsx')) },
      { path: 'admin/help', ...page('Help', () => import('./admin/Help.jsx')) },
    ],
  },
];

/** Portal screens use their own tokens (see api.js), independent of the platform's role-based auth. */
export const portalGuard = (to) => {
  if (!to.path.startsWith('/partner-portal') || to.meta.portalPublic) return true;
  const staff = to.path.startsWith('/partner-portal/admin');
  let token = null;
  try { token = localStorage.getItem(staff ? 'pp_staff_token' : 'pp_partner_token'); } catch { /* storage unavailable */ }
  if (token) return true;
  return { path: staff ? '/partner-portal/admin/login' : '/partner-portal/login', query: { next: to.fullPath } };
};

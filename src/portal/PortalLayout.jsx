import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import logo from '../assets/logo.jpeg';
import './portal.css';
import { Icon, Toasts, Steps, Badge } from './components/ui.jsx';
import { state, partnerOf, ME, loadPartner, resetPartner } from './store.js';
import { staff, loadStaff, resetStaff } from './admin/adminStore.js';
import { tokens, staffApi, partnerApi, setUnauthorizedHandler } from './api.js';
import { fmtDate } from './store.js';

const BASE = '/partner-portal';

// [path, label, icon, queue key for the count badge]
const PARTNER_NAV = [
  ['dashboard', 'Dashboard', 'dashboard'], ['links', 'Referral Links & Codes', 'link'], ['campaigns', 'Campaigns', 'megaphone'], ['analytics', 'Analytics', 'chart'],
  ['wallet', 'Earnings & Wallet', 'wallet'], ['withdrawals', 'Withdrawals & Payouts', 'bank'], ['leaderboard', 'Spiritual Impact', 'trophy'],
  ['activity', 'Referral Activity', 'activity'], ['resources', 'Marketing Resources', 'image'],
];
const ADMIN_NAV = [
  ['admin/overview', 'Dashboard', 'dashboard'], ['admin/partners', 'Partners', 'users', 'applications'], ['admin/campaigns', 'Campaigns', 'megaphone', 'campaigns'],
  ['admin/commissions', 'Commission Review', 'checkCircle'], ['admin/withdrawals', 'Withdrawals & Payouts', 'bank', 'withdrawalsToApprove'],
  ['admin/reports', 'Reports', 'chart'], ['admin/fraud', 'Fraud & Security', 'shieldAlert', 'fraudOpen'], ['admin/roles', 'Roles & Access', 'key'], ['admin/audit', 'Audit Logs', 'file'],
];

const Splash = (props, { slots }) => (
  <div class="pp-state"><div class="pp-card">{props.spin && <div class="pp-spin" />}{slots.default?.()}</div></div>
);
Splash.props = ['spin'];

export default {
  name: 'PortalLayout',
  setup() {
    const route = useRoute(); const router = useRouter();
    const isMobile = ref(false); const collapsed = ref(false); const open = ref(false); const menu = ref(false);
    const queue = ref({});
    const applicant = ref(null); // profile of a partner who cannot use the portal yet (pending / rejected / suspended)
    const isAdmin = computed(() => route.path.startsWith(`${BASE}/admin`));

    const checkMobile = () => { isMobile.value = window.innerWidth < 1024; };
    const onDocClick = (e) => { if (!e.target.closest('.pp-umenu')) menu.value = false; };
    const toggleSidebar = () => { if (isMobile.value) open.value = !open.value; else collapsed.value = !collapsed.value; };

    const loadQueue = async () => { try { queue.value = (await staffApi.get('/admin/overview')).queue; } catch { /* count badges are optional */ } };
    // `fresh` re-fetches even when data is already loaded (area switch, tab regains focus) so screens never show stale balances.
    const boot = async (fresh = false) => {
      if (isAdmin.value) { if (!staff.ready || fresh) await loadStaff(); loadQueue(); }
      else if (!state.ready || fresh) await loadPartner();
      if (!isAdmin.value && state.blocked) { try { applicant.value = (await partnerApi.get('/partner/profile')).partner; } catch { /* status card still renders without it */ } }
    };
    const onVisible = () => { if (document.visibilityState === 'visible' && (isAdmin.value ? staff.ready : state.ready)) boot(true); };

    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      document.addEventListener('click', onDocClick);
      document.addEventListener('visibilitychange', onVisible);
      setUnauthorizedHandler((kind) => router.replace({ path: kind === 'staff' ? `${BASE}/admin/login` : `${BASE}/login`, query: { next: route.fullPath } }));
      boot();
    });
    onBeforeUnmount(() => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('visibilitychange', onVisible);
    });
    watch(isAdmin, () => boot(true));
    watch(() => route.path, () => { open.value = false; menu.value = false; if (isAdmin.value && staff.ready) loadQueue(); });

    const logout = () => {
      menu.value = false;
      if (isAdmin.value) { tokens.clear('staff'); resetStaff(); router.replace(`${BASE}/admin/login`); }
      else { tokens.clear('partner'); resetPartner(); router.replace(`${BASE}/login`); }
    };

    return () => {
      const blocked = !isAdmin.value && state.blocked;
      const me = state.ready && !blocked ? partnerOf(ME) : null;
      const ready = isAdmin.value ? staff.ready : state.ready;
      const error = isAdmin.value ? staff.error : state.error;
      const nav = blocked ? [[route.path.replace(`${BASE}/`, ''), 'Application status', 'clock']] : isAdmin.value ? ADMIN_NAV : PARTNER_NAV;
      const retry = () => { if (isAdmin.value) { staff.error = ''; loadStaff(); } else { state.error = ''; loadPartner(); } };
      const sideCollapsed = collapsed.value && !isMobile.value;

      let body;
      if (error) body = <Splash><h3>Couldn’t load your data</h3><p class="pp-muted" style={{ margin: '8px 0 16px' }}>{error}</p><button class="pp-btn" onClick={retry}>Try again</button></Splash>;
      else if (!ready) body = <Splash spin><span class="pp-muted">Loading…</span></Splash>;
      else if (blocked) {
        const code = state.blocked.code; const a = applicant.value;
        const title$ = { partner_pending: 'Application under review', partner_rejected: 'Application not approved', partner_suspended: 'Account suspended' }[code] || 'Access restricted';
        const steps = code === 'partner_rejected'
          ? [{ label: 'Submitted', state: 'done' }, { label: 'Reviewed', state: 'done' }, { label: 'Not approved', state: 'bad' }]
          : code === 'partner_suspended'
            ? [{ label: 'Submitted', state: 'done' }, { label: 'Approved', state: 'done' }, { label: 'Suspended', state: 'bad' }]
            : [{ label: 'Submitted', state: 'done' }, { label: 'Under review', state: 'now' }, { label: 'Approved', state: '' }];
        body = (
          <div class="pp-card" style={{ maxWidth: '640px', margin: '3vh auto' }}>
            <div class="pp-card-b" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}><h1 style={{ fontSize: '22px', fontWeight: 800 }}>{title$}</h1><Badge status={code === 'partner_pending' ? 'pending' : code === 'partner_rejected' ? 'rejected' : 'suspended'} /></div>
              <p class="pp-muted" style={{ margin: '8px 0 20px' }}>{code === 'partner_pending' ? 'Thanks for applying! Our team reviews every application. Once approved, your referral link, code and dashboard unlock automatically — just sign in again.' : state.blocked.message}</p>
              <div style={{ overflowX: 'auto', paddingBottom: '4px' }}><Steps steps={steps} /></div>
              {a?.reviewNote && code !== 'partner_pending' && <div class="pp-callout warn" style={{ marginTop: '18px' }}><Icon name="info" /><div><b>Reason from our team:</b> {a.reviewNote}</div></div>}
              {a && (
                <dl class="pp-kv" style={{ marginTop: '22px', gridTemplateColumns: '130px 1fr' }}>
                  <dt>Name</dt><dd>{a.name}</dd><dt>Organisation</dt><dd>{a.org || '—'}</dd><dt>Email</dt><dd>{a.email}</dd><dt>Applied on</dt><dd>{fmtDate(a.appliedAt)}</dd>
                </dl>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '22px', flexWrap: 'wrap' }}>
                <button class="pp-btn ghost" onClick={() => boot(true)}><Icon name="clock" size={16} />Check status</button>
                <a class="pp-btn ghost" href="mailto:partners@brahmakosh.com">Contact support</a>
              </div>
            </div>
          </div>
        );
      } else body = <RouterView />;

      const title = blocked ? 'Application status' : route.meta.title || 'Partner Portal';
      const area = isAdmin.value ? `${BASE}/admin` : BASE;
      const who = isAdmin.value
        ? (staff.ready ? { name: staff.name && staff.name !== staff.email ? staff.name : staff.roleLabel, email: staff.email, tag: `Admin · ${staff.roleLabel}` } : null)
        : (me ? { name: me.name, email: me.email, tag: `Partner · ${me.tier}` } : null);
      const iconLink = (path, label, icon, pill) => (
        <RouterLink key={path} to={`${BASE}/${path}`} title={sideCollapsed ? label : undefined}>
          <span class="pp-ni"><Icon name={icon} size={18} /></span><span class="pp-lbl">{label}</span>
          {pill && queue.value[pill] > 0 && <span class="pp-pill">{queue.value[pill]}</span>}
        </RouterLink>
      );

      return (
        <div class="pp-root">
          <div class={`pp-shell ${sideCollapsed ? 'collapsed' : ''}`}>
            <aside class={`pp-side ${open.value ? 'open' : ''}`} aria-label="Primary">
              <div class="pp-brand">
                <img src={logo} alt="Brahmakosh" />
                <div class="pp-brand-text"><b>Brahmakosh</b><span>{isAdmin.value ? 'Admin Dashboard' : 'Partner Dashboard'}</span></div>
              </div>
              <nav class="pp-nav">{nav.map(([path, label, icon, pill]) => iconLink(path, label, icon, pill))}</nav>
            </aside>
            <div class={`pp-scrim ${open.value ? 'open' : ''}`} onClick={() => (open.value = false)} />

            <div class="pp-main">
              <header class="pp-top">
                <div class="pp-top-l">
                  <button class="pp-hamb" aria-label="Toggle menu" onClick={toggleSidebar}><Icon name="menu" size={24} /></button>
                  <h2>{title}</h2>
                </div>
                {who && (
                  <div class="pp-umenu">
                    <button class="pp-umenu-btn" aria-haspopup="menu" aria-expanded={menu.value} onClick={() => (menu.value = !menu.value)}>
                      <span class="pp-umenu-txt"><b>{who.name}</b><small>{who.email}</small></span>
                      <Icon name="down" size={14} />
                    </button>
                    {menu.value && (
                      <div class="pp-umenu-dd" role="menu">
                        <div class="pp-umenu-head"><b>{who.name}</b><small>{who.email}</small><span class="pp-badge indigo">{who.tag}</span></div>
                        <RouterLink to={`${area}/profile`} role="menuitem"><Icon name="user" size={16} />Profile</RouterLink>
                        <RouterLink to={`${area}/settings`} role="menuitem"><Icon name="key" size={16} />Settings</RouterLink>
                        <RouterLink to={`${area}/help`} role="menuitem"><Icon name="support" size={16} />Help</RouterLink>
                        <button role="menuitem" class="pp-umenu-out" onClick={logout}><Icon name="x" size={16} />Logout</button>
                      </div>
                    )}
                  </div>
                )}
                {!who && ready && <button class="pp-btn ghost sm" onClick={logout}>Sign out</button>}
              </header>
              <main class="pp-content">{body}</main>
            </div>
          </div>
          <Toasts />
        </div>
      );
    };
  },
};

import { Icon, Card, PageHead, Badge, Avatar, loadState } from '../components/ui.jsx';
import { staff, useAdminData } from './adminStore.js';

export default {
  name: 'AdminProfile',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/roles');
    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      const labels = Object.fromEntries(data.value.perms);
      return (
        <div class="pp-stack">
          <PageHead title="My Profile" sub="Your admin account and what your role allows you to do." />
          <div class="pp-grid pp-g-2-1">
            <Card title="Access & permissions" sub={`Role: ${staff.roleLabel}`}>
              <div class="pp-list">{data.value.perms.map(([key, label]) => { const on = staff.perms.includes(key); return (
                <div key={key} style={{ opacity: on ? 1 : 0.5 }}><span class={`pp-ico ${on ? 'green' : 'gray'}`}><Icon name={on ? 'check' : 'x'} size={15} /></span><div class="pp-grow"><b>{label}</b><div class="pp-muted mono" style={{ fontSize: '11.5px' }}>{key}</div></div><Badge status={on ? 'active' : 'revoked'} label={on ? 'Allowed' : 'Not allowed'} /></div>
              ); })}</div>
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'grid', placeItems: 'center' }}><Avatar text={(staff.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()} size={64} /></div>
                <b style={{ display: 'block', marginTop: '10px', fontSize: '16px' }}>{staff.name}</b><small class="pp-muted">{staff.email}</small>
              </div>
              <dl class="pp-kv" style={{ gridTemplateColumns: '1fr auto', marginTop: '18px' }}>
                <dt>Role</dt><dd><Badge tone="indigo" status="active" label={staff.roleLabel} /></dd>
                <dt>Account type</dt><dd>{staff.source === 'admin' ? 'Platform admin' : 'Partner team'}</dd>
                <dt>Permissions</dt><dd>{staff.perms.length} of {data.value.perms.length}</dd>
              </dl>
            </Card>
          </div>
        </div>
      );
    };
  },
};

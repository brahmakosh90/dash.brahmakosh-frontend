import { ref, reactive } from 'vue';
import { Icon, Callout, PageHead, Card, DataTable, Badge, Avatar, Modal, Field, PasswordInput, loadState } from '../components/ui.jsx';
import { staffApi } from '../api.js';
import { can, staff, useAdminData, run } from './adminStore.js';

export default {
  name: 'AdminRoles',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/roles');
    const editable = () => can('roles.manage');
    const dlg = ref(false); const busy = ref(false); const err = reactive({});
    const form = reactive({ name: '', email: '', password: '', role: 'support' });
    const addMember = async () => {
      Object.keys(err).forEach((k) => delete err[k]);
      if (form.name.trim().length < 2) err.name = 'Enter a name.';
      if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Enter a valid email.';
      if (form.password.length < 8) err.password = 'At least 8 characters.';
      if (Object.keys(err).length) return;
      busy.value = true;
      const ok = await run(() => staffApi.post('/admin/staff', { ...form }), 'Team member added', () => reload());
      busy.value = false; if (ok) { dlg.value = false; Object.assign(form, { name: '', email: '', password: '', role: 'support' }); }
    };
    const patch = (m, body, msg) => run(() => staffApi.patch(`/admin/staff/${m.id}`, body), msg, () => reload());
    const flip = async (role, perm, enabled) => {
      await run(() => staffApi.put(`/admin/roles/${role}/permissions`, { permission: perm, enabled }), null, () => reload());
    };
    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      const { roles, labels, perms, members } = data.value; const keys = Object.keys(roles);
      return (
        <div class="pp-stack">
          <PageHead title="Roles & access control" sub="Least-privilege access, enforced by the server on every request." />
          {!editable() && <Callout tone="warn">Only a Super Admin can change role permissions. You are signed in as <b>{staff.roleLabel}</b>.</Callout>}
          <Card title="Permission matrix" sub="Super Admin always has every permission and cannot be edited" flush>
            <div class="pp-table-wrap">
              <table class="pp-table" style={{ minWidth: '760px' }}>
                <thead><tr><th>Permission</th>{keys.map((r) => <th key={r} style={{ textAlign: 'center' }}>{labels[r]}</th>)}</tr></thead>
                <tbody>{perms.map(([key, label]) => (
                  <tr key={key}><td><b>{label}</b><div class="pp-muted mono" style={{ fontSize: '11.5px' }}>{key}</div></td>
                    {keys.map((r) => { const on = roles[r].includes(key); return (
                      <td key={r} style={{ textAlign: 'center' }}>
                        <button class={`pp-switch-t ${on ? 'on' : ''}`} disabled={!editable() || r === 'super_admin'} role="switch" aria-checked={on} aria-label={`${labels[r]}: ${label}`} onClick={() => flip(r, key, !on)} />
                      </td>
                    ); })}</tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
          <Card title="Team members" flush>
            {{
              actions: () => <button class="pp-btn sm" disabled={!editable()} onClick={() => (dlg.value = true)}><Icon name="plus" size={14} />Add member</button>,
              default: () => (
                <DataTable noPager rows={members} columns={[
                  { label: 'Member', render: (m) => <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Avatar text={m.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()} size={32} /><div class="pp-cell-main"><b>{m.name}</b><small>{m.email}</small></div></div> },
                  { label: 'Role', render: (m) => (m.source === 'staff' && editable() && m.email !== staff.email
                    ? <select class="pp-select" style={{ minWidth: '170px' }} value={m.role} onChange={(e) => patch(m, { role: e.target.value }, 'Role updated')}>{Object.keys(roles).map((r) => <option key={r} value={r}>{labels[r]}</option>)}</select>
                    : <Badge tone="indigo" label={labels[m.role] || m.role} status={m.role} />) },
                  { label: 'Access', render: (m) => <Badge status={m.isActive ? 'active' : 'revoked'} label={m.isActive ? 'Active' : 'Deactivated'} /> },
                  { label: 'Source', render: (m) => <span class="pp-muted">{m.source === 'admin' ? 'Platform admin' : 'Referral team'}</span> },
                  { label: '', align: 'r', render: (m) => (m.source === 'staff' && editable() && m.email !== staff.email
                    ? <button class={`pp-btn sm ${m.isActive ? 'danger ghost' : 'ghost'}`} onClick={() => patch(m, { isActive: !m.isActive }, m.isActive ? 'Member deactivated' : 'Member reactivated')}>{m.isActive ? 'Deactivate' : 'Reactivate'}</button> : null) },
                ]} />
              ),
            }}
          </Card>
          {dlg.value && (
            <Modal title="Add team member" onClose={() => (dlg.value = false)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <Field label="Full name" error={err.name}><input class="pp-input" value={form.name} onInput={(e) => (form.name = e.target.value)} /></Field>
                    <Field label="Work email" error={err.email}><input class="pp-input" type="email" autocomplete="off" value={form.email} onInput={(e) => (form.email = e.target.value)} /></Field>
                    <Field label="Temporary password" error={err.password} hint="Share it securely; ask them to keep it private."><PasswordInput autocomplete="new-password" modelValue={form.password} onUpdate:modelValue={(v) => (form.password = v)} /></Field>
                    <Field label="Role"><select class="pp-select" value={form.role} onChange={(e) => (form.role = e.target.value)}>{Object.keys(roles).filter((r) => r !== 'super_admin' || staff.role === 'super_admin').map((r) => <option key={r} value={r}>{labels[r]}</option>)}</select></Field>
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (dlg.value = false)}>Cancel</button><button class="pp-btn" disabled={busy.value} onClick={addMember}>Add member</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

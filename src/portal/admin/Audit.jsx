import { ref, computed, watch } from 'vue';
import { Icon, Card, PageHead, DataTable, SearchBox, Callout, loadState } from '../components/ui.jsx';
import { exportCSV, num } from '../store.js';
import { qs } from '../api.js';
import { can, useAdminData } from './adminStore.js';

const ROLES = ['Super Admin', 'Operations Admin', 'Finance', 'Fraud Analyst', 'Support', 'Partner'];

export default {
  name: 'AdminAudit',
  setup() {
    const q = ref(''); const role = ref('all'); const page = ref(1);
    const url = () => `/admin/audit${qs({ q: q.value, role: role.value, page: page.value, limit: 12 })}`;
    const { data, loading, error, reload } = useAdminData(() => (can('audit.view') ? url() : '/admin/session'));
    let timer; const refresh = () => { clearTimeout(timer); timer = setTimeout(() => reload(url()), 250); };
    watch([q, role], () => { page.value = 1; refresh(); }); watch(page, refresh);
    const pages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / 12)));

    return () => {
      if (!can('audit.view')) return <div class="pp-stack"><PageHead title="Audit logs" /><Callout tone="warn">Your role cannot view audit logs.</Callout></div>;
      const wait = data.value?.items ? null : loadState(loading.value, error.value, () => reload(url())); if (wait) return wait;
      const items = data.value.items;
      return (
        <div class="pp-stack">
          <PageHead title="Audit logs" sub="Append-only record of every important action: approvals, payouts, fraud decisions and permission changes.">
            <button class="pp-btn ghost" onClick={() => exportCSV('brahmakosh-audit-log.csv', items.map(({ id, ts, actor, role: r, action, entity, detail, ip }) => ({ ID: id, Time: ts, Actor: actor, Role: r, Action: action, Entity: entity, Detail: detail, IP: ip })))}><Icon name="download" size={16} />Export this page</button>
          </PageHead>
          <Card flush>
            <div class="pp-toolbar">
              <SearchBox modelValue={q.value} onChange={(v) => (q.value = v)} placeholder="Search actor, action or entity" />
              <select class="pp-select" value={role.value} onChange={(e) => (role.value = e.target.value)} aria-label="Role filter"><option value="all">All roles</option>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
              <span class="pp-muted" style={{ marginLeft: 'auto' }}>{num(data.value.total)} events</span>
            </div>
            <DataTable noPager rows={items} empty={{ icon: 'file', title: 'No matching events' }} columns={[
              { label: 'Time', render: (a) => <span class="mono">{a.ts}</span> },
              { label: 'Actor', render: (a) => <div class="pp-cell-main"><b>{a.actor}</b><small>{a.role}</small></div> },
              { label: 'Action', render: (a) => <b>{a.action}</b> }, { label: 'Entity', render: (a) => <span class="pp-chip">{a.entity}</span> },
              { label: 'Detail', render: (a) => <span class="pp-muted">{a.detail}</span> }, { label: 'IP', render: (a) => <span class="mono">{a.ip}</span> },
            ]} />
            <div class="pp-pager">
              <span>Page {page.value} of {pages.value}</span>
              <div class="pp-right">
                <button class="pp-btn ghost sm" disabled={page.value === 1} onClick={() => page.value--}>Prev</button>
                <button class="pp-btn ghost sm" disabled={page.value >= pages.value} onClick={() => page.value++}>Next</button>
              </div>
            </div>
          </Card>
        </div>
      );
    };
  },
};

import { ref, computed } from 'vue';
import { Icon, Card, PageHead, Tabs, DataTable, Badge, Modal, Field, Callout, Kpi, loadState } from '../components/ui.jsx';
import { toast, num, fmtDate } from '../store.js';
import { staffApi } from '../api.js';
import { can, useAdminData, run } from './adminStore.js';

const CONTROLS = [
  ['Self-referral prevention', 'Device fingerprint, payout account and identity matching against the partner', 'users'],
  ['Duplicate prevention', 'One commission per verified identity and device; repeat registrations are rejected', 'copy'],
  ['Verified events only', 'Installs and registrations must be confirmed server-side by the attribution provider', 'checkCircle'],
  ['Suspicious activity flags', 'Install bursts, emulators, proxy clusters and register-delete patterns raise a flag', 'flag'],
  ['Transaction-safe processing', 'Commission and withdrawal state changes are conditional, atomic and fully audited', 'lock'],
  ['Data privacy', 'Referred users are anonymized and payout data is encrypted with role-based access', 'shield'],
];

export default {
  name: 'AdminFraud',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/fraud');
    const tab = ref('open'); const dlg = ref(null); const note = ref(''); const suspend = ref(false); const busy = ref(false);
    const perm = () => can('fraud.review');
    const flags = computed(() => data.value?.flags || []);
    const rows = computed(() => flags.value.filter((f) => tab.value === 'all' || f.status === tab.value));
    const count = (s) => flags.value.filter((f) => f.status === s).length;

    const open = (f, status) => { dlg.value = { f, status }; note.value = ''; suspend.value = false; };
    const doRun = async () => {
      const { f, status } = dlg.value;
      if (note.value.trim().length < 5 && status !== 'under_review') return toast('Add a short review note', 'err');
      busy.value = true;
      const ok = await run(() => staffApi.post(`/admin/fraud/${f.id}/resolve`, { status, note: note.value.trim(), suspend: suspend.value }),
        (r) => `${f.id} ${status.replace('_', ' ')}${r.reversed ? ` · ${r.reversed} commissions reversed` : ''}`, () => reload());
      busy.value = false; if (ok) dlg.value = null;
    };
    const actions = (f) => (['open', 'under_review'].includes(f.status) ? (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {f.status === 'open' && <button class="pp-btn ghost sm" disabled={!perm()} onClick={() => open(f, 'under_review')}>Review</button>}
        <button class="pp-btn danger sm" disabled={!perm()} onClick={() => open(f, 'confirmed')}>Confirm fraud</button>
        <button class="pp-btn ghost sm" disabled={!perm()} onClick={() => open(f, 'dismissed')}>Dismiss</button>
      </div>) : <span class="pp-muted" style={{ fontSize: '12.5px' }}>{f.note}</span>);

    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      return (
        <div class="pp-stack">
          <PageHead title="Fraud detection & security" sub="Investigate suspicious partner activity. Confirmed fraud reverses pending commissions." />
          {!perm() && <Callout tone="warn">Your role cannot act on fraud flags.</Callout>}
          <div class="pp-grid pp-g4">
            <Kpi icon="shieldAlert" tone="red" label="Open flags" value={count('open')} foot="need review" />
            <Kpi icon="eye" tone="amber" label="Under review" value={count('under_review')} foot="being investigated" />
            <Kpi icon="ban" tone="violet" label="Auto-blocked commissions" value={num(data.value.autoBlocked)} foot="rejected before payout" />
            <Kpi icon="flag" tone="blue" label="Self-referrals blocked" value={num(data.value.selfReferrals)} foot="across all partners" />
          </div>
          <Card flush>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['open', 'Open', count('open')], ['under_review', 'Under review', count('under_review')], ['confirmed', 'Confirmed', count('confirmed')], ['dismissed', 'Dismissed', count('dismissed')], ['all', 'All', flags.value.length]]} />
            <DataTable rows={rows.value} pageSize={8} empty={{ icon: 'shield', title: 'No flags here' }} columns={[
              { label: 'Flag', render: (f) => <div class="pp-cell-main"><b>{f.type}</b><small class="mono">{f.id} · {fmtDate(f.detectedAt)}</small></div> },
              { label: 'Partner', render: (f) => <div class="pp-cell-main"><b>{f.p.name}</b><small>{f.p.org}</small></div> },
              { label: 'Severity', render: (f) => <Badge status={f.severity} /> },
              { label: 'Evidence', render: (f) => <div style={{ maxWidth: '340px' }}>{f.detail}<div class="pp-muted" style={{ fontSize: '12px' }}>{f.related} related commissions</div></div> },
              { label: 'Status', render: (f) => <Badge status={f.status} /> }, { label: '', align: 'r', render: actions },
            ]} />
          </Card>
          <Card title="Automated controls" sub="Always on for every partner and every commission">
            <div class="pp-grid pp-g3">{CONTROLS.map(([t, d, ic]) => (
              <div key={t} style={{ display: 'flex', gap: '12px' }}><span class="pp-ico green"><Icon name={ic} size={17} /></span><div><b>{t}</b><div class="pp-muted" style={{ fontSize: '12.5px' }}>{d}</div></div></div>
            ))}</div>
          </Card>
          {dlg.value && (
            <Modal title={{ under_review: 'Start review', confirmed: 'Confirm fraud', dismissed: 'Dismiss flag' }[dlg.value.status]} onClose={() => (dlg.value = null)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <Callout tone={dlg.value.status === 'confirmed' ? 'bad' : 'info'}>{dlg.value.f.type} · {dlg.value.f.p.name}. {dlg.value.status === 'confirmed' ? `Up to ${dlg.value.f.related} pending commissions will be reversed.` : dlg.value.f.detail}</Callout>
                    <Field label={dlg.value.status === 'under_review' ? 'Note (optional)' : 'Review note'}><textarea class="pp-textarea" value={note.value} onInput={(e) => (note.value = e.target.value)} /></Field>
                    {dlg.value.status === 'confirmed' && dlg.value.f.p.status === 'approved' && can('partners.review') && <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><input type="checkbox" checked={suspend.value} onChange={(e) => (suspend.value = e.target.checked)} />Also suspend this partner</label>}
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (dlg.value = null)}>Cancel</button><button class={`pp-btn ${dlg.value.status === 'confirmed' ? 'danger' : ''}`} disabled={busy.value} onClick={doRun}>Confirm</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

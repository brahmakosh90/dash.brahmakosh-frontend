import { ref, computed, watch } from 'vue';
import { Icon, Card, PageHead, Tabs, DataTable, Badge, SearchBox, Modal, Avatar, Callout, Field, loadState } from '../components/ui.jsx';
import { money, num, pct, fmtDate, toast } from '../store.js';
import { staffApi } from '../api.js';
import { can, useAdminData, run } from './adminStore.js';

export default {
  name: 'AdminPartners',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/partners');
    const tab = ref('pending'); const note = ref(''); let picked = false; const q = ref(''); const sel = ref(null); const confirm = ref(null); const busy = ref(false);
    const all = computed(() => data.value?.partners || []);
    // open on the application queue when something is waiting for review
    watch(all, (list) => { if (!picked && list.length) { picked = true; if (!list.some((p) => p.status === 'pending')) tab.value = 'all'; } });
    const counts = computed(() => ({ all: all.value.length, ...Object.fromEntries(['pending', 'approved', 'suspended', 'rejected'].map((s) => [s, all.value.filter((p) => p.status === s).length])) }));
    const rows = computed(() => all.value.filter((p) => (tab.value === 'all' || p.status === tab.value) && (!q.value || `${p.name} ${p.org} ${p.email} ${p.code}`.toLowerCase().includes(q.value.toLowerCase()))));
    const perm = () => can('partners.review');
    const act = (p, status, label) => { note.value = ''; confirm.value = { p, status, label }; };
    const doRun = async () => {
      const { p, status, label } = confirm.value;
      if (['rejected', 'suspended'].includes(status) && note.value.trim().length < 5) return toast('Add a short reason (shown to the partner)', 'err');
      busy.value = true;
      const ok = await run(() => staffApi.post(`/admin/partners/${p.id}/status`, { status, note: note.value.trim() }), `${p.name}: ${label.toLowerCase()}`, () => reload());
      busy.value = false; if (ok) { confirm.value = null; sel.value = null; }
    };

    const buttons = (p) => (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {p.status === 'pending' && (<><button class="pp-btn success sm" disabled={!perm()} onClick={() => act(p, 'approved', 'Approve application')}>Approve</button><button class="pp-btn danger ghost sm" disabled={!perm()} onClick={() => act(p, 'rejected', 'Reject application')}>Reject</button></>)}
        {p.status === 'approved' && <button class="pp-btn danger ghost sm" disabled={!perm()} onClick={() => act(p, 'suspended', 'Suspend partner')}><Icon name="ban" size={13} />Suspend</button>}
        {p.status === 'suspended' && <button class="pp-btn ghost sm" disabled={!perm()} onClick={() => act(p, 'approved', 'Reinstate partner')}>Reinstate</button>}
        <button class="pp-btn ghost sm" onClick={() => (sel.value = p)}>View</button>
      </div>
    );

    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      return (
        <div class="pp-stack">
          <PageHead title="Partners" sub="Review applications and manage partner access." />
          {counts.value.pending > 0 && tab.value !== 'pending' && <Callout tone="info"><b>{counts.value.pending}</b> partner application{counts.value.pending === 1 ? ' is' : 's are'} waiting for your review. <a href="#" onClick={(e) => { e.preventDefault(); tab.value = 'pending'; }} style={{ fontWeight: 600, textDecoration: 'underline' }}>Open applications</a></Callout>}
          {!perm() && <Callout tone="warn">Your role cannot approve, reject or suspend partners. You have read-only access.</Callout>}
          <Card flush>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['all', 'All', counts.value.all], ['pending', 'Applications', counts.value.pending], ['approved', 'Approved', counts.value.approved], ['suspended', 'Suspended', counts.value.suspended], ['rejected', 'Rejected', counts.value.rejected]]} />
            <div class="pp-toolbar"><SearchBox modelValue={q.value} onChange={(v) => (q.value = v)} placeholder="Search name, organisation, code" /></div>
            <DataTable rows={rows.value} pageSize={10} columns={[
              { label: 'Partner', render: (p) => <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Avatar text={p.initials} size={34} /><div class="pp-cell-main"><b>{p.name}</b><small>{p.org}{[p.city, p.state, p.country].filter(Boolean).length ? ` · ${[p.city, p.state, p.country].filter(Boolean).join(', ')}` : ''}</small></div></div> },
              { label: 'Status', render: (p) => <Badge status={p.status} /> },
              { label: 'Code', render: (p) => (p.code ? <span class="pp-chip">{p.code}</span> : '—') },
              { label: 'Registrations', align: 'r', render: (p) => num(p.s.regs) }, { label: 'Conv.', align: 'r', render: (p) => pct(p.s.conv) },
              { label: 'Payable', align: 'r', render: (p) => money(p.s.wallet.payable) }, { label: '', align: 'r', render: buttons },
            ]} />
          </Card>

          {sel.value && (
            <Modal title={sel.value.name} large onClose={() => (sel.value = null)}>
              {{
                default: () => (
                  <div class="pp-grid pp-g2">
                    <dl class="pp-kv" style={{ gridTemplateColumns: '120px 1fr' }}>
                      <dt>Organisation</dt><dd>{sel.value.org || '—'}</dd><dt>Email</dt><dd>{sel.value.email}</dd><dt>Phone</dt><dd>{sel.value.phone || '—'}</dd><dt>Location</dt><dd>{[sel.value.city, sel.value.state, sel.value.country].filter(Boolean).join(', ') || '—'}</dd><dt>Status</dt><dd><Badge status={sel.value.status} /></dd><dt>{sel.value.status === 'pending' ? 'Applied' : 'Joined'}</dt><dd>{fmtDate(sel.value.status === 'pending' ? sel.value.appliedAt : sel.value.joinedAt)}</dd>
                    </dl>
                    <div class="pp-stack">
                      <dl class="pp-kv" style={{ gridTemplateColumns: '1fr auto' }}>
                        <dt>Registrations</dt><dd>{num(sel.value.s.regs)}</dd><dt>Pending commission</dt><dd>{money(sel.value.s.wallet.pending)}</dd><dt>Payable balance</dt><dd>{money(sel.value.s.wallet.payable)}</dd><dt>Paid out</dt><dd>{money(sel.value.s.wallet.paid)}</dd>
                        <dt>Open fraud flags</dt><dd>{sel.value.s.openFlags}</dd>
                      </dl>
                      {sel.value.bio && <Callout tone="info">{sel.value.bio}</Callout>}
                    </div>
                  </div>
                ),
                footer: () => buttons(sel.value),
              }}
            </Modal>
          )}
          {confirm.value && (
            <Modal title={confirm.value.label} onClose={() => (confirm.value = null)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <p>{confirm.value.status === 'suspended' ? `Suspending ${confirm.value.p.name} pauses their active campaigns and stops new commission approvals.` : confirm.value.status === 'approved' ? `${confirm.value.p.name} (${confirm.value.p.org}) will get a referral code, link and full dashboard access.` : `${confirm.value.label} for ${confirm.value.p.name} (${confirm.value.p.org})?`} This is recorded in the audit log.</p>
                    {['rejected', 'suspended'].includes(confirm.value.status) && <Field label="Reason (shown to the partner)"><textarea class="pp-textarea" value={note.value} onInput={(e) => (note.value = e.target.value)} placeholder="e.g. Audience could not be verified" /></Field>}
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (confirm.value = null)}>Cancel</button><button class={`pp-btn ${confirm.value.status === 'approved' ? 'success' : 'danger'}`} disabled={busy.value} onClick={doRun}>Confirm</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

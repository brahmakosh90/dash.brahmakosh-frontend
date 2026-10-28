import { ref, computed, watch } from 'vue';
import { Icon, Card, PageHead, Tabs, DataTable, Badge, SearchBox, Callout, Kpi, Modal, Field, loadState } from '../components/ui.jsx';
import { RULES, money, num, fmtDate, shortId } from '../store.js';
import { staffApi, qs } from '../api.js';
import { can, useAdminData, run } from './adminStore.js';

export default {
  name: 'AdminCommissions',
  setup() {
    const tab = ref('pending'); const q = ref(''); const partner = ref('all'); const page = ref(1);
    const selected = ref(new Set()); const allCleared = ref(false); const reason = ref(null); const why = ref(''); const busy = ref(false);
    const url = () => `/admin/commissions${qs({ status: tab.value, partner: partner.value, q: q.value, page: page.value, limit: 15 })}`;
    const { data, loading, error, reload } = useAdminData(url);
    const partners = useAdminData(() => '/admin/partners');
    const perm = () => can('commissions.approve');

    let timer; const refresh = () => { clearTimeout(timer); timer = setTimeout(() => reload(url()), 250); };
    watch([tab, partner, q], () => { page.value = 1; selected.value = new Set(); allCleared.value = false; refresh(); });
    watch(page, refresh);

    const items = computed(() => data.value?.items || []);
    const counts = computed(() => data.value?.counts || {});
    const count = (s) => counts.value[s]?.n || 0; const sum = (s) => counts.value[s]?.sum || 0;
    const pages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / 15)));
    const toggle = (id) => { allCleared.value = false; const s = new Set(selected.value); s.has(id) ? s.delete(id) : s.add(id); selected.value = s; };
    const togglePage = () => { allCleared.value = false; const s = new Set(selected.value); const all = items.value.every((i) => s.has(i.id)); items.value.forEach((i) => (all ? s.delete(i.id) : s.add(i.id))); selected.value = s; };
    const selCount = computed(() => (allCleared.value ? data.value?.holdCleared || 0 : selected.value.size));

    const apply = async (action, text = '') => {
      busy.value = true;
      const body = { action, reason: text, ...(allCleared.value ? { holdCleared: true, partner: partner.value === 'all' ? undefined : partner.value } : { ids: [...selected.value] }) };
      const ok = await run(() => staffApi.post('/admin/commissions/review', body),
        (r) => `${r.processed} commission${r.processed === 1 ? '' : 's'} ${{ approve: 'approved', reject: 'rejected', reverse: 'reversed' }[action]}${r.skipped ? ` · ${r.skipped} skipped (still in fraud hold or reserved)` : ''}`,
        () => { selected.value = new Set(); allCleared.value = false; return reload(url()); });
      busy.value = false; if (ok) { reason.value = null; why.value = ''; }
    };

    return () => {
      const wait = data.value ? null : loadState(loading.value, error.value, () => reload(url())); if (wait) return wait;
      return (
        <div class="pp-stack">
          <PageHead title="Commission review" sub={`Approve ${money(RULES.commission, 0)} commissions once the ${RULES.holdDays}-day fraud hold passes, or reject and reverse suspicious ones.`} />
          {!perm() && <Callout tone="warn">Your role cannot change commission status.</Callout>}
          <div class="pp-grid pp-g4">
            <Kpi icon="clock" tone="amber" label="Awaiting review" value={num(count('pending'))} foot={money(sum('pending'))} />
            <Kpi icon="checkCircle" tone="green" label="Approved (unpaid)" value={num(count('approved'))} foot={money(sum('approved'))} />
            <Kpi icon="bank" tone="blue" label="Paid" value={num(count('paid'))} foot={money(sum('paid'))} />
            <Kpi icon="ban" tone="red" label="Rejected / reversed" value={num(count('rejected') + count('reversed'))} foot={money(sum('rejected') + sum('reversed'))} />
          </div>
          <Card flush>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['pending', 'Pending', count('pending')], ['approved', 'Approved', count('approved')], ['paid', 'Paid', count('paid')], ['rejected', 'Rejected', count('rejected')], ['reversed', 'Reversed', count('reversed')]]} />
            <div class="pp-toolbar">
              <SearchBox modelValue={q.value} onChange={(v) => (q.value = v)} placeholder="Search referred user ID" />
              <select class="pp-select" value={partner.value} onChange={(e) => (partner.value = e.target.value)} aria-label="Partner filter"><option value="all">All partners</option>{(partners.data.value?.partners || []).filter((p) => ['approved', 'suspended'].includes(p.status)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              {selCount.value > 0 && <b class="pp-num">{num(selCount.value)} selected</b>}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tab.value === 'pending' && (<>
                  <button class="pp-btn ghost sm" disabled={!perm() || !(data.value?.holdCleared)} onClick={() => { selected.value = new Set(); allCleared.value = true; }}>Select hold-period cleared ({num(data.value?.holdCleared || 0)})</button>
                  <button class="pp-btn success sm" disabled={!perm() || !selCount.value || busy.value} onClick={() => apply('approve')}><Icon name="check" size={14} />Approve</button>
                  <button class="pp-btn danger ghost sm" disabled={!perm() || !selCount.value || allCleared.value} onClick={() => (reason.value = 'reject')}>Reject</button>
                </>)}
                {tab.value === 'approved' && <button class="pp-btn danger ghost sm" disabled={!perm() || !selected.value.size} onClick={() => (reason.value = 'reverse')}>Reverse</button>}
              </div>
            </div>
            <DataTable noPager rows={items.value} empty={{ icon: 'checkCircle', title: 'Nothing here', sub: 'No commissions in this state.' }} columns={[
              ...(['pending', 'approved'].includes(tab.value) ? [{ label: '', width: '44px', head: () => <input type="checkbox" aria-label="Select page" onChange={togglePage} />, render: (c) => <input type="checkbox" checked={allCleared.value || selected.value.has(c.id)} disabled={allCleared.value} onChange={() => toggle(c.id)} aria-label={`Select ${shortId('CM', c.id)}`} /> }] : []),
              { label: 'Commission', render: (c) => <div class="pp-cell-main"><b class="mono">{shortId('CM', c.id)}</b><small>{fmtDate(c.date)} · {c.age}d old</small></div> },
              { label: 'Partner', render: (c) => c.partner }, { label: 'Referred user', render: (c) => <span class="mono">{c.anon}</span> }, { label: 'Campaign', render: (c) => c.campaign },
              { label: 'Status', render: (c) => <div><Badge status={c.status} />{c.reason && <div class="pp-muted" style={{ fontSize: '12px', marginTop: '3px' }}>{c.reason}</div>}</div> },
              { label: 'Amount', align: 'r', render: (c) => <b>{money(c.amount)}</b> },
            ]} />
            <div class="pp-pager">
              <span>{num(data.value?.total || 0)} records</span>
              <div class="pp-right">
                <button class="pp-btn ghost sm" disabled={page.value === 1} onClick={() => page.value--}>Prev</button>
                <span>Page {page.value} / {pages.value}</span>
                <button class="pp-btn ghost sm" disabled={page.value >= pages.value} onClick={() => page.value++}>Next</button>
              </div>
            </div>
          </Card>
          {reason.value && (
            <Modal title={reason.value === 'reject' ? 'Reject commissions' : 'Reverse commissions'} onClose={() => (reason.value = null)}>
              {{
                default: () => <Field label="Reason (shown to the partner)"><textarea class="pp-textarea" value={why.value} onInput={(e) => (why.value = e.target.value)} placeholder="e.g. Duplicate device detected" /></Field>,
                footer: () => (<><button class="pp-btn ghost" onClick={() => (reason.value = null)}>Cancel</button><button class="pp-btn danger" disabled={why.value.trim().length < 4 || busy.value} onClick={() => apply(reason.value, why.value.trim())}>{reason.value === 'reject' ? 'Reject' : 'Reverse'} {selected.value.size}</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

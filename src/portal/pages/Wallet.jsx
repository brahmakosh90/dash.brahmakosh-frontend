import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon, Card, Kpi, PageHead, Tabs, DataTable, Badge, SearchBox, Callout } from '../components/ui.jsx';
import { state, ME, RULES, walletOf, campaignOf, exportCSV, money, fmtDate, shortId } from '../store.js';

export default {
  name: 'PartnerWallet',
  setup() {
    const tab = ref('all');
    const q = ref('');
    const wallet = computed(() => walletOf(ME));
    const mine = computed(() => state.commissions);

    const ledger = computed(() => {
      const rows = mine.value.map((c) => ({ id: shortId('CM', c.id), date: c.date, type: 'Commission', ref: c.anon, campaign: campaignOf(c.campaignId)?.general ? 'Direct link' : campaignOf(c.campaignId)?.name, amount: c.amount, status: c.status, note: c.reason }));
      const pay = state.withdrawals.filter((w) => w.partnerId === ME && w.status === 'paid').map((w) => ({ id: w.id, date: w.history[w.history.length - 1].at, type: 'Payout', ref: w.reference, campaign: 'Bank transfer', amount: -w.amount, status: 'paid', note: '' }));
      return [...rows, ...pay].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    });
    const filtered = computed(() => ledger.value.filter((r) => {
      const t = tab.value;
      const ok = t === 'all' || (t === 'rejected' ? ['rejected', 'reversed'].includes(r.status) : t === 'paid' ? r.status === 'paid' && r.type === 'Payout' : r.status === t);
      const s = q.value.toLowerCase();
      return ok && (!s || `${r.id} ${r.ref} ${r.campaign}`.toLowerCase().includes(s));
    }));
    const cnt = (f) => ledger.value.filter(f).length;

    return () => {
      const w = wallet.value;
      return (
        <div class="pp-stack">
          <PageHead title="Earnings & Commission Wallet" sub={`${money(RULES.commission, 0)} for every eligible registration. Payouts are settled by manual bank transfer.`}>
            <button class="pp-btn ghost" onClick={() => exportCSV('brahmakosh-commission-ledger.csv', filtered.value.map((r) => ({ Date: r.date, ID: r.id, Type: r.type, Reference: r.ref, Campaign: r.campaign, 'Amount USD': r.amount.toFixed(2), Status: r.status, Note: r.note })))}><Icon name="download" size={16} />Export ledger</button>
            <RouterLink class="pp-btn" to="/partner-portal/withdrawals"><Icon name="bank" size={16} />Withdraw</RouterLink>
          </PageHead>

          <div class="pp-grid pp-g5">
            <Kpi icon="clock" tone="amber" label="Pending commissions" value={money(w.pending)} foot={`${RULES.holdDays}-day fraud review`} />
            <Kpi icon="checkCircle" tone="green" label="Approved & payable" value={money(w.payable)} foot="available to withdraw" />
            <Kpi icon="lock" tone="violet" label="Reserved for withdrawal" value={money(w.reserved)} foot="in an open request" />
            <Kpi icon="bank" tone="blue" label="Paid out to date" value={money(w.paid)} foot="settled by Finance" />
            <Kpi icon="ban" tone="red" label="Rejected / reversed" value={money(w.rejected + w.reversed)} foot="not payable" />
          </div>

          <Callout tone="info">Lifecycle: <b>Pending</b> (fraud checks run for {RULES.holdDays} days) → <b>Approved</b> (payable) → <b>Reserved</b> when you request a withdrawal → <b>Paid</b> once Finance completes the bank transfer.</Callout>

          <Card flush title="Commission transaction ledger" style={{ paddingTop: '0' }}>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['all', 'All', ledger.value.length], ['pending', 'Pending', cnt((r) => r.status === 'pending')], ['approved', 'Approved', cnt((r) => r.status === 'approved')], ['paid', 'Paid out', cnt((r) => r.type === 'Payout')], ['rejected', 'Rejected / reversed', cnt((r) => ['rejected', 'reversed'].includes(r.status))]]} />
            <div class="pp-toolbar"><SearchBox modelValue={q.value} onChange={(v) => (q.value = v)} placeholder="Search by ID, user or campaign" /></div>
            <DataTable rows={filtered.value} pageSize={12} empty={{ icon: 'wallet', title: 'No transactions', sub: 'Nothing matches this filter.' }} columns={[
              { label: 'Date', render: (r) => fmtDate(r.date) },
              { label: 'Transaction', render: (r) => <div class="pp-cell-main"><b class="mono">{r.id}</b><small>{r.type}</small></div> },
              { label: 'Reference', render: (r) => <span class="mono">{r.ref || '—'}</span> },
              { label: 'Campaign', render: (r) => r.campaign || '—' },
              { label: 'Status', render: (r) => <div><Badge status={r.status} />{r.note && <div class="pp-muted" style={{ fontSize: '12px', marginTop: '3px' }}>{r.note}</div>}</div> },
              { label: 'Amount', align: 'r', render: (r) => <span class={['rejected', 'reversed'].includes(r.status) ? 'pp-muted' : r.amount < 0 ? 'pp-neg' : 'pp-pos'} style={['rejected', 'reversed'].includes(r.status) ? { textDecoration: 'line-through' } : null}>{r.amount < 0 ? '−' : '+'}{money(Math.abs(r.amount))}</span> },
            ]} />
          </Card>
        </div>
      );
    };
  },
};

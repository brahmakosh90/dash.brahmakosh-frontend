import { ref, computed } from 'vue';
import { Icon, Card, PageHead, Tabs, DataTable, Badge, Modal, Field, Callout, Kpi, loadState } from '../components/ui.jsx';
import { toast, exportCSV, money, fmtDate } from '../store.js';
import { staffApi } from '../api.js';
import { can, useAdminData, run } from './adminStore.js';

const TITLES = { approve: 'Approve withdrawal', process: 'Mark bank transfer initiated', paid: 'Reconcile payout', reject: 'Reject withdrawal' };
const DONE = { approve: 'approved', process: 'marked as transfer initiated', paid: 'reconciled as paid', reject: 'rejected' };

export default {
  name: 'AdminWithdrawals',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/withdrawals');
    const tab = ref('pending'); const dlg = ref(null); const bankRef = ref(''); const reason = ref(''); const busy = ref(false);
    const canApprove = () => can('withdrawals.approve'); const canRec = () => can('withdrawals.reconcile');
    const all = computed(() => data.value?.withdrawals || []);
    const rows = computed(() => all.value.filter((w) => tab.value === 'all' || w.status === tab.value));
    const count = (s) => all.value.filter((w) => w.status === s).length;
    const amt = (f) => all.value.filter(f).reduce((a, w) => a + w.amount, 0);

    const open = (w, action) => { dlg.value = { w, action }; bankRef.value = ''; reason.value = ''; };
    const confirm = async () => {
      const { w, action } = dlg.value;
      if (action === 'paid' && !/^[A-Za-z0-9-]{8,30}$/.test(bankRef.value)) return toast('Enter the bank transfer reference (8–30 characters)', 'err');
      if (action === 'reject' && reason.value.trim().length < 5) return toast('A rejection reason is required', 'err');
      busy.value = true;
      const ok = await run(() => staffApi.post(`/admin/withdrawals/${w.id}/${action}`, { reference: bankRef.value.trim(), reason: reason.value.trim() }), `${w.id} ${DONE[action]}`, () => reload());
      busy.value = false; if (ok) dlg.value = null; else reload();
    };
    const decide = async (v, decision) => {
      await run(() => staffApi.post(`/admin/partners/${v.partnerId}/payout/${decision}`), `Payout details ${decision === 'verify' ? 'verified' : 'rejected'} for ${v.name}`, () => reload());
    };

    const actions = (w) => (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {w.status === 'pending' && (<><button class="pp-btn success sm" disabled={!canApprove()} onClick={() => open(w, 'approve')}>Approve</button><button class="pp-btn danger ghost sm" disabled={!canApprove()} onClick={() => open(w, 'reject')}>Reject</button></>)}
        {w.status === 'approved' && (<><button class="pp-btn sm" disabled={!canRec()} onClick={() => open(w, 'process')}>Mark transfer sent</button><button class="pp-btn danger ghost sm" disabled={!canApprove()} onClick={() => open(w, 'reject')}>Reject</button></>)}
        {w.status === 'processing' && <button class="pp-btn success sm" disabled={!canRec()} onClick={() => open(w, 'paid')}>Reconcile as paid</button>}
      </div>
    );

    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      const verifs = data.value.payoutVerifications;
      return (
        <div class="pp-stack">
          <PageHead title="Withdrawals & payouts" sub="Finance approves each request, sends the manual bank transfer and reconciles it against the bank statement.">
            <button class="pp-btn ghost" onClick={() => exportCSV('brahmakosh-payouts.csv', all.value.map((w) => ({ ID: w.id, Partner: w.p.name, Amount: w.amount, Requested: w.requestedAt, Status: w.status, Reference: w.reference })))}><Icon name="download" size={16} />Export</button>
          </PageHead>
          {!canApprove() && !canRec() && <Callout tone="warn">Your role cannot approve or reconcile payouts. Finance or a Super Admin must do this.</Callout>}
          {verifs.length > 0 && (
            <Card title="Payout details awaiting verification" sub="Confirm the account holder matches the partner before any transfer is made" flush>
              <DataTable noPager rows={verifs.map((v) => ({ ...v, id: v.partnerId }))} columns={[
                { label: 'Partner', render: (v) => <div class="pp-cell-main"><b>{v.name}</b><small>{v.org}</small></div> },
                { label: 'Account holder', render: (v) => v.holder }, { label: 'Bank', render: (v) => <div class="pp-cell-main"><b>{v.bank}</b><small class="mono">{v.code} · ••{v.last4}</small></div> },
                { label: 'Submitted', render: (v) => fmtDate(v.updatedAt) },
                { label: '', align: 'r', render: (v) => <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}><button class="pp-btn success sm" disabled={!canApprove()} onClick={() => decide(v, 'verify')}>Verify</button><button class="pp-btn danger ghost sm" disabled={!canApprove()} onClick={() => decide(v, 'reject')}>Reject</button></div> },
              ]} />
            </Card>
          )}
          <div class="pp-grid pp-g4">
            <Kpi icon="clock" tone="amber" label="Awaiting approval" value={money(amt((w) => w.status === 'pending'))} foot={`${count('pending')} requests`} />
            <Kpi icon="checkCircle" tone="indigo" label="Approved, to be sent" value={money(amt((w) => w.status === 'approved'))} foot={`${count('approved')} requests`} />
            <Kpi icon="swap" tone="violet" label="Transfers in flight" value={money(amt((w) => w.status === 'processing'))} foot={`${count('processing')} awaiting reconciliation`} />
            <Kpi icon="bank" tone="blue" label="Paid" value={money(amt((w) => w.status === 'paid'))} foot={`${count('paid')} reconciled`} />
          </div>
          <Card flush>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['pending', 'Pending', count('pending')], ['approved', 'Approved', count('approved')], ['processing', 'Processing', count('processing')], ['paid', 'Paid', count('paid')], ['rejected', 'Rejected', count('rejected')], ['all', 'All', all.value.length]]} />
            <DataTable rows={rows.value} pageSize={10} empty={{ icon: 'bank', title: 'No withdrawals in this state' }} columns={[
              { label: 'Request', render: (w) => <div class="pp-cell-main"><b class="mono">{w.id}</b><small>{fmtDate(w.requestedAt)}</small></div> },
              { label: 'Partner', render: (w) => <div class="pp-cell-main"><b>{w.p.name}</b><small>{w.p.org}</small></div> },
              { label: 'Amount', align: 'r', render: (w) => <b>{money(w.amount)}</b> },
              { label: 'Payable balance', align: 'r', render: (w) => money(w.payable) },
              { label: 'Status', render: (w) => <Badge status={w.status} /> },
              { label: 'Bank reference', render: (w) => <span class="mono">{w.reference || '—'}</span> },
              { label: '', align: 'r', render: actions },
            ]} />
          </Card>
          {dlg.value && (
            <Modal title={TITLES[dlg.value.action]} onClose={() => (dlg.value = null)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <dl class="pp-kv" style={{ gridTemplateColumns: '120px 1fr' }}><dt>Request</dt><dd class="mono">{dlg.value.w.id}</dd><dt>Partner</dt><dd>{dlg.value.w.p.name}</dd><dt>Amount</dt><dd>{money(dlg.value.w.amount)}</dd><dt>Payout to</dt><dd>Bank transfer · manual</dd></dl>
                    {dlg.value.action === 'paid' && <Field label="Bank transfer reference" hint="Copy from the bank statement, e.g. NEFT-HDFC-88231947."><input class="pp-input" value={bankRef.value} onInput={(e) => (bankRef.value = e.target.value)} /></Field>}
                    {dlg.value.action === 'reject' && <Field label="Reason (shown to partner)"><textarea class="pp-textarea" value={reason.value} onInput={(e) => (reason.value = e.target.value)} /></Field>}
                    {dlg.value.action === 'approve' && <Callout tone="info">The amount stays reserved on the partner’s wallet until you reconcile the transfer.</Callout>}
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (dlg.value = null)}>Cancel</button><button class={`pp-btn ${dlg.value.action === 'reject' ? 'danger' : 'success'}`} disabled={busy.value} onClick={confirm}>Confirm</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

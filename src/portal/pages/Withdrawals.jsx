import { ref, computed, reactive } from 'vue';
import { Icon, Card, Kpi, PageHead, DataTable, Badge, Modal, Field, Callout, Steps, CountrySelect } from '../components/ui.jsx';
import { state, ME, RULES, walletOf, requestWithdrawal, updatePayout, toast, money, fmtDate } from '../store.js';

const FLOW = ['pending', 'approved', 'processing', 'paid'];
const FLOW_LABEL = ['Requested', 'Finance approved', 'Transfer initiated', 'Paid'];
const stepsFor = (w) => FLOW_LABEL.map((label, i) => {
  if (w.status === 'rejected') return { label: i === 0 ? label : i === 1 ? 'Rejected' : label, state: i === 0 ? 'done' : i === 1 ? 'bad' : '' };
  const at = FLOW.indexOf(w.status);
  return { label, state: i < at ? 'done' : i === at ? (w.status === 'paid' ? 'done' : 'now') : '' };
});

export default {
  name: 'PartnerWithdrawals',
  setup() {
    const wallet = computed(() => walletOf(ME));
    const history = computed(() => state.withdrawals.filter((w) => w.partnerId === ME));
    const open = ref(null); // 'request' | 'payout' | withdrawal
    const amount = ref('');
    const error = ref('');
    const pay = reactive({ holder: '', bank: '', account: '', account2: '', code: '', country: 'India' });
    const payErr = reactive({});

    const openRequest = () => { amount.value = String(Math.floor(wallet.value.payable)); error.value = ''; open.value = 'request'; };
    const submitRequest = async () => {
      const r = await requestWithdrawal(amount.value);
      if (!r.ok) { error.value = r.error; return; }
      open.value = null; toast(`Withdrawal request ${r.data.withdrawal.id} submitted`);
    };
    const openPayout = () => { Object.assign(pay, { holder: state.payout.holder, bank: state.payout.bank, account: '', account2: '', code: state.payout.code, country: state.payout.country }); Object.keys(payErr).forEach((k) => delete payErr[k]); open.value = 'payout'; };
    const submitPayout = async () => {
      Object.keys(payErr).forEach((k) => delete payErr[k]);
      if (pay.holder.trim().length < 3) payErr.holder = 'Enter the name exactly as on the bank account.';
      if (pay.bank.trim().length < 2) payErr.bank = 'Enter the bank name.';
      if (!/^\d{8,18}$/.test(pay.account)) payErr.account = 'Account number must be 8–18 digits.';
      if (pay.account !== pay.account2) payErr.account2 = 'Account numbers do not match.';
      if (!/^[A-Za-z0-9]{6,15}$/.test(pay.code)) payErr.code = 'Enter a valid IFSC / SWIFT / routing code.';
      if (Object.keys(payErr).length) return;
      const r = await updatePayout(pay);
      if (!r.ok) { payErr.account = r.error; return; }
      open.value = null; toast('Payout details submitted for Finance verification');
    };

    return () => {
      const w = wallet.value; const p = state.payout; const can = w.payable >= RULES.minWithdrawal;
      const hasPending = history.value.some((h) => h.status === 'pending');
      return (
        <div class="pp-stack">
          <PageHead title="Withdrawals & Payouts" sub={`Minimum ${money(RULES.minWithdrawal, 0)} approved balance. Paid by manual bank transfer approved by Finance.`}>
            <button class="pp-btn" disabled={!can || hasPending || p.status !== 'verified'} onClick={openRequest}><Icon name="bank" size={16} />Request withdrawal</button>
          </PageHead>

          <div class="pp-grid pp-g4">
            <Kpi icon="checkCircle" tone="green" label="Available to withdraw" value={money(w.payable)} foot={can ? 'Eligible now' : `${money(RULES.minWithdrawal - w.payable)} short of minimum`} />
            <Kpi icon="lock" tone="violet" label="Reserved" value={money(w.reserved)} foot="held for open requests" />
            <Kpi icon="clock" tone="amber" label="Pending commissions" value={money(w.pending)} foot="not yet payable" />
            <Kpi icon="bank" tone="blue" label="Total paid" value={money(w.paid)} foot={`${history.value.filter((h) => h.status === 'paid').length} payouts`} />
          </div>

          {!can && <Callout tone="warn">You need at least <b>{money(RULES.minWithdrawal, 0)}</b> in approved payable balance. You are {money(RULES.minWithdrawal - w.payable)} away.</Callout>}
          {hasPending && <Callout tone="info">A request is waiting for Finance approval. You can raise another one after it is processed.</Callout>}

          <div class="pp-grid pp-g-2-1">
            <Card title="Withdrawal history" sub="Status, bank transfer reference and payment history" flush>
              <DataTable pageSize={6} rows={history.value} empty={{ icon: 'bank', title: 'No withdrawals yet' }} columns={[
                { label: 'Request', render: (r) => <div class="pp-cell-main"><b class="mono">{r.id}</b><small>{fmtDate(r.requestedAt)}</small></div> },
                { label: 'Amount', align: 'r', render: (r) => <b>{money(r.amount)}</b> },
                { label: 'Status', render: (r) => <Badge status={r.status} /> },
                { label: 'Bank reference', render: (r) => <span class="mono">{r.reference || '—'}</span> },
                { label: '', align: 'r', render: (r) => <button class="pp-btn ghost sm" onClick={() => (open.value = r)}>Track</button> },
              ]} />
            </Card>
            <Card title="Payout details" sub="Bank transfer · account number stored encrypted">
              {{
                actions: () => <Badge status={p.status} />,
                default: () => (<>
                  <dl class="pp-kv" style={{ gridTemplateColumns: '120px 1fr' }}>
                    <dt>Account holder</dt><dd>{p.holder}</dd><dt>Bank</dt><dd>{p.bank}</dd>
                    <dt>Account no.</dt><dd class="pp-num">•••• •••• {p.last4}</dd><dt>IFSC / SWIFT</dt><dd class="mono">{p.code}</dd>
                    <dt>Country</dt><dd>{p.country}</dd><dt>Last updated</dt><dd>{fmtDate(p.updatedAt)}</dd>
                  </dl>
                  <button class="pp-btn ghost" style={{ marginTop: '16px', width: '100%' }} onClick={openPayout}><Icon name="edit" size={15} />Update payout details</button>
                  <div class="pp-callout info" style={{ marginTop: '14px' }}><Icon name="lock" /><div>Changes are re-verified by Finance before your next payout. Full account numbers are never shown again.</div></div>
                </>),
              }}
            </Card>
          </div>

          {open.value === 'request' && (
            <Modal title="Request withdrawal" onClose={() => (open.value = null)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <div class="pp-callout ok"><Icon name="checkCircle" /><div>Available: <b>{money(w.payable)}</b> · to <b>{p.bank} ••{p.last4}</b></div></div>
                    <Field label="Amount (USD)" error={error.value} hint={`Minimum ${money(RULES.minWithdrawal, 0)}. The amount is reserved until Finance processes it.`}>
                      <input class="pp-input" type="number" min={RULES.minWithdrawal} max={w.payable} step="1" value={amount.value} onInput={(e) => { amount.value = e.target.value; error.value = ''; }} />
                    </Field>
                    <div style={{ display: 'flex', gap: '8px' }}>{[RULES.minWithdrawal, Math.floor(w.payable / 2), Math.floor(w.payable)].filter((v, i, a) => v >= RULES.minWithdrawal && a.indexOf(v) === i).map((v) => <button class="pp-btn ghost sm" onClick={() => (amount.value = String(v))}>{v === Math.floor(w.payable) ? 'Max' : money(v, 0)}</button>)}</div>
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (open.value = null)}>Cancel</button><button class="pp-btn" onClick={submitRequest}>Submit request</button></>),
              }}
            </Modal>
          )}

          {open.value === 'payout' && (
            <Modal title="Update payout details" onClose={() => (open.value = null)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <Field label="Account holder name" error={payErr.holder}><input class="pp-input" value={pay.holder} onInput={(e) => (pay.holder = e.target.value)} /></Field>
                    <div class="pp-form two">
                      <Field label="Bank name" error={payErr.bank}><input class="pp-input" value={pay.bank} onInput={(e) => (pay.bank = e.target.value)} /></Field>
                      <Field label="IFSC / SWIFT / routing" error={payErr.code}><input class="pp-input" value={pay.code} onInput={(e) => (pay.code = e.target.value.toUpperCase())} /></Field>
                      <Field label="Account number" error={payErr.account}><input class="pp-input" inputmode="numeric" autocomplete="off" value={pay.account} onInput={(e) => (pay.account = e.target.value.replace(/\D/g, ''))} /></Field>
                      <Field label="Confirm account number" error={payErr.account2}><input class="pp-input" inputmode="numeric" autocomplete="off" value={pay.account2} onInput={(e) => (pay.account2 = e.target.value.replace(/\D/g, ''))} /></Field>
                    </div>
                    <Field label="Country"><CountrySelect modelValue={pay.country} onChange={(v) => (pay.country = v)} /></Field>
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (open.value = null)}>Cancel</button><button class="pp-btn" onClick={submitPayout}>Save & verify</button></>),
              }}
            </Modal>
          )}

          {open.value && typeof open.value === 'object' && (
            <Modal title={`Withdrawal ${open.value.id}`} large onClose={() => (open.value = null)}>
              <div class="pp-stack">
                <div style={{ overflowX: 'auto', paddingBottom: '4px' }}><Steps steps={stepsFor(open.value)} /></div>
                <dl class="pp-kv"><dt>Amount</dt><dd>{money(open.value.amount)}</dd><dt>Status</dt><dd><Badge status={open.value.status} /></dd>
                  <dt>Bank reference</dt><dd class="mono">{open.value.reference || 'Assigned when payment is made'}</dd>
                  {open.value.reason && (<><dt>Reason</dt><dd>{open.value.reason}</dd></>)}</dl>
                <div class="pp-list">{[...open.value.history].reverse().map((h) => <div><span class="pp-ico indigo"><Icon name="clock" size={15} /></span><div class="pp-grow"><b>{h.label}</b></div><span class="pp-muted">{fmtDate(h.at)}</span></div>)}</div>
              </div>
            </Modal>
          )}
        </div>
      );
    };
  },
};

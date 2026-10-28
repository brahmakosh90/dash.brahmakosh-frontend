import { ref, reactive, computed } from 'vue';
import { Icon, Card, PageHead, Tabs, Badge, Field, Callout, DataTable, Modal } from '../components/ui.jsx';
import { state, RULES, toast, createTicket, fmtDate, money } from '../store.js';

const FAQS = [
  ['How much do I earn per referral?', `You earn ${money(RULES.commission, 0)} for every eligible registration: a verified, attributed app install plus a completed account registration that passes fraud checks.`],
  ['How long does attribution last?', `${RULES.attributionDays} days from an eligible click on your link or code. If the user installs after that window, the install is not attributed to you.`],
  ['Why is a commission still pending?', `New commissions are held for ${RULES.holdDays} days while automated and manual fraud checks run. They move to Approved and become payable afterwards.`],
  ['When can I withdraw?', `Once your approved payable balance is at least ${money(RULES.minWithdrawal, 0)}. Requests are approved by Finance and paid by manual bank transfer.`],
  ['Why can’t I request a withdrawal?', 'Your payout details must be verified by Finance first, and you can only have one request waiting for approval at a time.'],
  ['What counts as self-referral?', 'Registering yourself, family on your devices, or accounts tied to your payout details. These are blocked automatically and repeat attempts can lead to suspension.'],
  ['Does my leaderboard rank affect my commission?', 'No. The Spiritual Impact ranking is based on how deeply referred users practise and is completely separate from cash commission.'],
];
const GUIDELINES = [
  'Be honest about what Brahmakosh offers. Do not claim guaranteed spiritual, medical or financial outcomes.',
  'Never register yourself, relatives or friends solely to earn commission — these are blocked and may lead to suspension.',
  'No incentivised installs, fake accounts, bots, emulators or purchased traffic.',
  'No spam: do not send unsolicited bulk messages or post links in unrelated communities.',
  'Use only approved brand assets and clearly disclose that you earn a commission when asked.',
];

export default {
  name: 'PartnerHelp',
  setup() {
    const tab = ref('faq'); const open = ref(false); const busy = ref(false);
    const f = reactive({ subject: '', category: 'Commission', message: '' }); const err = reactive({});
    const tickets = computed(() => state.tickets);
    const send = async () => {
      Object.keys(err).forEach((k) => delete err[k]);
      if (f.subject.trim().length < 5) err.subject = 'Add a short subject (5+ characters).';
      if (f.message.trim().length < 15) err.message = 'Please describe the issue in a little more detail.';
      if (Object.keys(err).length) return;
      busy.value = true; const r = await createTicket(f); busy.value = false;
      if (!r.ok) { err.message = r.error; return; }
      open.value = false; Object.assign(f, { subject: '', message: '' }); toast(`Ticket ${r.data.ticket.id} created`);
    };
    return () => (
      <div class="pp-stack">
        <PageHead title="Help & Support" sub="Answers, program rules and a direct line to the partner team.">
          <button class="pp-btn" onClick={() => (open.value = true)}><Icon name="plus" size={16} />New support ticket</button>
        </PageHead>
        <Card flush>
          <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={[['faq', 'FAQs'], ['rules', 'Program rules'], ['tickets', 'My tickets', tickets.value.filter((t) => t.status === 'open').length || null]]} />
          <div class="pp-card-b">
            {tab.value === 'faq' && <div class="pp-faq">{FAQS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>}
            {tab.value === 'rules' && (
              <div class="pp-stack">
                <div class="pp-list">{GUIDELINES.map((g) => <div key={g}><span class="pp-ico green"><Icon name="check" size={15} /></span><div class="pp-grow">{g}</div></div>)}</div>
                <Callout tone="warn">Breaking these rules can lead to commission reversal, payout holds or account suspension.</Callout>
              </div>
            )}
            {tab.value === 'tickets' && (
              <DataTable rows={tickets.value} pageSize={8} empty={{ icon: 'support', title: 'No tickets yet', sub: 'Open a ticket and we will reply within one business day.' }} columns={[
                { label: 'Ticket', render: (t) => <div class="pp-cell-main"><b>{t.subject}</b><small class="mono">{t.id} · {t.category}</small>{t.reply && <div class="pp-muted" style={{ marginTop: '4px', fontSize: '12.5px' }}>↳ {t.reply}</div>}</div> },
                { label: 'Created', render: (t) => fmtDate(t.createdAt) }, { label: 'Updated', render: (t) => fmtDate(t.updatedAt) },
                { label: 'Status', render: (t) => <Badge status={t.status === 'open' ? 'pending' : 'resolved'} label={t.status === 'open' ? 'Open' : 'Resolved'} /> },
              ]} />
            )}
          </div>
        </Card>
        <Callout tone="info">Prefer email? Write to <b>partners@brahmakosh.com</b> — include your referral code so we can help faster.</Callout>

        {open.value && (
          <Modal title="Report an issue" onClose={() => (open.value = false)}>
            {{
              default: () => (
                <div class="pp-form">
                  <Field label="Category"><select class="pp-select" value={f.category} onChange={(e) => (f.category = e.target.value)}>{['Commission', 'Withdrawal', 'Referral links', 'Campaign', 'Account', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
                  <Field label="Subject" error={err.subject}><input class="pp-input" value={f.subject} onInput={(e) => (f.subject = e.target.value)} /></Field>
                  <Field label="Describe the issue" error={err.message}><textarea class="pp-textarea" value={f.message} onInput={(e) => (f.message = e.target.value)} /></Field>
                </div>
              ),
              footer: () => (<><button class="pp-btn ghost" onClick={() => (open.value = false)}>Cancel</button><button class="pp-btn" disabled={busy.value} onClick={send}>Submit ticket</button></>),
            }}
          </Modal>
        )}
      </div>
    );
  },
};

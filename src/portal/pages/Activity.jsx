import { ref, computed } from 'vue';
import { Icon, Card, PageHead, DataTable, Badge, SearchBox, Modal, Callout, Seg } from '../components/ui.jsx';
import { LineChart, COLORS } from '../components/charts.jsx';
import { state, ME, RULES, campaignOf, exportCSV, fmtDate, shortDate, dayStr, ageDays, money, num } from '../store.js';

export default {
  name: 'ReferralActivity',
  setup() {
    const q = ref(''); const status = ref('all'); const campaign = ref('all'); const open = ref(null);
    const all = computed(() => [...state.referrals].sort((a, b) => (b.installAt + b.id).localeCompare(a.installAt + a.id)));
    const camps = computed(() => state.campaigns.filter((c) => c.partnerId === ME));
    const rows = computed(() => all.value.filter((r) => {
      const s = q.value.toLowerCase();
      const okS = status.value === 'all' || (status.value === 'registered' ? r.status === 'registered' : status.value === 'installed' ? r.status === 'installed' : r.eligibility === status.value);
      return okS && (campaign.value === 'all' || r.campaignId === campaign.value) && (!s || `${r.anon} ${r.channel}`.toLowerCase().includes(s));
    }));
    const history = computed(() => {
      const m = {}; for (let i = 13; i >= 0; i--) m[dayStr(-i)] = { label: shortDate(dayStr(-i)), installs: 0, regs: 0 };
      all.value.forEach((r) => { if (m[r.installAt]) { m[r.installAt].installs++; if (r.status === 'registered') m[r.installAt].regs++; } });
      return Object.values(m);
    });
    const eligibleReason = (r) => ({
      eligible: `Verified install + completed registration, passed ${RULES.holdDays}-day fraud review.`,
      in_review: `Registered ${ageDays(r.regAt)}d ago. Commission becomes payable after the ${RULES.holdDays}-day fraud review.`,
      awaiting: 'Installed the app but has not completed account registration yet. No commission until registration.',
      rejected: r.reason || 'Failed eligibility checks.', reversed: r.reason || 'Commission reversed after review.',
    }[r.eligibility]);

    return () => (
      <div class="pp-stack">
        <PageHead title="Referral Activity & Records" sub="Anonymized records of every install and registration you drove. Personal details are never shown.">
          <button class="pp-btn ghost" onClick={() => exportCSV('brahmakosh-referral-activity.csv', rows.value.map((r) => ({ 'Anonymous ID': r.anon, Campaign: campaignOf(r.campaignId)?.name, Channel: r.channel, Device: r.device, Installed: r.installAt, Registered: r.regAt || '', Status: r.status, Eligibility: r.eligibility, Note: r.reason })))}><Icon name="download" size={16} />Export</button>
        </PageHead>

        <Card title="Last 14 days" sub="Installs and completed registrations">
          <LineChart data={history.value} series={[{ key: 'installs', label: 'Installs', color: COLORS.indigo }, { key: 'regs', label: 'Registrations', color: COLORS.green }]} height={200} />
        </Card>

        <Card flush>
          <div class="pp-toolbar">
            <SearchBox modelValue={q.value} onChange={(v) => (q.value = v)} placeholder="Search anonymous ID or channel" />
            <select class="pp-select" value={status.value} onChange={(e) => (status.value = e.target.value)} aria-label="Status filter">
              <option value="all">All statuses</option><option value="installed">Installed only</option><option value="registered">Registered</option>
              <option value="eligible">Eligible</option><option value="in_review">In fraud review</option><option value="rejected">Rejected</option><option value="reversed">Reversed</option>
            </select>
            <select class="pp-select" value={campaign.value} onChange={(e) => (campaign.value = e.target.value)} aria-label="Campaign filter">
              <option value="all">All campaigns</option>{camps.value.map((c) => <option key={c.id} value={c.id}>{c.general ? 'Direct link' : c.name}</option>)}
            </select>
            <span class="pp-muted" style={{ marginLeft: 'auto' }}>{num(rows.value.length)} records</span>
          </div>
          <DataTable rows={rows.value} pageSize={12} empty={{ icon: 'activity', title: 'No matching records' }} columns={[
            { label: 'Referred user', render: (r) => <div class="pp-cell-main"><b class="mono">{r.anon}</b><small>{r.device} · {r.channel}</small></div> },
            { label: 'Campaign', render: (r) => (campaignOf(r.campaignId)?.general ? 'Direct link' : campaignOf(r.campaignId)?.name) },
            { label: 'Installed', render: (r) => fmtDate(r.installAt) },
            { label: 'Registered', render: (r) => (r.regAt ? fmtDate(r.regAt) : '—') },
            { label: 'Stage', render: (r) => <Badge status={r.status} /> },
            { label: 'Commission eligibility', render: (r) => <Badge status={r.eligibility} /> },
            { label: '', align: 'r', render: (r) => <button class="pp-btn ghost sm" onClick={() => (open.value = r)}>History</button> },
          ]} />
        </Card>

        {open.value && (
          <Modal title={`Conversion history · ${open.value.anon}`} onClose={() => (open.value = null)}>
            <div class="pp-stack">
              <div class="pp-list">
                {[['pointer', 'Clicked your link', open.value.clickAt, true], ['phone', 'Installed the app (verified)', open.value.installAt, true], ['userCheck', 'Completed registration', open.value.regAt, !!open.value.regAt],
                  ['shield', 'Fraud review', open.value.regAt && ageDays(open.value.regAt) >= RULES.holdDays ? dayStr(-ageDays(open.value.regAt) + RULES.holdDays) : null, open.value.eligibility === 'eligible'],
                  ['dollar', open.value.eligibility === 'eligible' ? `${money(RULES.commission)} commission approved` : 'Commission', null, open.value.eligibility === 'eligible']].map(([ic, label, at, done]) => (
                  <div key={label} style={{ opacity: done ? 1 : 0.45 }}><span class={`pp-ico ${done ? 'green' : 'blue'}`}><Icon name={ic} size={15} /></span><div class="pp-grow"><b>{label}</b></div><span class="pp-muted">{at ? fmtDate(at) : done ? '' : 'Not yet'}</span></div>
                ))}
              </div>
              <Callout tone={open.value.eligibility === 'eligible' ? 'ok' : ['rejected', 'reversed'].includes(open.value.eligibility) ? 'bad' : 'info'}>{eligibleReason(open.value)}</Callout>
            </div>
          </Modal>
        )}
      </div>
    );
  },
};

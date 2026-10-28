import { ref, computed } from 'vue';
import { Icon, Card, Kpi, PageHead, Seg, DataTable } from '../components/ui.jsx';
import { LineChart, BarChart, Funnel, COLORS } from '../components/charts.jsx';
import { state, ME, dailySeries, bucketSeries, sumSeries, exportCSV, num, pct, rate, money, RULES, dayStr, shortDate, campaignOf } from '../store.js';

export default {
  name: 'PartnerAnalytics',
  setup() {
    const mode = ref('daily');
    const preset = ref(30);
    const from = ref(dayStr(-29)); const to = ref(dayStr(0));
    const campaign = ref('all');

    const setPreset = (d) => { preset.value = d; if (d) { from.value = dayStr(-(d - 1)); to.value = dayStr(0); } };
    const camps = computed(() => state.campaigns.filter((c) => c.partnerId === ME));

    const rows = computed(() => dailySeries({ partnerId: ME, days: 90, campaignId: campaign.value }).filter((r) => r.date >= from.value && r.date <= to.value));
    const bucketed = computed(() => bucketSeries(rows.value, mode.value).map((r) => ({ ...r, conv: rate(r.regs, r.clicks), earned: r.regs * RULES.commission, id: r.label })));
    const tot = computed(() => sumSeries(rows.value));

    const byCampaign = computed(() => camps.value.map((c) => {
      const t = sumSeries(state.series.filter((s) => s.campaignId === c.id && s.date >= from.value && s.date <= to.value));
      return { id: c.id, name: c.general ? 'Direct referral link' : c.name, code: c.code, ...t, conv: rate(t.regs, t.clicks), earned: t.regs * RULES.commission };
    }).filter((r) => r.clicks).sort((a, b) => b.regs - a.regs));

    const exportRows = () => exportCSV(`brahmakosh-${mode.value}-report.csv`, bucketed.value.map((r) => ({ Period: r.label, Clicks: r.clicks, Installs: r.installs, Registrations: r.regs, 'Conversion %': r.conv.toFixed(2), 'Est. commission USD': r.earned })));

    return () => (
      <div class="pp-stack">
        <PageHead title="Download & Registration Analytics" sub="Track clicks, verified installs and completed registrations across campaigns.">
          <button class="pp-btn ghost" onClick={exportRows}><Icon name="download" size={16} />Export CSV</button>
        </PageHead>

        <Card flush>
          <div class="pp-toolbar">
            <Seg modelValue={preset.value} onChange={setPreset} options={[[7, '7D'], [30, '30D'], [90, '90D'], [0, 'Custom']]} />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span class="pp-muted">From</span><input class="pp-input" style={{ width: '150px' }} type="date" min={dayStr(-89)} max={to.value} value={from.value} onInput={(e) => { from.value = e.target.value; preset.value = 0; }} /></label>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span class="pp-muted">To</span><input class="pp-input" style={{ width: '150px' }} type="date" min={from.value} max={dayStr(0)} value={to.value} onInput={(e) => { to.value = e.target.value; preset.value = 0; }} /></label>
            <select class="pp-select" value={campaign.value} onChange={(e) => (campaign.value = e.target.value)} aria-label="Campaign filter">
              <option value="all">All campaigns</option>
              {camps.value.map((c) => <option key={c.id} value={c.id}>{c.general ? 'Direct referral link' : c.name}</option>)}
            </select>
            <div style={{ marginLeft: 'auto' }}><Seg modelValue={mode.value} onChange={(v) => (mode.value = v)} options={[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]} /></div>
          </div>
        </Card>

        <div class="pp-grid pp-g4">
          <Kpi icon="pointer" tone="amber" label="Total referral clicks" value={num(tot.value.clicks)} foot={`${shortDate(from.value)} – ${shortDate(to.value)}`} />
          <Kpi icon="phone" tone="indigo" label="Verified app installs" value={num(tot.value.installs)} foot={`${pct(rate(tot.value.installs, tot.value.clicks))} click → install`} />
          <Kpi icon="userCheck" tone="green" label="Completed registrations" value={num(tot.value.regs)} foot={`${pct(rate(tot.value.regs, tot.value.installs))} install → registration`} />
          <Kpi icon="trendUp" tone="violet" label="Conversion rate" value={pct(rate(tot.value.regs, tot.value.clicks))} foot="clicks → registrations" />
        </div>

        <div class="pp-grid pp-g-2-1">
          <Card title="Trend" sub={`${mode.value[0].toUpperCase() + mode.value.slice(1)} view`}>
            <LineChart data={bucketed.value} series={[{ key: 'clicks', label: 'Clicks', color: COLORS.amber }, { key: 'installs', label: 'Installs', color: COLORS.indigo }, { key: 'regs', label: 'Registrations', color: COLORS.green }]} height={280} area={false} />
          </Card>
          <Card title="Funnel">
            <Funnel steps={[{ label: 'Clicks', value: tot.value.clicks, color: COLORS.amber }, { label: 'Installs', value: tot.value.installs, color: COLORS.indigo }, { label: 'Registrations', value: tot.value.regs, color: COLORS.green }]} />
          </Card>
        </div>

        <Card title="Campaign-wise analytics" sub="Within the selected date range" flush>
          <DataTable rows={byCampaign.value} pageSize={8} columns={[
            { label: 'Campaign', render: (r) => <div class="pp-cell-main"><b>{r.name}</b><small class="mono">{r.code}</small></div> },
            { label: 'Clicks', align: 'r', render: (r) => num(r.clicks) }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) },
            { label: 'Registrations', align: 'r', render: (r) => num(r.regs) }, { label: 'Conversion', align: 'r', render: (r) => pct(r.conv) },
            { label: 'Est. commission', align: 'r', render: (r) => <b>{money(r.earned)}</b> },
          ]} />
        </Card>

        <Card title={`${mode.value[0].toUpperCase() + mode.value.slice(1)} report`} flush>
          <DataTable rows={[...bucketed.value].reverse()} pageSize={10} columns={[
            { label: 'Period', render: (r) => <b>{r.label}</b> }, { label: 'Clicks', align: 'r', render: (r) => num(r.clicks) }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) },
            { label: 'Registrations', align: 'r', render: (r) => num(r.regs) }, { label: 'Conversion', align: 'r', render: (r) => pct(r.conv) }, { label: 'Est. commission', align: 'r', render: (r) => money(r.earned) },
          ]} />
        </Card>
      </div>
    );
  },
};

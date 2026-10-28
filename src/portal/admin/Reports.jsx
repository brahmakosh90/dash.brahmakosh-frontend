import { ref, computed, watch } from 'vue';
import { Icon, Card, PageHead, Seg, DataTable, Badge, Callout, Kpi, loadState } from '../components/ui.jsx';
import { BarChart, COLORS } from '../components/charts.jsx';
import { exportCSV, money, num, pct, rate, RULES } from '../store.js';
import { useAdminData, can } from './adminStore.js';

export default {
  name: 'AdminReports',
  setup() {
    const days = ref(30); const view = ref('partners');
    const url = () => `/admin/reports?days=${days.value}`;
    const { data, loading, error, reload } = useAdminData(url);
    watch(days, () => reload(url()));
    const chart = computed(() => (data.value?.partners || []).slice(0, 8).map((r) => ({ label: r.name.split(' ')[0], installs: r.installs, regs: r.regs })));
    const exp = () => exportCSV(`brahmakosh-${view.value}-report-${days.value}d.csv`, (view.value === 'partners' ? data.value.partners : data.value.campaigns).map(({ id, ...r }) => r));

    return () => {
      if (!can('reports.view')) return <div class="pp-stack"><PageHead title="Performance reports" /><Callout tone="warn">Your role cannot view reports.</Callout></div>;
      const wait = data.value ? null : loadState(loading.value, error.value, () => reload(url())); if (wait) return wait;
      const t = data.value.totals;
      return (
        <div class="pp-stack">
          <PageHead title="Performance reports" sub="Partner and campaign performance for the selected period.">
            <Seg modelValue={days.value} onChange={(v) => (days.value = v)} options={[[7, '7D'], [30, '30D'], [90, '90D']]} />
            <button class="pp-btn ghost" onClick={exp}><Icon name="download" size={16} />Export CSV</button>
          </PageHead>
          <div class="pp-grid pp-g4">
            <Kpi icon="pointer" tone="amber" label="Clicks" value={num(t.clicks)} foot={`last ${days.value} days`} />
            <Kpi icon="phone" tone="indigo" label="Installs" value={num(t.installs)} foot={`${pct(rate(t.installs, t.clicks))} of clicks`} />
            <Kpi icon="userCheck" tone="green" label="Registrations" value={num(t.regs)} foot={`${pct(rate(t.regs, t.installs))} of installs`} />
            <Kpi icon="dollar" tone="violet" label="Gross commission accrued" value={money(t.regs * RULES.commission)} foot="before fraud adjustments" />
          </div>
          <Card title="Top partners" sub="Installs vs registrations"><BarChart data={chart.value} series={[{ key: 'installs', label: 'Installs', color: COLORS.indigo }, { key: 'regs', label: 'Registrations', color: COLORS.green }]} height={240} /></Card>
          <Card flush>
            <div class="pp-toolbar"><Seg modelValue={view.value} onChange={(v) => (view.value = v)} options={[['partners', 'By partner'], ['campaigns', 'By campaign']]} /></div>
            {view.value === 'partners' ? (
              <DataTable rows={data.value.partners} pageSize={10} columns={[
                { label: 'Partner', render: (r) => <div class="pp-cell-main"><b>{r.name}</b><small>{r.org}</small></div> }, { label: 'Status', render: (r) => <Badge status={r.status} /> },
                { label: 'Clicks', align: 'r', render: (r) => num(r.clicks) }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) }, { label: 'Regs', align: 'r', render: (r) => <b>{num(r.regs)}</b> },
                { label: 'Conv.', align: 'r', render: (r) => pct(r.conv) }, { label: 'Accrued', align: 'r', render: (r) => money(r.earned) }, { label: 'Payable', align: 'r', render: (r) => money(r.payable) }, { label: 'Impact', align: 'r', render: (r) => num(r.impact) },
              ]} />
            ) : (
              <DataTable rows={data.value.campaigns} pageSize={10} columns={[
                { label: 'Campaign', render: (r) => <div class="pp-cell-main"><b>{r.name}</b><small>{r.partner}</small></div> }, { label: 'Status', render: (r) => <Badge status={r.status} /> },
                { label: 'Clicks', align: 'r', render: (r) => num(r.clicks) }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) }, { label: 'Regs', align: 'r', render: (r) => <b>{num(r.regs)}</b> }, { label: 'Conv.', align: 'r', render: (r) => pct(r.conv) },
              ]} />
            )}
          </Card>
        </div>
      );
    };
  },
};

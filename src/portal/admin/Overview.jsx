import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon, Card, Kpi, PageHead, DataTable, Badge, Avatar, loadState } from '../components/ui.jsx';
import { LineChart, Donut, COLORS } from '../components/charts.jsx';
import { RULES, bucketSeries, money, num, pct, rate } from '../store.js';
import { useAdminData } from './adminStore.js';

export default {
  name: 'AdminOverview',
  setup() {
    const { data, loading, error, reload } = useAdminData(() => '/admin/overview');
    const series = computed(() => bucketSeries(data.value.series, 'daily'));
    const queue = computed(() => { const q = data.value.queue; return [
      ['Partner applications', q.applications, 'users', 'amber', 'partners'], ['Campaigns awaiting approval', q.campaigns, 'megaphone', 'indigo', 'campaigns'],
      ['Withdrawals to approve', q.withdrawalsToApprove, 'bank', 'blue', 'withdrawals'], ['Transfers to reconcile', q.transfersToReconcile, 'checkCircle', 'violet', 'withdrawals'],
      ['Open fraud flags', q.fraudOpen, 'shieldAlert', 'red', 'fraud'],
    ]; });
    const mix = computed(() => [['approved', 'Approved', COLORS.green], ['pending', 'Pending', COLORS.amber], ['paid', 'Paid', COLORS.blue], ['rejected', 'Rejected', COLORS.red], ['reversed', 'Reversed', COLORS.gray]]
      .map(([k, l, color]) => ({ label: l, value: data.value.mix[k] || 0, color })));

    return () => {
      const wait = loadState(loading.value, error.value, reload); if (wait) return wait;
      const d = data.value; const w = d.wallets; const t = d.totals;
      return (
        <div class="pp-stack">
          <PageHead title="Partner programme overview" sub="Health of the referral programme across all partners." />
          <div class="pp-grid pp-g4">
            <Kpi icon="users" tone="indigo" label="Active partners" value={num(d.activePartners)} foot={`${d.suspendedPartners} suspended`} />
            <Kpi icon="userCheck" tone="green" label="Verified registrations" value={num(t.regs)} foot={`${pct(rate(t.regs, t.clicks))} conversion`} />
            <Kpi icon="dollar" tone="amber" label="Commission liability" value={money(w.payable + w.reserved)} foot={`${money(w.pending)} pending review`} />
            <Kpi icon="bank" tone="blue" label="Paid to partners" value={money(w.paid)} foot={`${d.paidTransfers} bank transfers`} />
          </div>
          <div class="pp-grid pp-g-2-1">
            <Card title="Programme registrations" sub="Last 30 days across all partners">
              <LineChart data={series.value} series={[{ key: 'regs', label: 'Registrations', color: COLORS.green }, { key: 'installs', label: 'Installs', color: COLORS.indigo }]} height={260} />
            </Card>
            <Card title="Needs your attention">
              <div class="pp-list">{queue.value.map(([label, n, icon, tone, to]) => (
                <div key={label}><span class={`pp-ico ${tone}`}><Icon name={icon} size={16} /></span><div class="pp-grow"><b>{label}</b></div>
                  <RouterLink to={`/partner-portal/admin/${to}`} class={`pp-badge ${n ? (tone === 'red' ? 'red' : 'amber') : 'gray'}`}>{n}</RouterLink></div>
              ))}</div>
            </Card>
          </div>
          <div class="pp-grid pp-g-2-1">
            <Card title="Top partners · last 30 days" flush>
              <DataTable noPager rows={d.top} columns={[
                { label: 'Partner', render: (r) => <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Avatar text={r.initials} size={32} /><div class="pp-cell-main"><b>{r.name}</b><small>{r.org}</small></div></div> },
                { label: 'Clicks', align: 'r', render: (r) => num(r.clicks) }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) },
                { label: 'Registrations', align: 'r', render: (r) => <b>{num(r.regs)}</b> }, { label: 'Conv.', align: 'r', render: (r) => pct(rate(r.regs, r.clicks)) },
              ]} />
            </Card>
            <Card title="Commission status mix" sub={`${money(RULES.commission, 0)} per eligible registration`}>
              <Donut items={mix.value} center={num(d.commissionRecords)} centerLabel="records" />
            </Card>
          </div>
        </div>
      );
    };
  },
};

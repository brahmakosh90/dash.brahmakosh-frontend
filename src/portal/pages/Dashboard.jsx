import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Icon, Kpi, Card, Badge, PageHead, Seg, Callout } from '../components/ui.jsx';
import { LineChart, BarChart, Funnel, Spark, COLORS } from '../components/charts.jsx';
import { state, ME, RULES, partnerOf, walletOf, partnerTotals, dailySeries, bucketSeries, money, num, pct, rate, fmtDate, campaignOf, campaignTotals } from '../store.js';

const delta = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : 0);

export default {
  name: 'PartnerDashboard',
  setup() {
    const metric = ref('regs');
    const view = ref('daily');

    const me = computed(() => partnerOf(ME));
    const wallet = computed(() => walletOf(ME));
    const total = computed(() => partnerTotals(ME));
    const d60 = computed(() => dailySeries({ partnerId: ME, days: 60 }));
    const cur30 = computed(() => d60.value.slice(30)); const prev30 = computed(() => d60.value.slice(0, 30));
    const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);

    const chartData = computed(() => (view.value === 'monthly' ? bucketSeries(dailySeries({ partnerId: ME, days: 180 }), 'monthly') : bucketSeries(dailySeries({ partnerId: ME, days: view.value === 'weekly' ? 84 : 30 }), view.value)));
    const monthly = computed(() => bucketSeries(dailySeries({ partnerId: ME, days: 180 }), 'monthly').map((m) => ({ ...m, earned: m.regs * RULES.commission })));

    const recent = computed(() => [...state.referrals].sort((a, b) => (b.installAt + b.id).localeCompare(a.installAt + a.id)).slice(0, 6));
    const topCamps = computed(() => state.campaigns.filter((c) => c.partnerId === ME && !c.general).map((c) => ({ c, t: campaignTotals(c.id) })).filter((x) => x.t.regs).sort((a, b) => b.t.regs - a.t.regs).slice(0, 4));
    const progress = computed(() => Math.min(100, (wallet.value.payable / RULES.minWithdrawal) * 100));
    const spark = (k) => d60.value.slice(-14).map((r) => r[k]);

    return () => {
      const w = wallet.value; const t = total.value;
      const c30 = (k) => sum(cur30.value, k); const p30 = (k) => sum(prev30.value, k);
      const key = metric.value; const label = { clicks: 'Clicks', installs: 'Installs', regs: 'Registrations' }[key];
      return (
        <div class="pp-stack">
          <div class="pp-hero">
            <div class="pp-hero-row">
              <div>
                <h2>Namaste, {me.value.name.split(' ')[0]} 🙏</h2>
                <p>Your referrals brought <b>{num(c30('regs'))}</b> verified registrations in the last 30 days. Keep sharing — every eligible registration earns {money(RULES.commission, 0)}.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <RouterLink class="pp-btn" to="/partner-portal/links"><Icon name="share" size={16} />Share my link</RouterLink>
                <RouterLink class="pp-btn ghost" to="/partner-portal/withdrawals"><Icon name="bank" size={16} />Withdraw</RouterLink>
              </div>
            </div>
          </div>

          <div class="pp-grid pp-g4">
            <Kpi icon="phone" tone="indigo" label="Total app downloads" value={num(t.installs)} delta={delta(c30('installs'), p30('installs'))} foot="vs previous 30d" spark={<Spark values={spark('installs')} color={COLORS.indigo} />} />
            <Kpi icon="userCheck" tone="green" label="Verified registrations" value={num(t.regs)} delta={delta(c30('regs'), p30('regs'))} foot={`${pct(t.conv)} click-to-reg`} spark={<Spark values={spark('regs')} color={COLORS.green} />} />
            <Kpi icon="dollar" tone="amber" label="Total commission earnings" value={money(w.lifetime)} foot={`${money(w.pending)} still in fraud review`} />
            <Kpi icon="wallet" tone="violet" label="Available withdrawal balance" value={money(w.payable)} foot={w.payable >= RULES.minWithdrawal ? 'Ready to withdraw' : `${money(RULES.minWithdrawal - w.payable)} to reach ${money(RULES.minWithdrawal, 0)} minimum`} />
          </div>

          <div class="pp-grid pp-g-2-1">
            <Card title="Performance overview" sub="Monthly growth and funnel trend">
              {{
                actions: () => (<>
                  <Seg modelValue={view.value} onChange={(v) => (view.value = v)} options={[['daily', '30D'], ['weekly', '12W'], ['monthly', '6M']]} />
                  <Seg modelValue={key} onChange={(v) => (metric.value = v)} options={[['clicks', 'Clicks'], ['installs', 'Installs'], ['regs', 'Regs']]} />
                </>),
                default: () => <LineChart data={chartData.value} series={[{ key, label, color: key === 'regs' ? COLORS.green : key === 'installs' ? COLORS.indigo : COLORS.amber }]} />,
              }}
            </Card>
            <Card title="Conversion funnel" sub="All time, attributed to you">
              <Funnel steps={[{ label: 'Referral clicks', value: t.clicks, color: COLORS.amber }, { label: 'Verified installs', value: t.installs, color: COLORS.indigo }, { label: 'Completed registrations', value: t.regs, color: COLORS.green }]} />
              <div class="pp-callout info" style={{ marginTop: '18px' }}><Icon name="info" /><div>Overall conversion <b>{pct(t.conv)}</b>. A commission is earned only for a verified install plus a completed registration within {RULES.attributionDays} days of the click.</div></div>
            </Card>
          </div>

          <div class="pp-grid pp-g-2-1">
            <Card title="Monthly earnings" sub="Commission generated per month">
              <BarChart data={monthly.value} series={[{ key: 'earned', label: 'Commission (USD)', color: COLORS.indigo }]} money height={220} />
            </Card>
            <Card title="Withdrawal progress" sub={`Minimum ${money(RULES.minWithdrawal, 0)} payable balance`}>
              <div class="pp-kpi-val pp-num" style={{ marginTop: 0 }}>{money(w.payable)}</div>
              <div class="pp-progress amber" style={{ margin: '12px 0 8px' }}><i style={{ width: `${progress.value}%` }} /></div>
              <div class="pp-muted" style={{ fontSize: '12.5px' }}>{progress.value >= 100 ? 'Threshold reached — you can submit a request.' : `${progress.value.toFixed(0)}% of the way to your next payout`}</div>
              <dl class="pp-kv" style={{ marginTop: '18px', gridTemplateColumns: '1fr auto' }}>
                <dt>Pending review</dt><dd class="pp-num">{money(w.pending)}</dd>
                <dt>Reserved for payout</dt><dd class="pp-num">{money(w.reserved)}</dd>
                <dt>Paid to date</dt><dd class="pp-num">{money(w.paid)}</dd>
              </dl>
            </Card>
          </div>

          <div class="pp-grid pp-g-3-2">
            <Card title="Recent referral activity" flush>
              {{
                actions: () => <RouterLink class="pp-btn ghost sm" to="/partner-portal/activity">View all</RouterLink>,
                default: () => (
                  <div class="pp-card-b" style={{ paddingTop: '10px' }}>
                    <div class="pp-list">{recent.value.map((r) => (
                      <div key={r.id}>
                        <span class={`pp-ico ${r.status === 'registered' ? 'green' : 'blue'}`}><Icon name={r.status === 'registered' ? 'userCheck' : 'phone'} size={16} /></span>
                        <div class="pp-grow"><b class="pp-num">{r.anon}</b><div class="pp-muted" style={{ fontSize: '12.5px' }}>{r.status === 'registered' ? 'Completed registration' : 'Installed the app'} · {r.channel} · {fmtDate(r.installAt)}</div></div>
                        <Badge status={r.eligibility} />
                      </div>
                    ))}</div>
                  </div>
                ),
              }}
            </Card>
            <Card title="Top campaigns" sub="By verified registrations" flush>
              {{
                default: () => (
                  <div class="pp-card-b" style={{ paddingTop: '12px' }}>
                    {topCamps.value.map(({ c, t: ct }) => (
                      <div key={c.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><b>{c.name}</b><span class="pp-num"><b>{num(ct.regs)}</b> <span class="pp-muted">regs</span></span></div>
                        <div class="pp-progress"><i style={{ width: `${Math.min(100, (ct.regs / (c.cap || ct.regs)) * 100)}%` }} /></div>
                        <div class="pp-muted" style={{ fontSize: '12px', marginTop: '4px' }}>{pct(rate(ct.regs, ct.clicks))} conversion · <Badge status={c.status} /></div>
                      </div>
                    ))}
                    {!topCamps.value.length && <div class="pp-muted">No campaign activity yet.</div>}
                  </div>
                ),
              }}
            </Card>
          </div>
          {me.value.status !== 'approved' && <Callout tone="warn">Your partner account is {me.value.status}. Earning is paused.</Callout>}
        </div>
      );
    };
  },
};

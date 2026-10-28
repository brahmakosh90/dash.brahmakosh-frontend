import { ref, computed, onMounted, watch } from 'vue';
import { Icon, Card, PageHead, Seg, DataTable, Callout, Avatar, Kpi } from '../components/ui.jsx';
import { partnerApi } from '../api.js';
import { ME, num, pct, errMsg } from '../store.js';

export default {
  name: 'SpiritualLeaderboard',
  setup() {
    const period = ref('30');
    const list = ref([]); const loading = ref(true); const error = ref('');
    const load = async () => {
      loading.value = true;
      try { list.value = (await partnerApi.get(`/partner/leaderboard?period=${period.value}`)).rows; error.value = ''; }
      catch (e) { error.value = errMsg(e); } finally { loading.value = false; }
    };
    onMounted(load); watch(period, load);
    const rows = computed(() => list.value);
    const mine = computed(() => rows.value.find((r) => r.partner.id === ME));
    const hours = (m) => `${Math.floor(m / 60).toLocaleString()}h ${m % 60}m`;

    return () => {
      const top = rows.value.slice(0, 3); const order = [top[1], top[0], top[2]].filter(Boolean);
      return (
        <div class="pp-stack">
          <PageHead title="Spiritual Impact Leaderboard" sub="Ranks partners by how deeply their referred users practise — completely separate from cash commission.">
            <Seg modelValue={period.value} onChange={(v) => (period.value = v)} options={[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All time']]} />
          </PageHead>
          {error.value && <Callout tone="warn">{error.value}</Callout>}
          <Callout tone="info">Rankings use verified spiritual sessions and retention only. Commission earnings never influence your rank, and rank never changes your commission.</Callout>

          {mine.value && (
            <div class="pp-grid pp-g4">
              <Kpi icon="trophy" tone="amber" label="Your rank" value={`#${mine.value.rank}`} foot={`of ${rows.value.length} partners · ${num(mine.value.score)} pts`} />
              <Kpi icon="spark" tone="indigo" label="Completed first activity" value={num(mine.value.first)} foot={`${pct((mine.value.first / (mine.value.users || 1)) * 100, 0)} of referred users`} />
              <Kpi icon="users" tone="green" label="Active referred users" value={num(mine.value.active)} foot="practised in last 14 days" />
              <Kpi icon="clock" tone="violet" label="Verified practice time" value={hours(mine.value.minutes)} foot={`${num(mine.value.sessions)} verified sessions`} />
            </div>
          )}

          <div class="pp-podium">{order.map((r) => (
            <div key={r.partner.id} class={`pp-card pp-pod ${r.rank === 1 ? 'first' : ''}`}>
              {r.rank === 1 && <span class="pp-crown" aria-hidden="true">👑</span>}
              <Avatar text={r.partner.initials} size={56} />
              <b>{r.partner.name}{r.partner.id === ME && ' (you)'}</b>
              <small class="pp-muted">{r.partner.org}</small>
              <div class="pp-score pp-num">{num(r.score)}</div>
              <small class="pp-muted">impact points · rank #{r.rank}</small>
            </div>
          ))}</div>

          <Card title="Full ranking" sub="Retention is measured on users who have been registered at least 7 / 30 days" flush>
            <DataTable pageSize={10} rows={rows.value.map((r) => ({ ...r, id: r.partner.id }))} rowClass={(r) => (r.partner.id === ME ? 'pp-me' : '')} columns={[
              { label: 'Rank', width: '70px', render: (r) => <span class={`pp-rank ${r.rank <= 3 ? 'r' + r.rank : ''}`}>{r.rank}</span> },
              { label: 'Partner', render: (r) => <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><Avatar text={r.partner.initials} size={32} /><div class="pp-cell-main"><b>{r.partner.name}{r.partner.id === ME && ' · You'}</b><small>{r.partner.org}</small></div></div> },
              { label: 'First activity', align: 'r', render: (r) => num(r.first) },
              { label: 'Active users', align: 'r', render: (r) => num(r.active) },
              { label: 'Sessions', align: 'r', render: (r) => num(r.sessions) },
              { label: 'Minutes', align: 'r', render: (r) => num(r.minutes) },
              { label: '7-day retention', align: 'r', render: (r) => pct(r.ret7, 0) },
              { label: '30-day retention', align: 'r', render: (r) => pct(r.ret30, 0) },
              { label: 'Impact score', align: 'r', render: (r) => <b>{num(r.score)}</b> },
            ]} />
          </Card>
          <Card title="How the impact score works">
            <p class="pp-muted">Score = active referred users × 4 + users with a first spiritual activity × 2 + verified sessions × 0.5 + practice hours + 30-day retention × 2. Only verified sessions inside the Brahmakosh app count, and flagged accounts are excluded.</p>
          </Card>
        </div>
      );
    };
  },
};

import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';

export const COLORS = { indigo: '#4f46e5', amber: '#f59e0b', green: '#10b981', blue: '#0ea5e9', violet: '#8b5cf6', red: '#ef4444', gray: '#9aa0bd' };

const useWidth = (fallback = 640) => {
  const el = ref(null); const width = ref(fallback); let ro;
  onMounted(() => {
    const read = () => { if (el.value) width.value = Math.max(240, el.value.clientWidth); };
    read(); ro = new ResizeObserver(read); ro.observe(el.value);
  });
  onBeforeUnmount(() => ro && ro.disconnect());
  return { el, width };
};

const niceMax = (v) => {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v)); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`);

/** Multi-series line chart with area under the first series and a hover tooltip. */
export const LineChart = defineComponent({
  name: 'PPLineChart',
  props: { data: Array, series: Array, height: { type: Number, default: 260 }, area: { type: Boolean, default: true } },
  setup(props) {
    const { el, width } = useWidth();
    const hover = ref(-1);
    const m = { t: 14, r: 14, b: 28, l: 40 };
    const geo = computed(() => {
      const w = width.value; const h = props.height;
      const iw = w - m.l - m.r; const ih = h - m.t - m.b;
      const max = niceMax(Math.max(1, ...props.data.flatMap((d) => props.series.map((s) => d[s.key]))));
      const x = (i) => m.l + (props.data.length <= 1 ? iw / 2 : (i / (props.data.length - 1)) * iw);
      const y = (v) => m.t + ih - (v / max) * ih;
      return { w, h, iw, ih, max, x, y };
    });
    const path = (key) => {
      const { x, y } = geo.value; const pts = props.data.map((d, i) => [x(i), y(d[key])]);
      if (pts.length < 2) return '';
      let dstr = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const cx = (x0 + x1) / 2;
        dstr += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
      }
      return dstr;
    };
    const onMove = (e) => {
      const r = e.currentTarget.getBoundingClientRect(); const { iw } = geo.value;
      const rel = (e.clientX - r.left - m.l) / iw;
      hover.value = Math.max(0, Math.min(props.data.length - 1, Math.round(rel * (props.data.length - 1))));
    };
    return () => {
      const { w, h, ih, max, x, y } = geo.value;
      const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
      const step = Math.ceil(props.data.length / Math.max(2, Math.floor(w / 80)));
      const hv = hover.value;
      return (
        <div class="pp-chart" ref={el}>
          <svg viewBox={`0 0 ${w} ${h}`} height={h} onMousemove={onMove} onMouseleave={() => (hover.value = -1)}>
            <defs>{props.series.map((s) => (
              <linearGradient id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color={s.color} stop-opacity=".22" /><stop offset="100%" stop-color={s.color} stop-opacity="0" /></linearGradient>
            ))}</defs>
            {ticks.map((t) => (
              <g key={t}><line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="#e8eaf4" stroke-dasharray={t ? '3 4' : ''} />
                <text x={m.l - 8} y={y(t) + 4} text-anchor="end" font-size="11" fill="#8a90b0">{compact(t)}</text></g>
            ))}
            {props.data.map((d, i) => i % step === 0 && <text key={i} x={x(i)} y={h - 8} text-anchor="middle" font-size="11" fill="#8a90b0">{d.label}</text>)}
            {props.area && props.series.map((s) => props.data.length > 1 && <path d={`${path(s.key)} L${x(props.data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#g-${s.key})`} />)}
            {props.series.map((s) => <path d={path(s.key)} fill="none" stroke={s.color} stroke-width="2.4" stroke-linecap="round" />)}
            {hv >= 0 && <g><line x1={x(hv)} x2={x(hv)} y1={m.t} y2={m.t + ih} stroke="#c9cde4" />
              {props.series.map((s) => <circle cx={x(hv)} cy={y(props.data[hv][s.key])} r="4.5" fill="#fff" stroke={s.color} stroke-width="2.5" />)}</g>}
            <rect x={m.l} y={m.t} width={w - m.l - m.r} height={ih} fill="transparent" />
          </svg>
          {hv >= 0 && (
            <div class="pp-tip" style={{ left: `${Math.min(Math.max(x(hv), 80), w - 80)}px`, top: `${m.t + 20}px` }}>
              <b>{props.data[hv].label}</b>
              {props.series.map((s) => <div><span><i style={{ background: s.color }} />{s.label}</span><b style={{ color: '#fff', margin: 0 }}>{props.data[hv][s.key].toLocaleString()}</b></div>)}
            </div>
          )}
          <div class="pp-legend">{props.series.map((s) => <span><i style={{ background: s.color }} />{s.label}</span>)}</div>
        </div>
      );
    };
  },
});

/** Grouped bar chart. */
export const BarChart = defineComponent({
  name: 'PPBarChart',
  props: { data: Array, series: Array, height: { type: Number, default: 240 }, money: Boolean },
  setup(props) {
    const { el, width } = useWidth();
    const hover = ref(-1);
    const m = { t: 14, r: 10, b: 28, l: 42 };
    return () => {
      const w = width.value; const h = props.height; const iw = w - m.l - m.r; const ih = h - m.t - m.b;
      const max = niceMax(Math.max(1, ...props.data.flatMap((d) => props.series.map((s) => d[s.key]))));
      const gw = iw / props.data.length; const bw = Math.min(30, (gw * 0.7) / props.series.length);
      const y = (v) => m.t + ih - (v / max) * ih;
      const fmt = (v) => (props.money ? `$${v.toLocaleString()}` : v.toLocaleString());
      return (
        <div class="pp-chart" ref={el}>
          <svg viewBox={`0 0 ${w} ${h}`} height={h} onMouseleave={() => (hover.value = -1)}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}><line x1={m.l} x2={w - m.r} y1={y(f * max)} y2={y(f * max)} stroke="#e8eaf4" stroke-dasharray={f ? '3 4' : ''} />
                <text x={m.l - 8} y={y(f * max) + 4} text-anchor="end" font-size="11" fill="#8a90b0">{compact(f * max)}</text></g>
            ))}
            {props.data.map((d, i) => {
              const cx = m.l + gw * i + gw / 2; const start = cx - (bw * props.series.length) / 2;
              return (
                <g key={i} onMouseenter={() => (hover.value = i)}>
                  <rect x={m.l + gw * i} y={m.t} width={gw} height={ih} fill={hover.value === i ? 'rgba(79,70,229,.05)' : 'transparent'} />
                  {props.series.map((s, k) => <rect x={start + k * bw} y={y(d[s.key])} width={bw - 3} height={Math.max(0, y(0) - y(d[s.key]))} rx="4" fill={s.color} />)}
                  <text x={cx} y={h - 8} text-anchor="middle" font-size="11" fill="#8a90b0">{d.label}</text>
                </g>
              );
            })}
          </svg>
          {hover.value >= 0 && (
            <div class="pp-tip" style={{ left: `${Math.min(Math.max(m.l + gw * hover.value + gw / 2, 80), w - 80)}px`, top: `${m.t + 20}px` }}>
              <b>{props.data[hover.value].label}</b>
              {props.series.map((s) => <div><span><i style={{ background: s.color }} />{s.label}</span><b style={{ color: '#fff', margin: 0 }}>{fmt(props.data[hover.value][s.key])}</b></div>)}
            </div>
          )}
          <div class="pp-legend">{props.series.map((s) => <span><i style={{ background: s.color }} />{s.label}</span>)}</div>
        </div>
      );
    };
  },
});

/** Donut with a legend list. */
export const Donut = (props) => {
  const total = props.items.reduce((a, i) => a + i.value, 0) || 1; const R = 54; const C = 2 * Math.PI * R; let off = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
      <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Distribution">
        <circle cx="75" cy="75" r={R} fill="none" stroke="#eceef7" stroke-width="18" />
        {props.items.map((it) => {
          const len = (it.value / total) * C; const el = <circle cx="75" cy="75" r={R} fill="none" stroke={it.color} stroke-width="18" stroke-dasharray={`${Math.max(0, len - 2)} ${C}`} stroke-dashoffset={-off} transform="rotate(-90 75 75)" />;
          off += len; return el;
        })}
        <text x="75" y="72" text-anchor="middle" font-size="22" font-weight="800" fill="#151a33">{props.center}</text>
        <text x="75" y="90" text-anchor="middle" font-size="11" fill="#8a90b0">{props.centerLabel}</text>
      </svg>
      <div style={{ flex: 1, minWidth: '150px', display: 'grid', gap: '10px' }}>
        {props.items.map((it) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <i style={{ width: '10px', height: '10px', borderRadius: '3px', background: it.color, display: 'inline-block' }} />
            <span style={{ flex: 1 }}>{it.label}</span><b class="pp-num">{it.value.toLocaleString()}</b>
            <span class="pp-muted pp-num" style={{ width: '42px', textAlign: 'right' }}>{((it.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
Donut.props = ['items', 'center', 'centerLabel'];

export const Spark = (props) => {
  const v = props.values; const w = 84; const h = 32; const max = Math.max(...v, 1); const min = Math.min(...v, 0);
  const pts = v.map((n, i) => `${(i / (v.length - 1)) * w},${h - 3 - ((n - min) / (max - min || 1)) * (h - 6)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={props.color || COLORS.indigo} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>;
};
Spark.props = ['values', 'color'];

export const Funnel = (props) => {
  const top = props.steps[0].value || 1;
  return (
    <div class="pp-funnel">{props.steps.map((s, i) => (
      <div>
        <div class="pp-funnel-row"><span>{s.label}</span><span class="pp-num">{s.value.toLocaleString()} <small>{i === 0 ? '' : `· ${((s.value / (props.steps[i - 1].value || 1)) * 100).toFixed(1)}% of previous`}</small></span></div>
        <div class="pp-funnel-bar"><i style={{ width: `${Math.max(2, (s.value / top) * 100)}%`, background: s.color }} /></div>
      </div>
    ))}</div>
  );
};
Funnel.props = ['steps'];

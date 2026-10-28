import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { state } from '../store.js';
import { COUNTRIES } from '../countries.js';

/* ---------- Icons (24px stroke set) ---------- */
const P = {
  dashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  megaphone: ['m3 11 18-5v12L3 14v-4Z', 'M11.6 16.8a3 3 0 1 1-5.8-1.6'],
  chart: ['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  trophy: ['M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  wallet: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  bank: ['M3 22h18', 'M6 18v-7', 'M10 18v-7', 'M14 18v-7', 'M18 18v-7', 'M12 2 20 7H4l8-5Z'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  shieldAlert: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'M12 8v4', 'M12 16h.01'],
  copy: ['M9 9h13v13H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  check: ['M20 6 9 17l-5-5'],
  checkCircle: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  search: ['M21 21l-4.3-4.3', 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  plus: ['M12 5v14', 'M5 12h14'],
  up: ['m5 12 7-7 7 7', 'M12 19V5'],
  down: ['m19 12-7 7-7-7', 'M12 5v14'],
  trendUp: ['M22 7l-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 6v6l4 2'],
  alert: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 16v-4', 'M12 8h.01'],
  file: ['M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'],
  support: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'm4.93 4.93 4.24 4.24', 'm14.83 9.17 4.24-4.24', 'm14.83 14.83 4.24 4.24', 'm9.17 14.83-4.24 4.24'],
  qr: ['M3 3h5v5H3z', 'M16 3h5v5h-5z', 'M3 16h5v5H3z', 'M21 16h-3a2 2 0 0 0-2 2v3', 'M21 21v.01', 'M12 7v3a2 2 0 0 1-2 2H7', 'M3 12h.01', 'M12 3h.01', 'M12 16v.01', 'M16 12h1', 'M21 12v.01', 'M12 21v-1'],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'm16 6-4-4-4 4', 'M12 2v13'],
  phone: ['M5 2h14v20H5z', 'M12 18h.01'],
  userCheck: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'm16 11 2 2 4-4'],
  pointer: ['m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z', 'm13 13 6 6'],
  dollar: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  spark: ['m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z'],
  lock: ['M3 11h18v11H3z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  key: ['M13 7.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0', 'm21 2-9.6 9.6', 'm15.5 7.5 3 3L22 7l-3-3'],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  edit: ['M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'],
  ban: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'm4.9 4.9 14.2 14.2'],
  pause: ['M6 4h4v16H6z', 'M14 4h4v16h-4z'],
  play: ['m5 3 14 9-14 9V3z'],
  mail: ['M2 4h20v16H2z', 'm22 7-10 5L2 7'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  send: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
  image: ['M3 3h18v18H3z', 'M21 15l-5-5L5 21', 'M9 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  external: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'm15 3 6 0 0 6', 'M10 14 21 3'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  menuDots: ['M12 12h.01', 'M12 5h.01', 'M12 19h.01'],
  swap: ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
};
export const Icon = ({ name, size = 18, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {(P[name] || P.info).map((d) => <path d={d} key={d} />)}
  </svg>
);

/* ---------- Status badges ---------- */
const META = {
  active: ['green', 'Active'], scheduled: ['blue', 'Scheduled'], paused: ['amber', 'Paused'], expired: ['gray', 'Expired'], pending_approval: ['indigo', 'Pending approval'],
  revoked: ['red', 'Revoked'], approved: ['green', 'Approved'], pending: ['amber', 'Pending'], paid: ['blue', 'Paid'], rejected: ['red', 'Rejected'], reversed: ['red', 'Reversed'],
  processing: ['violet', 'Processing'], eligible: ['green', 'Eligible'], in_review: ['amber', 'In fraud review'], awaiting: ['gray', 'Awaiting registration'],
  registered: ['green', 'Registered'], installed: ['blue', 'Installed'], suspended: ['red', 'Suspended'], open: ['red', 'Open'], under_review: ['amber', 'Under review'],
  confirmed: ['red', 'Confirmed'], dismissed: ['gray', 'Dismissed'], resolved: ['green', 'Resolved'], verified: ['green', 'Verified'], pending_verification: ['amber', 'Verifying'],
  high: ['red', 'High'], medium: ['amber', 'Medium'], low: ['blue', 'Low'],
};
export const Badge = ({ status, label, tone }) => {
  const [t, l] = META[status] || ['gray', status];
  return <span class={`pp-badge ${tone || t}`}>{label || l}</span>;
};

/* ---------- Layout bits ---------- */
export const PageHead = (props, { slots }) => (
  <div class="pp-head">
    <div><h1>{props.title}</h1>{props.sub && <p>{props.sub}</p>}</div>
    <div class="pp-head-actions">{slots.default?.()}</div>
  </div>
);
PageHead.props = ['title', 'sub'];

export const Card = (props, { slots }) => (
  <section class={`pp-card ${props.class || ''}`} style={props.style}>
    {(props.title || slots.actions) && (
      <div class="pp-card-h">
        <div><h3>{props.title}</h3>{props.sub && <small>{props.sub}</small>}</div>
        {slots.actions && <div class="pp-right">{slots.actions()}</div>}
      </div>
    )}
    {props.flush ? slots.default?.() : <div class="pp-card-b">{slots.default?.()}</div>}
  </section>
);
Card.props = ['title', 'sub', 'flush', 'class', 'style'];

export const Kpi = (props) => (
  <div class="pp-card pp-kpi">
    <div class="pp-kpi-top"><span class={`pp-ico ${props.tone || 'indigo'}`}><Icon name={props.icon} /></span>{props.label}</div>
    <div class="pp-kpi-val pp-num">{props.value}</div>
    <div class="pp-kpi-foot">
      {props.delta != null && (
        <span class={`pp-delta ${props.delta >= 0 ? 'up' : 'down'}`}><Icon name={props.delta >= 0 ? 'up' : 'down'} size={13} stroke={2.6} />{Math.abs(props.delta).toFixed(1)}%</span>
      )}
      <span>{props.foot}</span>
    </div>
    {props.spark && <div class="pp-kpi-spark">{props.spark}</div>}
  </div>
);
Kpi.props = ['icon', 'label', 'value', 'delta', 'foot', 'tone', 'spark'];

export const Callout = (props, { slots }) => (
  <div class={`pp-callout ${props.tone || 'info'}`}>
    <Icon name={props.tone === 'warn' ? 'alert' : props.tone === 'ok' ? 'checkCircle' : props.tone === 'bad' ? 'ban' : 'info'} />
    <div>{slots.default?.()}</div>
  </div>
);
Callout.props = ['tone'];

export const Seg = (props) => (
  <div class="pp-seg">{props.options.map(([v, l]) => <button key={v} class={props.modelValue === v ? 'on' : ''} onClick={() => props.onChange(v)}>{l}</button>)}</div>
);
Seg.props = ['options', 'modelValue', 'onChange'];

export const Tabs = (props) => (
  <div class="pp-tabs">{props.options.map(([v, l, n]) => (
    <button key={v} class={props.modelValue === v ? 'on' : ''} onClick={() => props.onChange(v)}>{l}{n != null && <i>{n}</i>}</button>
  ))}</div>
);
Tabs.props = ['options', 'modelValue', 'onChange'];

export const Empty = (props) => (
  <div class="pp-empty"><Icon name={props.icon || 'search'} size={30} /><b>{props.title || 'Nothing to show'}</b><span>{props.sub}</span></div>
);
Empty.props = ['icon', 'title', 'sub'];

export const SearchBox = (props) => (
  <div class="pp-search"><Icon name="search" size={16} />
    <input class="pp-input" placeholder={props.placeholder || 'Search'} value={props.modelValue} onInput={(e) => props.onChange(e.target.value)} />
  </div>
);
SearchBox.props = ['modelValue', 'onChange', 'placeholder'];

export const Field = (props, { slots }) => (
  <label class={`pp-field ${props.error ? 'err' : ''}`}><span>{props.label}</span>{slots.default?.()}{(props.error || props.hint) && <small>{props.error || props.hint}</small>}</label>
);
Field.props = ['label', 'error', 'hint'];

export const CopyField = (props) => (
  <div class="pp-copy">
    <input class="pp-input" readonly value={props.value} onFocus={(e) => e.target.select()} />
    <button class="pp-btn ghost" onClick={props.onCopy}><Icon name="copy" size={16} />Copy</button>
  </div>
);
CopyField.props = ['value', 'onCopy'];

/* ---------- Modal ---------- */
export const Modal = defineComponent({
  name: 'PPModal',
  props: { title: String, large: Boolean },
  emits: ['close'],
  setup(props, { slots, emit }) {
    const esc = (e) => e.key === 'Escape' && emit('close');
    onMounted(() => { window.addEventListener('keydown', esc); document.body.style.overflow = 'hidden'; });
    onBeforeUnmount(() => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; });
    return () => (
      <div class="pp-modal-bg" onMousedown={(e) => e.target === e.currentTarget && emit('close')}>
        <div class={`pp-modal ${props.large ? 'lg' : ''}`} role="dialog" aria-modal="true" aria-label={props.title}>
          <div class="pp-modal-h"><h3>{props.title}</h3><button class="pp-btn ghost icon sm" aria-label="Close" onClick={() => emit('close')}><Icon name="x" size={16} /></button></div>
          <div class="pp-modal-b">{slots.default?.()}</div>
          {slots.footer && <div class="pp-modal-f">{slots.footer()}</div>}
        </div>
      </div>
    );
  },
});

export const Toasts = () => (
  <div class="pp-toasts" aria-live="polite">{state.toasts.map((t) => (
    <div key={t.id} class={`pp-toast ${t.type}`}><Icon name={t.type === 'err' ? 'alert' : 'checkCircle'} />{t.message}</div>
  ))}</div>
);

/* ---------- DataTable with pagination ---------- */
export const DataTable = defineComponent({
  name: 'PPTable',
  props: { columns: Array, rows: Array, pageSize: { type: Number, default: 10 }, rowClass: Function, empty: Object, noPager: Boolean },
  setup(props) {
    const page = ref(1);
    const pages = computed(() => Math.max(1, Math.ceil(props.rows.length / props.pageSize)));
    watch(() => props.rows.length, () => { if (page.value > pages.value) page.value = 1; });
    watch(() => props.rows, () => { page.value = Math.min(page.value, pages.value); });
    const slice = computed(() => (props.noPager ? props.rows : props.rows.slice((page.value - 1) * props.pageSize, page.value * props.pageSize)));
    return () => (
      <div>
        {props.rows.length === 0 ? <Empty {...(props.empty || {})} /> : (
          <div class="pp-table-wrap">
            <table class="pp-table">
              <thead><tr>{props.columns.map((c) => <th key={c.label} class={c.align === 'r' ? 'r' : ''} style={c.width ? { width: c.width } : null}>{c.head ? c.head() : c.label}</th>)}</tr></thead>
              <tbody>{slice.value.map((row, i) => (
                <tr key={row.id || i} class={props.rowClass?.(row) || ''}>{props.columns.map((c) => (
                  <td key={c.label} class={`${c.align === 'r' ? 'r' : ''} ${c.mono ? 'mono' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!props.noPager && props.rows.length > props.pageSize && (
          <div class="pp-pager">
            <span>Showing {(page.value - 1) * props.pageSize + 1}–{Math.min(page.value * props.pageSize, props.rows.length)} of {props.rows.length}</span>
            <div class="pp-right">
              <button class="pp-btn ghost sm" disabled={page.value === 1} onClick={() => (page.value = 1)}>First</button>
              <button class="pp-btn ghost sm" disabled={page.value === 1} onClick={() => page.value--}>Prev</button>
              <span>Page {page.value} / {pages.value}</span>
              <button class="pp-btn ghost sm" disabled={page.value === pages.value} onClick={() => page.value++}>Next</button>
            </div>
          </div>
        )}
      </div>
    );
  },
});

/* ---------- Step tracker ---------- */
export const Steps = (props) => (
  <div class="pp-steps">{props.steps.map((s, i) => (
    <>
      <div class={`pp-step ${s.state}`}><i>{s.state === 'done' ? '✓' : s.state === 'bad' ? '!' : i + 1}</i>{s.label}</div>
      {i < props.steps.length - 1 && <div class={`pp-step-line ${s.state === 'done' ? 'done' : ''}`} />}
    </>
  ))}</div>
);
Steps.props = ['steps'];

export const Avatar = (props) => <span class="pp-avatar" style={{ width: `${props.size || 38}px`, height: `${props.size || 38}px`, fontSize: `${(props.size || 38) * 0.37}px` }}>{props.text}</span>;
Avatar.props = ['text', 'size'];

/** First-load / error placeholder for pages that fetch their data. Returns null once data is ready. */
export const loadState = (loading, error, retry) => {
  if (error) return <div class="pp-state"><div class="pp-card"><h3>Couldn’t load this page</h3><p class="pp-muted" style={{ margin: '8px 0 16px' }}>{error}</p><button class="pp-btn" onClick={retry}>Try again</button></div></div>;
  if (loading) return <div class="pp-state"><div><div class="pp-spin" /><span class="pp-muted">Loading…</span></div></div>;
  return null;
};

/** Password field with a show / hide toggle. */
export const PasswordInput = defineComponent({
  name: 'PPPasswordInput',
  props: { modelValue: String, autocomplete: String, required: Boolean },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const shown = ref(false);
    return () => (
      <div class="pp-pw">
        <input class="pp-input" type={shown.value ? 'text' : 'password'} required={props.required} autocomplete={props.autocomplete} value={props.modelValue} onInput={(e) => emit('update:modelValue', e.target.value)} />
        <button type="button" class="pp-pw-toggle" aria-label={shown.value ? 'Hide password' : 'Show password'} aria-pressed={shown.value} onClick={() => (shown.value = !shown.value)}>
          {shown.value
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
            : <Icon name="eye" size={18} />}
        </button>
      </div>
    );
  },
});

/** Country dropdown listing every country. A saved value that is not in the list is kept as an extra option. */
export const CountrySelect = (props) => (
  <select class="pp-select" value={props.modelValue || ''} onChange={(e) => props.onChange(e.target.value)} autocomplete="country-name">
    <option value="">Select country</option>
    {props.modelValue && !COUNTRIES.includes(props.modelValue) && <option value={props.modelValue}>{props.modelValue}</option>}
    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
  </select>
);
CountrySelect.props = ['modelValue', 'onChange'];

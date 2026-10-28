import { ref, computed, reactive } from 'vue';
import { Icon, Card, PageHead, Tabs, Badge, Modal, Field, Empty, Callout } from '../components/ui.jsx';
import { state, ME, RULES, campaignTotals, requestCampaign, copyText, toast, money, num, pct, rate, fmtDate, daysBetween, dayStr } from '../store.js';

const TABS = [['active', 'Active'], ['scheduled', 'Scheduled'], ['paused', 'Paused'], ['expired', 'Expired'], ['pending_approval', 'Pending approval']];

export default {
  name: 'PartnerCampaigns',
  setup() {
    const tab = ref('active');
    const modal = ref(false);
    const detail = ref(null);
    const form = reactive({ name: '', code: '', start: dayStr(7), end: dayStr(37), cap: 500, channel: '' });
    const errors = reactive({});

    const mine = computed(() => state.campaigns.filter((c) => c.partnerId === ME && !c.general));
    const counts = computed(() => Object.fromEntries(TABS.map(([k]) => [k, mine.value.filter((c) => c.status === k).length])));
    const list = computed(() => mine.value.filter((c) => c.status === tab.value));

    const submit = async () => {
      Object.keys(errors).forEach((k) => delete errors[k]);
      if (form.name.trim().length < 4) errors.name = 'Give the campaign a descriptive name.';
      if (!/^[A-Za-z0-9]{4,14}$/.test(form.code)) errors.code = '4–14 letters or numbers, no spaces.';
      else if (state.campaigns.some((c) => c.code === form.code.toUpperCase())) errors.code = 'This code is already in use.';
      if (form.end <= form.start) errors.end = 'End date must be after the start date.';
      if (!(Number(form.cap) >= 50)) errors.cap = 'Minimum limit is 50 registrations.';
      if (Object.keys(errors).length) return;
      const r = await requestCampaign({ ...form, cap: Number(form.cap) });
      if (!r.ok) { errors.name = r.error; return; }
      modal.value = false; tab.value = 'pending_approval';
      toast('Campaign submitted for admin approval');
      Object.assign(form, { name: '', code: '', channel: '' });
    };

    const card = (c) => {
      const t = campaignTotals(c.id); const used = c.cap ? (t.regs / c.cap) * 100 : 0;
      const left = daysBetween(dayStr(0), c.end);
      return (
        <div class="pp-card pp-camp" key={c.id}>
          <div class="pp-camp-top">
            <div style={{ flex: 1 }}><h4>{c.name}</h4><div class="pp-muted" style={{ fontSize: '12.5px', marginTop: '2px' }}>{fmtDate(c.start)} → {fmtDate(c.end)}{c.status === 'active' && left >= 0 && ` · ${left}d left`}</div></div>
            <Badge status={c.status} />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span class="pp-chip">{c.code}</span>
            <button class="pp-btn ghost sm" onClick={() => copyText(c.code, 'Campaign code copied')}><Icon name="copy" size={13} />Copy</button>
            <span class="pp-badge indigo" style={{ marginLeft: 'auto' }}>{money(c.rate)} / registration</span>
          </div>
          <div class="pp-camp-metrics">
            <div><small>Clicks</small><b class="pp-num">{num(t.clicks)}</b></div>
            <div><small>Installs</small><b class="pp-num">{num(t.installs)}</b></div>
            <div><small>Registrations</small><b class="pp-num">{num(t.regs)}</b></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}><span class="pp-muted">Campaign limit</span><b class="pp-num">{num(t.regs)} / {num(c.cap)}</b></div>
            <div class={`pp-progress ${used > 90 ? 'amber' : ''}`}><i style={{ width: `${Math.min(100, used)}%` }} /></div>
            {used > 90 && c.status === 'active' && <div class="pp-muted" style={{ fontSize: '12px', marginTop: '6px', color: '#b36b00' }}>Nearly at limit — registrations past the cap will not earn commission.</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span class="pp-muted" style={{ fontSize: '12.5px' }}>{pct(rate(t.regs, t.clicks))} click → registration</span>
            <button class="pp-btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => (detail.value = c)}>Details</button>
          </div>
        </div>
      );
    };

    return () => (
      <div class="pp-stack">
        <PageHead title="Campaigns" sub="Run time-boxed campaigns with their own codes. New campaigns go live after admin approval.">
          <button class="pp-btn" onClick={() => (modal.value = true)}><Icon name="plus" size={16} />Request campaign</button>
        </PageHead>
        <Callout tone="info">Every campaign needs admin approval before it can earn. Commission is <b>{money(RULES.commission, 0)}</b> per eligible registration and stops once the campaign limit or end date is reached.</Callout>
        <Card flush>
          <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={TABS.map(([k, l]) => [k, l, counts.value[k]])} />
          <div class="pp-card-b">
            {list.value.length ? <div class="pp-grid pp-g3">{list.value.map(card)}</div> : <Empty icon="megaphone" title={`No ${TABS.find((t) => t[0] === tab.value)[1].toLowerCase()} campaigns`} sub="Campaigns in this state will appear here." />}
          </div>
        </Card>

        {modal.value && (
          <Modal title="Request a new campaign" onClose={() => (modal.value = false)}>
            {{
              default: () => (
                <div class="pp-form">
                  <Field label="Campaign name" error={errors.name}><input class="pp-input" value={form.name} onInput={(e) => (form.name = e.target.value)} placeholder="e.g. Guru Purnima Meditation Drive" /></Field>
                  <div class="pp-form two">
                    <Field label="Campaign code" error={errors.code} hint="Shown to new users at sign-up"><input class="pp-input" value={form.code} onInput={(e) => (form.code = e.target.value.toUpperCase())} placeholder="GURU27" /></Field>
                    <Field label="Registration limit" error={errors.cap}><input class="pp-input" type="number" min="50" value={form.cap} onInput={(e) => (form.cap = e.target.value)} /></Field>
                    <Field label="Start date"><input class="pp-input" type="date" value={form.start} min={dayStr(0)} onInput={(e) => (form.start = e.target.value)} /></Field>
                    <Field label="End date" error={errors.end}><input class="pp-input" type="date" value={form.end} onInput={(e) => (form.end = e.target.value)} /></Field>
                  </div>
                  <Field label="Main promotion channels"><input class="pp-input" value={form.channel} onInput={(e) => (form.channel = e.target.value)} placeholder="Instagram reels, WhatsApp communities…" /></Field>
                </div>
              ),
              footer: () => (<><button class="pp-btn ghost" onClick={() => (modal.value = false)}>Cancel</button><button class="pp-btn" onClick={submit}>Submit for approval</button></>),
            }}
          </Modal>
        )}
        {detail.value && (
          <Modal title={detail.value.name} onClose={() => (detail.value = null)}>
            <dl class="pp-kv">
              <dt>Status</dt><dd><Badge status={detail.value.status} /></dd>
              <dt>Admin approval</dt><dd><Badge status={detail.value.approval === 'approved' ? 'approved' : detail.value.approval === 'pending' ? 'pending' : 'rejected'} /></dd>
              <dt>Campaign code</dt><dd><span class="pp-chip">{detail.value.code}</span></dd>
              <dt>Validity</dt><dd>{fmtDate(detail.value.start)} → {fmtDate(detail.value.end)}</dd>
              <dt>Commission rate</dt><dd>{money(detail.value.rate)} per eligible registration</dd>
              <dt>Registration limit</dt><dd>{num(detail.value.cap)}</dd>
              <dt>Promotion channels</dt><dd>{detail.value.channelFocus || '—'}</dd>
              <dt>Created</dt><dd>{fmtDate(detail.value.createdAt)}</dd>
            </dl>
          </Modal>
        )}
      </div>
    );
  },
};

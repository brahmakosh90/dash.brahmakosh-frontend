import { ref, computed, reactive } from 'vue';
import { Icon, Card, PageHead, Tabs, DataTable, Badge, Modal, Field, Callout, loadState } from '../components/ui.jsx';
import { RULES, money, num, fmtDate, dayStr } from '../store.js';
import { staffApi } from '../api.js';
import { can, useAdminData, run } from './adminStore.js';

const STATUS = ['pending_approval', 'active', 'scheduled', 'paused', 'expired', 'revoked'];
const LABEL = { pending_approval: 'Pending approval', active: 'Active', scheduled: 'Scheduled', paused: 'Paused', expired: 'Expired', revoked: 'Revoked' };

export default {
  name: 'AdminCampaigns',
  setup() {
    const camps = useAdminData(() => '/admin/campaigns');
    const partners = useAdminData(() => '/admin/partners');
    const tab = ref('pending_approval'); const create = ref(false); const confirm = ref(null); const busy = ref(false);
    const form = reactive({ partnerId: '', name: '', code: '', start: dayStr(0), end: dayStr(30), cap: 500, rate: RULES.commission }); const err = reactive({});
    const all = computed(() => camps.data.value?.campaigns || []);
    const approved = computed(() => (partners.data.value?.partners || []).filter((p) => p.status === 'approved'));
    const rows = computed(() => all.value.filter((c) => c.status === tab.value));
    const perm = () => can('campaigns.manage');

    const submit = async () => {
      Object.keys(err).forEach((k) => delete err[k]);
      if (form.name.trim().length < 4) err.name = 'Name is required.';
      if (!/^[A-Za-z0-9]{4,14}$/.test(form.code)) err.code = '4–14 letters or numbers.';
      if (form.end <= form.start) err.end = 'End must be after start.';
      if (!(Number(form.rate) > 0 && Number(form.rate) <= 5)) err.rate = 'Rate must be between $0.01 and $5.';
      if (Object.keys(err).length) return;
      busy.value = true;
      const ok = await run(() => staffApi.post('/admin/campaigns', { ...form, partnerId: form.partnerId || approved.value[0]?.id }), 'Campaign created and approved', () => camps.reload());
      busy.value = false; if (ok) { create.value = false; tab.value = 'scheduled'; }
    };
    const act = (c, action, text, tone) => { confirm.value = { c, action, text, tone }; };
    const doRun = async () => {
      busy.value = true; const { c, action, text } = confirm.value;
      const ok = await run(() => staffApi.post(`/admin/campaigns/${c.id}/${action}`), `${c.name}: ${text.toLowerCase()}`, () => camps.reload());
      busy.value = false; if (ok) confirm.value = null;
    };

    const buttons = (c) => (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {c.status === 'pending_approval' && (<><button class="pp-btn success sm" disabled={!perm()} onClick={() => act(c, 'approve', 'Approve campaign', 'success')}>Approve</button><button class="pp-btn danger ghost sm" disabled={!perm()} onClick={() => act(c, 'reject', 'Reject campaign', 'danger')}>Reject</button></>)}
        {c.status === 'active' && <button class="pp-btn ghost sm" disabled={!perm()} onClick={() => act(c, 'pause', 'Pause campaign', 'danger')}><Icon name="pause" size={13} />Pause</button>}
        {c.status === 'paused' && <button class="pp-btn ghost sm" disabled={!perm()} onClick={() => act(c, 'resume', 'Resume campaign', 'success')}><Icon name="play" size={13} />Resume</button>}
        {['active', 'scheduled', 'paused'].includes(c.status) && <button class="pp-btn danger ghost sm" disabled={!perm()} onClick={() => act(c, 'revoke', 'Revoke campaign', 'danger')}>Revoke</button>}
      </div>
    );

    return () => {
      const wait = loadState(camps.loading.value, camps.error.value, camps.reload); if (wait) return wait;
      return (
        <div class="pp-stack">
          <PageHead title="Campaign management" sub="Create campaigns, approve partner requests and pause or revoke running ones.">
            <button class="pp-btn" disabled={!perm()} onClick={() => { form.partnerId = approved.value[0]?.id || ''; create.value = true; }}><Icon name="plus" size={16} />Create campaign</button>
          </PageHead>
          {!perm() && <Callout tone="warn">Your role has read-only access to campaigns.</Callout>}
          <Card flush>
            <Tabs modelValue={tab.value} onChange={(v) => (tab.value = v)} options={STATUS.map((s) => [s, LABEL[s], all.value.filter((c) => c.status === s).length])} />
            <DataTable rows={rows.value} pageSize={10} empty={{ icon: 'megaphone', title: `No ${LABEL[tab.value].toLowerCase()} campaigns` }} columns={[
              { label: 'Campaign', render: (c) => <div class="pp-cell-main"><b>{c.name}</b><small>{c.partnerName}</small></div> },
              { label: 'Code', render: (c) => <span class="pp-chip">{c.code}</span> },
              { label: 'Validity', render: (c) => <small>{fmtDate(c.start)} → {fmtDate(c.end)}</small> },
              { label: 'Rate / limit', render: (c) => <div class="pp-cell-main"><b>{money(c.rate)}</b><small>{num(c.cap)} regs cap</small></div> },
              { label: 'Performance', render: (c) => <div class="pp-cell-main"><b>{num(c.t.regs)} regs</b><small>{num(c.t.clicks)} clicks · {num(c.t.installs)} installs</small></div> },
              { label: '', align: 'r', render: buttons },
            ]} />
          </Card>

          {create.value && (
            <Modal title="Create campaign" onClose={() => (create.value = false)}>
              {{
                default: () => (
                  <div class="pp-form">
                    <Field label="Partner"><select class="pp-select" value={form.partnerId} onChange={(e) => (form.partnerId = e.target.value)}>{approved.value.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.org}</option>)}</select></Field>
                    <Field label="Campaign name" error={err.name}><input class="pp-input" value={form.name} onInput={(e) => (form.name = e.target.value)} /></Field>
                    <div class="pp-form two">
                      <Field label="Campaign code" error={err.code}><input class="pp-input" value={form.code} onInput={(e) => (form.code = e.target.value.toUpperCase())} /></Field>
                      <Field label="Commission rate (USD)" error={err.rate} hint={`Programme default is ${money(RULES.commission)}`}><input class="pp-input" type="number" step="0.25" value={form.rate} onInput={(e) => (form.rate = e.target.value)} /></Field>
                      <Field label="Start"><input class="pp-input" type="date" value={form.start} onInput={(e) => (form.start = e.target.value)} /></Field>
                      <Field label="End" error={err.end}><input class="pp-input" type="date" value={form.end} onInput={(e) => (form.end = e.target.value)} /></Field>
                    </div>
                    <Field label="Registration limit"><input class="pp-input" type="number" min="50" value={form.cap} onInput={(e) => (form.cap = e.target.value)} /></Field>
                  </div>
                ),
                footer: () => (<><button class="pp-btn ghost" onClick={() => (create.value = false)}>Cancel</button><button class="pp-btn" disabled={busy.value} onClick={submit}>Create & approve</button></>),
              }}
            </Modal>
          )}
          {confirm.value && (
            <Modal title={confirm.value.text} onClose={() => (confirm.value = null)}>
              {{
                default: () => <p>{confirm.value.text} “{confirm.value.c.name}” for {confirm.value.c.partnerName}? {confirm.value.action === 'revoke' ? 'Referral attribution stops immediately; already approved commissions are kept.' : 'This is recorded in the audit log.'}</p>,
                footer: () => (<><button class="pp-btn ghost" onClick={() => (confirm.value = null)}>Cancel</button><button class={`pp-btn ${confirm.value.tone}`} disabled={busy.value} onClick={doRun}>Confirm</button></>),
              }}
            </Modal>
          )}
        </div>
      );
    };
  },
};

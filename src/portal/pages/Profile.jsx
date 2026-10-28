import { reactive } from 'vue';
import { Card, PageHead, Badge, Field, Callout, Avatar } from '../components/ui.jsx';
import { LocationFields } from '../components/LocationFields.jsx';
import { ME, partnerOf, toast, saveProfile, fmtDate } from '../store.js';

export default {
  name: 'PartnerProfile',
  setup() {
    const me = partnerOf(ME);
    const form = reactive({ name: me.name, org: me.org, phone: me.phone || '', country: me.country || '', state: me.state || '', city: me.city || '', bio: me.bio || '' });
    const save = async () => {
      if (form.name.trim().length < 2) return toast('Name is required', 'err');
      if (!form.country || !form.city.trim()) return toast('Country and city are required', 'err');
      const r = await saveProfile({ ...form });
      toast(r.ok ? 'Profile updated' : r.error, r.ok ? 'ok' : 'err');
    };
    return () => {
      const p = partnerOf(ME);
      return (
        <div class="pp-stack">
          <PageHead title="My Profile" sub="Your partner details and approval status." />
          <div class="pp-grid pp-g-2-1">
            <Card title="Personal & location details">
              <div class="pp-form two">
                <Field label="Full name"><input class="pp-input" value={form.name} onInput={(e) => (form.name = e.target.value)} /></Field>
                <Field label="Organisation / channel"><input class="pp-input" value={form.org} onInput={(e) => (form.org = e.target.value)} /></Field>
                <Field label="Email" hint="Your sign-in email cannot be changed here."><input class="pp-input" type="email" readonly value={p.email} /></Field>
                <Field label="Phone"><input class="pp-input" value={form.phone} onInput={(e) => (form.phone = e.target.value)} /></Field>
                <LocationFields value={form} onChange={(v) => Object.assign(form, v)} />
                <div style={{ gridColumn: '1 / -1' }}><Field label="About you"><textarea class="pp-textarea" maxlength="600" value={form.bio} onInput={(e) => (form.bio = e.target.value)} /></Field></div>
                <div style={{ gridColumn: '1 / -1' }}><button class="pp-btn" onClick={save}>Save changes</button></div>
              </div>
            </Card>
            <div class="pp-stack">
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'grid', placeItems: 'center' }}><Avatar text={p.initials} size={64} /></div>
                  <b style={{ display: 'block', marginTop: '10px', fontSize: '16px' }}>{p.name}</b><small class="pp-muted">{p.email}</small>
                </div>
              </Card>
              <Card title="Partner account">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><span class="pp-muted">Approval status</span><Badge status={p.status} /></div>
                <dl class="pp-kv" style={{ gridTemplateColumns: '1fr auto' }}>
                  <dt>Partner tier</dt><dd>{p.tier}</dd><dt>Partner since</dt><dd>{fmtDate(p.joinedAt)}</dd><dt>Referral code</dt><dd class="mono">{p.code}</dd>
                </dl>
                <div style={{ marginTop: '14px' }}><Callout tone="ok">Approved by the Brahmakosh team. New campaigns need separate approval.</Callout></div>
              </Card>
            </div>
          </div>
        </div>
      );
    };
  },
};

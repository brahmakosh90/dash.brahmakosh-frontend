import { ref, reactive } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { AuthShell } from '../components/AuthShell.jsx';
import { Field, PasswordInput } from '../components/ui.jsx';
import { LocationFields } from '../components/LocationFields.jsx';
import { partnerApi, tokens } from '../api.js';
import { errMsg, resetPartner, toast } from '../store.js';

export default {
  name: 'PartnerRegister',
  setup() {
    const router = useRouter();
    const f = reactive({ name: '', org: '', email: '', password: '', phone: '', country: '', state: '', city: '', bio: '' });
    const error = ref(''); const busy = ref(false);
    const set = (k) => (e) => { f[k] = e.target.value; };
    const submit = async (e) => {
      e.preventDefault(); error.value = '';
      if (f.password.length < 8) { error.value = 'Password must be at least 8 characters.'; return; }
      if (!f.country) { error.value = 'Select your country.'; return; }
      if (!f.city.trim()) { error.value = 'Select or enter your city.'; return; }
      busy.value = true;
      try {
        const d = await partnerApi.post('/auth/register', f);
        tokens.set('partner', d.token); resetPartner();
        toast('Application submitted');
        router.replace('/partner-portal/dashboard');
      } catch (err) { error.value = errMsg(err); } finally { busy.value = false; }
    };
    return () => (
      <AuthShell area="Partner Portal" title="Become a Brahmakosh partner" sub="Earn $1 for every verified registration you bring. Applications are reviewed by our team.">
        <form class="pp-form two" onSubmit={submit} style={{ marginTop: '18px' }}>
          <Field label="Full name"><input class="pp-input" required value={f.name} onInput={set('name')} /></Field>
          <Field label="Organisation / channel"><input class="pp-input" value={f.org} onInput={set('org')} /></Field>
          <Field label="Email"><input class="pp-input" type="email" required autocomplete="username" value={f.email} onInput={set('email')} /></Field>
          <Field label="Password" hint="At least 8 characters"><PasswordInput required autocomplete="new-password" modelValue={f.password} onUpdate:modelValue={(v) => (f.password = v)} /></Field>
          <Field label="Phone"><input class="pp-input" value={f.phone} onInput={set('phone')} /></Field>
          <LocationFields value={f} onChange={(v) => Object.assign(f, v)} />
          <div style={{ gridColumn: '1 / -1' }}><Field label="About you" error={error.value}><textarea class="pp-textarea" maxlength="600" value={f.bio} onInput={set('bio')} /></Field></div>
          <div style={{ gridColumn: '1 / -1' }}><button class="pp-btn" style={{ width: '100%' }} type="submit" disabled={busy.value}>{busy.value ? 'Submitting…' : 'Submit application'}</button></div>
        </form>
        <p class="pp-auth-foot">Already a partner? <RouterLink to="/partner-portal/login">Sign in</RouterLink></p>
      </AuthShell>
    );
  },
};

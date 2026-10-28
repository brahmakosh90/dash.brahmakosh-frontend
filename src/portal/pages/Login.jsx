import { ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { AuthShell } from '../components/AuthShell.jsx';
import { Field, PasswordInput } from '../components/ui.jsx';
import { partnerApi, tokens } from '../api.js';
import { errMsg, resetPartner } from '../store.js';

export default {
  name: 'PartnerLogin',
  setup() {
    const router = useRouter(); const route = useRoute();
    const email = ref(''); const password = ref(''); const error = ref(''); const busy = ref(false);
    const submit = async (e) => {
      e.preventDefault(); error.value = ''; busy.value = true;
      try {
        const d = await partnerApi.post('/auth/login', { email: email.value, password: password.value });
        tokens.set('partner', d.token); resetPartner();
        router.replace(route.query.next || '/partner-portal/dashboard');
      } catch (err) { error.value = errMsg(err); } finally { busy.value = false; }
    };
    return () => (
      <AuthShell area="Partner Portal" title="Welcome back" sub="Sign in to track referrals and earnings.">
        <form class="pp-form" onSubmit={submit} style={{ marginTop: '18px' }}>
          <Field label="Email"><input class="pp-input" type="email" autocomplete="username" required value={email.value} onInput={(e) => (email.value = e.target.value)} /></Field>
          <Field label="Password" error={error.value}><PasswordInput autocomplete="current-password" required modelValue={password.value} onUpdate:modelValue={(v) => (password.value = v)} /></Field>
          <button class="pp-btn" type="submit" disabled={busy.value}>{busy.value ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p class="pp-auth-foot">New here? <RouterLink to="/partner-portal/register">Apply to become a partner</RouterLink> · <RouterLink to="/partner-portal/admin/login">Staff sign in</RouterLink></p>
      </AuthShell>
    );
  },
};

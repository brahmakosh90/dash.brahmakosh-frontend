import { ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { AuthShell } from '../components/AuthShell.jsx';
import { Field, PasswordInput } from '../components/ui.jsx';
import { staffApi, tokens } from '../api.js';
import { errMsg } from '../store.js';
import { resetStaff } from './adminStore.js';

export default {
  name: 'StaffLogin',
  setup() {
    const router = useRouter(); const route = useRoute();
    const email = ref(''); const password = ref(''); const error = ref(''); const busy = ref(false);
    const submit = async (e) => {
      e.preventDefault(); error.value = ''; busy.value = true;
      try {
        const d = await staffApi.post('/auth/admin/login', { email: email.value, password: password.value });
        tokens.set('staff', d.token); resetStaff();
        router.replace(route.query.next || '/partner-portal/admin/overview');
      } catch (err) { error.value = errMsg(err); } finally { busy.value = false; }
    };
    return () => (
      <AuthShell area="Admin Console" title="Staff sign in" sub="Use your Brahmakosh admin credentials.">
        <form class="pp-form" onSubmit={submit} style={{ marginTop: '18px' }}>
          <Field label="Work email"><input class="pp-input" type="email" autocomplete="username" required value={email.value} onInput={(e) => (email.value = e.target.value)} /></Field>
          <Field label="Password" error={error.value}><PasswordInput autocomplete="current-password" required modelValue={password.value} onUpdate:modelValue={(v) => (password.value = v)} /></Field>
          <button class="pp-btn" type="submit" disabled={busy.value}>{busy.value ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p class="pp-auth-foot"><RouterLink to="/partner-portal/login">Partner sign in</RouterLink></p>
      </AuthShell>
    );
  },
};

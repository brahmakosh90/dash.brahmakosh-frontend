import { ref, reactive } from 'vue';
import { Card, Field, PasswordInput } from './ui.jsx';
import { toast, errMsg } from '../store.js';

/** Change-password card shared by both dashboards. `submit(current, next)` performs the API call. */
export const ChangePassword = (props) => {
  const f = reactive({ current: '', next: '', again: '' }); const error = ref(''); const busy = ref(false);
  const save = async (e) => {
    e.preventDefault(); error.value = '';
    if (f.next.length < 8) { error.value = 'New password must be at least 8 characters.'; return; }
    if (f.next !== f.again) { error.value = 'The new passwords do not match.'; return; }
    busy.value = true;
    try { await props.submit(f.current, f.next); toast('Password updated'); Object.assign(f, { current: '', next: '', again: '' }); }
    catch (err) { error.value = errMsg(err); } finally { busy.value = false; }
  };
  return (
    <Card title="Change password" sub="Use at least 8 characters. You stay signed in on this device.">
      <form class="pp-form" onSubmit={save} style={{ maxWidth: '420px' }}>
        <Field label="Current password"><PasswordInput required autocomplete="current-password" modelValue={f.current} onUpdate:modelValue={(v) => (f.current = v)} /></Field>
        <Field label="New password"><PasswordInput required autocomplete="new-password" modelValue={f.next} onUpdate:modelValue={(v) => (f.next = v)} /></Field>
        <Field label="Confirm new password" error={error.value}><PasswordInput required autocomplete="new-password" modelValue={f.again} onUpdate:modelValue={(v) => (f.again = v)} /></Field>
        <div><button class="pp-btn" type="submit" disabled={busy.value}>{busy.value ? 'Saving…' : 'Update password'}</button></div>
      </form>
    </Card>
  );
};
ChangePassword.props = ['submit'];

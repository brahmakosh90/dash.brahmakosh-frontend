// Staff session state + a tiny data-loading hook shared by the admin pages.
import { reactive, ref, onMounted } from 'vue';
import { staffApi } from '../api.js';
import { errMsg, toast } from '../store.js';

export const staff = reactive({ ready: false, error: '', name: '', email: '', role: '', roleLabel: '', perms: [], source: '' });

export const can = (perm) => staff.perms.includes(perm);

export const resetStaff = () => Object.assign(staff, { ready: false, error: '', name: '', email: '', role: '', roleLabel: '', perms: [], source: '' });

export const loadStaff = async () => {
  try { const d = await staffApi.get('/admin/session'); Object.assign(staff, d.staff, { ready: true, error: '' }); }
  catch (e) { staff.error = errMsg(e); }
};

/** Loads `path` on mount and exposes reload(). `data` holds the response, `loading` the first-load state. */
export const useAdminData = (path) => {
  const data = ref(null); const loading = ref(true); const error = ref('');
  const reload = async (p = path()) => {
    try { data.value = await staffApi.get(p); error.value = ''; } catch (e) { error.value = errMsg(e); } finally { loading.value = false; }
  };
  onMounted(() => reload());
  return { data, loading, error, reload };
};

/** Runs a mutation, toasts the outcome, and refreshes on success. Returns true when it worked. */
export const run = async (fn, okMessage, after) => {
  try { const r = await fn(); if (okMessage) toast(typeof okMessage === 'function' ? okMessage(r) : okMessage); if (after) await after(r); return true; }
  catch (e) { toast(errMsg(e), 'err'); return false; }
};

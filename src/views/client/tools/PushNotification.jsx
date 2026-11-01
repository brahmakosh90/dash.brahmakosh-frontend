import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { ArrowLeftIcon, PlusIcon, BellIcon, PaperAirplaneIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import notificationService from '../../../services/notificationService.js';

const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;

const emptyForm = () => ({
  targetType: 'group',
  groupId: '',
  userIds: [],
  name: '',
  description: '',
  url: '',
  postType: 'immediate',
  scheduledFor: ''
});

// <input type="datetime-local"> works in the browser's local time; the server needs an unambiguous instant
const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const STATUS_STYLE = {
  sent: { cls: 'bg-success', label: 'Sent' },
  sending: { cls: 'bg-info', label: 'Sending' },
  scheduled: { cls: 'bg-warning text-dark', label: 'Scheduled' },
  failed: { cls: 'bg-danger', label: 'Failed' }
};

export default {
  name: 'ClientPushNotification',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const submitting = ref(false);
    const creatingGroup = ref(false);
    const users = ref([]);
    const groups = ref([]);
    const campaigns = ref([]);
    const serverCounts = ref(null);

    const showCreateGroupModal = ref(false);
    const newGroup = ref({ name: '', description: '', userIds: [] });
    const form = ref(emptyForm());
    const formSearch = ref('');
    const groupSearch = ref('');
    const touched = ref(false);

    const goBack = () => router.push('/client/tools');

    const fetchAllData = async () => {
      loading.value = true;
      try {
        // allSettled: one failing endpoint must not blank the whole page
        const [usersRes, groupsRes, campaignsRes] = await Promise.allSettled([
          notificationService.getClientUsers(),
          notificationService.getClientGroups(),
          notificationService.getClientCampaigns()
        ]);
        const failed = [];
        if (usersRes.status === 'fulfilled') users.value = usersRes.value.data || [];
        else failed.push(`users (${usersRes.reason?.message || 'error'})`);
        if (groupsRes.status === 'fulfilled') groups.value = groupsRes.value.data || [];
        else failed.push(`groups (${groupsRes.reason?.message || 'error'})`);
        if (campaignsRes.status === 'fulfilled') {
          campaigns.value = campaignsRes.value.data || [];
          serverCounts.value = campaignsRes.value.counts || null;
        } else {
          failed.push(`history (${campaignsRes.reason?.message || 'error'})`);
        }
        if (failed.length) toast.error(`Could not load: ${failed.join(', ')}`);
      } finally {
        loading.value = false;
      }
    };

    const counts = computed(() => {
      if (serverCounts.value) return serverCounts.value;
      const c = { sent: 0, scheduled: 0, sending: 0, failed: 0 };
      campaigns.value.forEach((n) => { if (c[n.status] !== undefined) c[n.status] += 1; });
      return c;
    });

    const selectedGroup = computed(() => groups.value.find((g) => g._id === form.value.groupId));

    const selectedRecipientsCount = computed(() =>
      form.value.targetType === 'group' ? (selectedGroup.value?.userIds?.length || 0) : form.value.userIds.length
    );

    const minScheduleValue = () => toLocalInputValue(new Date());

    // Single source of truth for validation: drives the inline messages and the disabled button
    const formErrors = computed(() => {
      const f = form.value;
      const errors = {};
      if (!f.name.trim()) errors.name = 'Enter a notification name';
      if (!f.description.trim()) errors.description = 'Enter a description';
      if (f.url.trim() && !isHttpUrl(f.url.trim())) errors.url = 'URL must start with http:// or https://';
      if (f.targetType === 'group' && !f.groupId) errors.target = 'Choose a group';
      if (f.targetType === 'users' && f.userIds.length === 0) errors.target = 'Select at least one user';
      if (f.postType === 'scheduled') {
        if (!f.scheduledFor) errors.scheduledFor = 'Pick a date and time';
        else if (new Date(f.scheduledFor).getTime() < Date.now() - 60000) errors.scheduledFor = 'Time must be in the future';
      }
      return errors;
    });

    const createGroup = async () => {
      if (creatingGroup.value) return;
      if (!newGroup.value.name.trim()) return toast.error('Please enter group name');
      if (!newGroup.value.userIds.length) return toast.error('Please select at least one user');

      creatingGroup.value = true;
      try {
        await notificationService.createClientGroup({
          name: newGroup.value.name.trim(),
          description: newGroup.value.description.trim(),
          userIds: newGroup.value.userIds
        });
        toast.success('Group created');
        newGroup.value = { name: '', description: '', userIds: [] };
        groupSearch.value = '';
        showCreateGroupModal.value = false;
        await fetchAllData();
      } catch (error) {
        toast.error(error.message || 'Failed to create group');
      } finally {
        creatingGroup.value = false;
      }
    };

    const submitCampaign = async () => {
      touched.value = true;
      if (submitting.value) return;
      const firstError = Object.values(formErrors.value)[0];
      if (firstError) return toast.error(firstError);

      submitting.value = true;
      try {
        const f = form.value;
        const res = await notificationService.createClientCampaign({
          groupId: f.targetType === 'group' ? f.groupId : null,
          userIds: f.targetType === 'users' ? f.userIds : [],
          name: f.name.trim(),
          description: f.description.trim(),
          url: f.url.trim(),
          postType: f.postType,
          // ISO (UTC) so the server fires at the time the person picked, not in the server's timezone
          scheduledFor: f.postType === 'scheduled' ? new Date(f.scheduledFor).toISOString() : null
        });

        const result = res.data;
        if (f.postType === 'immediate' && result?.status === 'failed') {
          toast.error(result.errorMessage || 'Notification could not be delivered');
        } else if (result?.errorMessage) {
          toast.warning(result.errorMessage);
        } else {
          toast.success(res.message || 'Notification posted');
        }

        form.value = emptyForm();
        formSearch.value = '';
        touched.value = false;
        await fetchAllData();
      } catch (error) {
        toast.error(error.message || 'Failed to post notification');
      } finally {
        submitting.value = false;
      }
    };

    const formatDate = (item) => {
      const d = new Date(item.sentAt || item.scheduledFor || item.createdAt);
      return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
    };

    // ── Searchable checkbox list (replaces the unusable multi-select for 200+ users) ──
    const renderUserPicker = ({ selected, onChange, search, height = 220 }) => {
      const q = search.value.trim().toLowerCase();
      const visible = q
        ? users.value.filter((u) => `${u.profile?.name || ''} ${u.email || ''} ${u.mobile || ''}`.toLowerCase().includes(q))
        : users.value;
      const selectedSet = new Set(selected);
      const allVisibleSelected = visible.length > 0 && visible.every((u) => selectedSet.has(u._id));

      const toggle = (id) => {
        const next = new Set(selectedSet);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange([...next]);
      };
      const toggleAllVisible = () => {
        const next = new Set(selectedSet);
        visible.forEach((u) => (allVisibleSelected ? next.delete(u._id) : next.add(u._id)));
        onChange([...next]);
      };

      return (
        <div class="border rounded">
          <div class="p-2 border-bottom d-flex gap-2 align-items-center bg-light">
            <div class="position-relative flex-grow-1">
              <MagnifyingGlassIcon style={{ width: '1rem', height: '1rem', position: 'absolute', left: '0.6rem', top: '0.65rem', color: '#6c757d' }} />
              <input
                class="form-control form-control-sm"
                style={{ paddingLeft: '2rem' }}
                placeholder="Search name, email or mobile"
                value={search.value}
                onInput={(e) => (search.value = e.target.value)}
              />
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary text-nowrap" onClick={toggleAllVisible} disabled={visible.length === 0}>
              {allVisibleSelected ? 'Unselect' : 'Select'} {q ? 'results' : 'all'}
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => onChange([])} disabled={selected.length === 0}>
              Clear
            </button>
          </div>
          <div style={{ maxHeight: `${height}px`, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div class="text-center text-muted py-4 small">{users.value.length === 0 ? 'No users yet' : 'No users match your search'}</div>
            ) : (
              visible.map((u) => (
                <label key={u._id} class="d-flex align-items-center gap-2 px-3 py-2 border-bottom mb-0" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" class="form-check-input mt-0" checked={selectedSet.has(u._id)} onChange={() => toggle(u._id)} />
                  <span class="text-truncate">
                    <span class="fw-semibold">{u.profile?.name || u.email}</span>
                    {u.profile?.name && <span class="text-muted small"> · {u.email}</span>}
                  </span>
                </label>
              ))
            )}
          </div>
          <div class="px-3 py-2 border-top small text-muted bg-light">
            {selected.length} selected{q ? ` · ${visible.length} shown` : ` of ${users.value.length}`}
          </div>
        </div>
      );
    };

    const statCard = (value, label, color) => (
      <div class="col-6 col-md">
        <div class="card border-0 shadow-sm text-center h-100">
          <div class="card-body py-3">
            <h3 class={`mb-1 text-${color}`}>{value}</h3>
            <p class="text-muted mb-0 small">{label}</p>
          </div>
        </div>
      </div>
    );

    onMounted(() => {
      fetchAllData();
    });

    return () => {
      const f = form.value;
      const errors = formErrors.value;
      const showErr = (key) => touched.value && errors[key];
      const hasErrors = Object.keys(errors).length > 0;

      return (
        <div class="container-fluid pb-4">
          <div class="d-flex flex-wrap align-items-center gap-3 mb-4">
            <button class="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={goBack}>
              <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
              Back to Tools
            </button>
            <div class="flex-grow-1">
              <h1 class="h2 mb-0 text-primary">Post Notification</h1>
              <p class="text-muted mb-0">Create groups, select users and post immediate or scheduled notifications</p>
            </div>
            <button class="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={fetchAllData} disabled={loading.value}>
              <ArrowPathIcon style={{ width: '1rem', height: '1rem', opacity: loading.value ? 0.4 : 1 }} />
              {loading.value ? 'Refreshing...' : 'Refresh'}
            </button>
            <button class="btn btn-primary d-flex align-items-center gap-2" onClick={() => (showCreateGroupModal.value = true)}>
              <PlusIcon style={{ width: '1rem', height: '1rem' }} />
              Create Group
            </button>
          </div>

          <div class="row g-3 mb-4">
            {statCard(counts.value.sent, 'Sent', 'success')}
            {statCard(counts.value.scheduled, 'Scheduled', 'warning')}
            {statCard(counts.value.failed, 'Failed', 'danger')}
            {statCard(groups.value.length, 'Groups', 'info')}
            {statCard(users.value.length, 'Total Users', 'primary')}
          </div>

          <div class="row g-4 mb-4">
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white">
                  <h5 class="mb-0">Create Post Notification</h5>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label fw-semibold">Send to</label>
                      <div class="btn-group w-100" role="group">
                        {[['group', 'A group'], ['users', 'Selected users']].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            class={`btn ${f.targetType === value ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => (f.targetType = value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div class="col-12">
                      {f.targetType === 'group' ? (
                        <>
                          <select
                            class={`form-select ${showErr('target') ? 'is-invalid' : ''}`}
                            value={f.groupId}
                            onChange={(e) => (f.groupId = e.target.value)}
                          >
                            <option value="">{groups.value.length ? 'Choose a group' : 'No groups yet - create one first'}</option>
                            {groups.value.map((group) => (
                              <option value={group._id} key={group._id}>
                                {group.name} ({group.userIds?.length || 0} users)
                              </option>
                            ))}
                          </select>
                          {showErr('target') && <div class="invalid-feedback d-block">{errors.target}</div>}
                        </>
                      ) : (
                        <>
                          {renderUserPicker({ selected: f.userIds, onChange: (ids) => (f.userIds = ids), search: formSearch })}
                          {showErr('target') && <div class="text-danger small mt-1">{errors.target}</div>}
                        </>
                      )}
                    </div>

                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Notification Name</label>
                      <input
                        class={`form-control ${showErr('name') ? 'is-invalid' : ''}`}
                        maxlength={MAX_NAME}
                        value={f.name}
                        onInput={(e) => (f.name = e.target.value)}
                        placeholder="e.g. Diwali Special Puja"
                      />
                      {showErr('name') && <div class="invalid-feedback">{errors.name}</div>}
                    </div>

                    <div class="col-md-6">
                      <label class="form-label fw-semibold">URL <span class="text-muted fw-normal">(optional)</span></label>
                      <input
                        class={`form-control ${showErr('url') ? 'is-invalid' : ''}`}
                        value={f.url}
                        onInput={(e) => (f.url = e.target.value)}
                        placeholder="https://example.com/page"
                      />
                      {showErr('url') && <div class="invalid-feedback">{errors.url}</div>}
                    </div>

                    <div class="col-12">
                      <div class="d-flex justify-content-between">
                        <label class="form-label fw-semibold">Description</label>
                        <small class="text-muted">{f.description.length}/{MAX_DESCRIPTION}</small>
                      </div>
                      <textarea
                        class={`form-control ${showErr('description') ? 'is-invalid' : ''}`}
                        rows="3"
                        maxlength={MAX_DESCRIPTION}
                        value={f.description}
                        onInput={(e) => (f.description = e.target.value)}
                        placeholder="What do you want to tell your users?"
                      />
                      {showErr('description') && <div class="invalid-feedback">{errors.description}</div>}
                    </div>

                    <div class="col-md-6">
                      <label class="form-label fw-semibold">When</label>
                      <div class="btn-group w-100" role="group">
                        {[['immediate', 'Post now'], ['scheduled', 'Schedule']].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            class={`btn ${f.postType === value ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => (f.postType = value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {f.postType === 'scheduled' && (
                      <div class="col-md-6">
                        <label class="form-label fw-semibold">Date & Time</label>
                        <input
                          type="datetime-local"
                          class={`form-control ${showErr('scheduledFor') ? 'is-invalid' : ''}`}
                          min={minScheduleValue()}
                          value={f.scheduledFor}
                          onInput={(e) => (f.scheduledFor = e.target.value)}
                        />
                        {showErr('scheduledFor') && <div class="invalid-feedback">{errors.scheduledFor}</div>}
                      </div>
                    )}

                    <div class="col-12 d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top">
                      <div class="text-muted">
                        Recipients: <strong class="text-dark">{selectedRecipientsCount.value}</strong>
                      </div>
                      <button
                        class="btn btn-primary d-flex align-items-center gap-2 px-4"
                        onClick={submitCampaign}
                        disabled={submitting.value || (touched.value && hasErrors)}
                      >
                        <PaperAirplaneIcon style={{ width: '1rem', height: '1rem' }} />
                        {submitting.value ? 'Posting...' : f.postType === 'scheduled' ? 'Schedule Notification' : 'Post Notification'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white">
                  <h5 class="mb-0">Preview</h5>
                </div>
                <div class="card-body bg-light">
                  <p class="small text-muted">How it appears on the user's phone</p>
                  <div class="bg-white rounded-3 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                      <BellIcon style={{ width: '1rem', height: '1rem', color: '#0d6efd' }} />
                      <small class="text-muted">Brahmakosh · now</small>
                    </div>
                    <div class="fw-semibold text-break">{f.name.trim() || 'Notification name'}</div>
                    <div class="text-muted small text-break">{f.description.trim() || 'Your description will appear here.'}</div>
                    {f.url.trim() && isHttpUrl(f.url.trim()) && <div class="small text-primary mt-2 text-truncate">{f.url.trim()}</div>}
                  </div>
                  <ul class="small text-muted mt-3 ps-3 mb-0">
                    <li>Users with push enabled get a phone alert.</li>
                    <li>Everyone also sees it in the app's notification list.</li>
                    <li>Scheduled posts go out at the time you pick (your local time).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Notification History</h5>
              <small class="text-muted">Latest {campaigns.value.length}</small>
            </div>
            <div class="card-body p-0">
              {loading.value && campaigns.value.length === 0 ? (
                <div class="text-center py-5 text-muted">Loading...</div>
              ) : campaigns.value.length === 0 ? (
                <div class="text-center py-5">
                  <BellIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                  <h5 class="text-muted mt-3">No notifications posted yet</h5>
                </div>
              ) : (
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Notification</th>
                        <th>Status</th>
                        <th>Recipients</th>
                        <th>Push delivery</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.value.map((item) => {
                        const st = STATUS_STYLE[item.status] || { cls: 'bg-secondary', label: item.status };
                        return (
                          <tr key={item._id}>
                            <td style={{ maxWidth: '360px' }}>
                              <div class="fw-semibold text-truncate">{item.name}</div>
                              <small class="text-muted d-block text-truncate">{item.description}</small>
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" class="small text-truncate d-block">
                                  {item.url}
                                </a>
                              )}
                            </td>
                            <td>
                              <span class={`badge ${st.cls}`}>{st.label}</span>
                              {item.errorMessage && <div class="small text-danger mt-1" style={{ maxWidth: '240px' }}>{item.errorMessage}</div>}
                            </td>
                            <td>
                              {item.totalRecipients || 0}
                              {item.groupId?.name && <div class="small text-muted">{item.groupId.name}</div>}
                            </td>
                            <td class="small">
                              {item.totalTokens
                                ? <span>{item.sentCount || 0} / {item.totalTokens} devices</span>
                                : <span class="text-muted">-</span>}
                            </td>
                            <td class="small text-nowrap">{formatDate(item)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {showCreateGroupModal.value && (
            <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Create Notification Group</h5>
                    <button class="btn-close" onClick={() => (showCreateGroupModal.value = false)}></button>
                  </div>
                  <div class="modal-body">
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Group Name</label>
                      <input
                        type="text"
                        class="form-control"
                        maxlength={MAX_NAME}
                        value={newGroup.value.name}
                        onInput={(e) => (newGroup.value.name = e.target.value)}
                        placeholder="e.g. Premium members"
                      />
                    </div>
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Description <span class="text-muted fw-normal">(optional)</span></label>
                      <textarea
                        class="form-control"
                        rows="2"
                        value={newGroup.value.description}
                        onInput={(e) => (newGroup.value.description = e.target.value)}
                      />
                    </div>
                    <div>
                      <label class="form-label fw-semibold">Members</label>
                      {renderUserPicker({
                        selected: newGroup.value.userIds,
                        onChange: (ids) => (newGroup.value.userIds = ids),
                        search: groupSearch,
                        height: 260
                      })}
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-secondary" onClick={() => (showCreateGroupModal.value = false)}>Cancel</button>
                    <button class="btn btn-primary" onClick={createGroup} disabled={creatingGroup.value}>
                      {creatingGroup.value ? 'Creating...' : `Create Group (${newGroup.value.userIds.length})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };
  }
};

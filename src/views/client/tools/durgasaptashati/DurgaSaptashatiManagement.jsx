import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeftIcon, PlusIcon, EllipsisVerticalIcon, PencilIcon,
  TrashIcon, EyeIcon, CalendarIcon, ArrowRightIcon,
  BookOpenIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';
import api from '../../../../services/api.js';

const COLOR = '#be123c';

export default {
  name: 'DurgaSaptashatiManagement',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showViewModal = ref(false);
    const activeDropdown = ref(null);
    const selectedItem = ref(null);
    const editingItem = ref(null);
    const items = ref([]);

    const createFormState = () => ({
      title: '',
      chapterNumber: 1,
      description: '',
      verseCount: 0,
      image: null,
      status: 'active'
    });

    const form = ref(createFormState());
    const editForm = ref(createFormState());
    const imageFileName = ref('');
    const editImageFileName = ref('');

    const truncateText = (text, n = 100) => !text || text.length <= n ? text : text.substring(0, n) + '...';

    const fetchItems = async () => {
      try {
        loading.value = true;
        const res = await api.get('/durga-saptashati');
        items.value = res.data?.data || res.data || [];
      } catch (e) {
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    const buildFormData = (f) => {
      const fd = new FormData();
      fd.append('title', f.title);
      fd.append('chapterNumber', f.chapterNumber);
      fd.append('description', f.description);
      fd.append('verseCount', f.verseCount);
      fd.append('status', f.status);
      if (f.image) fd.append('image', f.image);
      return fd;
    };

    const validate = (f) => {
      if (!f.title?.trim()) { toast.error('Title is required'); return false; }
      if (!f.description?.trim()) { toast.error('Description is required'); return false; }
      if (!f.verseCount || f.verseCount < 1) { toast.error('Valid verse count is required'); return false; }
      return true;
    };

    const submitCreate = async () => {
      if (!validate(form.value)) return;
      try {
        loading.value = true;
        const res = await api.post('/durga-saptashati', buildFormData(form.value));
        items.value.push(res.data?.data || res.data);
        toast.success('✓ Chapter created successfully!');
        showCreateModal.value = false;
        form.value = createFormState();
        imageFileName.value = '';
      } catch (e) {
        toast.error(e.response?.data?.message || '❌ Failed to create chapter');
      } finally {
        loading.value = false;
      }
    };

    const openEdit = (item) => {
      editingItem.value = item;
      editForm.value = { title: item.title, chapterNumber: item.chapterNumber, description: item.description, verseCount: item.verseCount, status: item.status, image: null };
      editImageFileName.value = item.imageUrl ? 'Current image' : '';
      showEditModal.value = true;
      activeDropdown.value = null;
    };

    const submitUpdate = async () => {
      if (!validate(editForm.value)) return;
      try {
        loading.value = true;
        const res = await api.put(`/durga-saptashati/${editingItem.value._id}`, buildFormData(editForm.value));
        const updated = res.data?.data || res.data;
        if (!editForm.value.image && editingItem.value.imageUrl) updated.imageUrl = editingItem.value.imageUrl;
        const idx = items.value.findIndex(i => i._id === editingItem.value._id);
        if (idx !== -1) items.value[idx] = updated;
        toast.success('✓ Chapter updated successfully!');
        showEditModal.value = false;
      } catch (e) {
        toast.error('❌ Failed to update chapter');
      } finally {
        loading.value = false;
      }
    };

    const deleteItem = async (id) => {
      const item = items.value.find(i => i._id === id);
      if (!item || !confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
      try {
        loading.value = true;
        await api.delete(`/durga-saptashati/${id}`);
        items.value = items.value.filter(i => i._id !== id);
        toast.success('✓ Chapter deleted!');
      } catch (e) {
        toast.error('❌ Failed to delete chapter');
      } finally {
        loading.value = false;
        activeDropdown.value = null;
      }
    };

    const toggleStatus = async (item) => {
      try {
        const res = await api.patch(`/durga-saptashati/${item._id}/toggle-status`);
        const updated = res.data?.data || res.data;
        const idx = items.value.findIndex(i => i._id === item._id);
        if (idx !== -1) items.value[idx] = updated;
        toast.success(`Chapter ${updated.status === 'active' ? 'enabled' : 'disabled'}!`);
      } catch (e) {
        toast.error('❌ Failed to update status');
      }
      activeDropdown.value = null;
    };

    onMounted(fetchItems);

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <style>{`
          .ds-card { transition: all 0.3s ease; border-radius: 16px; }
          .ds-card:not(.disabled):hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important; }
          .ds-icon { transition: all 0.3s ease; }
          .ds-card:not(.disabled):hover .ds-icon { transform: rotate(10deg) scale(1.1); }
          .ds-arrow { transition: all 0.3s ease; }
          .ds-card:not(.disabled):hover .ds-arrow { transform: scale(1.2); background-color: ${COLOR} !important; color: white !important; }
          .ds-hover { opacity: 0; transition: opacity 0.3s ease; }
          .ds-card:not(.disabled):hover .ds-hover { opacity: 1; }
        `}</style>

        <div class="row">
          <div class="col-12">

            {/* Header */}
            <div class="rounded-4 p-4 mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #be123c15, #be123c25)' }}>
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button class="btn btn-light btn-sm rounded-pill px-3"
                  onClick={() => router.push('/client/tools')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span>Back to Tools</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-2 text-dark d-flex align-items-center gap-2">
                    <BookOpenIcon style={{ width: '2rem', height: '2rem', color: COLOR }} />
                    दुर्गा सप्तशती (Durga Saptashati)
                  </h1>
                  <p class="mb-0 text-muted">Manage Durga Saptashati chapters and sacred verses of Maa Durga</p>
                </div>
                <button class="btn btn-lg rounded-pill px-4 shadow-sm text-white"
                  style={{ backgroundColor: COLOR, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                  onClick={() => showCreateModal.value = true}
                  disabled={loading.value}>
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Add New Chapter</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            {loading.value ? (
              <div class="text-center py-5">
                <div class="spinner-border mb-3" style={{ width: '3rem', height: '3rem', color: COLOR }} role="status" />
                <p class="text-muted">Loading chapters...</p>
              </div>
            ) : items.value.length > 0 ? (
              <div class="row g-4">
                {items.value.map(item => (
                  <div key={item._id} class="col-xl-4 col-lg-6 col-md-6">
                    <div
                      class={`ds-card card h-100 border-0 shadow-sm position-relative overflow-hidden ${item.status === 'inactive' ? 'disabled opacity-50' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${COLOR}08 0%, ${COLOR}15 30%, #f8fafc 100%)`, cursor: item.status === 'active' ? 'pointer' : 'default' }}
                      onClick={() => item.status === 'active' && router.push(`/client/tools/durga-saptashati/${item._id}/verses?title=${encodeURIComponent(item.title)}&chapterNumber=${item.chapterNumber}`)}
                    >
                      {item.status === 'inactive' && (
                        <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                          style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                          <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                        </div>
                      )}

                      {/* Dropdown */}
                      <div class="position-absolute top-0 end-0 m-3" style={{ zIndex: 2 }}>
                        <button class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                          onClick={e => { e.stopPropagation(); activeDropdown.value = activeDropdown.value === item._id ? null : item._id; }}
                          style={{ width: '32px', height: '32px' }}>
                          <EllipsisVerticalIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                        </button>
                        {activeDropdown.value === item._id && (
                          <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3"
                            style={{ minWidth: '160px', right: '0', top: '100%', zIndex: 1000 }}>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
                              onClick={e => { e.stopPropagation(); selectedItem.value = item; showViewModal.value = true; activeDropdown.value = null; }}>
                              <EyeIcon style={{ width: '1rem', height: '1rem', color: '#0d6efd' }} /> View Details
                            </button>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
                              onClick={e => { e.stopPropagation(); openEdit(item); }}>
                              <PencilIcon style={{ width: '1rem', height: '1rem', color: COLOR }} /> Edit Chapter
                            </button>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
                              onClick={e => { e.stopPropagation(); toggleStatus(item); }}>
                              {item.status === 'active'
                                ? <><XCircleIcon style={{ width: '1rem', height: '1rem', color: '#dc3545' }} /> Disable</>
                                : <><CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#198754' }} /> Enable</>}
                            </button>
                            <hr class="dropdown-divider my-1" />
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger"
                              onClick={e => { e.stopPropagation(); deleteItem(item._id); }}>
                              <TrashIcon style={{ width: '1rem', height: '1rem' }} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div class="card-body p-4">
                        <div class="mb-4">
                          <div class="ds-icon d-inline-flex align-items-center justify-content-center rounded-3 overflow-hidden"
                            style={{ width: '100px', height: '100px', backgroundColor: `${COLOR}15`, border: `2px solid ${COLOR}25` }}>
                            {item.imageUrl
                              ? <img src={item.imageUrl} alt={item.title} style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                              : <BookOpenIcon style={{ color: COLOR, width: '2rem', height: '2rem' }} />}
                          </div>
                        </div>

                        <div class="mb-4">
                          <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge text-white fw-bold" style={{ fontSize: '0.8rem', backgroundColor: COLOR }}>
                              Chapter {item.chapterNumber}
                            </span>
                            <span class={`badge ${item.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                              {item.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h5 class="card-title fw-bold mb-2 text-dark">{item.title}</h5>
                          <p class="card-text text-muted lh-base" style={{ fontSize: '0.95rem' }}>
                            {truncateText(item.description, 100)}
                          </p>
                        </div>

                        <div class="mb-4 d-flex align-items-center justify-content-between">
                          <span class="badge text-white px-3 py-2 rounded-pill" style={{ backgroundColor: COLOR }}>
                            {item.verseCount} Verses
                          </span>
                          <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                            <CalendarIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between">
                          <span class="text-muted" style={{ fontSize: '0.85rem' }}>Click to access</span>
                          <div class="ds-arrow d-flex align-items-center justify-content-center rounded-circle"
                            style={{ width: '40px', height: '40px', backgroundColor: `${COLOR}10`, color: COLOR }}>
                            <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                          </div>
                        </div>
                      </div>

                      {item.status === 'active' && (
                        <div class="ds-hover position-absolute top-0 start-0 w-100 h-100"
                          style={{ background: `linear-gradient(135deg, ${COLOR}15 0%, ${COLOR}25 100%)`, pointerEvents: 'none', borderRadius: '16px' }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div class="text-center py-5">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                  style={{ width: '80px', height: '80px' }}>
                  <BookOpenIcon style={{ width: '2rem', height: '2rem', color: '#6c757d' }} />
                </div>
                <h4 class="fw-bold mb-2">No Chapters Yet</h4>
                <p class="text-muted mb-4">Add the first Durga Saptashati chapter to get started</p>
                <button class="btn rounded-pill px-4 text-white" style={{ backgroundColor: COLOR }}
                  onClick={() => showCreateModal.value = true}>Add First Chapter</button>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header py-2">
                  <h6 class="modal-title fw-bold mb-0">Add New Chapter</h6>
                  <button class="btn-close" onClick={() => { showCreateModal.value = false; form.value = createFormState(); imageFileName.value = ''; }} />
                </div>
                <div class="modal-body py-2 px-3">
                  <div class="row g-2">
                    <div class="col-8">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Title *</label>
                      <input type="text" class="form-control form-control-sm rounded-3"
                        placeholder="e.g., Pratham Charitra"
                        value={form.value.title} onInput={e => form.value.title = e.target.value} />
                    </div>
                    <div class="col-4">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Chapter No. *</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1"
                        value={form.value.chapterNumber} onInput={e => form.value.chapterNumber = e.target.value} />
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Description *</label>
                      <textarea class="form-control form-control-sm rounded-3" rows="2"
                        placeholder="Describe this chapter..."
                        value={form.value.description} onInput={e => form.value.description = e.target.value} />
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Verse Count *</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1"
                        placeholder="e.g., 87"
                        value={form.value.verseCount} onInput={e => form.value.verseCount = e.target.value} />
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Status</label>
                      <select class="form-select form-select-sm rounded-3" value={form.value.status}
                        onChange={e => form.value.status = e.target.value}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Image</label>
                      <input type="file" class="form-control form-control-sm rounded-3" accept="image/*"
                        onChange={e => { form.value.image = e.target.files[0]; imageFileName.value = e.target.files[0]?.name || ''; }} />
                      {imageFileName.value && <small class="text-success">✓ {imageFileName.value}</small>}
                    </div>
                  </div>
                </div>
                <div class="modal-footer py-2">
                  <button class="btn btn-secondary btn-sm"
                    onClick={() => { showCreateModal.value = false; form.value = createFormState(); imageFileName.value = ''; }}>Cancel</button>
                  <button class="btn btn-sm text-white" style={{ backgroundColor: COLOR }}
                    onClick={submitCreate} disabled={loading.value}>
                    {loading.value ? <><span class="spinner-border spinner-border-sm me-1" />Creating...</> : 'Create Chapter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => showEditModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header py-2">
                  <h6 class="modal-title fw-bold mb-0">Edit Chapter</h6>
                  <button class="btn-close" onClick={() => showEditModal.value = false} />
                </div>
                <div class="modal-body py-2 px-3">
                  <div class="row g-2">
                    <div class="col-8">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Title *</label>
                      <input type="text" class="form-control form-control-sm rounded-3"
                        value={editForm.value.title} onInput={e => editForm.value.title = e.target.value} />
                    </div>
                    <div class="col-4">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Chapter No.</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1"
                        value={editForm.value.chapterNumber} onInput={e => editForm.value.chapterNumber = e.target.value} />
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Description *</label>
                      <textarea class="form-control form-control-sm rounded-3" rows="2"
                        value={editForm.value.description} onInput={e => editForm.value.description = e.target.value} />
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Verse Count *</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1"
                        value={editForm.value.verseCount} onInput={e => editForm.value.verseCount = e.target.value} />
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Status</label>
                      <select class="form-select form-select-sm rounded-3" value={editForm.value.status}
                        onChange={e => editForm.value.status = e.target.value}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Image</label>
                      <input type="file" class="form-control form-control-sm rounded-3" accept="image/*"
                        onChange={e => { editForm.value.image = e.target.files[0]; editImageFileName.value = e.target.files[0]?.name || ''; }} />
                      {editImageFileName.value && <small class="text-success">✓ {editImageFileName.value}</small>}
                    </div>
                  </div>
                </div>
                <div class="modal-footer py-2">
                  <button class="btn btn-secondary btn-sm" onClick={() => showEditModal.value = false}>Cancel</button>
                  <button class="btn btn-sm text-white" style={{ backgroundColor: COLOR }}
                    onClick={submitUpdate} disabled={loading.value}>
                    {loading.value ? 'Updating...' : 'Update Chapter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedItem.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => showViewModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header text-white border-0"
                  style={{ backgroundColor: COLOR, borderRadius: '16px 16px 0 0' }}>
                  <h5 class="mb-0 fw-bold">Chapter Preview</h5>
                  <button class="btn-close btn-close-white" onClick={() => showViewModal.value = false} />
                </div>
                <div class="modal-body p-4">
                  {selectedItem.value.imageUrl && (
                    <div class="text-center mb-4">
                      <img src={selectedItem.value.imageUrl} alt={selectedItem.value.title}
                        class="rounded-circle border border-3 border-white shadow-lg"
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                    </div>
                  )}
                  <h4 class="mb-2 text-center fw-bold">Chapter {selectedItem.value.chapterNumber}: {selectedItem.value.title}</h4>
                  <p class="text-muted text-center mb-3">{selectedItem.value.description}</p>
                  <div class="p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div class="mb-2">
                      <small class="text-muted fw-semibold">Total Verses</small>
                      <p class="mb-0 fw-bold" style={{ color: COLOR }}>{selectedItem.value.verseCount}</p>
                    </div>
                    <div>
                      <small class="text-muted fw-semibold">Status</small>
                      <p class="mb-0">
                        <span class={`badge ${selectedItem.value.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {selectedItem.value.status === 'active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <small class="text-muted d-flex align-items-center gap-1 mt-3">
                    <CalendarIcon style={{ width: '14px', height: '14px' }} />
                    {selectedItem.value.createdAt ? new Date(selectedItem.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};

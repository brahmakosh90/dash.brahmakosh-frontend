import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeftIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';
import apiClient from '../../../../services/api.js';

export default {
  name: 'ShivPuranManagement',
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
      partNumber: 1,
      description: '',
      verseCount: 0,
      image: null,
      status: 'active'
    });

    const form = ref(createFormState());
    const editForm = ref(createFormState());
    const imageFileName = ref('');
    const editImageFileName = ref('');
    const expandedDescriptions = ref(new Set());

    const toggleDescription = (id) => {
      const expanded = expandedDescriptions.value;
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      expandedDescriptions.value = new Set(expanded);
    };

    const truncateText = (text, maxLength = 100) => {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    const goBack = () => router.push('/client/tools');

    const validateForm = (f) => {
      if (!f.title?.trim()) { toast.error('Title is required'); return false; }
      if (!f.description?.trim()) { toast.error('Description is required'); return false; }
      if (!f.verseCount || f.verseCount < 1) { toast.error('Valid verse count is required'); return false; }
      return true;
    };

    const handleImageUpload = (event, isEdit = false) => {
      const file = event.target.files[0];
      if (file) {
        if (isEdit) { editForm.value.image = file; editImageFileName.value = file.name; }
        else { form.value.image = file; imageFileName.value = file.name; }
      }
    };

    const fetchItems = async () => {
      try {
        loading.value = true;
        const res = await apiClient.get('/shiv-puran');
        items.value = res.data?.data || res.data || [];
      } catch (error) {
        console.error('Fetch error:', error);
        items.value = [];
      } finally {
        loading.value = false;
      }
    };

    const submitCreate = async () => {
      if (!validateForm(form.value)) return;
      try {
        loading.value = true;
        const formData = new FormData();
        formData.append('title', form.value.title);
        formData.append('partNumber', form.value.partNumber);
        formData.append('description', form.value.description);
        formData.append('verseCount', form.value.verseCount);
        formData.append('status', form.value.status);
        if (form.value.image) formData.append('image', form.value.image);

        const res = await apiClient.post('/shiv-puran', formData);
        items.value.push(res.data?.data || res.data);
        toast.success('✓ Part created successfully!');
        showCreateModal.value = false;
        form.value = createFormState();
        imageFileName.value = '';
      } catch (error) {
        console.error('Create error:', error);
        toast.error('❌ Failed to create part. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const openEdit = (item) => {
      editingItem.value = item;
      editForm.value = { title: item.title, partNumber: item.partNumber, description: item.description, verseCount: item.verseCount, status: item.status, image: null };
      editImageFileName.value = item.imageUrl ? 'Current image' : '';
      showEditModal.value = true;
      activeDropdown.value = null;
    };

    const submitUpdate = async () => {
      if (!validateForm(editForm.value)) return;
      try {
        loading.value = true;
        const formData = new FormData();
        formData.append('title', editForm.value.title);
        formData.append('partNumber', editForm.value.partNumber);
        formData.append('description', editForm.value.description);
        formData.append('verseCount', editForm.value.verseCount);
        formData.append('status', editForm.value.status);
        if (editForm.value.image) formData.append('image', editForm.value.image);

        const res = await apiClient.put(`/shiv-puran/${editingItem.value._id}`, formData);
        const updated = res.data?.data || res.data;
        if (!editForm.value.image && editingItem.value.imageUrl) updated.imageUrl = editingItem.value.imageUrl;
        const idx = items.value.findIndex(i => i._id === editingItem.value._id);
        if (idx !== -1) items.value[idx] = updated;
        toast.success('✓ Part updated successfully!');
        showEditModal.value = false;
      } catch (error) {
        console.error('Update error:', error);
        toast.error('❌ Failed to update part.');
      } finally {
        loading.value = false;
      }
    };

    const deleteItem = async (id) => {
      const item = items.value.find(i => i._id === id);
      if (!item || !confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
      try {
        loading.value = true;
        await apiClient.delete(`/shiv-puran/${id}`);
        items.value = items.value.filter(i => i._id !== id);
        toast.success('✓ Part deleted successfully!');
      } catch (error) {
        toast.error('❌ Failed to delete part.');
      } finally {
        loading.value = false;
        activeDropdown.value = null;
      }
    };

    const toggleStatus = async (item) => {
      try {
        const res = await apiClient.patch(`/shiv-puran/${item._id}/toggle-status`);
        const updated = res.data?.data || res.data;
        const idx = items.value.findIndex(i => i._id === item._id);
        if (idx !== -1) items.value[idx] = updated;
        toast.success(`Part ${updated.status === 'active' ? 'enabled' : 'disabled'} successfully!`);
      } catch (error) {
        toast.error('❌ Failed to update status.');
      }
      activeDropdown.value = null;
    };

    onMounted(fetchItems);

    const COLOR = '#1e40af';

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <style>{`
          .sp-card { transition: all 0.3s ease; border-radius: 16px; }
          .sp-card:not(.disabled):hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important; }
          .sp-icon { transition: all 0.3s ease; }
          .sp-card:not(.disabled):hover .sp-icon { transform: rotate(10deg) scale(1.1); }
          .sp-arrow { transition: all 0.3s ease; }
          .sp-card:not(.disabled):hover .sp-arrow { transform: scale(1.2); background-color: #1e40af !important; color: white !important; }
          .sp-hover { opacity: 0; transition: opacity 0.3s ease; }
          .sp-card:not(.disabled):hover .sp-hover { opacity: 1; }
        `}</style>

        <div class="row">
          <div class="col-12">
            {/* Header */}
            <div class="rounded-4 p-4 mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e40af15, #1e40af25)' }}>
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button class="btn btn-light btn-sm rounded-pill px-3" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span>Back to Tools</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-2 text-dark d-flex align-items-center gap-2">
                    <BookOpenIcon style={{ width: '2rem', height: '2rem', color: COLOR }} />
                    शिव पुराण (Shiv Puran)
                  </h1>
                  <p class="mb-0 text-muted">Manage sacred Shiv Puran parts and verses</p>
                </div>
                <button
                  class="btn btn-primary btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => showCreateModal.value = true}
                  disabled={loading.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Add New Part</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {/* Grid */}
            {loading.value ? (
              <div class="text-center py-5">
                <div class="spinner-border mb-3" style={{ width: '3rem', height: '3rem', color: COLOR }} role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">Loading Shiv Puran parts...</p>
              </div>
            ) : items.value.length > 0 ? (
              <div class="row g-4">
                {items.value.map(item => (
                  <div key={item._id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                    <div
                      class={`sp-card card h-100 border-0 shadow-sm position-relative overflow-hidden ${item.status === 'inactive' ? 'disabled opacity-50' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${COLOR}08 0%, ${COLOR}15 30%, #f8fafc 100%)`, cursor: item.status === 'active' ? 'pointer' : 'default' }}
                      onClick={() => item.status === 'active' && router.push(`/client/tools/shiv-puran/${item._id}/verses?title=${encodeURIComponent(item.title)}&partNumber=${item.partNumber}`)}
                    >
                      {item.status === 'inactive' && (
                        <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                          <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                        </div>
                      )}

                      {/* Dropdown */}
                      <div class="position-absolute top-0 end-0 m-3" style={{ zIndex: 2, pointerEvents: 'auto' }}>
                        <div class="dropdown position-relative">
                          <button
                            class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            onClick={(e) => { e.stopPropagation(); activeDropdown.value = activeDropdown.value === item._id ? null : item._id; }}
                            style={{ width: '32px', height: '32px' }}
                          >
                            <EllipsisVerticalIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                          </button>
                          {activeDropdown.value === item._id && (
                            <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ minWidth: '160px', right: '0', top: '100%', zIndex: 1000 }}>
                              <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3" onClick={(e) => { e.stopPropagation(); selectedItem.value = item; showViewModal.value = true; activeDropdown.value = null; }}>
                                <EyeIcon style={{ width: '1rem', height: '1rem', color: '#0d6efd' }} /> View Details
                              </button>
                              <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                                <PencilIcon style={{ width: '1rem', height: '1rem', color: COLOR }} /> Edit Part
                              </button>
                              <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3" onClick={(e) => { e.stopPropagation(); toggleStatus(item); }}>
                                {item.status === 'active'
                                  ? <><XCircleIcon style={{ width: '1rem', height: '1rem', color: '#dc3545' }} /> Disable</>
                                  : <><CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#198754' }} /> Enable</>
                                }
                              </button>
                              <hr class="dropdown-divider my-1" />
                              <button class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger" onClick={(e) => { e.stopPropagation(); deleteItem(item._id); }}>
                                <TrashIcon style={{ width: '1rem', height: '1rem' }} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div class="card-body p-4">
                        <div class="mb-4">
                          <div class="sp-icon d-inline-flex align-items-center justify-content-center rounded-3 overflow-hidden" style={{ width: '100px', height: '100px', backgroundColor: `${COLOR}15`, border: `2px solid ${COLOR}25` }}>
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} class="rounded-3" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                            ) : (
                              <BookOpenIcon style={{ color: COLOR, width: '2rem', height: '2rem' }} />
                            )}
                          </div>
                        </div>

                        <div class="mb-4">
                          <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge text-white fw-bold" style={{ fontSize: '0.8rem', backgroundColor: COLOR }}>Part {item.partNumber || 'N/A'}</span>
                            <span class={`badge px-2 py-1 rounded-pill ${item.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{item.status === 'active' ? 'Active' : 'Inactive'}</span>
                          </div>
                          <h5 class="card-title fw-bold mb-2 text-dark">{item.title}</h5>
                          <div class="card-text text-muted lh-base" style={{ fontSize: '0.95rem' }}>
                            {expandedDescriptions.value.has(item._id) ? (
                              <>
                                <p class="mb-1">{item.description}</p>
                                <button class="btn btn-link p-0 text-primary" style={{ fontSize: '0.85rem', textDecoration: 'none' }} onClick={(e) => { e.stopPropagation(); toggleDescription(item._id); }}>See less</button>
                              </>
                            ) : (
                              <>
                                <p class="mb-1">{truncateText(item.description, 100)}</p>
                                {item.description?.length > 100 && (
                                  <button class="btn btn-link p-0 text-primary" style={{ fontSize: '0.85rem', textDecoration: 'none' }} onClick={(e) => { e.stopPropagation(); toggleDescription(item._id); }}>See more</button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div class="mb-4 d-flex align-items-center justify-content-between">
                          <span class="badge text-white px-3 py-2 rounded-pill" style={{ backgroundColor: COLOR }}>{item.verseCount} Verses</span>
                          <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                            <CalendarIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                            <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                          </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between">
                          <span class="text-muted" style={{ fontSize: '0.85rem' }}>Click to access</span>
                          <div class="sp-arrow d-flex align-items-center justify-content-center rounded-circle" style={{ width: '40px', height: '40px', backgroundColor: `${COLOR}10`, color: COLOR }}>
                            <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                          </div>
                        </div>
                      </div>

                      {item.status === 'active' && (
                        <div class="sp-hover position-absolute top-0 start-0 w-100 h-100" style={{ background: `linear-gradient(135deg, ${COLOR}15 0%, ${COLOR}25 100%)`, pointerEvents: 'none', borderRadius: '16px' }}></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div class="text-center py-5">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                  <BookOpenIcon style={{ width: '2rem', height: '2rem', color: '#6c757d' }} />
                </div>
                <h4 class="fw-bold mb-2">No Parts Yet</h4>
                <p class="text-muted mb-4">Add the first Shiv Puran part to get started</p>
                <button class="btn btn-primary rounded-pill px-4" onClick={() => showCreateModal.value = true}>Add First Part</button>
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
                  <h6 class="modal-title fw-bold mb-0">Add New Shiv Puran Part</h6>
                  <button class="btn-close" onClick={() => { showCreateModal.value = false; form.value = createFormState(); imageFileName.value = ''; }}></button>
                </div>
                <div class="modal-body py-2 px-3">
                  <div class="row g-2">
                    <div class="col-8">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Title *</label>
                      <input type="text" class="form-control form-control-sm rounded-3" placeholder="e.g., Vidyeshwar Samhita" v-model={form.value.title} />
                    </div>
                    <div class="col-4">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Part No. *</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1" v-model={form.value.partNumber} />
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Description *</label>
                      <textarea class="form-control form-control-sm rounded-3" rows="2" placeholder="Describe this part..." v-model={form.value.description}></textarea>
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Verse Count *</label>
                      <input type="number" class="form-control form-control-sm rounded-3" min="1" placeholder="e.g., 100" v-model={form.value.verseCount} />
                    </div>
                    <div class="col-6">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Status</label>
                      <select class="form-select form-select-sm rounded-3" v-model={form.value.status}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Image</label>
                      <input type="file" class="form-control form-control-sm rounded-3" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                      {imageFileName.value && <small class="text-success">✓ {imageFileName.value}</small>}
                    </div>
                  </div>
                </div>
                <div class="modal-footer py-2">
                  <button class="btn btn-secondary btn-sm" onClick={() => { showCreateModal.value = false; form.value = createFormState(); imageFileName.value = ''; }}>Cancel</button>
                  <button class="btn btn-primary btn-sm" onClick={submitCreate} disabled={loading.value}>
                    {loading.value ? <><span class="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Part'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showEditModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header">
                  <h5 class="modal-title fw-bold">Edit Shiv Puran Part</h5>
                  <button class="btn-close" onClick={() => showEditModal.value = false}></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Title</label>
                    <input type="text" class="form-control rounded-3" v-model={editForm.value.title} />
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Part Number</label>
                    <input type="number" class="form-control rounded-3" min="1" v-model={editForm.value.partNumber} />
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Description</label>
                    <textarea class="form-control rounded-3" rows="3" v-model={editForm.value.description}></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Verse Count</label>
                    <input type="number" class="form-control rounded-3" min="1" v-model={editForm.value.verseCount} />
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Image</label>
                    <input type="file" class="form-control rounded-3" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                    {editImageFileName.value && <small class="text-success mt-1 d-block">✓ {editImageFileName.value}</small>}
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Status</label>
                    <select class="form-select rounded-3" v-model={editForm.value.status}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" onClick={() => showEditModal.value = false} disabled={loading.value}>Cancel</button>
                  <button class="btn btn-primary" onClick={submitUpdate} disabled={loading.value}>
                    {loading.value ? 'Updating...' : 'Update Part'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedItem.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showViewModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header text-white border-0" style={{ backgroundColor: COLOR, borderRadius: '16px 16px 0 0' }}>
                  <h5 class="mb-0 fw-bold d-flex align-items-center">
                    <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" /> Part Preview
                  </h5>
                  <button class="btn-close btn-close-white" onClick={() => showViewModal.value = false}></button>
                </div>
                <div class="modal-body p-4">
                  {selectedItem.value.imageUrl && (
                    <div class="text-center mb-4">
                      <img src={selectedItem.value.imageUrl} alt={selectedItem.value.title} class="rounded-circle border border-3 border-white shadow-lg" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                    </div>
                  )}
                  <h4 class="mb-2 text-center fw-bold text-dark">Part {selectedItem.value.partNumber}: {selectedItem.value.title}</h4>
                  <p class="text-muted text-center mb-3">{selectedItem.value.description}</p>
                  <div class="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    <div class="mb-3">
                      <label class="form-label fw-bold text-muted">Total Verses</label>
                      <p class="mb-0 fw-bold" style={{ color: COLOR }}>{selectedItem.value.verseCount}</p>
                    </div>
                    <div>
                      <label class="form-label fw-bold text-muted">Status</label>
                      <p class="mb-0">
                        <span class={`badge px-3 py-2 rounded-pill ${selectedItem.value.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {selectedItem.value.status === 'active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <small class="text-muted d-flex align-items-center gap-1">
                    <CalendarIcon style={{ width: '14px', height: '14px' }} />
                    Created on {selectedItem.value.createdAt ? new Date(selectedItem.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date'}
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

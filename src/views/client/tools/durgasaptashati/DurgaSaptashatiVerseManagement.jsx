import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeftIcon, PlusIcon, EllipsisVerticalIcon, PencilIcon,
  TrashIcon, EyeIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon,
  MagnifyingGlassIcon, MusicalNoteIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';
import api from '../../../../services/api.js';

const COLOR = '#be123c';

export default {
  name: 'DurgaSaptashatiVerseManagement',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToast();

    const chapterId = route.params.chapterId;
    const chapterTitle = route.query.title || 'Durga Saptashati';
    const chapterNumber = route.query.chapterNumber || '';

    const loading = ref(false);
    const verses = ref([]);
    const searchTerm = ref('');
    const activeDropdown = ref(null);
    const showCreateModal = ref(false);
    const showEditModal = ref(false);
    const showViewModal = ref(false);
    const selectedVerse = ref(null);
    const editingVerse = ref(null);
    const createAudioFile = ref(null);
    const editAudioFile = ref(null);

    const createForm = () => ({
      verseNumber: '',
      sanskrit: '',
      transliteration: '',
      hindi: '',
      english: '',
      explanation: '',
      status: 'active'
    });

    const form = ref(createForm());
    const editForm = ref(createForm());

    const filteredVerses = () => {
      if (!searchTerm.value) return verses.value;
      const q = searchTerm.value.toLowerCase();
      return verses.value.filter(v =>
        v.verseNumber?.toString().includes(q) ||
        v.sanskrit?.toLowerCase().includes(q) ||
        v.hindi?.toLowerCase().includes(q) ||
        v.english?.toLowerCase().includes(q)
      );
    };

    const buildFormData = (data, audioFile) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
      if (audioFile) fd.append('audio', audioFile);
      return fd;
    };

    const fetchVerses = async () => {
      try {
        loading.value = true;
        const res = await api.get(`/durga-saptashati/${chapterId}/verses`);
        verses.value = res.data?.data || res.data || [];
      } catch (e) {
        verses.value = [];
      } finally {
        loading.value = false;
      }
    };

    const submitCreate = async () => {
      if (!form.value.verseNumber) { toast.error('Verse number is required'); return; }
      if (!form.value.sanskrit?.trim()) { toast.error('Sanskrit text is required'); return; }
      try {
        loading.value = true;
        const res = await api.post(`/durga-saptashati/${chapterId}/verses`, buildFormData(form.value, createAudioFile.value));
        verses.value.push(res.data?.data || res.data);
        toast.success('✓ Verse created successfully!');
        showCreateModal.value = false;
        form.value = createForm();
        createAudioFile.value = null;
      } catch (e) {
        toast.error(e.response?.data?.message || '❌ Failed to create verse');
      } finally {
        loading.value = false;
      }
    };

    const openEdit = (verse) => {
      editingVerse.value = verse;
      editForm.value = { ...verse };
      editAudioFile.value = null;
      showEditModal.value = true;
      activeDropdown.value = null;
    };

    const submitUpdate = async () => {
      try {
        loading.value = true;
        const res = await api.put(`/durga-saptashati/${chapterId}/verses/${editingVerse.value._id}`, buildFormData(editForm.value, editAudioFile.value));
        const updated = res.data?.data || res.data;
        const idx = verses.value.findIndex(v => v._id === editingVerse.value._id);
        if (idx !== -1) verses.value[idx] = updated;
        toast.success('✓ Verse updated successfully!');
        showEditModal.value = false;
      } catch (e) {
        toast.error('❌ Failed to update verse');
      } finally {
        loading.value = false;
      }
    };

    const deleteVerse = async (id) => {
      const verse = verses.value.find(v => v._id === id);
      if (!verse || !confirm(`Delete Verse ${verse.verseNumber}? This cannot be undone.`)) return;
      try {
        loading.value = true;
        await api.delete(`/durga-saptashati/${chapterId}/verses/${id}`);
        verses.value = verses.value.filter(v => v._id !== id);
        toast.success('✓ Verse deleted!');
      } catch (e) {
        toast.error('❌ Failed to delete verse');
      } finally {
        loading.value = false;
        activeDropdown.value = null;
      }
    };

    const toggleStatus = async (verse) => {
      try {
        const res = await api.patch(`/durga-saptashati/${chapterId}/verses/${verse._id}/toggle-status`);
        const updated = res.data?.data || res.data;
        const idx = verses.value.findIndex(v => v._id === verse._id);
        if (idx !== -1) verses.value[idx] = updated;
        toast.success(`Verse ${updated.status === 'active' ? 'enabled' : 'disabled'}!`);
      } catch (e) {
        toast.error('❌ Failed to update status');
      }
      activeDropdown.value = null;
    };

    const truncate = (text, n = 100) => !text || text.length <= n ? text : text.substring(0, n) + '...';

    onMounted(fetchVerses);

    const AudioField = ({ currentUrl, onFileChange }) => (
      <div class="col-12">
        <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>
          <MusicalNoteIcon style={{ width: '0.9rem', height: '0.9rem', marginRight: '4px' }} />
          Audio File (Optional)
        </label>
        {currentUrl && (
          <div class="mb-2">
            <audio controls class="w-100" style={{ height: '36px' }}>
              <source src={currentUrl} />
            </audio>
            <small class="text-muted">Current audio — upload new to replace</small>
          </div>
        )}
        <input type="file" class="form-control form-control-sm rounded-3" accept="audio/*"
          onChange={e => onFileChange(e.target.files[0] || null)} />
      </div>
    );

    const VerseForm = ({ f, onUpdate, onAudioChange }) => (
      <div class="row g-2">
        <div class="col-4">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Verse No. *</label>
          <input type="number" class="form-control form-control-sm rounded-3" min="1"
            value={f.verseNumber} onInput={e => onUpdate('verseNumber', e.target.value)} />
        </div>
        <div class="col-8">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Status</label>
          <select class="form-select form-select-sm rounded-3" value={f.status}
            onChange={e => onUpdate('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Sanskrit (Devanagari) *</label>
          <textarea class="form-control form-control-sm rounded-3" rows="3"
            style={{ fontFamily: 'serif', fontSize: '1rem' }}
            placeholder="संस्कृत श्लोक यहाँ लिखें..."
            value={f.sanskrit} onInput={e => onUpdate('sanskrit', e.target.value)} />
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Transliteration</label>
          <input type="text" class="form-control form-control-sm rounded-3"
            placeholder="e.g., Ya Devi Sarva Bhuteshu..."
            value={f.transliteration} onInput={e => onUpdate('transliteration', e.target.value)} />
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Hindi Meaning</label>
          <textarea class="form-control form-control-sm rounded-3" rows="2"
            placeholder="हिंदी अर्थ..."
            value={f.hindi} onInput={e => onUpdate('hindi', e.target.value)} />
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>English Meaning</label>
          <textarea class="form-control form-control-sm rounded-3" rows="2"
            placeholder="English meaning..."
            value={f.english} onInput={e => onUpdate('english', e.target.value)} />
        </div>
        <div class="col-12">
          <label class="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>Explanation (Optional)</label>
          <textarea class="form-control form-control-sm rounded-3" rows="2"
            placeholder="Detailed explanation..."
            value={f.explanation} onInput={e => onUpdate('explanation', e.target.value)} />
        </div>
        <AudioField currentUrl={f.audioUrl || null} onFileChange={onAudioChange} />
      </div>
    );

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <style>{`
          .dsv-card { transition: all 0.2s ease; border-radius: 12px; }
          .dsv-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(190,18,60,0.12) !important; }
        `}</style>

        <div class="row">
          <div class="col-12">

            {/* Header */}
            <div class="rounded-4 p-4 mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #be123c15, #be123c25)' }}>
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button class="btn btn-light btn-sm rounded-pill px-3"
                  onClick={() => router.push('/client/tools/durga-saptashati')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span>Back to Chapters</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-4 text-dark d-flex align-items-center gap-2">
                    <BookOpenIcon style={{ width: '1.5rem', height: '1.5rem', color: COLOR }} />
                    Chapter {chapterNumber}: {chapterTitle}
                  </h1>
                  <p class="mb-0 text-muted" style={{ fontSize: '0.85rem' }}>Manage verses of this chapter</p>
                </div>
                <button class="btn rounded-pill px-4 shadow-sm text-white"
                  style={{ backgroundColor: COLOR, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                  onClick={() => showCreateModal.value = true}
                  disabled={loading.value}>
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Add Verse</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {/* Stats + Search */}
            <div class="row g-2 mb-3">
              <div class="col-6 col-md-3">
                <div class="card border-0 shadow-sm text-center p-2">
                  <div class="fw-bold fs-5" style={{ color: COLOR }}>{verses.value.length}</div>
                  <small class="text-muted">Total Verses</small>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="card border-0 shadow-sm text-center p-2">
                  <div class="fw-bold fs-5 text-success">{verses.value.filter(v => v.status === 'active').length}</div>
                  <small class="text-muted">Active</small>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0">
                    <MagnifyingGlassIcon style={{ width: '1rem', height: '1rem', color: '#6c757d' }} />
                  </span>
                  <input type="text" class="form-control border-start-0 ps-0"
                    placeholder="Search verses..."
                    value={searchTerm.value}
                    onInput={e => searchTerm.value = e.target.value} />
                </div>
              </div>
            </div>

            {/* Verses Grid */}
            {loading.value ? (
              <div class="text-center py-5">
                <div class="spinner-border mb-3" style={{ width: '3rem', height: '3rem', color: COLOR }} role="status" />
                <p class="text-muted">Loading verses...</p>
              </div>
            ) : filteredVerses().length > 0 ? (
              <div class="row g-3">
                {filteredVerses().map(verse => (
                  <div key={verse._id} class="col-md-6">
                    <div class="dsv-card card border-0 shadow-sm position-relative"
                      style={{
                        borderLeft: `4px solid ${COLOR}`,
                        background: verse.status === 'inactive' ? '#f8f9fa' : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
                        opacity: verse.status === 'inactive' ? 0.7 : 1
                      }}>

                      {/* Dropdown */}
                      <div class="position-absolute top-0 end-0 m-2" style={{ zIndex: 2 }}>
                        <button class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                          onClick={e => { e.stopPropagation(); activeDropdown.value = activeDropdown.value === verse._id ? null : verse._id; }}
                          style={{ width: '30px', height: '30px' }}>
                          <EllipsisVerticalIcon style={{ width: '1rem', height: '1rem' }} />
                        </button>
                        {activeDropdown.value === verse._id && (
                          <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3"
                            style={{ minWidth: '150px', right: '0', top: '100%', zIndex: 1000 }}>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2"
                              onClick={e => { e.stopPropagation(); selectedVerse.value = verse; showViewModal.value = true; activeDropdown.value = null; }}>
                              <EyeIcon style={{ width: '1rem', height: '1rem', color: '#0d6efd' }} /> View
                            </button>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2"
                              onClick={e => { e.stopPropagation(); openEdit(verse); }}>
                              <PencilIcon style={{ width: '1rem', height: '1rem', color: COLOR }} /> Edit
                            </button>
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2"
                              onClick={e => { e.stopPropagation(); toggleStatus(verse); }}>
                              {verse.status === 'active'
                                ? <><XCircleIcon style={{ width: '1rem', height: '1rem', color: '#dc3545' }} /> Disable</>
                                : <><CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#198754' }} /> Enable</>}
                            </button>
                            <hr class="dropdown-divider my-1" />
                            <button class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                              onClick={e => { e.stopPropagation(); deleteVerse(verse._id); }}>
                              <TrashIcon style={{ width: '1rem', height: '1rem' }} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div class="card-body p-3">
                        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <span class="badge text-white fw-bold" style={{ backgroundColor: COLOR }}>
                            Verse {verse.verseNumber}
                          </span>
                          <span class={`badge ${verse.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {verse.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                          {verse.audioUrl && (
                            <span class="badge bg-warning text-dark d-flex align-items-center gap-1">
                              <MusicalNoteIcon style={{ width: '0.7rem', height: '0.7rem' }} /> Audio
                            </span>
                          )}
                        </div>

                        <div class="p-2 rounded mb-2"
                          style={{ background: 'linear-gradient(135deg, #fff1f2, #fecdd3)', border: `1px solid ${COLOR}40` }}>
                          <p class="mb-0 text-center"
                            style={{ fontFamily: 'serif', fontSize: '1rem', color: COLOR, fontWeight: '500' }}>
                            {truncate(verse.sanskrit, 120)}
                          </p>
                        </div>

                        {verse.transliteration && (
                          <p class="text-muted mb-2" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                            {truncate(verse.transliteration, 80)}
                          </p>
                        )}
                        {verse.hindi && (
                          <div class="mb-2">
                            <small class="text-muted fw-semibold">हिंदी: </small>
                            <small class="text-dark">{truncate(verse.hindi, 80)}</small>
                          </div>
                        )}
                        {verse.english && (
                          <div class="mb-2">
                            <small class="text-muted fw-semibold">English: </small>
                            <small class="text-dark">{truncate(verse.english, 80)}</small>
                          </div>
                        )}
                        {verse.audioUrl && (
                          <div class="mt-2 pt-2" style={{ borderTop: '1px solid #e9ecef' }}>
                            <audio controls class="w-100" style={{ height: '32px' }}>
                              <source src={verse.audioUrl} />
                            </audio>
                          </div>
                        )}
                      </div>
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
                <h4 class="fw-bold mb-2">No Verses Yet</h4>
                <p class="text-muted mb-4">Add the first verse to this chapter</p>
                <button class="btn rounded-pill px-4 text-white" style={{ backgroundColor: COLOR }}
                  onClick={() => showCreateModal.value = true}>Add First Verse</button>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header py-2">
                  <h6 class="modal-title fw-bold mb-0">Add New Verse</h6>
                  <button class="btn-close" onClick={() => { showCreateModal.value = false; form.value = createForm(); createAudioFile.value = null; }} />
                </div>
                <div class="modal-body py-2 px-3">
                  <VerseForm f={form.value} onUpdate={(k, v) => form.value[k] = v} onAudioChange={f => createAudioFile.value = f} />
                </div>
                <div class="modal-footer py-2">
                  <button class="btn btn-secondary btn-sm"
                    onClick={() => { showCreateModal.value = false; form.value = createForm(); createAudioFile.value = null; }}>Cancel</button>
                  <button class="btn btn-sm text-white" style={{ backgroundColor: COLOR }}
                    onClick={submitCreate} disabled={loading.value}>
                    {loading.value ? <><span class="spinner-border spinner-border-sm me-1" />Creating...</> : 'Create Verse'}
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
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
              onClick={e => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header py-2">
                  <h6 class="modal-title fw-bold mb-0">Edit Verse</h6>
                  <button class="btn-close" onClick={() => showEditModal.value = false} />
                </div>
                <div class="modal-body py-2 px-3">
                  <VerseForm f={editForm.value} onUpdate={(k, v) => editForm.value[k] = v} onAudioChange={f => editAudioFile.value = f} />
                </div>
                <div class="modal-footer py-2">
                  <button class="btn btn-secondary btn-sm" onClick={() => showEditModal.value = false}>Cancel</button>
                  <button class="btn btn-sm text-white" style={{ backgroundColor: COLOR }}
                    onClick={submitUpdate} disabled={loading.value}>
                    {loading.value ? 'Updating...' : 'Update Verse'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedVerse.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => showViewModal.value = false}>
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
              onClick={e => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header text-white border-0"
                  style={{ backgroundColor: COLOR, borderRadius: '16px 16px 0 0' }}>
                  <h5 class="mb-0 fw-bold">Verse {selectedVerse.value.verseNumber}</h5>
                  <button class="btn-close btn-close-white" onClick={() => showViewModal.value = false} />
                </div>
                <div class="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div class="p-3 rounded mb-3 text-center"
                    style={{ background: 'linear-gradient(135deg, #fff1f2, #fecdd3)', border: `1px solid ${COLOR}40` }}>
                    <p class="mb-0" style={{ fontFamily: 'serif', fontSize: '1.1rem', color: COLOR, fontWeight: '500' }}>
                      {selectedVerse.value.sanskrit}
                    </p>
                  </div>
                  {selectedVerse.value.audioUrl && (
                    <div class="mb-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <MusicalNoteIcon style={{ width: '1rem', height: '1rem', color: COLOR }} />
                        <small class="fw-semibold text-muted">Audio Recitation</small>
                      </div>
                      <audio controls class="w-100">
                        <source src={selectedVerse.value.audioUrl} />
                      </audio>
                    </div>
                  )}
                  {selectedVerse.value.transliteration && (
                    <p class="text-muted fst-italic mb-3">{selectedVerse.value.transliteration}</p>
                  )}
                  {selectedVerse.value.hindi && (
                    <div class="mb-3">
                      <h6 class="fw-semibold text-muted mb-1" style={{ fontSize: '0.85rem' }}>हिंदी अर्थ</h6>
                      <p class="mb-0">{selectedVerse.value.hindi}</p>
                    </div>
                  )}
                  {selectedVerse.value.english && (
                    <div class="mb-3">
                      <h6 class="fw-semibold text-muted mb-1" style={{ fontSize: '0.85rem' }}>English Meaning</h6>
                      <p class="mb-0">{selectedVerse.value.english}</p>
                    </div>
                  )}
                  {selectedVerse.value.explanation && (
                    <div class="mb-3">
                      <h6 class="fw-semibold text-muted mb-1" style={{ fontSize: '0.85rem' }}>Explanation</h6>
                      <p class="mb-0">{selectedVerse.value.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};

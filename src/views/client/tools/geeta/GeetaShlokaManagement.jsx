import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  ArrowLeftIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BookOpenIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';

export default {
  name: 'GeetaShlokaManagement',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToast();
    const { chapterId } = route.params;
    
    // Get chapter info from query parameters
    const chapterFromQuery = {
      chapterNumber: route.query.chapter ? parseInt(route.query.chapter) : null,
      name: route.query.chapterName || '',
      _id: route.query.chapterId || chapterId
    };
    
    const chapter = chapterFromQuery.chapterNumber ? chapterFromQuery : null;

    const loading = ref(false);
    const showShlokaModal = ref(false);
    const showEditModal = ref(false);
    const showViewModal = ref(false);
    const activeDropdown = ref(null);
    const selectedShloka = ref(null);
    const editingShloka = ref(null);
    const shlokas = ref([]);
    const searchTerm = ref('');
    const statusFilter = ref('all');
    const selectedChapterFilter = ref('');
    const selectedChapterNumber = ref(chapter?.chapterNumber?.toString() || route.query.chapter || '');
    const expandedDescriptions = ref(new Set());
    
    // Initialize chapter from URL query if it's a valid number
    const initializeChapterFromURL = () => {
      const chapterFromURL = route.query.chapter || '';
      // Only set if it's a valid chapter number
      if (chapterFromURL && !isNaN(parseInt(chapterFromURL))) {
        selectedChapterFilter.value = chapterFromURL;
      } else {
        selectedChapterFilter.value = '';
      }
    };
    
    initializeChapterFromURL();
    const pageTitle = ref('Shloka Management');
    const chapters = ref([]);
    
    const loadChapters = async () => {
      try {
        const { chapterService } = await import('../../../../services/chapterService.js');
        const response = await chapterService.getChapters();
        if (response.success) {
          chapters.value = response.data;
        }
      } catch (error) {
        console.error('Error loading chapters:', error);
      }
    };
    
    const shlokaForm = ref({
      chapterNumber: chapter?.chapterNumber || 1,
      chapterName: chapter?.name || '',
      section: '',
      shlokaNumber: '',
      shlokaIndex: '',
      sanskritShloka: '',
      hindiMeaning: '',
      englishMeaning: '',
      sanskritTransliteration: '',
      explanation: '',
      tags: '',
      status: 'draft',
      isActive: true,
      audioFile: null
    });

    const editForm = ref({
      chapterNumber: chapter?.chapterNumber || 1,
      chapterName: chapter?.name || '',
      section: '',
      shlokaNumber: '',
      shlokaIndex: '',
      sanskritShloka: '',
      hindiMeaning: '',
      englishMeaning: '',
      sanskritTransliteration: '',
      explanation: '',
      tags: '',
      status: 'draft',
      isActive: true,
      audioFile: null
    });

    const filteredShlokas = () => {
      let filtered = shlokas.value;
      
      // Apply chapter filter
      if (selectedChapterFilter.value) {
        filtered = filtered.filter(shloka => shloka.chapterNumber === parseInt(selectedChapterFilter.value));
      }
      
      // Apply search filter
      if (searchTerm.value) {
        filtered = filtered.filter(shloka => 
          shloka.sanskritShloka.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
          shloka.hindiMeaning.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
          shloka.englishMeaning.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
          (shloka.tags && shloka.tags.toLowerCase().includes(searchTerm.value.toLowerCase()))
        );
      }
      
      // Apply status filter
      if (statusFilter.value !== 'all') {
        filtered = filtered.filter(shloka => shloka.status === statusFilter.value);
      }
      
      return filtered;
    };

    // Auto-generate shloka index
    const updateShlokaIndex = () => {
      if (shlokaForm.value.chapterNumber && shlokaForm.value.shlokaNumber) {
        const chapterStr = shlokaForm.value.chapterNumber.toString().padStart(2, '0');
        // Handle different formats: "1", "47", "1.1", "00.2" etc.
        let shlokaStr;
        if (shlokaForm.value.shlokaNumber.includes('.')) {
          // Take the part after dot
          const afterDot = shlokaForm.value.shlokaNumber.split('.')[1];
          shlokaStr = afterDot ? afterDot.padStart(3, '0') : '001';
        } else {
          // Direct number without dot
          shlokaStr = shlokaForm.value.shlokaNumber.padStart(3, '0');
        }
        shlokaForm.value.shlokaIndex = `BG-${chapterStr}-${shlokaStr}`;
      }
    };

    const onChapterChange = () => {
      // Load shlokas with selected chapter filter
      loadShlokas(selectedChapterFilter.value || null);
      
      // Update page title based on selected chapter
      const selectedChapter = chapters.value.find(ch => ch.chapterNumber === parseInt(selectedChapterFilter.value));
      pageTitle.value = selectedChapter ? `Chapter ${selectedChapter.chapterNumber} - ${selectedChapter.name}` : 'Geeta Shloka Management';
      
      // Update URL query parameter
      router.replace({ 
        query: selectedChapterFilter.value ? { chapter: selectedChapterFilter.value } : {} 
      });
    };



    const loadShlokas = async (chapterNumber = null) => {
      try {
        loading.value = true;
        const { shlokaService } = await import('../../../../services/shlokaService.js');
        
        let response;
        if (chapterNumber) {
          response = await shlokaService.getShlokasByChapter(parseInt(chapterNumber));
        } else {
          response = await shlokaService.getAllShlokas();
        }
        
        if (response.success && response.data) {
          shlokas.value = response.data;
        } else {
          shlokas.value = [];
        }
      } catch (error) {
        console.error('Load shlokas error:', error);
        shlokas.value = [];
      } finally {
        loading.value = false;
      }
    };

    const goBack = () => {
      router.push('/client/tools/geeta-chapters');
    };

    const openShlokaModal = () => {
      showShlokaModal.value = true;
    };

    const submitShloka = async () => {
      try {
        loading.value = true;
        toast.info('Creating shloka...');
        
        updateShlokaIndex();
        
        const { shlokaService } = await import('../../../../services/shlokaService.js');

        const formData = new FormData();
        Object.entries(shlokaForm.value).forEach(([key, val]) => {
          if (key === 'audioFile') {
            if (val) formData.append('audio', val);
          } else {
            formData.append(key, val);
          }
        });

        const response = await shlokaService.createShloka(formData);
        
        if (response.success) {
          toast.success('✓ Shloka created successfully!');
          showShlokaModal.value = false;
          shlokaForm.value.audioFile = null;
          await loadShlokas(selectedChapterNumber.value || null);
        } else {
          toast.error(response.message || '❌ Failed to create shloka');
        }
        
      } catch (error) {
        console.error('Submit shloka error:', error);
        toast.error(error.response?.data?.message || '❌ Failed to create shloka');
      } finally {
        loading.value = false;
      }
    };

    const toggleDropdown = (shlokaId) => {
      activeDropdown.value = activeDropdown.value === shlokaId ? null : shlokaId;
    };

    const viewShloka = (shloka) => {
      selectedShloka.value = shloka;
      showViewModal.value = true;
      activeDropdown.value = null;
    };

    const editShloka = (shloka) => {
      editingShloka.value = shloka;
      editForm.value = { ...shloka };
      showEditModal.value = true;
      activeDropdown.value = null;
    };

    const updateShloka = async () => {
      try {
        loading.value = true;
        toast.info('Updating shloka...');
        
        const { shlokaService } = await import('../../../../services/shlokaService.js');

        const formData = new FormData();
        Object.entries(editForm.value).forEach(([key, val]) => {
          if (key === 'audioFile') {
            if (val) formData.append('audio', val);
          } else if (key !== '_id') {
            formData.append(key, val);
          }
        });

        const response = await shlokaService.updateShloka(editingShloka.value._id, formData);
        
        if (response.success) {
          const index = shlokas.value.findIndex(s => s._id === editingShloka.value._id);
          if (index !== -1) shlokas.value[index] = response.data;
          toast.success('✓ Shloka updated successfully!');
          showEditModal.value = false;
          editForm.value.audioFile = null;
        } else {
          toast.error(response.message || '❌ Failed to update shloka');
        }
        
      } catch (error) {
        console.error('Update shloka error:', error);
        toast.error(error.response?.data?.message || '❌ Failed to update shloka');
      } finally {
        loading.value = false;
      }
    };

    const deleteShloka = async (shlokaId) => {
      if (!confirm('Are you sure you want to delete this shloka?')) return;
      
      try {
        loading.value = true;
        const { shlokaService } = await import('../../../../services/shlokaService.js');
        const response = await shlokaService.deleteShloka(shlokaId);
        
        if (response.success) {
          shlokas.value = shlokas.value.filter(s => s._id !== shlokaId);
          toast.success('✓ Shloka deleted successfully!');
        } else {
          toast.error(response.message || '❌ Failed to delete shloka');
        }
      } catch (error) {
        console.error('Delete shloka error:', error);
        toast.error(error.response?.data?.message || '❌ Failed to delete shloka');
      } finally {
        loading.value = false;
      }
      
      activeDropdown.value = null;
    };

    const toggleShlokaStatus = async (shloka) => {
      try {
        const { shlokaService } = await import('../../../../services/shlokaService.js');
        const response = await shlokaService.toggleShlokaActive(shloka._id);
        
        if (response.success) {
          const index = shlokas.value.findIndex(s => s._id === shloka._id);
          if (index !== -1) {
            shlokas.value[index] = response.data;
          }
          toast.success(`Shloka ${response.data.isActive ? 'enabled' : 'disabled'} successfully!`);
        } else {
          toast.error(response.message || '❌ Failed to update shloka status');
        }
      } catch (error) {
        console.error('Toggle shloka status error:', error);
        toast.error(error.response?.data?.message || '❌ Failed to update shloka status');
      }
      activeDropdown.value = null;
    };

    const getStatusBadge = (status) => {
      const statusConfig = {
        published: { class: 'bg-success', text: 'Published', color: '#28a745' },
        draft: { class: 'bg-warning', text: 'Draft', color: '#ffc107' }
      };
      return statusConfig[status] || statusConfig.draft;
    };

    const toggleDescription = (shlokaId, field) => {
      const key = `${shlokaId}-${field}`;
      const expanded = expandedDescriptions.value;
      if (expanded.has(key)) {
        expanded.delete(key);
      } else {
        expanded.add(key);
      }
      expandedDescriptions.value = new Set(expanded);
    };

    const truncateText = (text, maxLength = 100) => {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    onMounted(() => {
      loadChapters();
      
      // If chapter is provided from query parameters, set filter and load that chapter's shlokas
      if (chapter?.chapterNumber) {
        selectedChapterFilter.value = chapter.chapterNumber.toString();
        pageTitle.value = `Chapter ${chapter.chapterNumber} - ${chapter.name}`;
        loadShlokas(chapter.chapterNumber);
      } else {
        // Load shlokas with chapter filter from URL if present
        loadShlokas(selectedChapterFilter.value || null);
        
        // Set initial page title if chapter is selected from URL
        if (selectedChapterFilter.value) {
          setTimeout(() => {
            const selectedChapter = chapters.value.find(ch => ch.chapterNumber === parseInt(selectedChapterFilter.value));
            pageTitle.value = selectedChapter ? `Chapter ${selectedChapter.chapterNumber} - ${selectedChapter.name}` : 'Geeta Shloka Management';
          }, 100);
        }
      }
    });

    return () => (
      <div class="container-fluid px-2 px-sm-3 px-lg-4">
        <style>{`
          .sanskrit-text {
            font-family: 'Noto Sans Devanagari', 'Devanagari Sangam MN', sans-serif;
            line-height: 1.6;
          }
          .shloka-card {
            transition: all 0.2s ease;
          }
          .shloka-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
        `}</style>
        
        <div class="row">
          <div class="col-12">
            {/* Header */}
            <div class="bg-gradient-primary rounded-3 py-4 px-4 mb-4 text-white shadow-lg">
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button 
                  class="btn btn-light btn-sm rounded-pill px-3" 
                  onClick={goBack}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                >
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span class="d-none d-sm-inline">Back to Chapters</span>
                  <span class="d-sm-none">Back</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-4 text-dark">{pageTitle.value}</h1>
                  <p class="mb-0 text-dark d-none d-sm-block" style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                    Manage sacred shlokas with Sanskrit, Hindi and English meanings
                  </p>
                </div>
                <button 
                  class="btn btn-light btn-sm rounded-pill px-4 shadow-sm"
                  onClick={openShlokaModal}
                  disabled={loading.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', whiteSpace: 'nowrap' }}
                >
                  <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                  <span class="d-none d-sm-inline">Add Shloka</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div class="row g-2 mb-3">
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100">
                  <div class="card-body text-center p-2">
                    <div class="text-primary mb-1">
                      <BookOpenIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    <h5 class="fw-bold mb-1">{filteredShlokas().length}</h5>
                    <small class="text-muted">Total Shlokas</small>
                  </div>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100">
                  <div class="card-body text-center p-2">
                    <div class="text-success mb-1">
                      <StarIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    <h5 class="fw-bold mb-1">{filteredShlokas().filter(s => s.status === 'published').length}</h5>
                    <small class="text-muted">Published</small>
                  </div>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100">
                  <div class="card-body text-center p-2">
                    <div class="text-warning mb-1">
                      <ChatBubbleLeftRightIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    <h5 class="fw-bold mb-1">{filteredShlokas().filter(s => s.status === 'draft').length}</h5>
                    <small class="text-muted">Drafts</small>
                  </div>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm h-100">
                  <div class="card-body text-center p-2">
                    <div class="text-info mb-1">
                      <UserIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                    </div>
                    <h5 class="fw-bold mb-1">{selectedChapterFilter.value || 'All'}</h5>
                    <small class="text-muted">Chapter</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div class="row g-2 mb-3">
              <div class="col-12 col-md-6">
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0">
                    <MagnifyingGlassIcon style={{ width: '1rem', height: '1rem', color: '#6c757d' }} />
                  </span>
                  <input
                    type="text"
                    class="form-control border-start-0 ps-0"
                    placeholder="Search shlokas..."
                    value={searchTerm.value}
                    onInput={(e) => searchTerm.value = e.target.value}
                  />
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="d-flex gap-2">
                  <select
                    class="form-select"
                    value={selectedChapterFilter.value}
                    onChange={(e) => {
                      selectedChapterFilter.value = e.target.value;
                      onChapterChange();
                    }}
                  >
                    <option value="">All Chapters</option>
                    {chapters.value.map(chapter => (
                      <option key={chapter.chapterNumber} value={chapter.chapterNumber}>
                        Chapter {chapter.chapterNumber} - {chapter.name}
                      </option>
                    ))}
                  </select>
                  <select
                    class="form-select"
                    value={statusFilter.value}
                    onChange={(e) => statusFilter.value = e.target.value}
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shlokas Grid */}
            <div class="row g-3">
              {filteredShlokas().map(shloka => (
                <div key={shloka._id} class="col-md-6">
                  <div 
                    class="card border-0 shadow-sm shloka-card position-relative" 
                    style={{ 
                      borderRadius: '12px',
                      background: shloka.shlokaIndex === 'BG-01-001' 
                        ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 50%, #fdcb6e 100%)'
                        : 'linear-gradient(135deg, #fff8e1 0%, #ffffff 100%)',
                      borderLeft: shloka.shlokaIndex === 'BG-01-001' 
                        ? '4px solid #f39c12'
                        : '4px solid #ff9800',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      boxShadow: shloka.shlokaIndex === 'BG-01-001' 
                        ? '0 4px 20px rgba(243, 156, 18, 0.3)'
                        : undefined
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 152, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Disabled Overlay */}
                    {shloka.isActive === false && (
                      <div 
                        class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{ 
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          zIndex: 2,
                          borderRadius: '12px',
                          pointerEvents: 'none'
                        }}
                      >
                        <span class="badge bg-secondary px-3 py-2">Disabled</span>
                      </div>
                    )}
                    
                    <div class="card-body p-4">
                      {/* Header with Chapter Info */}
                      <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div class="d-flex align-items-center gap-2 mb-1">
                            <h5 
                              class="card-title mb-0 fw-bold text-primary"
                            >
                              {shloka.shlokaIndex}
                              {shloka.shlokaIndex === 'BG-01-001' && (
                                <span class="ms-2" style={{ fontSize: '0.8rem' }}>✨</span>
                              )}
                            </h5>
                            <span class="badge bg-primary bg-opacity-10 text-primary">
                              Ch-{shloka.chapterNumber}
                            </span>
                          </div>
                          <small class="text-muted fw-medium">
                            श्लोक {shloka.shlokaNumber} • {shloka.chapterName}
                            {shloka.shlokaIndex === 'BG-01-001' && (
                              <span class="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
                                Arjuna Vishada Yoga
                              </span>
                            )}
                          </small>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <span class={`badge ${shloka.status === 'published' ? 'bg-success' : 'bg-warning'}`}>
                            {shloka.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                          <div class="dropdown">
                            <button 
                              class="btn btn-outline-secondary btn-sm"
                              style={{ position: 'relative', zIndex: 10 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(shloka._id);
                              }}
                            >
                              <EllipsisVerticalIcon style={{ width: '1rem', height: '1rem' }} />
                            </button>
                            {activeDropdown.value === shloka._id && (
                              <div class="dropdown-menu show position-absolute shadow" style={{ right: '0', zIndex: 1050 }}>
                                {shloka.isActive === false ? (
                                  // Only show Enable button for disabled cards
                                  <button class="dropdown-item" onClick={() => toggleShlokaStatus(shloka)}>
                                    <CheckCircleIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />Enable
                                  </button>
                                ) : (
                                  // Show all options for active cards
                                  <>
                                    <button class="dropdown-item" onClick={() => viewShloka(shloka)}>
                                      <EyeIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />View
                                    </button>
                                    <button class="dropdown-item" onClick={() => editShloka(shloka)}>
                                      <PencilIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />Edit
                                    </button>
                                    <button class="dropdown-item" onClick={() => toggleShlokaStatus(shloka)}>
                                      <XCircleIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />Disable
                                    </button>
                                    <hr class="dropdown-divider" />
                                    <button class="dropdown-item text-danger" onClick={() => deleteShloka(shloka._id)}>
                                      <TrashIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sanskrit Shloka - Highlighted */}
                      <div class="mb-3">
                        <div 
                          class="p-3 rounded sanskrit-text" 
                          style={{ 
                            background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                            border: '1px solid #ffcc02',
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#e65100',
                            textAlign: 'center',
                            fontFamily: 'serif',
                            boxShadow: '0 2px 8px rgba(255, 204, 2, 0.2)'
                          }}
                        >
                          {expandedDescriptions.value.has(`${shloka._id}-sanskrit`) ? (
                            <>
                              <p class="mb-1">{shloka.sanskritShloka}</p>
                              <button 
                                class="btn btn-link p-0 text-primary" 
                                style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'sanskrit'); }}
                              >
                                See less
                              </button>
                            </>
                          ) : (
                            <>
                              <p class="mb-1">{truncateText(shloka.sanskritShloka, 80)}</p>
                              {shloka.sanskritShloka && shloka.sanskritShloka.length > 80 && (
                                <button 
                                  class="btn btn-link p-0 text-primary" 
                                  style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'sanskrit'); }}
                                >
                                  See more
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Hindi Meaning */}
                      <div class="mb-3">
                        <h6 class="text-muted mb-2" style={{ fontSize: '0.85rem', fontWeight: '600' }}>हिंदी अर्थ:</h6>
                        <div 
                          class="p-2 rounded" 
                          style={{ 
                            backgroundColor: '#f8f9fa',
                            fontSize: '0.9rem', 
                            lineHeight: '1.5',
                            color: '#495057',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          {expandedDescriptions.value.has(`${shloka._id}-hindi`) ? (
                            <>
                              <p class="mb-1">{shloka.hindiMeaning}</p>
                              <button 
                                class="btn btn-link p-0 text-primary" 
                                style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'hindi'); }}
                              >
                                See less
                              </button>
                            </>
                          ) : (
                            <>
                              <p class="mb-1">{truncateText(shloka.hindiMeaning, 100)}</p>
                              {shloka.hindiMeaning && shloka.hindiMeaning.length > 100 && (
                                <button 
                                  class="btn btn-link p-0 text-primary" 
                                  style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'hindi'); }}
                                >
                                  See more
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* English Meaning */}
                      <div class="mb-3">
                        <h6 class="text-muted mb-2" style={{ fontSize: '0.85rem', fontWeight: '600' }}>English Meaning:</h6>
                        <div 
                          class="p-2 rounded" 
                          style={{ 
                            backgroundColor: '#f0f8ff',
                            fontSize: '0.9rem', 
                            lineHeight: '1.5',
                            color: '#495057',
                            border: '1px solid #cce7ff'
                          }}
                        >
                          {expandedDescriptions.value.has(`${shloka._id}-english`) ? (
                            <>
                              <p class="mb-1">{shloka.englishMeaning}</p>
                              <button 
                                class="btn btn-link p-0 text-primary" 
                                style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'english'); }}
                              >
                                See less
                              </button>
                            </>
                          ) : (
                            <>
                              <p class="mb-1">{truncateText(shloka.englishMeaning, 100)}</p>
                              {shloka.englishMeaning && shloka.englishMeaning.length > 100 && (
                                <button 
                                  class="btn btn-link p-0 text-primary" 
                                  style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'english'); }}
                                >
                                  See more
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Transliteration (if available) */}
                      {shloka.sanskritTransliteration && (
                        <div class="mb-3">
                          <h6 class="text-muted mb-2" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Transliteration:</h6>
                          <div 
                            class="p-2 rounded" 
                            style={{ 
                              backgroundColor: '#fff5f5',
                              fontSize: '0.85rem', 
                              lineHeight: '1.4',
                              color: '#6b7280',
                              border: '1px solid #fecaca',
                              fontStyle: 'italic'
                            }}
                          >
                            {expandedDescriptions.value.has(`${shloka._id}-transliteration`) ? (
                              <>
                                <p class="mb-1">{shloka.sanskritTransliteration}</p>
                                <button 
                                  class="btn btn-link p-0 text-primary" 
                                  style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'transliteration'); }}
                                >
                                  See less
                                </button>
                              </>
                            ) : (
                              <>
                                <p class="mb-1">{truncateText(shloka.sanskritTransliteration, 80)}</p>
                                {shloka.sanskritTransliteration && shloka.sanskritTransliteration.length > 80 && (
                                  <button 
                                    class="btn btn-link p-0 text-primary" 
                                    style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                    onClick={(e) => { e.stopPropagation(); toggleDescription(shloka._id, 'transliteration'); }}
                                  >
                                    See more
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section/Theme (if available) */}
                      {shloka.section && (
                        <div class="mb-3">
                          <span class="badge bg-info bg-opacity-10 text-info px-2 py-1">
                            📖 {shloka.section}
                          </span>
                        </div>
                      )}

                      {/* Tags */}
                      {shloka.tags && (
                        <div class="d-flex flex-wrap gap-1">
                          {shloka.tags.split(',').map((tag, index) => (
                            <span 
                              key={index} 
                              class="badge" 
                              style={{ 
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                border: '1px solid #bbdefb'
                              }}
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Audio Player */}
                      {shloka.audioUrl && (
                        <div class="mt-3">
                          <h6 class="text-muted mb-2" style={{ fontSize: '0.85rem', fontWeight: '600' }}>🎵 Audio:</h6>
                          <audio controls class="w-100" style={{ height: '36px' }}>
                            <source src={shloka.audioUrl} />
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredShlokas().length === 0 && (
              <div class="text-center py-5">
                <BookOpenIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} class="mb-3" />
                <h5 class="text-muted mb-2">No shlokas found</h5>
                <p class="text-muted mb-3">
                  {searchTerm.value || statusFilter.value !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Start by adding your first shloka to this chapter'
                  }
                </p>
                {!searchTerm.value && statusFilter.value === 'all' && (
                  <button class="btn btn-primary rounded-pill px-4" onClick={openShlokaModal}>
                    <PlusIcon style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    Add First Shloka
                  </button>
                )}
              </div>
            )}

            {/* Add Shloka Modal */}
            {showShlokaModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                  <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                      <h5 class="modal-title fw-bold">Add New Shloka</h5>
                      <button 
                        type="button" 
                        class="btn-close" 
                        onClick={() => showShlokaModal.value = false}
                      ></button>
                    </div>
                    <div class="modal-body px-3 px-md-4">
                      <form onSubmit={(e) => { e.preventDefault(); submitShloka(); }}>
                        <div class="row g-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Chapter Number *</label>
                            <select
                              required
                              class="form-select"
                              value={shlokaForm.value.chapterNumber}
                              onChange={async (e) => {
                                const chapterNum = parseInt(e.target.value);
                                shlokaForm.value.chapterNumber = chapterNum;
                                
                                // Get chapter name from loaded chapters
                                const selectedChapter = chapters.value.find(ch => ch.chapterNumber === chapterNum);
                                shlokaForm.value.chapterName = selectedChapter?.name || '';
                                
                                updateShlokaIndex();
                              }}
                            >
                              {chapters.value.map(ch => (
                                <option key={ch.chapterNumber} value={ch.chapterNumber}>
                                  Chapter {ch.chapterNumber} - {ch.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Chapter Name</label>
                            <input
                              type="text"
                              class="form-control bg-light"
                              value={shlokaForm.value.chapterName}
                              placeholder="Auto-filled from chapter selection"
                              readonly
                            />
                          </div>

                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Section / Theme</label>
                            <input
                              type="text"
                              class="form-control"
                              value={shlokaForm.value.section}
                              onInput={(e) => shlokaForm.value.section = e.target.value}
                              placeholder="e.g., Introduction, Karma Yoga"
                            />
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Shloka Number *</label>
                            <input
                              type="text"
                              required
                              class="form-control"
                              value={shlokaForm.value.shlokaNumber}
                              onInput={(e) => {
                                shlokaForm.value.shlokaNumber = e.target.value;
                                updateShlokaIndex();
                              }}
                              placeholder="e.g., 2.47"
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Shloka Index (Auto-generated)</label>
                            <input
                              type="text"
                              class="form-control bg-light"
                              value={shlokaForm.value.shlokaIndex}
                              placeholder="BG-02-047"
                              readonly
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Sanskrit Shloka *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control sanskrit-text"
                              style={{ fontSize: '1.1rem' }}
                              value={shlokaForm.value.sanskritShloka}
                              onInput={(e) => shlokaForm.value.sanskritShloka = e.target.value}
                              placeholder="Enter Sanskrit shloka in Devanagari..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Hindi Meaning *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control"
                              value={shlokaForm.value.hindiMeaning}
                              onInput={(e) => shlokaForm.value.hindiMeaning = e.target.value}
                              placeholder="Enter Hindi translation and meaning..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">English Meaning *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control"
                              value={shlokaForm.value.englishMeaning}
                              onInput={(e) => shlokaForm.value.englishMeaning = e.target.value}
                              placeholder="Enter English translation and meaning..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Sanskrit Transliteration (Optional)</label>
                            <textarea
                              rows={3}
                              class="form-control"
                              value={shlokaForm.value.sanskritTransliteration}
                              onInput={(e) => shlokaForm.value.sanskritTransliteration = e.target.value}
                              placeholder="Enter romanized Sanskrit text..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Explanation / Notes (Optional)</label>
                            <textarea
                              rows={4}
                              class="form-control"
                              value={shlokaForm.value.explanation}
                              onInput={(e) => shlokaForm.value.explanation = e.target.value}
                              placeholder="Enter detailed explanation, commentary, or notes..."
                            />
                          </div>

                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Tags (Optional)</label>
                            <input
                              type="text"
                              class="form-control"
                              value={shlokaForm.value.tags}
                              onInput={(e) => shlokaForm.value.tags = e.target.value}
                              placeholder="karma, bhakti, duty, dharma, yoga..."
                            />
                            <div class="form-text">Separate multiple tags with commas</div>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Status *</label>
                            <select
                              required
                              class="form-select"
                              value={shlokaForm.value.status}
                              onChange={(e) => shlokaForm.value.status = e.target.value}
                            >
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Active Status *</label>
                            <select
                              required
                              class="form-select"
                              value={shlokaForm.value.isActive}
                              onChange={(e) => shlokaForm.value.isActive = e.target.value === 'true'}
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                          <div class="col-12">
                            <label class="form-label fw-semibold">🎵 Audio File (Optional)</label>
                            <input
                              type="file"
                              class="form-control"
                              accept="audio/*"
                              onChange={(e) => shlokaForm.value.audioFile = e.target.files[0] || null}
                            />
                            <div class="form-text">Max 20MB. MP3, WAV, OGG supported.</div>
                          </div>
                        </div>
                      </form>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                      <button 
                        type="button" 
                        class="btn btn-secondary rounded-pill px-4" 
                        onClick={() => showShlokaModal.value = false}
                        disabled={loading.value}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-primary rounded-pill px-4" 
                        onClick={submitShloka}
                        disabled={loading.value}
                      >
                        {loading.value ? (
                          <>
                            <span class="spinner-border spinner-border-sm me-2"></span>
                            Creating...
                          </>
                        ) : (
                          'Create Shloka'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal - Similar structure as Add Modal */}
            {showEditModal.value && editingShloka.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                  <div class="modal-content">
                    <div class="modal-header border-0 pb-0">
                      <h5 class="modal-title fw-bold">Edit Shloka</h5>
                      <button 
                        type="button" 
                        class="btn-close" 
                        onClick={() => showEditModal.value = false}
                      ></button>
                    </div>
                    <div class="modal-body px-3 px-md-4">
                      <form onSubmit={(e) => { e.preventDefault(); updateShloka(); }}>
                        <div class="row g-3">
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Chapter Number *</label>
                            <select
                              required
                              class="form-select"
                              value={editForm.value.chapterNumber}
                              onChange={async (e) => {
                                const chapterNum = parseInt(e.target.value);
                                editForm.value.chapterNumber = chapterNum;
                                
                                // Get chapter name from loaded chapters
                                const selectedChapter = chapters.value.find(ch => ch.chapterNumber === chapterNum);
                                editForm.value.chapterName = selectedChapter?.name || '';
                              }}
                            >
                              {chapters.value.map(ch => (
                                <option key={ch.chapterNumber} value={ch.chapterNumber}>
                                  Chapter {ch.chapterNumber} - {ch.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Chapter Name</label>
                            <input
                              type="text"
                              class="form-control bg-light"
                              value={editForm.value.chapterName}
                              placeholder="Auto-filled from chapter selection"
                              readonly
                            />
                          </div>

                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Section / Theme</label>
                            <input
                              type="text"
                              class="form-control"
                              value={editForm.value.section}
                              onInput={(e) => editForm.value.section = e.target.value}
                              placeholder="e.g., Introduction, Karma Yoga"
                            />
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Shloka Number *</label>
                            <input
                              type="text"
                              required
                              class="form-control"
                              value={editForm.value.shlokaNumber}
                              onInput={(e) => editForm.value.shlokaNumber = e.target.value}
                              placeholder="e.g., 2.47"
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Shloka Index</label>
                            <input
                              type="text"
                              class="form-control bg-light"
                              value={editForm.value.shlokaIndex}
                              placeholder="BG-02-047"
                              readonly
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Sanskrit Shloka *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control sanskrit-text"
                              style={{ fontSize: '1.1rem' }}
                              value={editForm.value.sanskritShloka}
                              onInput={(e) => editForm.value.sanskritShloka = e.target.value}
                              placeholder="Enter Sanskrit shloka in Devanagari..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Hindi Meaning *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control"
                              value={editForm.value.hindiMeaning}
                              onInput={(e) => editForm.value.hindiMeaning = e.target.value}
                              placeholder="Enter Hindi translation and meaning..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">English Meaning *</label>
                            <textarea
                              required
                              rows={4}
                              class="form-control"
                              value={editForm.value.englishMeaning}
                              onInput={(e) => editForm.value.englishMeaning = e.target.value}
                              placeholder="Enter English translation and meaning..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Sanskrit Transliteration (Optional)</label>
                            <textarea
                              rows={3}
                              class="form-control"
                              value={editForm.value.sanskritTransliteration}
                              onInput={(e) => editForm.value.sanskritTransliteration = e.target.value}
                              placeholder="Enter romanized Sanskrit text..."
                            />
                          </div>

                          <div class="col-12">
                            <label class="form-label fw-semibold">Explanation / Notes (Optional)</label>
                            <textarea
                              rows={4}
                              class="form-control"
                              value={editForm.value.explanation}
                              onInput={(e) => editForm.value.explanation = e.target.value}
                              placeholder="Enter detailed explanation, commentary, or notes..."
                            />
                          </div>

                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Tags (Optional)</label>
                            <input
                              type="text"
                              class="form-control"
                              value={editForm.value.tags}
                              onInput={(e) => editForm.value.tags = e.target.value}
                              placeholder="karma, bhakti, duty, dharma, yoga..."
                            />
                            <div class="form-text">Separate multiple tags with commas</div>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Status *</label>
                            <select
                              required
                              class="form-select"
                              value={editForm.value.status}
                              onChange={(e) => editForm.value.status = e.target.value}
                            >
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label fw-semibold">Active Status *</label>
                            <select
                              required
                              class="form-select"
                              value={editForm.value.isActive}
                              onChange={(e) => editForm.value.isActive = e.target.value === 'true'}
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                          <div class="col-12">
                            <label class="form-label fw-semibold">🎵 Audio File (Optional)</label>
                            {editForm.value.audioUrl && (
                              <div class="mb-2">
                                <small class="text-muted">Current audio:</small>
                                <audio controls class="w-100 mt-1" style={{ height: '36px' }}>
                                  <source src={editForm.value.audioUrl} />
                                </audio>
                              </div>
                            )}
                            <input
                              type="file"
                              class="form-control"
                              accept="audio/*"
                              onChange={(e) => editForm.value.audioFile = e.target.files[0] || null}
                            />
                            <div class="form-text">Upload new audio to replace existing. Max 20MB.</div>
                          </div>
                        </div>
                      </form>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                      <button 
                        type="button" 
                        class="btn btn-secondary rounded-pill px-4" 
                        onClick={() => showEditModal.value = false}
                        disabled={loading.value}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        class="btn btn-primary rounded-pill px-4" 
                        onClick={updateShloka}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Updating...' : 'Update Shloka'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Modal */}
            {showViewModal.value && selectedShloka.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showViewModal.value = false}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pb-2">
                      <h5 class="modal-title fw-bold d-flex align-items-center gap-2">
                        <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                        {selectedShloka.value.shlokaIndex}
                      </h5>
                      <button type="button" class="btn-close" onClick={() => showViewModal.value = false}></button>
                    </div>
                    <div class="modal-body pt-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <div class="text-center mb-4">
                        <h4 class="fw-bold mb-1">Shloka {selectedShloka.value.shlokaNumber}</h4>
                        {selectedShloka.value.section && (
                          <p class="text-muted">{selectedShloka.value.section}</p>
                        )}
                        <span 
                          class="badge rounded-pill px-3 py-2"
                          style={{ 
                            backgroundColor: getStatusBadge(selectedShloka.value.status).color + '20',
                            color: getStatusBadge(selectedShloka.value.status).color
                          }}
                        >
                          {getStatusBadge(selectedShloka.value.status).text}
                        </span>
                      </div>
                      
                      <div class="mb-3">
                        <h6 class="fw-semibold mb-2 small text-muted">Sanskrit Shloka</h6>
                        <div class="bg-orange-50 p-3 rounded sanskrit-text" style={{ fontSize: '1.1rem' }}>
                          {selectedShloka.value.sanskritShloka}
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <h6 class="fw-semibold mb-2 small text-muted">Hindi Meaning</h6>
                        <p class="mb-0">{selectedShloka.value.hindiMeaning}</p>
                      </div>
                      
                      <div class="mb-3">
                        <h6 class="fw-semibold mb-2 small text-muted">English Meaning</h6>
                        <p class="mb-0">{selectedShloka.value.englishMeaning}</p>
                      </div>

                      {selectedShloka.value.sanskritTransliteration && (
                        <div class="mb-3">
                          <h6 class="fw-semibold mb-2 small text-muted">Sanskrit Transliteration</h6>
                          <p class="mb-0 font-monospace">{selectedShloka.value.sanskritTransliteration}</p>
                        </div>
                      )}

                      {selectedShloka.value.explanation && (
                        <div class="mb-3">
                          <h6 class="fw-semibold mb-2 small text-muted">Explanation</h6>
                          <p class="mb-0">{selectedShloka.value.explanation}</p>
                        </div>
                      )}
                      
                      {selectedShloka.value.tags && (
                        <div class="mb-3">
                          <h6 class="fw-semibold mb-2 small text-muted">Tags</h6>
                          <div class="d-flex flex-wrap gap-1">
                            {selectedShloka.value.tags.split(',').map((tag, index) => (
                              <span key={index} class="badge bg-primary">{tag.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedShloka.value.audioUrl && (
                        <div class="mb-3">
                          <h6 class="fw-semibold mb-2 small text-muted">🎵 Audio</h6>
                          <audio controls class="w-100">
                            <source src={selectedShloka.value.audioUrl} />
                          </audio>
                        </div>
                      )}
                    </div>
                    <div class="modal-footer border-0 pt-2">
                      <button type="button" class="btn btn-secondary rounded-pill px-3 btn-sm" onClick={() => showViewModal.value = false}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

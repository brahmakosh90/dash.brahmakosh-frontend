import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ArrowLeftIcon, MoonIcon, EyeIcon, EllipsisVerticalIcon, InboxIcon } from '@heroicons/vue/24/outline';
import swapnaDecoderService from '../../services/swapnaDecoderService';
import dreamRequestService from '../../services/dreamRequestService';
import api from '../../services/api';

export default {
  name: 'SwapnaDecoder',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const dreamList = ref([]);
    const showModal = ref(false);
    const isEdit = ref(false);
    const selectedDream = ref(null);
    const showDropdown = ref({});
    const thumbnailUploaded = ref(false);
    const thumbnailFileName = ref('');
    const uploadProgress = ref(0);
    const selectedCategory = ref('');
    const availableSubcategories = ref([]);
    const showCustomCategory = ref(false);
    const customCategoryName = ref('');
    const showCustomSubcategory = ref(false);
    const customSubcategoryName = ref('');
    const showViewModal = ref(false);
    const relatedSymbolsInput = ref('');
    const tagsInput = ref('');
    const activeTab = ref('symbols');
    const requestList = ref([]);
    const requestStats = ref({ pending: 0, inProgress: 0, completed: 0, rejected: 0 });
    const selectedRequest = ref(null);
    const showRequestModal = ref(false);

    const formData = ref({
      symbolName: '',
      symbolNameHindi: '',
      category: '',
      subcategory: '',
      thumbnailImage: null,
      shortDescription: '',
      detailedInterpretation: '',
      positiveAspects: [{ point: '', description: '' }],
      negativeAspects: [{ point: '', description: '' }],
      contextVariations: [{ context: '', meaning: '' }],
      astrologicalSignificance: '',
      vedicReferences: '',
      remedies: {
        mantras: [''],
        pujas: [''],
        donations: [''],
        precautions: ['']
      },
      relatedSymbols: [],
      frequencyImpact: '',
      timeSignificance: {
        morning: '',
        night: '',
        brahmaMuhurat: ''
      },
      genderSpecific: {
        male: '',
        female: '',
        common: ''
      },
      tags: [],
      status: 'Active',
      sortOrder: 0
    });

    const categories = ref({
      'Animals': ['Mammals', 'Birds', 'Reptiles', 'Insects', 'Aquatic', 'Other'],
      'Nature': ['Trees', 'Flowers', 'Water Bodies', 'Mountains', 'Weather', 'Other'],
      'People': ['Family', 'Friends', 'Strangers', 'Deities', 'Ancestors', 'Other'],
      'Objects': ['Jewelry', 'Vehicles', 'Weapons', 'Food', 'Clothes', 'Other'],
      'Actions': ['Flying', 'Falling', 'Running', 'Fighting', 'Eating', 'Other'],
      'Places': ['Temple', 'Home', 'Forest', 'River', 'Mountain', 'Other'],
      'Colors': ['White', 'Black', 'Red', 'Yellow', 'Green', 'Other'],
      'Numbers': ['Single Digit', 'Double Digit', 'Auspicious', 'Inauspicious', 'Other'],
      'Emotions': ['Fear', 'Joy', 'Anger', 'Peace', 'Confusion', 'Other'],
      'Events': ['Marriage', 'Death', 'Birth', 'Festival', 'Accident', 'Other']
    });

    // The logged-in client's own CLI-XXXXXX code. Client login never stores it in localStorage (that key is
    // only written for end-user logins, and may belong to another client), so ask the server who we are.
    let cachedClientCode = null;
    const resolveClientCode = async () => {
      if (cachedClientCode) return cachedClientCode;
      try {
        const response = await api.getCurrentClient(localStorage.getItem('token_client'));
        cachedClientCode = response?.data?.user?.clientId || null;
      } catch (error) {
        console.error('Could not resolve client id:', error);
      }
      return cachedClientCode;
    };

    const goBack = () => {
      router.push('/client/tools');
    };

    const fetchDreams = async () => {
      loading.value = true;
      try {
        const clientId = await resolveClientCode();
        const data = await swapnaDecoderService.getAll({ clientId });
        dreamList.value = data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      } catch (error) {
        toast.error('Error loading dreams');
      } finally {
        loading.value = false;
      }
    };

    const handleCategoryChange = (category) => {
      if (category === 'CREATE_NEW') {
        showCustomCategory.value = true;
        return;
      }
      formData.value.category = category;
      formData.value.subcategory = '';
      selectedCategory.value = category;
      availableSubcategories.value = categories.value[category] || [];
    };

    const handleSubcategoryChange = (subcategory) => {
      if (subcategory === 'CREATE_NEW') {
        showCustomSubcategory.value = true;
        return;
      }
      formData.value.subcategory = subcategory;
    };

    const addNewCategory = () => {
      if (!customCategoryName.value.trim()) {
        toast.error('Please enter category name');
        return;
      }
      if (categories.value[customCategoryName.value]) {
        toast.error('Category already exists');
        return;
      }
      categories.value[customCategoryName.value] = ['Other'];
      formData.value.category = customCategoryName.value;
      selectedCategory.value = customCategoryName.value;
      availableSubcategories.value = ['Other'];
      customCategoryName.value = '';
      showCustomCategory.value = false;
      toast.success('Category added!');
    };

    const addNewSubcategory = () => {
      if (!customSubcategoryName.value.trim()) {
        toast.error('Please enter subcategory name');
        return;
      }
      const currentCategory = selectedCategory.value || formData.value.category;
      if (!currentCategory) {
        toast.error('Please select a category first');
        return;
      }
      if (categories.value[currentCategory].includes(customSubcategoryName.value)) {
        toast.error('Subcategory already exists');
        return;
      }
      categories.value[currentCategory].push(customSubcategoryName.value);
      availableSubcategories.value = categories.value[currentCategory];
      formData.value.subcategory = customSubcategoryName.value;
      customSubcategoryName.value = '';
      showCustomSubcategory.value = false;
      toast.success('Subcategory added!');
    };

    const handleThumbnailUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('File size must be less than 5MB');
          return;
        }
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file');
          return;
        }
        formData.value.thumbnailImage = file;
        thumbnailUploaded.value = true;
        thumbnailFileName.value = file.name;
      }
    };

    const addMantra = () => {
      formData.value.remedies.mantras.push('');
    };

    const removeMantra = (index) => {
      formData.value.remedies.mantras.splice(index, 1);
    };

    const addPuja = () => {
      formData.value.remedies.pujas.push('');
    };

    const removePuja = (index) => {
      formData.value.remedies.pujas.splice(index, 1);
    };

    const addDonation = () => {
      formData.value.remedies.donations.push('');
    };

    const removeDonation = (index) => {
      formData.value.remedies.donations.splice(index, 1);
    };

    const addPrecaution = () => {
      formData.value.remedies.precautions.push('');
    };

    const removePrecaution = (index) => {
      formData.value.remedies.precautions.splice(index, 1);
    };

    const openAddModal = () => {
      isEdit.value = false;
      
      // Calculate next sort order for display only
      const maxSort = dreamList.value.length > 0 
        ? Math.max(...dreamList.value.map(d => d.sortOrder || 0))
        : 0;
      
      selectedCategory.value = '';
      availableSubcategories.value = [];
      thumbnailUploaded.value = false;
      thumbnailFileName.value = '';
      showCustomCategory.value = false;
      showCustomSubcategory.value = false;
      customCategoryName.value = '';
      customSubcategoryName.value = '';
      formData.value = {
        symbolName: '',
        symbolNameHindi: '',
        category: '',
        subcategory: '',
        thumbnailImage: null,
        shortDescription: '',
        detailedInterpretation: '',
        positiveAspects: [{ point: '', description: '' }],
        negativeAspects: [{ point: '', description: '' }],
        contextVariations: [{ context: '', meaning: '' }],
        astrologicalSignificance: '',
        vedicReferences: '',
        remedies: {
          mantras: [''],
          pujas: [''],
          donations: [''],
          precautions: ['']
        },
        relatedSymbols: [],
        frequencyImpact: '',
        timeSignificance: {
          morning: '',
          night: '',
          brahmaMuhurat: ''
        },
        genderSpecific: {
          male: '',
          female: '',
          common: ''
        },
        tags: [],
        status: 'Active',
        sortOrder: maxSort + 1
      };
      showModal.value = true;
    };

    const openEditModal = (dream) => {
      isEdit.value = true;
      selectedDream.value = dream;
      formData.value = {
        ...dream,
        thumbnailImage: null,
        positiveAspects: JSON.parse(JSON.stringify(dream.positiveAspects || [{ point: '', description: '' }])),
        negativeAspects: JSON.parse(JSON.stringify(dream.negativeAspects || [{ point: '', description: '' }])),
        contextVariations: JSON.parse(JSON.stringify(dream.contextVariations || [{ context: '', meaning: '' }])),
        remedies: dream.remedies || { mantras: [''], pujas: [''], donations: [''], precautions: [''] },
        timeSignificance: dream.timeSignificance || { morning: '', night: '', brahmaMuhurat: '' },
        genderSpecific: dream.genderSpecific || { male: '', female: '', common: '' }
      };
      selectedCategory.value = dream.category;
      availableSubcategories.value = categories.value[dream.category] || [];
      relatedSymbolsInput.value = dream.relatedSymbols?.join(', ') || '';
      tagsInput.value = dream.tags?.join(', ') || '';
      thumbnailUploaded.value = false;
      thumbnailFileName.value = '';
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      formData.value = {
        symbolName: '',
        symbolNameHindi: '',
        category: '',
        subcategory: '',
        thumbnailImage: null,
        shortDescription: '',
        detailedInterpretation: '',
        positiveAspects: [{ point: '', description: '' }],
        negativeAspects: [{ point: '', description: '' }],
        contextVariations: [{ context: '', meaning: '' }],
        astrologicalSignificance: '',
        vedicReferences: '',
        remedies: {
          mantras: [''],
          pujas: [''],
          donations: [''],
          precautions: ['']
        },
        relatedSymbols: [],
        frequencyImpact: '',
        timeSignificance: {
          morning: '',
          night: '',
          brahmaMuhurat: ''
        },
        genderSpecific: {
          male: '',
          female: '',
          common: ''
        },
        tags: [],
        status: 'Active',
        sortOrder: 0
      };
      relatedSymbolsInput.value = '';
      tagsInput.value = '';
      // Don't clear selectedRequest here - it's managed in handleSubmit
    };

    const handleSubmit = async () => {
      if (!formData.value.symbolName || !formData.value.category) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const clientId = await resolveClientCode();
      if (!clientId) {
        toast.error('Client ID not found. Please login again.');
        return;
      }
      
      loading.value = true;
      uploadProgress.value = 0;
      
      try {
        let thumbnailUrl = formData.value.thumbnailUrl;
        let thumbnailKey = formData.value.thumbnailKey;
        
        // Upload thumbnail if selected
        if (formData.value.thumbnailImage) {
          try {
            const file = formData.value.thumbnailImage;
            const { uploadUrl, fileUrl, key } = await swapnaDecoderService.getUploadUrl(
              file.name,
              file.type
            );
            
            await swapnaDecoderService.uploadToStorage(uploadUrl, file, (progress) => {
              uploadProgress.value = progress;
            });
            
            thumbnailUrl = fileUrl;
            thumbnailKey = key;
          } catch (uploadError) {
            console.error('Error uploading thumbnail:', uploadError);
            toast.error('Failed to upload thumbnail');
            loading.value = false;
            return;
          }
        }
        
        // Parse comma-separated inputs
        const relatedSymbols = relatedSymbolsInput.value
          ? relatedSymbolsInput.value.split(',').map(s => s.trim()).filter(s => s)
          : [];
        const tags = tagsInput.value
          ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t)
          : [];
        
        const data = {
          symbolName: formData.value.symbolName,
          symbolNameHindi: formData.value.symbolNameHindi,
          category: formData.value.category,
          subcategory: formData.value.subcategory,
          thumbnailUrl,
          thumbnailKey,
          shortDescription: formData.value.shortDescription,
          detailedInterpretation: formData.value.detailedInterpretation,
          positiveAspects: formData.value.positiveAspects.filter(a => a.point.trim() && a.description.trim()),
          negativeAspects: formData.value.negativeAspects.filter(a => a.point.trim() && a.description.trim()),
          contextVariations: formData.value.contextVariations.filter(c => c.context.trim() && c.meaning.trim()),
          astrologicalSignificance: formData.value.astrologicalSignificance,
          vedicReferences: formData.value.vedicReferences,
          remedies: {
            mantras: formData.value.remedies.mantras.filter(m => m.trim()),
            pujas: formData.value.remedies.pujas.filter(p => p.trim()),
            donations: formData.value.remedies.donations.filter(d => d.trim()),
            precautions: formData.value.remedies.precautions.filter(p => p.trim())
          },
          relatedSymbols,
          frequencyImpact: formData.value.frequencyImpact,
          timeSignificance: formData.value.timeSignificance,
          genderSpecific: formData.value.genderSpecific,
          tags,
          status: formData.value.status,
          clientId: clientId
        };
        
        // Only send sortOrder when editing
        if (isEdit.value) {
          data.sortOrder = formData.value.sortOrder ? Number(formData.value.sortOrder) : undefined;
        }
        
        let createdDream;
        if (isEdit.value) {
          await swapnaDecoderService.update(selectedDream.value._id, data);
          toast.success('Dream updated successfully!');
        } else {
          createdDream = await swapnaDecoderService.create(data);
          toast.success('Dream created successfully!');
          
          if (selectedRequest.value) {
            try {
              const response = await dreamRequestService.updateStatus(selectedRequest.value._id, {
                status: 'Completed',
                completedDreamId: createdDream._id
              });
              toast.success('Request marked as completed! User will receive email & SMS notification.');
            } catch (error) {
              toast.error('Dream created but failed to mark request as completed: ' + (error.response?.data?.error || error.message));
            }
          }
        }
        
        // Clear selectedRequest after successful submission
        selectedRequest.value = null;
        
        closeModal();
        await fetchDreams();
        await fetchRequests();
        
        // Switch to requests tab if dream was created from request
        if (createdDream && activeTab.value !== 'requests') {
          activeTab.value = 'requests';
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Error saving dream');
      } finally {
        loading.value = false;
        uploadProgress.value = 0;
      }
    };

    const addPositiveAspect = () => {
      formData.value.positiveAspects.push({ point: '', description: '' });
    };

    const removePositiveAspect = (index) => {
      formData.value.positiveAspects.splice(index, 1);
    };

    const addNegativeAspect = () => {
      formData.value.negativeAspects.push({ point: '', description: '' });
    };

    const removeNegativeAspect = (index) => {
      formData.value.negativeAspects.splice(index, 1);
    };

    const addContextVariation = () => {
      formData.value.contextVariations.push({ context: '', meaning: '' });
    };

    const removeContextVariation = (index) => {
      formData.value.contextVariations.splice(index, 1);
    };

    const deleteDream = async (id) => {
      if (!confirm('Are you sure you want to delete this Dream Symbol?')) return;
      try {
        await swapnaDecoderService.delete(id);
        toast.success('Dream deleted successfully!');
        await fetchDreams();
      } catch (error) {
        toast.error('Error deleting dream');
      }
    };

    const toggleStatus = async (dream) => {
      try {
        const response = await swapnaDecoderService.toggleStatus(dream._id);
        toast.success(`Dream ${response.data.status === 'Active' ? 'enabled' : 'disabled'} successfully!`);
        await fetchDreams();
      } catch (error) {
        toast.error('Error updating status');
      }
    };

    const toggleDropdown = (id) => {
      const newState = {};
      newState[id] = !showDropdown.value[id];
      showDropdown.value = newState;
    };

    const closeAllDropdowns = () => {
      showDropdown.value = {};
    };

    const viewDream = (dream) => {
      selectedDream.value = dream;
      showViewModal.value = true;
      closeAllDropdowns();
    };

    const closeViewModal = () => {
      showViewModal.value = false;
      selectedDream.value = null;
    };

    const fetchRequests = async () => {
      loading.value = true;
      try {
        const clientId = await resolveClientCode();
        const data = await dreamRequestService.getAll({ clientId });
        requestList.value = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const stats = await dreamRequestService.getStats({ clientId });
        requestStats.value = stats;
      } catch (error) {
        toast.error('Error loading requests');
      } finally {
        loading.value = false;
      }
    };

    const viewRequest = (request) => {
      selectedRequest.value = request;
      showRequestModal.value = true;
    };

    const closeRequestModal = () => {
      showRequestModal.value = false;
      selectedRequest.value = null;
    };

    const updateRequestStatus = async (requestId, status) => {
      try {
        await dreamRequestService.updateStatus(requestId, { status });
        toast.success('Status updated successfully!');
        await fetchRequests();
        closeRequestModal();
      } catch (error) {
        toast.error('Error updating status');
      }
    };

    const deleteRequest = async (id) => {
      if (!confirm('Are you sure you want to delete this request?')) return;
      try {
        await dreamRequestService.delete(id);
        toast.success('Request deleted successfully!');
        await fetchRequests();
      } catch (error) {
        toast.error('Error deleting request');
      }
    };

    const openAddModalFromRequest = (request) => {
      closeRequestModal();
      
      // Don't call openAddModal() - it resets formData
      isEdit.value = false;
      const maxSort = dreamList.value.length > 0 
        ? Math.max(...dreamList.value.map(d => d.sortOrder || 0))
        : 0;
      
      selectedCategory.value = '';
      availableSubcategories.value = [];
      thumbnailUploaded.value = false;
      thumbnailFileName.value = '';
      showCustomCategory.value = false;
      showCustomSubcategory.value = false;
      customCategoryName.value = '';
      customSubcategoryName.value = '';
      
      formData.value = {
        symbolName: request.dreamSymbol,
        symbolNameHindi: '',
        category: '',
        subcategory: '',
        thumbnailImage: null,
        shortDescription: request.additionalDetails || '',
        detailedInterpretation: '',
        positiveAspects: [{ point: '', description: '' }],
        negativeAspects: [{ point: '', description: '' }],
        contextVariations: [{ context: '', meaning: '' }],
        astrologicalSignificance: '',
        vedicReferences: '',
        remedies: {
          mantras: [''],
          pujas: [''],
          donations: [''],
          precautions: ['']
        },
        relatedSymbols: [],
        frequencyImpact: '',
        timeSignificance: {
          morning: '',
          night: '',
          brahmaMuhurat: ''
        },
        genderSpecific: {
          male: '',
          female: '',
          common: ''
        },
        tags: [],
        status: 'Active',
        sortOrder: maxSort + 1
      };
      
      showModal.value = true;
      selectedRequest.value = request;
    };

    const switchTab = (tab) => {
      activeTab.value = tab;
      // Only fetch requests if switching to requests tab and not already loaded
      if (tab === 'requests' && requestList.value.length === 0) {
        fetchRequests();
      }
    };

    onMounted(() => {
      fetchDreams();
      // Only fetch requests if on requests tab initially
      if (activeTab.value === 'requests') {
        fetchRequests();
      }
      document.addEventListener('click', closeAllDropdowns);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', closeAllDropdowns);
    });

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        {/* Header */}
        <div class="bg-gradient-primary rounded-4 p-4 mb-4 text-white shadow-lg">
          <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
            <button 
              class="btn btn-light btn-sm rounded-pill px-3" 
              onClick={goBack}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
              <span>Back to Tools</span>
            </button>
            <div class="flex-grow-1">
              <h3 class="mb-1 fw-bold text-dark" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MoonIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                Swapna Decoder Management
              </h3>
              <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Manage dream symbols and interpretations</p>
            </div>
            <button 
              class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
              onClick={openAddModal}
              disabled={loading.value}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
            >
              <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
              <span>Add Dream Symbol</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div class="mb-4">
          <ul class="nav nav-tabs">
            <li class="nav-item">
              <button 
                class={`nav-link ${activeTab.value === 'symbols' ? 'active' : ''}`}
                onClick={() => switchTab('symbols')}
              >
                <MoonIcon style="width: 1.2rem; height: 1.2rem; display: inline-block; margin-right: 0.5rem;" />
                Dream Symbols
              </button>
            </li>
            <li class="nav-item">
              <button 
                class={`nav-link ${activeTab.value === 'requests' ? 'active' : ''}`}
                onClick={() => switchTab('requests')}
              >
                <InboxIcon style="width: 1.2rem; height: 1.2rem; display: inline-block; margin-right: 0.5rem;" />
                User Requests
                {requestStats.value.pending > 0 && (
                  <span class="badge bg-danger ms-2">{requestStats.value.pending}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        {/* Stats Cards */}
        {activeTab.value === 'symbols' && (
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Total Symbols</p>
                    <h3 class="mb-0 fw-bold text-dark">{dreamList.value.length}</h3>
                  </div>
                  <MoonIcon style="width: 2.5rem; height: 2.5rem; color: #6366f1;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Active</p>
                    <h3 class="mb-0 fw-bold text-dark">{dreamList.value.filter(d => d.status === 'Active').length}</h3>
                  </div>
                  <CheckCircleIcon style="width: 2.5rem; height: 2.5rem; color: #10b981;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Categories</p>
                    <h3 class="mb-0 fw-bold text-dark">{[...new Set(dreamList.value.map(d => d.category))].length}</h3>
                  </div>
                  <MoonIcon style="width: 2.5rem; height: 2.5rem; color: #f59e0b;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Total Views</p>
                    <h3 class="mb-0 fw-bold text-dark">{dreamList.value.reduce((sum, d) => sum + (d.viewCount || 0), 0)}</h3>
                  </div>
                  <EyeIcon style="width: 2.5rem; height: 2.5rem; color: #3b82f6;" />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab.value === 'requests' && (
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Pending</p>
                    <h3 class="mb-0 fw-bold text-warning">{requestStats.value.pending}</h3>
                  </div>
                  <InboxIcon style="width: 2.5rem; height: 2.5rem; color: #f59e0b;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">In Progress</p>
                    <h3 class="mb-0 fw-bold text-primary">{requestStats.value.inProgress}</h3>
                  </div>
                  <InboxIcon style="width: 2.5rem; height: 2.5rem; color: #3b82f6;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Completed</p>
                    <h3 class="mb-0 fw-bold text-success">{requestStats.value.completed}</h3>
                  </div>
                  <CheckCircleIcon style="width: 2.5rem; height: 2.5rem; color: #10b981;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Rejected</p>
                    <h3 class="mb-0 fw-bold text-danger">{requestStats.value.rejected}</h3>
                  </div>
                  <XCircleIcon style="width: 2.5rem; height: 2.5rem; color: #ef4444;" />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Dream List */}
        {activeTab.value === 'symbols' && (loading.value ? (
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status" style="color: #6366f1 !important;"></div>
          </div>
        ) : dreamList.value.length === 0 ? (
          <div class="text-center py-5">
            <div style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;">🌙</div>
            <h5 class="text-muted">No Dream Symbols yet</h5>
            <p class="text-muted">Create your first dream symbol to get started</p>
          </div>
        ) : (
          <div class="row g-4">
            {dreamList.value.map(dream => (
              <div key={dream._id} class="col-xl-4 col-lg-6 col-md-6">
                <div class={`card h-100 border-0 shadow-sm ${dream.status !== 'Active' ? 'opacity-50' : ''}`} style="border-radius: 12px; overflow: hidden;">
                  
                  {/* Thumbnail */}
                  {dream.thumbnailUrl && (
                    <div style="height: 180px; overflow: hidden;">
                      <img src={dream.thumbnailUrl} alt={dream.symbolName} class="w-100 h-100" style="object-fit: cover;" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  {dream.status !== 'Active' && (
                    <div class="position-absolute top-0 start-0 m-3" style="z-index: 1;">
                      <span class="badge bg-secondary px-2 py-1 rounded-pill">{dream.status}</span>
                    </div>
                  )}
                  
                  {/* Dropdown Menu */}
                  <div class="position-absolute top-0 end-0 m-3" style="z-index: 2;">
                    <div class="dropdown">
                      <button 
                        class="btn btn-light btn-sm rounded-circle"
                        onClick={(e) => { e.stopPropagation(); toggleDropdown(dream._id); }}
                        style="width: 32px; height: 32px;"
                      >
                        <EllipsisVerticalIcon style="width: 1rem; height: 1rem;" />
                      </button>
                      {showDropdown.value[dream._id] && (
                        <div class="dropdown-menu show position-absolute shadow-lg" style="right: 0; z-index: 1000;" onClick={(e) => e.stopPropagation()}>
                          {dream.status === 'Active' ? (
                            <>
                              <button class="dropdown-item" onClick={() => { viewDream(dream); closeAllDropdowns(); }}>
                                <EyeIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                View Details
                              </button>
                              <button class="dropdown-item" onClick={() => { openEditModal(dream); closeAllDropdowns(); }}>
                                <PencilIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Edit
                              </button>
                              <button class="dropdown-item" onClick={() => { toggleStatus(dream); closeAllDropdowns(); }}>
                                <XCircleIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Disable
                              </button>
                              <hr class="dropdown-divider" />
                              <button class="dropdown-item text-danger" onClick={() => { deleteDream(dream._id); closeAllDropdowns(); }}>
                                <TrashIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button class="dropdown-item" onClick={() => { toggleStatus(dream); closeAllDropdowns(); }}>
                              <CheckCircleIcon style="width: 1rem; height: 1rem;" class="me-2" />
                              Enable
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div class="card-body p-4">
                    <div class="mb-3">
                      <h5 class="card-title fw-bold mb-2">{dream.symbolName}</h5>
                      {dream.symbolNameHindi && <p class="text-muted mb-2" style="font-size: 0.9rem;">{dream.symbolNameHindi}</p>}
                      <div class="d-flex flex-wrap gap-1 mb-2">
                        <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 small">{dream.category}</span>
                        {dream.subcategory && <span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 small">{dream.subcategory}</span>}
                      </div>
                    </div>
                    
                    {dream.shortDescription && (
                      <p class="card-text text-muted mb-3" style="font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        {dream.shortDescription}
                      </p>
                    )}

                    {/* Stats */}
                    <div class="d-flex flex-wrap gap-2 mb-3 pb-3" style="border-bottom: 1px solid #e5e7eb;">
                      {dream.positiveAspects?.length > 0 && (
                        <span class="badge bg-success bg-opacity-10 text-success px-2 py-1 small">
                          ✅ {dream.positiveAspects.length}
                        </span>
                      )}
                      {dream.negativeAspects?.length > 0 && (
                        <span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 small">
                          ⚠️ {dream.negativeAspects.length}
                        </span>
                      )}
                      {dream.contextVariations?.length > 0 && (
                        <span class="badge bg-info bg-opacity-10 text-info px-2 py-1 small">
                          🔄 {dream.contextVariations.length}
                        </span>
                      )}
                      {dream.viewCount > 0 && (
                        <span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 small">
                          👁️ {dream.viewCount}
                        </span>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div class="mb-3" style="font-size: 0.85rem;">
                      {dream.astrologicalSignificance && (
                        <div class="mb-2">
                          <strong class="text-primary">🪐 Astro:</strong>
                          <span class="text-muted ms-1" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
                            {dream.astrologicalSignificance}
                          </span>
                        </div>
                      )}
                      {dream.vedicReferences && (
                        <div class="mb-2">
                          <strong class="text-warning">📖 Vedic:</strong>
                          <span class="text-muted ms-1" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
                            {dream.vedicReferences}
                          </span>
                        </div>
                      )}
                      {(dream.remedies?.mantras?.length > 0 || dream.remedies?.pujas?.length > 0) && (
                        <div class="mb-2">
                          <strong class="text-success">🙏 Remedies:</strong>
                          <span class="text-muted ms-1">
                            {dream.remedies.mantras?.filter(m => m).length || 0} Mantras, {dream.remedies.pujas?.filter(p => p).length || 0} Pujas
                          </span>
                        </div>
                      )}
                    </div>

                    <div class="d-flex justify-content-between align-items-center pt-2" style="border-top: 1px solid #e5e7eb;">
                      <span class={`badge ${dream.status === 'Active' ? 'bg-success' : 'bg-secondary'}`} style="font-size: 0.7rem;">{dream.status}</span>
                      <small class="text-muted" style="font-size: 0.75rem;">Order: {dream.sortOrder || 0}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Requests List */}
        {activeTab.value === 'requests' && (loading.value ? (
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status" style="color: #6366f1 !important;"></div>
          </div>
        ) : requestList.value.length === 0 ? (
          <div class="text-center py-5">
            <div style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;">📥</div>
            <h5 class="text-muted">No User Requests yet</h5>
            <p class="text-muted">User requests will appear here</p>
          </div>
        ) : (
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Dream Symbol</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestList.value.map(request => (
                  <tr key={request._id}>
                    <td><strong>{request.dreamSymbol}</strong></td>
                    <td>{request.userId?.name || request.userName || 'N/A'}</td>
                    <td>{request.userId?.email || request.userEmail}</td>
                    <td>
                      <span class={`badge ${
                        request.status === 'Pending' ? 'bg-warning' :
                        request.status === 'In Progress' ? 'bg-primary' :
                        request.status === 'Completed' ? 'bg-success' : 'bg-danger'
                      }`}>{request.status}</span>
                    </td>
                    <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary me-2" onClick={() => viewRequest(request)}>
                        <EyeIcon style="width: 1rem; height: 1rem;" />
                      </button>
                      <button class="btn btn-sm btn-outline-danger" onClick={() => deleteRequest(request._id)}>
                        <TrashIcon style="width: 1rem; height: 1rem;" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Add/Edit Modal */}
        {showModal.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeModal}>
            <div class="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content" style="border-radius: 12px;">
                <div class="modal-header">
                  <h5 class="modal-title fw-bold">{isEdit.value ? 'Edit' : 'Add'} Dream Symbol</h5>
                  <button type="button" class="btn-close" onClick={closeModal}></button>
                </div>
                <div class="modal-body p-3" style="max-height: 70vh; overflow-y: auto;">
                  <form>
                    {/* Basic Info */}
                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Symbol Name (English) *</label>
                        <input type="text" class="form-control" v-model={formData.value.symbolName} placeholder="e.g., Snake" />
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Symbol Name (Hindi) *</label>
                        <input type="text" class="form-control" v-model={formData.value.symbolNameHindi} placeholder="e.g., साँप" />
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Category *</label>
                        <select class="form-select" v-model={formData.value.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                          <option value="">Select Category</option>
                          {Object.keys(categories.value).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="CREATE_NEW" class="text-primary fw-bold">+ Create New Category</option>
                        </select>
                        {showCustomCategory.value && (
                          <div class="mt-2 p-2 border rounded bg-light">
                            <div class="d-flex gap-2">
                              <input type="text" class="form-control form-control-sm" placeholder="Enter new category" v-model={customCategoryName.value} />
                              <button type="button" class="btn btn-primary btn-sm" onClick={addNewCategory}>Add</button>
                              <button type="button" class="btn btn-secondary btn-sm" onClick={() => showCustomCategory.value = false}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Subcategory *</label>
                        <select class="form-select" v-model={formData.value.subcategory} onChange={(e) => handleSubcategoryChange(e.target.value)} disabled={!selectedCategory.value && !formData.value.category}>
                          <option value="">Select Subcategory</option>
                          {availableSubcategories.value.map(subcat => (
                            <option key={subcat} value={subcat}>{subcat}</option>
                          ))}
                          {(selectedCategory.value || formData.value.category) && (
                            <option value="CREATE_NEW" class="text-primary fw-bold">+ Create New Subcategory</option>
                          )}
                        </select>
                        {showCustomSubcategory.value && (
                          <div class="mt-2 p-2 border rounded bg-light">
                            <div class="d-flex gap-2">
                              <input type="text" class="form-control form-control-sm" placeholder="Enter new subcategory" v-model={customSubcategoryName.value} />
                              <button type="button" class="btn btn-primary btn-sm" onClick={addNewSubcategory}>Add</button>
                              <button type="button" class="btn btn-secondary btn-sm" onClick={() => showCustomSubcategory.value = false}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Thumbnail Image</label>
                      {isEdit.value && formData.value.thumbnailUrl && !thumbnailUploaded.value && (
                        <div class="mb-2 d-flex align-items-center gap-3">
                          <img src={formData.value.thumbnailUrl} alt="Current thumbnail" style="height: 60px; width: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #dee2e6;" />
                          <small class="text-muted">Current image — upload new to replace</small>
                        </div>
                      )}
                      <input type="file" class="form-control" accept="image/*" onChange={handleThumbnailUpload} />
                      {thumbnailUploaded.value && (
                        <small class="text-success mt-1 d-block">✓ {thumbnailFileName.value} selected (will replace current)</small>
                      )}
                      {uploadProgress.value > 0 && uploadProgress.value < 100 && (
                        <div class="progress mt-2" style="height: 4px;">
                          <div class="progress-bar" style={`width: ${uploadProgress.value}%`}></div>
                        </div>
                      )}
                      <small class="text-muted">Max 5MB (JPG, PNG, WEBP)</small>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Short Description</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.shortDescription} placeholder="Brief summary..."></textarea>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Detailed Interpretation</label>
                      <textarea class="form-control" rows="4" v-model={formData.value.detailedInterpretation} placeholder="Complete meaning..."></textarea>
                    </div>

                    {/* Positive Aspects */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Positive Aspects</label>
                        <button type="button" class="btn btn-sm btn-outline-success" onClick={addPositiveAspect}>
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add
                        </button>
                      </div>
                      {formData.value.positiveAspects.map((aspect, index) => (
                        <div key={index} class="card mb-2 p-3 bg-light">
                          <div class="d-flex justify-content-end mb-2">
                            {formData.value.positiveAspects.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removePositiveAspect(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                          <input type="text" class="form-control mb-2" placeholder="Point" v-model={aspect.point} />
                          <textarea class="form-control" rows="2" placeholder="Description" v-model={aspect.description}></textarea>
                        </div>
                      ))}
                    </div>

                    {/* Negative Aspects */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Negative Aspects</label>
                        <button type="button" class="btn btn-sm btn-outline-danger" onClick={addNegativeAspect}>
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add
                        </button>
                      </div>
                      {formData.value.negativeAspects.map((aspect, index) => (
                        <div key={index} class="card mb-2 p-3 bg-light">
                          <div class="d-flex justify-content-end mb-2">
                            {formData.value.negativeAspects.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeNegativeAspect(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                          <input type="text" class="form-control mb-2" placeholder="Point" v-model={aspect.point} />
                          <textarea class="form-control" rows="2" placeholder="Description" v-model={aspect.description}></textarea>
                        </div>
                      ))}
                    </div>

                    {/* Context Variations */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Context Variations</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onClick={addContextVariation}>
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add
                        </button>
                      </div>
                      {formData.value.contextVariations.map((variation, index) => (
                        <div key={index} class="card mb-2 p-3 bg-light">
                          <div class="d-flex justify-content-end mb-2">
                            {formData.value.contextVariations.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeContextVariation(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                          <input type="text" class="form-control mb-2" placeholder="Context (e.g., Snake biting)" v-model={variation.context} />
                          <textarea class="form-control" rows="2" placeholder="Meaning" v-model={variation.meaning}></textarea>
                        </div>
                      ))}
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Astrological Significance</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.astrologicalSignificance} placeholder="Planetary connections..."></textarea>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Vedic References</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.vedicReferences} placeholder="Scripture references..."></textarea>
                    </div>

                    {/* Remedies */}
                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">Remedies</h6>
                      
                      {/* Mantras */}
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label fw-semibold mb-0">Mantras</label>
                          <button type="button" class="btn btn-sm btn-outline-primary" onClick={addMantra}>
                            <PlusIcon style="width: 14px; height: 14px;" class="me-1" />
                            Add
                          </button>
                        </div>
                        {formData.value.remedies.mantras.map((mantra, index) => (
                          <div key={index} class="d-flex gap-2 mb-2">
                            <input type="text" class="form-control" placeholder="Mantra text" v-model={formData.value.remedies.mantras[index]} />
                            {formData.value.remedies.mantras.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeMantra(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Pujas */}
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label fw-semibold mb-0">Pujas</label>
                          <button type="button" class="btn btn-sm btn-outline-primary" onClick={addPuja}>
                            <PlusIcon style="width: 14px; height: 14px;" class="me-1" />
                            Add
                          </button>
                        </div>
                        {formData.value.remedies.pujas.map((puja, index) => (
                          <div key={index} class="d-flex gap-2 mb-2">
                            <input type="text" class="form-control" placeholder="Puja name" v-model={formData.value.remedies.pujas[index]} />
                            {formData.value.remedies.pujas.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removePuja(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Donations */}
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label fw-semibold mb-0">Donations</label>
                          <button type="button" class="btn btn-sm btn-outline-primary" onClick={addDonation}>
                            <PlusIcon style="width: 14px; height: 14px;" class="me-1" />
                            Add
                          </button>
                        </div>
                        {formData.value.remedies.donations.map((donation, index) => (
                          <div key={index} class="d-flex gap-2 mb-2">
                            <input type="text" class="form-control" placeholder="Donation item" v-model={formData.value.remedies.donations[index]} />
                            {formData.value.remedies.donations.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeDonation(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Precautions */}
                      <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <label class="form-label fw-semibold mb-0">Precautions</label>
                          <button type="button" class="btn btn-sm btn-outline-primary" onClick={addPrecaution}>
                            <PlusIcon style="width: 14px; height: 14px;" class="me-1" />
                            Add
                          </button>
                        </div>
                        {formData.value.remedies.precautions.map((precaution, index) => (
                          <div key={index} class="d-flex gap-2 mb-2">
                            <input type="text" class="form-control" placeholder="Precaution" v-model={formData.value.remedies.precautions[index]} />
                            {formData.value.remedies.precautions.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removePrecaution(index)}>
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Fields */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Frequency Impact</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.frequencyImpact} placeholder="Impact of dream frequency..."></textarea>
                    </div>

                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">Time Significance</h6>
                      <div class="row">
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Morning</label>
                          <input type="text" class="form-control" v-model={formData.value.timeSignificance.morning} placeholder="Morning meaning" />
                        </div>
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Night</label>
                          <input type="text" class="form-control" v-model={formData.value.timeSignificance.night} placeholder="Night meaning" />
                        </div>
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Brahma Muhurat</label>
                          <input type="text" class="form-control" v-model={formData.value.timeSignificance.brahmaMuhurat} placeholder="Brahma muhurat meaning" />
                        </div>
                      </div>
                    </div>

                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">Gender Specific Meaning</h6>
                      <div class="row">
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Male</label>
                          <textarea class="form-control" rows="2" v-model={formData.value.genderSpecific.male} placeholder="For males"></textarea>
                        </div>
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Female</label>
                          <textarea class="form-control" rows="2" v-model={formData.value.genderSpecific.female} placeholder="For females"></textarea>
                        </div>
                        <div class="col-md-4 mb-2">
                          <label class="form-label">Common</label>
                          <textarea class="form-control" rows="2" v-model={formData.value.genderSpecific.common} placeholder="Common meaning"></textarea>
                        </div>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Related Symbols (comma separated)</label>
                      <input type="text" class="form-control" v-model={relatedSymbolsInput.value} placeholder="e.g., Snake, Poison, Fear" />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Tags (comma separated)</label>
                      <input type="text" class="form-control" v-model={tagsInput.value} placeholder="e.g., fear, transformation, danger" />
                    </div>

                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Status</label>
                        <select class="form-select" v-model={formData.value.status}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Sort Order {!isEdit.value && <span class="badge bg-success ms-1" style="font-size: 0.7rem;">Auto</span>}</label>
                        <input type="number" class="form-control" v-model={formData.value.sortOrder} placeholder="Auto-generated" readonly={!isEdit.value} />
                        {!isEdit.value && <small class="text-muted">Auto-generated based on existing dreams</small>}
                      </div>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onClick={closeModal} disabled={loading.value}>Cancel</button>
                  <button type="button" class="btn btn-primary" onClick={handleSubmit} disabled={loading.value}>
                    {loading.value ? 'Saving...' : (isEdit.value ? 'Update' : 'Create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedDream.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeViewModal}>
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content" style="border-radius: 12px;">
                <div class="modal-header">
                  <h5 class="modal-title fw-bold">🌙 {selectedDream.value.symbolName} ({selectedDream.value.symbolNameHindi})</h5>
                  <button type="button" class="btn-close" onClick={closeViewModal}></button>
                </div>
                <div class="modal-body p-4" style="max-height: 75vh; overflow-y: auto;">
                  {selectedDream.value.thumbnailUrl && (
                    <div class="mb-4 text-center">
                      <img src={selectedDream.value.thumbnailUrl} alt={selectedDream.value.symbolName} style="max-height: 300px; border-radius: 12px;" />
                    </div>
                  )}
                  
                  <div class="row mb-4">
                    <div class="col-md-4">
                      <strong>Category:</strong> <span class="badge bg-primary ms-1">{selectedDream.value.category}</span>
                    </div>
                    <div class="col-md-4">
                      <strong>Subcategory:</strong> <span class="badge bg-secondary ms-1">{selectedDream.value.subcategory || 'N/A'}</span>
                    </div>
                    <div class="col-md-4">
                      <strong>Status:</strong> <span class={`badge ms-1 ${selectedDream.value.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>{selectedDream.value.status}</span>
                    </div>
                  </div>

                  {selectedDream.value.shortDescription && (
                    <div class="mb-4 p-3 bg-light rounded">
                      <h6 class="fw-bold mb-2">📝 Short Description</h6>
                      <p class="mb-0">{selectedDream.value.shortDescription}</p>
                    </div>
                  )}

                  {selectedDream.value.detailedInterpretation && (
                    <div class="mb-4 p-3 bg-light rounded">
                      <h6 class="fw-bold mb-2">📖 Detailed Interpretation</h6>
                      <p class="mb-0">{selectedDream.value.detailedInterpretation}</p>
                    </div>
                  )}

                  {selectedDream.value.positiveAspects?.length > 0 && (
                    <div class="mb-4">
                      <h6 class="fw-bold text-success mb-3">✅ Positive Aspects ({selectedDream.value.positiveAspects.length})</h6>
                      {selectedDream.value.positiveAspects.map((aspect, i) => (
                        <div key={i} class="mb-2 p-3 border border-success rounded bg-success bg-opacity-10">
                          <strong class="text-success">{aspect.point}</strong>
                          <p class="mb-0 mt-1">{aspect.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDream.value.negativeAspects?.length > 0 && (
                    <div class="mb-4">
                      <h6 class="fw-bold text-danger mb-3">⚠️ Negative Aspects ({selectedDream.value.negativeAspects.length})</h6>
                      {selectedDream.value.negativeAspects.map((aspect, i) => (
                        <div key={i} class="mb-2 p-3 border border-danger rounded bg-danger bg-opacity-10">
                          <strong class="text-danger">{aspect.point}</strong>
                          <p class="mb-0 mt-1">{aspect.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDream.value.contextVariations?.length > 0 && (
                    <div class="mb-4">
                      <h6 class="fw-bold text-info mb-3">🔄 Context Variations ({selectedDream.value.contextVariations.length})</h6>
                      {selectedDream.value.contextVariations.map((variation, i) => (
                        <div key={i} class="mb-2 p-3 border border-info rounded bg-info bg-opacity-10">
                          <strong class="text-info">{variation.context}</strong>
                          <p class="mb-0 mt-1">{variation.meaning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedDream.value.astrologicalSignificance && (
                    <div class="mb-4 p-3 bg-light rounded">
                      <h6 class="fw-bold mb-2">🪐 Astrological Significance</h6>
                      <p class="mb-0">{selectedDream.value.astrologicalSignificance}</p>
                    </div>
                  )}

                  {selectedDream.value.vedicReferences && (
                    <div class="mb-4 p-3 bg-light rounded">
                      <h6 class="fw-bold mb-2">📚 Vedic References</h6>
                      <p class="mb-0">{selectedDream.value.vedicReferences}</p>
                    </div>
                  )}

                  {(selectedDream.value.remedies?.mantras?.filter(m => m).length > 0 || 
                    selectedDream.value.remedies?.pujas?.filter(p => p).length > 0 || 
                    selectedDream.value.remedies?.donations?.filter(d => d).length > 0 || 
                    selectedDream.value.remedies?.precautions?.filter(p => p).length > 0) && (
                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">🙏 Remedies</h6>
                      <div class="row">
                        {selectedDream.value.remedies.mantras?.filter(m => m).length > 0 && (
                          <div class="col-md-6 mb-3">
                            <div class="p-3 border rounded">
                              <strong class="text-primary">Mantras:</strong>
                              <ul class="mb-0 mt-2">
                                {selectedDream.value.remedies.mantras.filter(m => m).map((mantra, i) => (
                                  <li key={i}>{mantra}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.remedies.pujas?.filter(p => p).length > 0 && (
                          <div class="col-md-6 mb-3">
                            <div class="p-3 border rounded">
                              <strong class="text-success">Pujas:</strong>
                              <ul class="mb-0 mt-2">
                                {selectedDream.value.remedies.pujas.filter(p => p).map((puja, i) => (
                                  <li key={i}>{puja}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.remedies.donations?.filter(d => d).length > 0 && (
                          <div class="col-md-6 mb-3">
                            <div class="p-3 border rounded">
                              <strong class="text-warning">Donations:</strong>
                              <ul class="mb-0 mt-2">
                                {selectedDream.value.remedies.donations.filter(d => d).map((donation, i) => (
                                  <li key={i}>{donation}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.remedies.precautions?.filter(p => p).length > 0 && (
                          <div class="col-md-6 mb-3">
                            <div class="p-3 border rounded">
                              <strong class="text-danger">Precautions:</strong>
                              <ul class="mb-0 mt-2">
                                {selectedDream.value.remedies.precautions.filter(p => p).map((precaution, i) => (
                                  <li key={i}>{precaution}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDream.value.frequencyImpact && (
                    <div class="mb-4 p-3 bg-light rounded">
                      <h6 class="fw-bold mb-2">🔁 Frequency Impact</h6>
                      <p class="mb-0">{selectedDream.value.frequencyImpact}</p>
                    </div>
                  )}

                  {(selectedDream.value.timeSignificance?.morning || selectedDream.value.timeSignificance?.night || selectedDream.value.timeSignificance?.brahmaMuhurat) && (
                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">⏰ Time Significance</h6>
                      <div class="row">
                        {selectedDream.value.timeSignificance.morning && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-warning">🌅 Morning:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.timeSignificance.morning}</p>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.timeSignificance.night && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-primary">🌙 Night:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.timeSignificance.night}</p>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.timeSignificance.brahmaMuhurat && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-success">🕉️ Brahma Muhurat:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.timeSignificance.brahmaMuhurat}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedDream.value.genderSpecific?.male || selectedDream.value.genderSpecific?.female || selectedDream.value.genderSpecific?.common) && (
                    <div class="mb-4">
                      <h6 class="fw-bold mb-3">👥 Gender Specific Meaning</h6>
                      <div class="row">
                        {selectedDream.value.genderSpecific.male && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-primary">♂️ Male:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.genderSpecific.male}</p>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.genderSpecific.female && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-danger">♀️ Female:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.genderSpecific.female}</p>
                            </div>
                          </div>
                        )}
                        {selectedDream.value.genderSpecific.common && (
                          <div class="col-md-4 mb-2">
                            <div class="p-3 border rounded">
                              <strong class="text-secondary">⚥ Common:</strong>
                              <p class="mb-0 mt-1 small">{selectedDream.value.genderSpecific.common}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDream.value.relatedSymbols?.length > 0 && (
                    <div class="mb-4">
                      <h6 class="fw-bold mb-2">🔗 Related Symbols</h6>
                      <div class="d-flex flex-wrap gap-2">
                        {selectedDream.value.relatedSymbols.map((symbol, i) => (
                          <span key={i} class="badge bg-secondary">{symbol}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDream.value.tags?.length > 0 && (
                    <div class="mb-4">
                      <h6 class="fw-bold mb-2">🏷️ Tags</h6>
                      <div class="d-flex flex-wrap gap-2">
                        {selectedDream.value.tags.map((tag, i) => (
                          <span key={i} class="badge bg-primary">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div class="row mt-4 pt-3" style="border-top: 2px solid #e5e7eb;">
                    <div class="col-md-4">
                      <small class="text-muted"><strong>Sort Order:</strong> {selectedDream.value.sortOrder || 0}</small>
                    </div>
                    <div class="col-md-4">
                      <small class="text-muted"><strong>View Count:</strong> {selectedDream.value.viewCount || 0}</small>
                    </div>
                    <div class="col-md-4">
                      <small class="text-muted"><strong>Created:</strong> {new Date(selectedDream.value.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onClick={closeViewModal}>Close</button>
                  <button type="button" class="btn btn-primary" onClick={() => { closeViewModal(); openEditModal(selectedDream.value); }}>Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Request View Modal */}
        {showRequestModal.value && selectedRequest.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeRequestModal}>
            <div class="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content" style="border-radius: 12px;">
                <div class="modal-header">
                  <h5 class="modal-title fw-bold">Dream Request Details</h5>
                  <button type="button" class="btn-close" onClick={closeRequestModal}></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <strong>Dream Symbol:</strong>
                    <p class="mb-0">{selectedRequest.value.dreamSymbol}</p>
                  </div>
                  <div class="mb-3">
                    <strong>User Name:</strong>
                    <p class="mb-0">{selectedRequest.value.userId?.name || selectedRequest.value.userName || 'N/A'}</p>
                  </div>
                  <div class="mb-3">
                    <strong>Email:</strong>
                    <p class="mb-0">{selectedRequest.value.userId?.email || selectedRequest.value.userEmail}</p>
                  </div>
                  {selectedRequest.value.additionalDetails && (
                    <div class="mb-3">
                      <strong>Additional Details:</strong>
                      <p class="mb-0">{selectedRequest.value.additionalDetails}</p>
                    </div>
                  )}
                  <div class="mb-3">
                    <strong>Status:</strong>
                    <span class={`badge ms-2 ${
                      selectedRequest.value.status === 'Pending' ? 'bg-warning' :
                      selectedRequest.value.status === 'In Progress' ? 'bg-primary' :
                      selectedRequest.value.status === 'Completed' ? 'bg-success' : 'bg-danger'
                    }`}>{selectedRequest.value.status}</span>
                  </div>
                  <div class="mb-3">
                    <strong>Requested On:</strong>
                    <p class="mb-0">{new Date(selectedRequest.value.createdAt).toLocaleString()}</p>
                  </div>
                  <div class="mb-3">
                    <strong>Update Status:</strong>
                    <div class="btn-group w-100 mt-2" role="group">
                      <button 
                        class="btn btn-sm btn-outline-warning" 
                        onClick={() => updateRequestStatus(selectedRequest.value._id, 'Pending')}
                        disabled={selectedRequest.value.status === 'Pending' || selectedRequest.value.status === 'Completed'}
                      >
                        Pending
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-primary" 
                        onClick={() => updateRequestStatus(selectedRequest.value._id, 'In Progress')}
                        disabled={selectedRequest.value.status === 'In Progress' || selectedRequest.value.status === 'Completed'}
                      >
                        In Progress
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-success" 
                        onClick={() => updateRequestStatus(selectedRequest.value._id, 'Completed')}
                        disabled={selectedRequest.value.status === 'Completed'}
                      >
                        Completed
                      </button>
                      <button 
                        class="btn btn-sm btn-outline-danger" 
                        onClick={() => updateRequestStatus(selectedRequest.value._id, 'Rejected')}
                        disabled={selectedRequest.value.status === 'Rejected' || selectedRequest.value.status === 'Completed'}
                      >
                        Rejected
                      </button>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-success" onClick={() => openAddModalFromRequest(selectedRequest.value)}>
                    <PlusIcon style="width: 1rem; height: 1rem;" class="me-1" />
                    Add Dream for this Request
                  </button>
                  <button type="button" class="btn btn-secondary" onClick={closeRequestModal}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ArrowLeftIcon, ChartBarIcon, EllipsisVerticalIcon, EyeIcon, RectangleStackIcon, CheckBadgeIcon, BookOpenIcon, SparklesIcon, ClockIcon, CalendarIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';
import pujaPadhatiService from '../../services/pujaPadhatiService';

export default {
  name: 'PujaPadhati',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const pujaList = ref([]);
    const showModal = ref(false);
    const showViewModal = ref(false);
    const isEdit = ref(false);
    const selectedPuja = ref(null);
    const showDropdown = ref({});

    const thumbnailUploaded = ref(false);
    const thumbnailFileName = ref('');
    const uploadProgress = ref(0);
    const audioUploaded = ref(false);
    const audioFileName = ref('');
    const videoUploaded = ref(false);
    const videoFileName = ref('');
    const audioUploadProgress = ref(0);
    const videoUploadProgress = ref(0);
    const selectedCategory = ref('');
    const availableSubcategories = ref([]);
    const showCustomCategory = ref(false);
    const customCategoryName = ref('');
    const showCustomSubcategory = ref(false);
    const customSubcategoryName = ref('');
    const showMediaModal = ref(false);
    const mediaModalUrl = ref('');
    const mediaModalType = ref('');

    const formData = ref({
      pujaName: '',
      category: 'Daily Puja',
      subcategory: '',
      purpose: '',
      description: '',
      bestDay: '',
      duration: '',
      language: 'Hindi',
      thumbnailImage: null,
      audioFile: null,
      videoFile: null,
      pujaVidhi: [{ stepNumber: 1, title: '', description: '' }],
      samagriList: [{ itemName: '', quantity: '', isOptional: false }],
      mantras: [{ mantraText: '', meaning: '' }],
      specialInstructions: '',
      muhurat: '',
      status: 'Active',
      sortOrder: 0
    });

    const categories = ref({
      'Daily Puja': ['Morning Puja', 'Evening Puja', 'Sandhya Puja', 'Other'],
      'Festival Puja': ['Diwali', 'Holi', 'Navratri', 'Janmashtami', 'Other'],
      'Vrat / Katha': ['Satyanarayan Katha', 'Ekadashi Vrat', 'Karva Chauth', 'Other'],
      'Grah Shanti': ['Navagraha Puja', 'Shani Puja', 'Rahu-Ketu Puja', 'Other'],
      'Special Occasion': ['Griha Pravesh', 'Marriage', 'Mundan', 'Annaprashan', 'Other'],
      'Deity Specific': ['Ganesh Puja', 'Lakshmi Puja', 'Shiva Puja', 'Durga Puja', 'Other']
    });

    const languages = ['Hindi', 'English', 'Sanskrit', 'Tamil', 'Telugu', 'Bengali'];

    const resolvedClientId = ref(null);

    const getClientId = async () => {
      // Return cached value if already resolved
      if (resolvedClientId.value) return resolvedClientId.value;

      try {
        const token = localStorage.getItem('token_client');
        if (!token) return null;

        // Try JWT payload first (works after re-login with new backend)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.clientId) {
            resolvedClientId.value = payload.clientId;
            return payload.clientId;
          }
        } catch (e) { /* ignore */ }

        // Fallback: fetch from /auth/client/me (works with old tokens too)
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API_URL}/auth/client/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const id = json?.data?.user?.clientId || json?.data?.user?._id || null;
          resolvedClientId.value = id;
          return id;
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    const fetchPujas = async () => {
      loading.value = true;
      try {
        const clientId = await getClientId();
        const data = await pujaPadhatiService.getAll({ clientId });
        pujaList.value = data;
      } catch (error) {
        console.error('Error loading pujas:', error);
        toast.error('Error loading pujas');
      } finally {
        loading.value = false;
      }
    };

    const openAddModal = () => {
      isEdit.value = false;
      
      // Calculate next sort order
      const maxSort = pujaList.value.length > 0 
        ? Math.max(...pujaList.value.map(p => p.sortOrder || 0))
        : 0;
      
      formData.value = {
        pujaName: '',
        category: 'Daily Puja',
        subcategory: '',
        purpose: '',
        description: '',
        bestDay: '',
        duration: '',
        language: 'Hindi',
        thumbnailImage: null,
        pujaVidhi: [{ stepNumber: 1, title: '', description: '' }],
        samagriList: [{ itemName: '', quantity: '', isOptional: false }],
        mantras: [{ mantraText: '', meaning: '' }],
        specialInstructions: '',
        muhurat: '',
        audioUrl: '',
        videoUrl: '',
        status: 'Active',
        sortOrder: maxSort + 1
      };
      selectedCategory.value = '';
      availableSubcategories.value = [];
      thumbnailUploaded.value = false;
      thumbnailFileName.value = '';
      audioUploaded.value = false;
      audioFileName.value = '';
      videoUploaded.value = false;
      videoFileName.value = '';
      showCustomCategory.value = false;
      showCustomSubcategory.value = false;
      customCategoryName.value = '';
      customSubcategoryName.value = '';
      showModal.value = true;
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

    const handleAudioUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error('Audio file size must be less than 50MB');
          return;
        }
        if (!file.type.startsWith('audio/')) {
          toast.error('Please upload an audio file');
          return;
        }
        formData.value.audioFile = file;
        audioUploaded.value = true;
        audioFileName.value = file.name;
      }
    };

    const handleVideoUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error('Video file size must be less than 100MB');
          return;
        }
        if (!file.type.startsWith('video/')) {
          toast.error('Please upload a video file');
          return;
        }
        formData.value.videoFile = file;
        videoUploaded.value = true;
        videoFileName.value = file.name;
      }
    };

    const openEditModal = async (puja) => {
      isEdit.value = true;
      loading.value = true;
      try {
        const full = await pujaPadhatiService.getById(puja._id);
        selectedPuja.value = full;
        formData.value = {
          ...full,
          thumbnailImage: null,
          pujaVidhi: JSON.parse(JSON.stringify(full.pujaVidhi?.length ? full.pujaVidhi : [{ stepNumber: 1, title: '', description: '' }])),
          samagriList: JSON.parse(JSON.stringify(full.samagriList?.length ? full.samagriList : [{ itemName: '', quantity: '', isOptional: false }])),
          mantras: JSON.parse(JSON.stringify(full.mantras?.length ? full.mantras : [{ mantraText: '', meaning: '' }]))
        };
        selectedCategory.value = full.category;
        availableSubcategories.value = categories.value[full.category] || [];
      } catch {
        selectedPuja.value = puja;
        formData.value = {
          ...puja,
          thumbnailImage: null,
          pujaVidhi: JSON.parse(JSON.stringify(puja.pujaVidhi?.length ? puja.pujaVidhi : [{ stepNumber: 1, title: '', description: '' }])),
          samagriList: JSON.parse(JSON.stringify(puja.samagriList?.length ? puja.samagriList : [{ itemName: '', quantity: '', isOptional: false }])),
          mantras: JSON.parse(JSON.stringify(puja.mantras?.length ? puja.mantras : [{ mantraText: '', meaning: '' }]))
        };
        selectedCategory.value = puja.category;
        availableSubcategories.value = categories.value[puja.category] || [];
      } finally {
        loading.value = false;
      }
      thumbnailUploaded.value = false;
      thumbnailFileName.value = '';
      audioUploaded.value = false;
      audioFileName.value = '';
      videoUploaded.value = false;
      videoFileName.value = '';
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      formData.value = {
        pujaName: '',
        category: 'Daily Puja',
        subcategory: '',
        purpose: '',
        description: '',
        bestDay: '',
        duration: '',
        language: 'Hindi',
        thumbnailImage: null,
        pujaVidhi: [{ stepNumber: 1, title: '', description: '' }],
        samagriList: [{ itemName: '', quantity: '', isOptional: false }],
        mantras: [{ mantraText: '', meaning: '' }],
        specialInstructions: '',
        muhurat: '',
        audioUrl: '',
        videoUrl: '',
        status: 'Active',
        sortOrder: 0
      };
    };

    const addVidhiStep = () => {
      formData.value.pujaVidhi.push({
        stepNumber: formData.value.pujaVidhi.length + 1,
        title: '',
        description: ''
      });
    };

    const removeVidhiStep = (index) => {
      formData.value.pujaVidhi.splice(index, 1);
      formData.value.pujaVidhi.forEach((step, i) => {
        step.stepNumber = i + 1;
      });
    };

    const addSamagriItem = () => {
      formData.value.samagriList.push({ itemName: '', quantity: '', isOptional: false });
    };

    const removeSamagriItem = (index) => {
      formData.value.samagriList.splice(index, 1);
    };

    const addMantra = () => {
      formData.value.mantras.push({ mantraText: '', meaning: '' });
    };

    const removeMantra = (index) => {
      formData.value.mantras.splice(index, 1);
    };

    const handleSubmit = async () => {
      if (!formData.value.pujaName || !formData.value.category) {
        toast.error('Please fill all required fields');
        return;
      }
      
      const clientId = await getClientId();
      if (!clientId) {
        toast.error('Client ID not found. Please login again.');
        return;
      }
      
      loading.value = true;
      uploadProgress.value = 0;
      
      try {
        let thumbnailUrl = formData.value.thumbnailUrl;
        let thumbnailKey = formData.value.thumbnailKey;
        let audioUrl = formData.value.audioUrl;
        let audioKey = formData.value.audioKey;
        let videoUrl = formData.value.videoUrl;
        let videoKey = formData.value.videoKey;
        
        // Upload new thumbnail if selected
        if (formData.value.thumbnailImage) {
          try {
            const file = formData.value.thumbnailImage;
            const { uploadUrl, fileUrl: tFileUrl, key: tKey } = await pujaPadhatiService.getUploadUrl(
              file.name,
              file.type
            );
            
            await pujaPadhatiService.uploadToStorage(uploadUrl, file, (progress) => {
              uploadProgress.value = progress;
            });
            
            thumbnailUrl = tFileUrl;
            thumbnailKey = tKey;
          } catch (uploadError) {
            console.error('Error uploading thumbnail:', uploadError);
            toast.error('Failed to upload thumbnail');
            loading.value = false;
            return;
          }
        }

        // Upload audio if selected
        if (formData.value.audioFile) {
          try {
            const file = formData.value.audioFile;
            const { uploadUrl, fileUrl: aFileUrl, key: aKey } = await pujaPadhatiService.getUploadUrl(
              file.name,
              file.type
            );
            
            await pujaPadhatiService.uploadToStorage(uploadUrl, file, (progress) => {
              audioUploadProgress.value = progress;
            });
            
            audioUrl = aFileUrl;
            audioKey = aKey;
          } catch (uploadError) {
            console.error('Error uploading audio:', uploadError);
            toast.error('Failed to upload audio');
            loading.value = false;
            return;
          }
        }

        // Upload video if selected
        if (formData.value.videoFile) {
          try {
            const file = formData.value.videoFile;
            const { uploadUrl, fileUrl: vFileUrl, key: vKey } = await pujaPadhatiService.getUploadUrl(
              file.name,
              file.type
            );
            
            await pujaPadhatiService.uploadToStorage(uploadUrl, file, (progress) => {
              videoUploadProgress.value = progress;
            });
            
            videoUrl = vFileUrl;
            videoKey = vKey;
          } catch (uploadError) {
            console.error('Error uploading video:', uploadError);
            toast.error('Failed to upload video');
            loading.value = false;
            return;
          }
        }
        
        const data = {
          pujaName: formData.value.pujaName,
          category: formData.value.category,
          subcategory: formData.value.subcategory,
          purpose: formData.value.purpose,
          description: formData.value.description,
          bestDay: formData.value.bestDay,
          duration: formData.value.duration ? Number(formData.value.duration) : undefined,
          language: formData.value.language,
          thumbnailUrl,
          thumbnailKey,
          audioUrl,
          audioKey,
          videoUrl,
          videoKey,
          pujaVidhi: formData.value.pujaVidhi.filter(step => step.title.trim() && step.description.trim()),
          samagriList: formData.value.samagriList.filter(item => item.itemName.trim()),
          mantras: formData.value.mantras.filter(mantra => mantra.mantraText.trim()),
          specialInstructions: formData.value.specialInstructions,
          muhurat: formData.value.muhurat,
          status: formData.value.status,
          sortOrder: formData.value.sortOrder ? Number(formData.value.sortOrder) : undefined,
          clientId: clientId
        };
        
        if (isEdit.value) {
          await pujaPadhatiService.update(selectedPuja.value._id, data);
          toast.success('Puja updated successfully!');
        } else {
          await pujaPadhatiService.create(data);
          toast.success('Puja created successfully!');
        }
        
        closeModal();
        await fetchPujas();
      } catch (error) {
        console.error('Error saving puja:', error);
        console.error('Error response:', error.response?.data);
        toast.error(error.response?.data?.error || 'Error saving puja');
      } finally {
        loading.value = false;
        uploadProgress.value = 0;
      }
    };

    const deletePuja = async (id) => {
      if (!confirm('Are you sure you want to delete this Puja?')) return;
      try {
        await pujaPadhatiService.delete(id);
        toast.success('Puja deleted successfully!');
        await fetchPujas();
      } catch (error) {
        console.error('Error deleting puja:', error);
        toast.error('Error deleting puja');
      }
    };

    const toggleStatus = async (puja) => {
      try {
        const response = await pujaPadhatiService.toggleStatus(puja._id);
        toast.success(`Puja ${response.data.status === 'Active' ? 'enabled' : 'disabled'} successfully!`);
        await fetchPujas();
      } catch (error) {
        console.error('Error toggling status:', error);
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

    const viewPuja = async (puja) => {
      closeAllDropdowns();
      try {
        const full = await pujaPadhatiService.getById(puja._id);
        selectedPuja.value = full;
      } catch {
        selectedPuja.value = puja;
      }
      showViewModal.value = true;
    };

    const closeViewModal = () => {
      showViewModal.value = false;
      selectedPuja.value = null;
    };

    const openMediaModal = (url, type) => {
      mediaModalUrl.value = url;
      mediaModalType.value = type;
      showMediaModal.value = true;
    };

    const closeMediaModal = () => {
      showMediaModal.value = false;
      mediaModalUrl.value = '';
      mediaModalType.value = '';
    };

    const goBack = () => {
      router.push('/client/tools');
    };

    onMounted(() => {
      fetchPujas();
      document.addEventListener('click', closeAllDropdowns);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', closeAllDropdowns);
    });

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <style>{`
          .puja-card {
            transition: all 0.3s ease;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          }
          .puja-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          }
          .status-badge {
            font-size: 0.75rem;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-weight: 600;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
          }
          .action-btn {
            padding: 0.5rem;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
          }
          .action-btn:hover {
            background: #f9fafb;
            border-color: #9333ea;
          }
        `}</style>

        {/* Header */}
        <div class="bg-gradient-primary rounded-4 p-4 mb-4 text-white shadow-lg">
          <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
            <button 
              class="btn btn-light btn-sm rounded-pill px-3" 
              onClick={goBack}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
              <span class="d-none d-sm-inline">Back to Tools</span>
              <span class="d-sm-none">Back</span>
            </button>
            <div class="flex-grow-1">
              <h1 class="mb-1 fw-bold fs-2 text-dark">📿 पूजा पद्धति Management</h1>
              <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Create and manage puja methods, vidhi, mantras and samagri</p>
              {!loading.value && pujaList.value.length > 0 && (
                <small class="text-dark d-block mt-1" style={{ opacity: 0.8 }}>
                  <ChartBarIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                  {pujaList.value.length} total pujas • {pujaList.value.filter(p => p.status === 'Active').length} active
                </small>
              )}
            </div>
            <button 
              class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
              onClick={openAddModal}
              disabled={loading.value}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
            >
              <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
              <span class="d-none d-sm-inline">Add Puja</span>
              <span class="d-sm-none">Add</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: white;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Total Pujas</p>
                    <h3 class="mb-0 fw-bold text-dark">{pujaList.value.length}</h3>
                  </div>
                  <RectangleStackIcon style="width: 2.5rem; height: 2.5rem; color: #9333ea;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: white;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Active</p>
                    <h3 class="mb-0 fw-bold text-dark">{pujaList.value.filter(p => p.status === 'Active').length}</h3>
                  </div>
                  <CheckBadgeIcon style="width: 2.5rem; height: 2.5rem; color: #10b981;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: white;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Categories</p>
                    <h3 class="mb-0 fw-bold text-dark">{[...new Set(pujaList.value.map(p => p.category))].length}</h3>
                  </div>
                  <BookOpenIcon style="width: 2.5rem; height: 2.5rem; color: #f59e0b;" />
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: white;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <p class="mb-1 text-muted" style="font-size: 0.875rem;">Total Mantras</p>
                    <h3 class="mb-0 fw-bold text-dark">{pujaList.value.reduce((sum, p) => sum + (p.mantras?.length || 0), 0)}</h3>
                  </div>
                  <SparklesIcon style="width: 2.5rem; height: 2.5rem; color: #3b82f6;" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Puja List */}
        {loading.value ? (
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status" style="color: #9333ea !important;"></div>
          </div>
        ) : pujaList.value.length === 0 ? (
          <div class="text-center py-5">
            <div style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;">📿</div>
            <h5 class="text-muted">No Pujas yet</h5>
            <p class="text-muted">Create your first Puja to get started</p>
          </div>
        ) : (
          <div class="row g-4">
            {pujaList.value.map(puja => (
              <div key={puja._id} class="col-xl-4 col-lg-6 col-md-6">
                <div class={`card h-100 border-0 shadow-sm ${puja.status !== 'Active' ? 'opacity-50' : ''}`} style="border-radius: 12px; overflow: hidden;">
                  
                  {/* Thumbnail Image */}
                  {puja.thumbnailUrl && (
                    <div style="height: 180px; overflow: hidden;">
                      <img src={puja.thumbnailUrl} alt={puja.pujaName} class="w-100 h-100" style="object-fit: cover;" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  {puja.status !== 'Active' && (
                    <div class="position-absolute top-0 start-0 m-3" style="z-index: 1;">
                      <span class="badge bg-secondary px-2 py-1 rounded-pill">{puja.status}</span>
                    </div>
                  )}
                  
                  {/* Dropdown Menu */}
                  <div class="position-absolute top-0 end-0 m-3" style="z-index: 2;">
                    <div class="dropdown">
                      <button 
                        class="btn btn-light btn-sm rounded-circle"
                        onClick={(e) => { e.stopPropagation(); toggleDropdown(puja._id); }}
                        style="width: 32px; height: 32px;"
                      >
                        <EllipsisVerticalIcon style="width: 1rem; height: 1rem;" />
                      </button>
                      {showDropdown.value[puja._id] && (
                        <div class="dropdown-menu show position-absolute shadow-lg" style="right: 0; z-index: 1000;" onClick={(e) => e.stopPropagation()}>
                          {puja.status === 'Active' ? (
                            <>
                              <button class="dropdown-item" onClick={() => { viewPuja(puja); closeAllDropdowns(); }}>
                                <EyeIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                View Details
                              </button>
                              <button class="dropdown-item" onClick={() => { openEditModal(puja); closeAllDropdowns(); }}>
                                <PencilIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Edit
                              </button>
                              <button class="dropdown-item" onClick={() => { toggleStatus(puja); closeAllDropdowns(); }}>
                                <XCircleIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Disable
                              </button>
                              <hr class="dropdown-divider" />
                              <button class="dropdown-item text-danger" onClick={() => { deletePuja(puja._id); closeAllDropdowns(); }}>
                                <TrashIcon style="width: 1rem; height: 1rem;" class="me-2" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button class="dropdown-item" onClick={() => { toggleStatus(puja); closeAllDropdowns(); }}>
                              <CheckCircleIcon style="width: 1rem; height: 1rem;" class="me-2" />
                              Enable
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div class="card-body p-4">
                    {/* Title and Category */}
                    <div class="mb-3">
                      <h5 class="card-title fw-bold mb-2">{puja.pujaName}</h5>
                      <div class="d-flex flex-wrap gap-1 mb-2">
                        <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 small">{puja.category}</span>
                        {puja.subcategory && <span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 small">{puja.subcategory}</span>}
                        {puja.language && <span class="badge bg-info bg-opacity-10 text-info px-2 py-1 small">{puja.language}</span>}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p class="card-text text-muted mb-3" style="font-size: 0.9rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                      {puja.description || 'No description available'}
                    </p>

                    {/* Purpose */}
                    {puja.purpose && (
                      <div class="mb-3 p-2 rounded" style="background: #fef3c7; border-left: 3px solid #f59e0b;">
                        <small class="text-dark fw-semibold d-block" style="font-size: 0.8rem;">🎯 Purpose: {puja.purpose}</small>
                      </div>
                    )}

                    {/* Duration & Best Day */}
                    <div class="d-flex flex-wrap gap-2 mb-3 pb-3" style="border-bottom: 1px solid #e5e7eb;">
                      {puja.duration && (
                        <div class="stat-item">
                          <ClockIcon style="width: 1rem; height: 1rem;" />
                          <span>{puja.duration} mins</span>
                        </div>
                      )}
                      {puja.bestDay && (
                        <div class="stat-item">
                          <CalendarIcon style="width: 1rem; height: 1rem;" />
                          <span>{puja.bestDay}</span>
                        </div>
                      )}
                    </div>

                    {/* Vidhi Steps & Samagri Count */}
                    <div class="d-flex flex-wrap gap-2 mb-3">
                      <div class="stat-item">
                        <DocumentTextIcon style="width: 1rem; height: 1rem;" />
                        <span>{puja.pujaVidhi?.length || 0} steps</span>
                      </div>
                      <div class="stat-item">
                        <BookOpenIcon style="width: 1rem; height: 1rem;" />
                        <span>{puja.samagriList?.length || 0} items</span>
                      </div>
                      <div class="stat-item">
                        <SparklesIcon style="width: 1rem; height: 1rem;" />
                        <span>{puja.mantras?.length || 0} mantras</span>
                      </div>
                    </div>

                    {/* Media Links */}
                    {(puja.audioUrl || puja.videoUrl) && (
                      <div class="d-flex gap-2 mb-3">
                        {puja.audioUrl && (
                          puja.status === 'Active' ? (
                            <button onClick={(e) => { e.stopPropagation(); openMediaModal(puja.audioUrl, 'audio'); }} class="badge bg-info bg-opacity-10 text-info px-2 py-1 small border-0" style="cursor: pointer;">
                              🎧 Audio
                            </button>
                          ) : (
                            <span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 small" style="cursor: not-allowed; opacity: 0.5;">
                              🎧 Audio
                            </span>
                          )
                        )}
                        {puja.videoUrl && (
                          puja.status === 'Active' ? (
                            <button onClick={(e) => { e.stopPropagation(); openMediaModal(puja.videoUrl, 'video'); }} class="badge bg-danger bg-opacity-10 text-danger px-2 py-1 small border-0" style="cursor: pointer;">
                              🎥 Video
                            </button>
                          ) : (
                            <span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 small" style="cursor: not-allowed; opacity: 0.5;">
                              🎥 Video
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Status & Sort Order - Bottom */}
                    <div class="d-flex justify-content-between align-items-center pt-2" style="border-top: 1px solid #e5e7eb;">
                      <span class={`badge ${puja.status === 'Active' ? 'bg-success' : 'bg-secondary'}`} style="font-size: 0.7rem;">{puja.status}</span>
                      <small class="text-muted d-flex align-items-center gap-1" style="font-size: 0.75rem;">
                        <ChartBarIcon style="width: 0.85rem; height: 0.85rem;" />
                        Order: {puja.sortOrder || 0}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeModal}>
            <div class="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content" style="border-radius: 12px; border: none;">
                <div class="modal-header" style="border-bottom: 1px solid #e5e7eb;">
                  <h5 class="modal-title fw-bold">{isEdit.value ? 'Edit' : 'Add'} Puja</h5>
                  <button type="button" class="btn-close" onClick={closeModal}></button>
                </div>
                <div class="modal-body p-3" style="max-height: 70vh; overflow-y: auto;">
                  <form>
                    {/* Basic Info */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Puja Name *</label>
                      <input type="text" class="form-control" v-model={formData.value.pujaName} placeholder="e.g., Satyanarayan Puja" style="border-radius: 8px;" />
                    </div>
                    
                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Category *</label>
                        <select class="form-select" v-model={formData.value.category} onChange={(e) => handleCategoryChange(e.target.value)} style="border-radius: 8px;">
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
                        <select class="form-select" v-model={formData.value.subcategory} onChange={(e) => handleSubcategoryChange(e.target.value)} disabled={!selectedCategory.value && !formData.value.category} style="border-radius: 8px;">
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
                      <label class="form-label fw-semibold">Language</label>
                      <select class="form-select" v-model={formData.value.language} style="border-radius: 8px;">
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Purpose / Benefits</label>
                      <input type="text" class="form-control" v-model={formData.value.purpose} placeholder="e.g., For prosperity and peace" style="border-radius: 8px;" />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Description</label>
                      <textarea class="form-control" rows="3" v-model={formData.value.description} placeholder="Describe the puja..." style="border-radius: 8px;"></textarea>
                    </div>

                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Best Day</label>
                        <input type="text" class="form-control" v-model={formData.value.bestDay} placeholder="e.g., Purnima" style="border-radius: 8px;" />
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Duration (min)</label>
                        <input type="number" class="form-control" v-model={formData.value.duration} placeholder="30" style="border-radius: 8px;" />
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Thumbnail Image</label>
                      {isEdit.value && formData.value.thumbnailUrl && typeof formData.value.thumbnailUrl === 'string' && (
                        <div class="mb-2 p-2 border rounded bg-light d-flex align-items-center gap-2">
                          <img src={formData.value.thumbnailUrl} alt="Current thumbnail" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
                          <small class="text-muted">Current thumbnail (upload new to replace)</small>
                        </div>
                      )}
                      <input type="file" class="form-control" accept="image/*" onChange={handleThumbnailUpload} style="border-radius: 8px;" />
                      {thumbnailUploaded.value && (
                        <small class="text-success mt-1 d-block">✓ {thumbnailFileName.value} selected</small>
                      )}
                      {uploadProgress.value > 0 && uploadProgress.value < 100 && (
                        <div class="progress mt-2" style="height: 4px;">
                          <div class="progress-bar" style={`width: ${uploadProgress.value}%`}></div>
                        </div>
                      )}
                      <small class="text-muted">Max 5MB (JPG, PNG, WEBP)</small>
                    </div>

                    {/* Puja Vidhi */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Puja Vidhi (Steps)</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onClick={addVidhiStep} style="border-radius: 8px;">
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add Step
                        </button>
                      </div>
                      {formData.value.pujaVidhi.map((step, index) => (
                        <div key={index} class="card mb-2 p-3" style="border-radius: 8px; background: #f9fafb;">
                          <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-secondary">Step {step.stepNumber}</span>
                            {formData.value.pujaVidhi.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeVidhiStep(index)} style="border-radius: 6px;">
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                          <input type="text" class="form-control mb-2" placeholder="Step Title" v-model={step.title} style="border-radius: 6px;" />
                          <textarea class="form-control" rows="2" placeholder="Step Description" v-model={step.description} style="border-radius: 6px;"></textarea>
                        </div>
                      ))}
                    </div>

                    {/* Samagri List */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Samagri List</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onClick={addSamagriItem} style="border-radius: 8px;">
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add Item
                        </button>
                      </div>
                      {formData.value.samagriList.map((item, index) => (
                        <div key={index} class="card mb-2 p-3" style="border-radius: 8px; background: #f9fafb;">
                          <div class="row g-2">
                            <div class="col-md-5">
                              <input type="text" class="form-control" placeholder="Item Name" v-model={item.itemName} style="border-radius: 6px;" />
                            </div>
                            <div class="col-md-3">
                              <input type="text" class="form-control" placeholder="Qty" v-model={item.quantity} style="border-radius: 6px;" />
                            </div>
                            <div class="col-md-3">
                              <div class="form-check mt-2">
                                <input class="form-check-input" type="checkbox" v-model={item.isOptional} />
                                <label class="form-check-label">Optional</label>
                              </div>
                            </div>
                            <div class="col-md-1">
                              {formData.value.samagriList.length > 1 && (
                                <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeSamagriItem(index)} style="border-radius: 6px;">
                                  <TrashIcon style="width: 14px; height: 14px;" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mantras */}
                    <div class="mb-4">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <label class="form-label fw-semibold mb-0">Main Mantras</label>
                        <button type="button" class="btn btn-sm btn-outline-primary" onClick={addMantra} style="border-radius: 8px;">
                          <PlusIcon style="width: 16px; height: 16px;" class="me-1" />
                          Add Mantra
                        </button>
                      </div>
                      {formData.value.mantras.map((mantra, index) => (
                        <div key={index} class="card mb-2 p-3" style="border-radius: 8px; background: #f9fafb;">
                          <div class="d-flex justify-content-end mb-2">
                            {formData.value.mantras.length > 1 && (
                              <button type="button" class="btn btn-sm btn-outline-danger" onClick={() => removeMantra(index)} style="border-radius: 6px;">
                                <TrashIcon style="width: 14px; height: 14px;" />
                              </button>
                            )}
                          </div>
                          <textarea class="form-control mb-2" rows="2" placeholder="Mantra Text" v-model={mantra.mantraText} style="border-radius: 6px;"></textarea>
                          <input type="text" class="form-control" placeholder="Meaning (Optional)" v-model={mantra.meaning} style="border-radius: 6px;" />
                        </div>
                      ))}
                    </div>

                    {/* Additional Fields */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Special Instructions</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.specialInstructions} placeholder="Any special instructions..." style="border-radius: 8px;"></textarea>
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Muhurat Notes</label>
                      <textarea class="form-control" rows="2" v-model={formData.value.muhurat} placeholder="Best time to perform..." style="border-radius: 8px;"></textarea>
                    </div>

                    {/* Audio Upload */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Audio File</label>
                      {isEdit.value && formData.value.audioUrl && typeof formData.value.audioUrl === 'string' && (
                        <div class="mb-2 p-2 border rounded bg-light d-flex align-items-center gap-2">
                          <span>🎧</span>
                          <small class="text-muted">Current audio exists (upload new to replace)</small>
                          <a href={formData.value.audioUrl} target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">Play</a>
                        </div>
                      )}
                      <input type="file" class="form-control" accept="audio/*" onChange={handleAudioUpload} style="border-radius: 8px;" />
                      {audioUploaded.value && (
                        <small class="text-success mt-1 d-block">✓ {audioFileName.value} selected</small>
                      )}
                      {audioUploadProgress.value > 0 && audioUploadProgress.value < 100 && (
                        <div class="progress mt-2" style="height: 4px;">
                          <div class="progress-bar bg-info" style={`width: ${audioUploadProgress.value}%`}></div>
                        </div>
                      )}
                      <small class="text-muted">Max 50MB (MP3, WAV, etc.)</small>
                    </div>

                    {/* Video Upload */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Video File</label>
                      {isEdit.value && formData.value.videoUrl && typeof formData.value.videoUrl === 'string' && (
                        <div class="mb-2 p-2 border rounded bg-light d-flex align-items-center gap-2">
                          <span>🎥</span>
                          <small class="text-muted">Current video exists (upload new to replace)</small>
                          <a href={formData.value.videoUrl} target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-danger">Watch</a>
                        </div>
                      )}
                      <input type="file" class="form-control" accept="video/*" onChange={handleVideoUpload} style="border-radius: 8px;" />
                      {videoUploaded.value && (
                        <small class="text-success mt-1 d-block">✓ {videoFileName.value} selected</small>
                      )}
                      {videoUploadProgress.value > 0 && videoUploadProgress.value < 100 && (
                        <div class="progress mt-2" style="height: 4px;">
                          <div class="progress-bar bg-danger" style={`width: ${videoUploadProgress.value}%`}></div>
                        </div>
                      )}
                      <small class="text-muted">Max 100MB (MP4, AVI, etc.)</small>
                    </div>

                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Status *</label>
                        <select class="form-select" v-model={formData.value.status} style="border-radius: 8px;">
                          <option value="Draft">Draft</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-semibold">Sort Order {!isEdit.value && <span class="badge bg-success ms-1" style="font-size: 0.7rem;">Auto</span>}</label>
                        <input type="number" class="form-control" v-model={formData.value.sortOrder} placeholder="Auto-generated" style="border-radius: 8px;" readonly={!isEdit.value} />
                        {!isEdit.value && <small class="text-muted">Auto-generated based on existing pujas</small>}
                      </div>
                    </div>
                  </form>
                </div>
                <div class="modal-footer" style="border-top: 1px solid #e5e7eb;">
                  <button type="button" class="btn btn-secondary" onClick={closeModal} style="border-radius: 8px;" disabled={loading.value}>Cancel</button>
                  <button type="button" class="btn btn-primary" onClick={handleSubmit} style="background: #9333ea; border: none; border-radius: 8px;" disabled={loading.value}>
                    {loading.value ? (
                      <>
                        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                        {isEdit.value ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEdit.value ? 'Update' : 'Create'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedPuja.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeViewModal}>
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()} style="max-width: 700px;">
              <div class="modal-content" style="border-radius: 12px; border: none;">
                <div class="modal-header" style="border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                  <h5 class="modal-title fw-bold text-white">📿 {selectedPuja.value.pujaName}</h5>
                  <button type="button" class="btn-close btn-close-white" onClick={closeViewModal}></button>
                </div>
                <div class="modal-body p-2 p-md-3" style="max-height: 70vh; overflow-y: auto;">
                  {/* Thumbnail */}
                  {selectedPuja.value.thumbnailUrl && (
                    <div class="mb-4 text-center">
                      <img src={selectedPuja.value.thumbnailUrl} alt={selectedPuja.value.pujaName} class="img-fluid rounded shadow" style="max-height: 300px; object-fit: cover;" />
                    </div>
                  )}

                  {/* Basic Info */}
                  <div class="row mb-3">
                    <div class="col-md-6 col-12 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Category</small>
                        <h6 class="mb-0">{selectedPuja.value.category}</h6>
                      </div>
                    </div>
                    <div class="col-md-6 col-12 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Subcategory</small>
                        <h6 class="mb-0">{selectedPuja.value.subcategory || 'N/A'}</h6>
                      </div>
                    </div>
                    <div class="col-md-4 col-6 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Language</small>
                        <h6 class="mb-0">{selectedPuja.value.language}</h6>
                      </div>
                    </div>
                    <div class="col-md-4 col-6 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Duration</small>
                        <h6 class="mb-0">{selectedPuja.value.duration ? `${selectedPuja.value.duration} mins` : 'N/A'}</h6>
                      </div>
                    </div>
                    <div class="col-md-4 col-12 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Best Day</small>
                        <h6 class="mb-0">{selectedPuja.value.bestDay || 'N/A'}</h6>
                      </div>
                    </div>
                    <div class="col-md-6 col-12 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Status</small>
                        <h6 class="mb-0"><span class={`badge ${selectedPuja.value.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>{selectedPuja.value.status}</span></h6>
                      </div>
                    </div>
                    <div class="col-md-6 col-12 mb-2">
                      <div class="card border-0 bg-light p-2">
                        <small class="text-muted">Sort Order</small>
                        <h6 class="mb-0">{selectedPuja.value.sortOrder || 0}</h6>
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  {selectedPuja.value.purpose && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">🎯 Purpose / Benefits</h6>
                      <div class="alert alert-warning mb-0 py-2">{selectedPuja.value.purpose}</div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedPuja.value.description && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">📝 Description</h6>
                      <p class="text-muted mb-0">{selectedPuja.value.description}</p>
                    </div>
                  )}

                  {/* Puja Vidhi */}
                  {selectedPuja.value.pujaVidhi && selectedPuja.value.pujaVidhi.length > 0 && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">📜 Puja Vidhi ({selectedPuja.value.pujaVidhi.length} Steps)</h6>
                      {selectedPuja.value.pujaVidhi.map((step, index) => (
                        <div key={index} class="card mb-2 border-0 shadow-sm">
                          <div class="card-body p-2">
                            <div class="d-flex align-items-start gap-2">
                              <span class="badge bg-primary" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">Step {step.stepNumber}</span>
                              <div class="flex-grow-1">
                                <h6 class="mb-1 small">{step.title}</h6>
                                <p class="mb-0 text-muted" style="font-size: 0.85rem;">{step.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Samagri List */}
                  {selectedPuja.value.samagriList && selectedPuja.value.samagriList.length > 0 && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">🌿 Samagri List ({selectedPuja.value.samagriList.length} Items)</h6>
                      <div class="table-responsive">
                        <table class="table table-bordered table-sm mb-0">
                          <thead class="table-light">
                            <tr>
                              <th style="font-size: 0.85rem;">Item Name</th>
                              <th style="font-size: 0.85rem;">Quantity</th>
                              <th style="font-size: 0.85rem;">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPuja.value.samagriList.map((item, index) => (
                              <tr key={index}>
                                <td style="font-size: 0.85rem;">{item.itemName}</td>
                                <td style="font-size: 0.85rem;">{item.quantity || 'As needed'}</td>
                                <td>{item.isOptional ? <span class="badge bg-secondary" style="font-size: 0.7rem;">Optional</span> : <span class="badge bg-success" style="font-size: 0.7rem;">Required</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Mantras */}
                  {selectedPuja.value.mantras && selectedPuja.value.mantras.length > 0 && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">🕉️ Main Mantras ({selectedPuja.value.mantras.length})</h6>
                      {selectedPuja.value.mantras.map((mantra, index) => (
                        <div key={index} class="card mb-2 border-0" style="background: #fef3c7;">
                          <div class="card-body p-2">
                            <p class="mb-1 fw-semibold" style="font-size: 0.95rem; color: #92400e;">{mantra.mantraText}</p>
                            {mantra.meaning && <p class="mb-0 text-muted" style="font-size: 0.8rem;"><strong>Meaning:</strong> {mantra.meaning}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Instructions */}
                  {selectedPuja.value.specialInstructions && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">⚠️ Special Instructions</h6>
                      <div class="alert alert-info mb-0 py-2" style="font-size: 0.9rem;">{selectedPuja.value.specialInstructions}</div>
                    </div>
                  )}

                  {/* Muhurat */}
                  {selectedPuja.value.muhurat && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">🌟 Muhurat Notes</h6>
                      <p class="text-muted mb-0" style="font-size: 0.9rem;">{selectedPuja.value.muhurat}</p>
                    </div>
                  )}

                  {/* Media Links */}
                  {(selectedPuja.value.audioUrl || selectedPuja.value.videoUrl) && (
                    <div class="mb-3">
                      <h6 class="fw-bold mb-2 small">🎬 Media Resources</h6>
                      <div class="d-flex gap-2 flex-wrap">
                        {selectedPuja.value.audioUrl && (
                          <button class="btn btn-info btn-sm" onClick={() => openMediaModal(selectedPuja.value.audioUrl, 'audio')}>
                            🎧 Play Audio
                          </button>
                        )}
                        {selectedPuja.value.videoUrl && (
                          <button class="btn btn-danger btn-sm" onClick={() => openMediaModal(selectedPuja.value.videoUrl, 'video')}>
                            🎥 Play Video
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div class="modal-footer p-2" style="border-top: 1px solid #e5e7eb;">
                  <button type="button" class="btn btn-secondary btn-sm" onClick={closeViewModal} style="border-radius: 8px;">Close</button>
                  <button type="button" class="btn btn-primary btn-sm" onClick={() => { closeViewModal(); openEditModal(selectedPuja.value); }} style="background: #9333ea; border: none; border-radius: 8px;">
                    <PencilIcon style="width: 0.9rem; height: 0.9rem;" class="me-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Modal */}
        {showMediaModal.value && (
          <div class="modal show d-block" style="background: rgba(0,0,0,0.5);" onClick={closeMediaModal}>
            <div class="modal-dialog modal-dialog-centered" style="max-width: 600px;" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content" style="border-radius: 12px; border: none;">
                <div class="modal-header" style="border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1rem;">
                  <h6 class="modal-title fw-bold mb-0">{mediaModalType.value === 'audio' ? '🎧 Audio Player' : '🎥 Video Player'}</h6>
                  <button type="button" class="btn-close" onClick={closeMediaModal}></button>
                </div>
                <div class="modal-body p-3">
                  {mediaModalType.value === 'audio' ? (
                    <div class="text-center">
                      <audio controls autoplay class="w-100" style="outline: none;">
                        <source src={mediaModalUrl.value} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  ) : (
                    <video controls autoplay class="w-100" style="border-radius: 8px; max-height: 400px;">
                      <source src={mediaModalUrl.value} type="video/mp4" />
                      Your browser does not support the video element.
                    </video>
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

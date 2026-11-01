import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import spiritualClipService from '../../../services/spiritualClipService.js';
import spiritualStatsService from '../../../services/spiritualStatsService.js';
import spiritualActivityService from '../../../services/spiritualActivityService.js';

export default {
  name: 'MobileSilence',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const clips = ref([]);
    const configurations = ref([]);
    const loading = ref(true);
    const isSessionActive = ref(false);
    const sessionTimer = ref(0);
    const selectedEmotion = ref('happy');
    const selectedDuration = ref(5);
    const selectedVideoUrl = ref('');
    const selectedAudioUrl = ref('');
    const enableVideo = ref(false);
    const enableAudio = ref(false);
    const tempVideoUrl = ref('');
    const tempAudioUrl = ref('');
    const timerInterval = ref(null);
    const showRewardModal = ref(false);
    const earnedPoints = ref(0);
    const backgroundVideo = ref(null);
    const backgroundAudio = ref(null);
    const isVideoPlaying = ref(false);
    const isAudioPlaying = ref(false);
    const selectedClip = ref(null);
    const selectedConfig = ref(null);
    const availableClips = ref([]);
    const showClipPreview = ref(false);
    const previewClip = ref(null);
    const isUserLoggedIn = ref(false);
    const selectedVideoKey = ref('');
    const selectedAudioKey = ref('');
    const emotionSliderRef = ref(null);
    const autoSelectTimeout = ref(null);
    
    const emotions = [
      { emoji: '😊', label: 'Happy', value: 'happy' },
      { emoji: '😢', label: 'Sad', value: 'sad' },
      { emoji: '😠', label: 'Angry', value: 'angry' },
      { emoji: '😨', label: 'Afraid', value: 'afraid' },
      { emoji: '🥰', label: 'Loved', value: 'loved' },
      { emoji: '😲', label: 'Surprised', value: 'surprised' },
      { emoji: '😌', label: 'Calm', value: 'calm' },
      { emoji: '🤢', label: 'Disgusted', value: 'disgusted' },
      { emoji: '😐', label: 'Neutral', value: 'neutral' },
      { emoji: '😰', label: 'Stressed', value: 'stressed' }
    ];
    
    const checkUserAuth = () => {
      const token = localStorage.getItem('token_user');
      isUserLoggedIn.value = !!token;
      return !!token;
    };
    
    const goBack = () => {
      router.push('/mobile/user/spiritual-checkin');
    };

    const fetchSilenceConfigurations = async () => {
      try {
        const activityType = route.query.type || 'silence';
        const categoryId = route.query.categoryId;
        
        
        let response;
        if (categoryId) {
          response = await spiritualActivityService.getSingleCheckinAllConfigration(categoryId);
          
          if (!response.success || !response.data || response.data.length === 0) {
            response = await spiritualActivityService.getAllSpiritualCheckinConfigurations(activityType);
          }
        } else {
          response = await spiritualActivityService.getAllSpiritualCheckinConfigurations(activityType);
        }
        
        if (response.success && response.data) {
          configurations.value = response.data;
        } else {
          configurations.value = [];
        }
      } catch (error) {
        console.error('Error fetching configurations:', error);
        configurations.value = [];
      }
    };

    const fetchSilenceClips = async () => {
      try {
        loading.value = true;
        const response = await spiritualClipService.getAllClips({ type: 'silence' });
        
        if (response.success && response.data && response.data.length > 0) {
          clips.value = response.data;
        } else {
          clips.value = [
            {
              _id: 'fallback-1',
              title: 'Silent Contemplation',
              description: 'In silence, we find our truest self and discover profound peace.',
              type: 'silence'
            },
            {
              _id: 'fallback-2', 
              title: 'Mindful Quietude',
              description: 'Embrace the power of silence and let your mind find its natural state.',
              type: 'silence'
            }
          ];
        }
      } catch (error) {
        console.error('Error fetching silence clips:', error);
        clips.value = [
          {
            _id: 'error-1',
            title: 'Connection Error - Silent Contemplation',
            description: 'Find peace in silence (offline mode).',
            type: 'silence'
          }
        ];
      } finally {
        loading.value = false;
      }
    };

    const filteredConfigurations = computed(() => {
      
      let emotionFiltered = configurations.value.filter(config => 
        config.emotion?.toLowerCase() === selectedEmotion.value.toLowerCase()
      );
      
      
      if (emotionFiltered.length === 0) {
        return [];
      }
      
      const durationStr = `${selectedDuration.value} minute${selectedDuration.value > 1 ? 's' : ''}`;
      const exactMatch = emotionFiltered.filter(config => config.duration === durationStr);
      
      if (exactMatch.length > 0) {
        return exactMatch;
      }
      
      const sorted = emotionFiltered.slice().sort((a, b) => {
        const aDuration = parseInt(a.duration);
        const bDuration = parseInt(b.duration);
        return Math.abs(aDuration - selectedDuration.value) - Math.abs(bDuration - selectedDuration.value);
      });
      
      return [sorted[0]];
    });

    const debouncedAutoSelect = () => {
      if (autoSelectTimeout.value) {
        clearTimeout(autoSelectTimeout.value);
      }
      autoSelectTimeout.value = setTimeout(() => {
        autoSelectClipForEmotion();
      }, 300);
    };

    const autoSelectClipForEmotion = async () => {
      const configs = filteredConfigurations.value;
      
      const fallbackKarma = selectedDuration.value;
      
      if (configs.length > 0) {
        try {
          const allClipsPromises = configs.map(config => 
            spiritualClipService.getSingleConfigurationAllClips(config._id)
              .then(response => ({ config, response }))
          );
          
          const results = await Promise.all(allClipsPromises);
          
          const allClips = [];
          results.forEach(({ config, response }) => {
            if (response.success && response.data && response.data.length > 0) {
              response.data.forEach(clip => {
                allClips.push({ ...clip, configId: config._id, karmaPoints: config.karmaPoints });
              });
            }
          });
          
          
          if (allClips.length > 0) {
            availableClips.value = allClips;
            const clip = allClips[0];
            const config = configs.find(c => c._id === clip.configId);
            selectedClip.value = clip;
            selectedConfig.value = config;
            selectedVideoUrl.value = clip.videoPresignedUrl || clip.videoUrl || '';
            selectedAudioUrl.value = clip.audioPresignedUrl || clip.audioUrl || '';
            selectedVideoKey.value = clip.videoKey || '';
            selectedAudioKey.value = clip.audioKey || '';
          } else {
            selectedClip.value = null;
            selectedConfig.value = { karmaPoints: fallbackKarma };
            availableClips.value = [];
            selectedVideoUrl.value = '';
            selectedAudioUrl.value = '';
            selectedVideoKey.value = '';
            selectedAudioKey.value = '';
          }
        } catch (error) {
          console.error('Error auto-selecting clip:', error);
          selectedClip.value = null;
          selectedConfig.value = { karmaPoints: fallbackKarma };
          availableClips.value = [];
          selectedVideoUrl.value = '';
          selectedAudioUrl.value = '';
          selectedVideoKey.value = '';
          selectedAudioKey.value = '';
        }
      } else {
        selectedClip.value = null;
        selectedConfig.value = { karmaPoints: fallbackKarma };
        availableClips.value = [];
        selectedVideoUrl.value = '';
        selectedAudioUrl.value = '';
        selectedVideoKey.value = '';
        selectedAudioKey.value = '';
      }
    };

    const selectClip = (clip) => {
      const configs = filteredConfigurations.value;
      const config = configs.find(c => c._id === clip.configId);
      selectedClip.value = clip;
      selectedConfig.value = config;
      selectedVideoUrl.value = clip.videoPresignedUrl || clip.videoUrl || '';
      selectedAudioUrl.value = clip.audioPresignedUrl || clip.audioUrl || '';
      selectedVideoKey.value = clip.videoKey || '';
      selectedAudioKey.value = clip.audioKey || '';
    };

    const startSession = () => {
      beginSilence();
    };

    const saveSession = async (targetDuration, actualDuration, emotion, karmaPoints) => {
      try {
        const token = localStorage.getItem('token_user');
        if (!token) {
          alert('⚠️ Please log in to save your silence sessions and earn karma points!');
          return;
        }
        
        const sessionData = {
          type: 'silence',
          title: 'Silence Session',
          targetDuration: targetDuration,
          actualDuration: actualDuration,
          karmaPoints: karmaPoints,
          emotion: emotion,
          videoUrl: selectedVideoUrl.value || '',
          audioUrl: selectedAudioUrl.value || '',
          videoKey: selectedVideoKey.value || '',
          audioKey: selectedAudioKey.value || ''
        };
        
        const response = await spiritualStatsService.saveSession(sessionData);
        if (response.success) {
          if (response.data?.statusMessage) {
            setTimeout(() => {
              alert(response.data.statusMessage);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error saving session:', error);
        alert('❌ Failed to save session. Please check your internet connection and try again.');
      }
    };

    const beginSilence = () => {
      isSessionActive.value = true;
      sessionTimer.value = selectedDuration.value * 60;
      
      setTimeout(() => {
        if (selectedVideoUrl.value && backgroundVideo.value) {
          isVideoPlaying.value = true;
          backgroundVideo.value.play().catch(e => {
            isVideoPlaying.value = false;
          });
        }
        if (selectedAudioUrl.value && backgroundAudio.value) {
          isAudioPlaying.value = true;
          backgroundAudio.value.play().catch(e => {
            isAudioPlaying.value = false;
          });
        }
      }, 500);
      
      timerInterval.value = setInterval(() => {
        sessionTimer.value--;
        if (sessionTimer.value <= 0) {
          isSessionActive.value = false;
          clearInterval(timerInterval.value);
          
          if (backgroundVideo.value) {
            backgroundVideo.value.pause();
            backgroundVideo.value.currentTime = 0;
            isVideoPlaying.value = false;
          }
          if (backgroundAudio.value) {
            backgroundAudio.value.pause();
            backgroundAudio.value.currentTime = 0;
            isAudioPlaying.value = false;
          }
          
          sessionTimer.value = 0;
          earnedPoints.value = selectedConfig.value?.karmaPoints || selectedDuration.value;
          saveSession(selectedDuration.value, selectedDuration.value, selectedEmotion.value, earnedPoints.value);
          showRewardModal.value = true;
        }
      }, 1000);
    };

    const endSession = () => {
      isSessionActive.value = false;
      clearInterval(timerInterval.value);
      
      if (backgroundVideo.value) {
        backgroundVideo.value.pause();
        backgroundVideo.value.currentTime = 0;
        isVideoPlaying.value = false;
      }
      if (backgroundAudio.value) {
        backgroundAudio.value.pause();
        backgroundAudio.value.currentTime = 0;
        isAudioPlaying.value = false;
      }
      
      const completedMinutes = selectedDuration.value - Math.ceil(sessionTimer.value / 60);
      sessionTimer.value = 0;
      const configKarma = selectedConfig.value?.karmaPoints || selectedDuration.value;
      earnedPoints.value = Math.max(0, Math.floor((completedMinutes / selectedDuration.value) * configKarma));
      
      if (completedMinutes > 0) {
        saveSession(selectedDuration.value, completedMinutes, selectedEmotion.value, earnedPoints.value);
      } else {
        saveSession(selectedDuration.value, 0, selectedEmotion.value, 0);
      }
      showRewardModal.value = true;
    };

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const closeReward = () => {
      showRewardModal.value = false;
      earnedPoints.value = 0;
      selectedClip.value = null;
      selectedConfig.value = null;
      selectedVideoUrl.value = '';
      selectedAudioUrl.value = '';
      isVideoPlaying.value = false;
      isAudioPlaying.value = false;
    };

    onMounted(async () => {
      checkUserAuth();
      await fetchSilenceConfigurations();
      await fetchSilenceClips();
      await autoSelectClipForEmotion();
      
      // Scroll to show happy emotion in the middle (index 4) - only on mobile
      setTimeout(() => {
        if (emotionSliderRef.value && window.innerWidth < 768) {
          const container = emotionSliderRef.value;
          const happyIndex = 4;
          const cardWidth = container.offsetWidth / 3;
          const gap = parseFloat(getComputedStyle(container).gap) || 8;
          const scrollPosition = (happyIndex * (cardWidth + gap)) - cardWidth;
          container.scrollLeft = scrollPosition;
        }
      }, 100);
    });

    // Watch for changes in filteredConfigurations and auto-select clips
    watch(filteredConfigurations, () => {
      debouncedAutoSelect();
    });

    onUnmounted(() => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
      }
    });

    return () => (
      <div class="silence-page" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        <style>{`
          * {
            box-sizing: border-box;
          }
          
          html {
            overflow-x: hidden;
            width: 100%;
          }
          
          body {
            overflow-x: hidden;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .silence-page {
            padding: 0.75rem;
            min-height: 100vh;
            background: #f8fafc;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            position: relative;
          }
          
          .page-header {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
            color: white;
            padding: 0.6rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
            gap: 0.5rem;
          }
          
          .back-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.4rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }
          
          .back-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.4);
          }
          
          .share-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 0.4rem;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          
          .share-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.4);
          }
          
          .header-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            justify-content: center;
            min-width: 0;
          }
          
          .activity-icon {
            font-size: 1.25rem;
          }
          
          .activity-title {
            font-size: 0.95rem;
            font-weight: 600;
            margin: 0;
            color: white;
          }
          
          .silence-content {
            background: white;
            border-radius: 8px;
            padding: 0.9rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .start-btn {
            background: linear-gradient(135deg, #9ca3af, #6b7280);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
          }
          
          .start-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
          }
          
          .session-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80') center/cover,
                        linear-gradient(135deg, rgba(156, 163, 175, 0.8) 0%, rgba(107, 114, 128, 0.8) 50%, rgba(75, 85, 99, 0.8) 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            color: #f8fafc;
            text-align: center;
            overflow: hidden;
            padding: 1rem;
          }
          
          .session-card {
            background: transparent;
            backdrop-filter: none;
            border-radius: 20px;
            padding: 0.8rem;
            margin: 0.5rem auto;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: none;
            max-width: 340px;
            width: calc(100% - 2rem);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .session-timer {
            font-size: 2.5rem;
            font-weight: 300;
            margin: 0.8rem 0;
            text-shadow: 0 0 20px rgba(30, 41, 59, 0.8);
            color: #1e293b;
          }
          
          .silence-circle {
            width: 130px;
            height: 130px;
            margin: 0.8rem auto;
            border-radius: 50%;
            background: linear-gradient(135deg, #9ca3af, #6b7280);
            box-shadow: 0 0 40px rgba(156, 163, 175, 0.6), 0 0 80px rgba(107, 114, 128, 0.4);
            animation: breathingGlow 4s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .silence-icon {
            font-size: 3.5rem;
          }
          
          @keyframes breathingGlow {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 40px rgba(156, 163, 175, 0.6), 0 0 80px rgba(107, 114, 128, 0.4);
            }
            50% { 
              transform: scale(1.1);
              box-shadow: 0 0 60px rgba(156, 163, 175, 0.8), 0 0 120px rgba(107, 114, 128, 0.6);
            }
          }
          
          .reward-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.5s ease;
            padding: 1rem;
            overflow: hidden;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .reward-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 2rem 1.5rem;
            text-align: center;
            color: #1e293b;
            width: calc(100% - 2rem);
            max-width: 320px;
            animation: bounceIn 0.6s ease;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          
          @keyframes bounceIn {
            0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          
          .reward-sparkles {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          
          .sparkle {
            position: absolute;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            animation: sparkle 2s ease-in-out infinite;
          }
          
          @keyframes sparkle {
            0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
            50% { transform: scale(1) rotate(180deg); opacity: 1; }
          }
          
          .karma-points {
            font-size: 2.5rem;
            font-weight: bold;
            margin: 0.8rem 0;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            animation: glow 2s ease-in-out infinite;
          }
          
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
            50% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6); }
          }
        `}</style>
        
        <div class="page-header">
          <button class="back-btn" onClick={goBack}>
            ← Back
          </button>
          <div class="header-content">
            <div class="activity-icon">🤫</div>
            <h1 class="activity-title">Silence</h1>
          </div>
          <button class="share-btn" onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Silence Session - Brahmakosh',
                text: 'Join me in finding peace through silent contemplation',
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert('🔗 Link copied to clipboard!');
            }
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
        
        <div class="silence-content">
          <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.05rem' }}>Silent Contemplation Session</h3>
          <p style={{ marginBottom: '2rem', color: '#64748b', lineHeight: '1.6', fontSize: '0.88rem' }}>
            In silence, we find our truest self and discover profound peace.
          </p>
          
          {!isUserLoggedIn.value ? (
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                color: 'white', 
                padding: '1rem', 
                borderRadius: '12px', 
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                ⚠️ Please log in to save your sessions and earn karma points!
              </div>
              <button 
                class="btn btn-outline-primary"
                style={{ marginRight: '0.5rem' }}
                onClick={() => router.push('/user/login')}
              >
                Login
              </button>
              <button 
                class="btn btn-outline-secondary"
                onClick={() => router.push('/mobile/user/register')}
              >
                Register
              </button>
            </div>
          ) : null}
        </div>
        
        {/* Session Setup - Now directly on page */}
        <div class="session-setup" style={{ background: 'white', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.05rem', textAlign: 'center', fontWeight: '600' }}>Customize Your Silence</h3>
          
          <div class="emotion-selector" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#374151', fontSize: '0.9rem', fontWeight: '500' }}>How are you feeling?</h4>
            <style>{`
              .emotion-grid {
                display: flex;
                overflow-x: auto;
                gap: 0.5rem;
                padding: 0.75rem 0;
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              .emotion-grid::-webkit-scrollbar {
                display: none;
              }
              .emotion-card {
                min-width: 120px;
                flex-shrink: 0;
              }
              @media (min-width: 768px) {
                .emotion-grid {
                  display: grid;
                  grid-template-columns: repeat(5, 1fr);
                  overflow-x: visible;
                }
                .emotion-card {
                  min-width: auto;
                }
              }
              @media (min-width: 1024px) {
                .emotion-grid {
                  grid-template-columns: repeat(10, 1fr);
                }
              }
            `}</style>
            <div class="emotion-grid">
                {[
                  { emotion: 'sad', emoji: '😢' },
                  { emotion: 'angry', emoji: '😠' },
                  { emotion: 'afraid', emoji: '😨' },
                  { emotion: 'loved', emoji: '🥰' },
                  { emotion: 'happy', emoji: '😊' },
                  { emotion: 'surprised', emoji: '😲' },
                  { emotion: 'calm', emoji: '😌' },
                  { emotion: 'disgusted', emoji: '🤢' },
                  { emotion: 'neutral', emoji: '😐' },
                  { emotion: 'stressed', emoji: '😰' },
                ].map(item => (
                  <div
                    class="emotion-card" 
                    key={item.emotion}
                    onClick={() => {
                      selectedEmotion.value = item.emotion;
                      debouncedAutoSelect();
                    }}
                    style={{
                      padding: '0.6rem 0.5rem',
                      borderRadius: '10px',
                      border: selectedEmotion.value === item.emotion ? '2px solid #9ca3af' : '1px solid #e2e8f0',
                      background: selectedEmotion.value === item.emotion ? '#9ca3af' : '#FFFFFF',
                      color: selectedEmotion.value === item.emotion ? 'white' : '#2D3748',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedEmotion.value === item.emotion ? '0 4px 12px rgba(156, 163, 175, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                      transform: selectedEmotion.value === item.emotion ? 'scale(1.05)' : 'scale(1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{item.emoji}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: selectedEmotion.value === item.emotion ? '600' : '500', 
                      textTransform: 'capitalize'
                    }}>
                      {item.emotion}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          <div class="duration-selector" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#374151', fontSize: '0.9rem', fontWeight: '500' }}>
              Duration: {selectedDuration.value} minutes
            </h4>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={selectedDuration.value}
              onChange={(e) => {
                selectedDuration.value = parseInt(e.target.value);
                debouncedAutoSelect();
              }}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '5px',
                background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${(selectedDuration.value - 1) * 11.11}%, #e5e7eb ${(selectedDuration.value - 1) * 11.11}%, #e5e7eb 100%)`,
                outline: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.65rem', color: '#6b7280' }}>
              <span>1m</span>
              <span>5m</span>
              <span>10m</span>
            </div>
            {selectedDuration.value && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.65rem', 
                background: 'white', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <h5 style={{ color: '#1e293b', margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>Selected Duration</h5>
                  <span style={{ 
                    background: '#9ca3af', 
                    color: 'white', 
                    padding: '0.15rem 0.35rem', 
                    borderRadius: '4px', 
                    fontSize: '0.65rem',
                    fontWeight: '500'
                  }}>
                    {selectedConfig.value?.karmaPoints || selectedDuration.value} pts
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.3rem 0', lineHeight: '1.3' }}>Ideal duration for daily silence practice</p>
                <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.65rem', color: '#6b7280', flexWrap: 'wrap' }}>
                  <span>⏱️ {selectedDuration.value} minutes</span>
                  <span>🎯 Optimal</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.45rem', 
                  background: '#f3f4f6', 
                  borderRadius: '6px',
                  border: '1px solid #9ca3af'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: '500' }}>💎 Karma Points Preview</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: '1.3' }}>You will earn {selectedConfig.value?.karmaPoints || selectedDuration.value} karma points for completing this silence session</div>
                </div>
              </div>
            )}
          </div>
          
          <button class="start-btn" onClick={startSession}>
            🤫 Begin Silence
          </button>
        </div>
        
        {/* Active Session Screen */}
        {isSessionActive.value && (
          <div class="session-screen" style={{ overflow: 'hidden' }}>
            {/* Background media elements */}
            {selectedVideoUrl.value && (
              <div style={{
                position: 'absolute',
                top: '1%',
                left: '0.5%',
                width: '99%',
                height: '98%',
                zIndex: -1,
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <video 
                  ref={backgroundVideo}
                  style={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  loop
                  preload="auto"
                  playsInline
                >
                  <source src={selectedVideoUrl.value} type="video/mp4" />
                </video>
              </div>
            )}
            
            {selectedAudioUrl.value && (
              <audio 
                ref={backgroundAudio}
                loop
                preload="auto"
              >
                <source src={selectedAudioUrl.value} type="audio/mpeg" />
              </audio>
            )}
            
            <div class="session-card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', color: '#1e293b' }}>Silence in Progress</h2>
            <p style={{ opacity: 0.9, marginBottom: '1.5rem', color: '#1e293b', fontSize: '0.88rem' }}>Feeling: {selectedEmotion.value}</p>
            
            <div class="silence-circle">
              <div class="silence-icon">🤫</div>
            </div>
            
            <div class="session-timer">{formatTime(sessionTimer.value)}</div>
            
            <p style={{ opacity: 0.9, lineHeight: '1.5', color: '#1e293b', fontSize: '0.88rem', padding: '0 0.5rem' }}>
              Embrace the stillness. Let silence guide you to inner peace.
            </p>
            
            {/* Media Controls */}
            {(selectedVideoUrl.value || selectedAudioUrl.value) && (
              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                marginTop: '1.2rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {selectedVideoUrl.value && (
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#1e293b',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      if (backgroundVideo.value) {
                        if (backgroundVideo.value.paused) {
                          backgroundVideo.value.play();
                          isVideoPlaying.value = true;
                        } else {
                          backgroundVideo.value.pause();
                          isVideoPlaying.value = false;
                        }
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isVideoPlaying.value ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                      Video
                    </span>
                  </button>
                )}
                
                {selectedAudioUrl.value && (
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#1e293b',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      if (backgroundAudio.value) {
                        if (backgroundAudio.value.paused) {
                          backgroundAudio.value.play();
                          isAudioPlaying.value = true;
                        } else {
                          backgroundAudio.value.pause();
                          isAudioPlaying.value = false;
                        }
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isAudioPlaying.value ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                      Audio
                    </span>
                  </button>
                )}
              </div>
            )}
            
            <button 
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#1e293b',
                padding: '0.7rem 1.3rem',
                borderRadius: '22px',
                cursor: 'pointer',
                marginTop: '1.5rem',
                fontSize: '0.88rem',
                fontWeight: '500'
              }}
              onClick={() => {
                isSessionActive.value = false;
                clearInterval(timerInterval.value);
                
                if (backgroundVideo.value) {
                  backgroundVideo.value.pause();
                  backgroundVideo.value.currentTime = 0;
                }
                if (backgroundAudio.value) {
                  backgroundAudio.value.pause();
                  backgroundAudio.value.currentTime = 0;
                }
                
                const completedMinutes = selectedDuration.value - Math.ceil(sessionTimer.value / 60);
                sessionTimer.value = 0;
                const configKarma = selectedConfig.value?.karmaPoints || selectedDuration.value;
                earnedPoints.value = Math.max(0, Math.floor((completedMinutes / selectedDuration.value) * configKarma));
                if (completedMinutes > 0) {
                  saveSession(selectedDuration.value, completedMinutes, selectedEmotion.value, earnedPoints.value);
                } else {
                  saveSession(selectedDuration.value, 0, selectedEmotion.value, 0);
                }
                showRewardModal.value = true;
              }}
            >
              End Session
            </button>
            </div>
          </div>
        )}
        
        {/* Clip Preview Modal */}
        {showClipPreview.value && previewClip.value && (
          <div 
            class="reward-modal"
            onClick={() => {
              showClipPreview.value = false;
              previewClip.value = null;
            }}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.2rem',
                width: 'calc(100% - 2rem)',
                maxWidth: '340px',
                maxHeight: '75vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', flex: 1, wordBreak: 'break-word' }}>{previewClip.value.title}</h3>
                <button
                  onClick={() => {
                    showClipPreview.value = false;
                    previewClip.value = null;
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 0,
                    minWidth: '30px',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>
              
              {previewClip.value.description && (
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                  {previewClip.value.description}
                </p>
              )}
              
              {(previewClip.value.videoUrl || previewClip.value.videoPresignedUrl) && (
                <div style={{ marginBottom: '1rem', width: '100%' }}>
                  <video 
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      maxHeight: '250px',
                      display: 'block'
                    }}
                    controls
                    preload="metadata"
                  >
                    <source src={previewClip.value.videoPresignedUrl || previewClip.value.videoUrl} type="video/mp4" />
                  </video>
                </div>
              )}
              
              {(previewClip.value.audioUrl || previewClip.value.audioPresignedUrl) && (
                <div style={{ marginBottom: '1rem', width: '100%' }}>
                  <audio 
                    style={{
                      width: '100%',
                      display: 'block'
                    }}
                    controls
                    preload="metadata"
                  >
                    <source src={previewClip.value.audioPresignedUrl || previewClip.value.audioUrl} type="audio/mpeg" />
                  </audio>
                </div>
              )}
              
              <button
                onClick={() => {
                  selectClip(previewClip.value);
                  showClipPreview.value = false;
                  previewClip.value = null;
                }}
                style={{
                  background: 'linear-gradient(135deg, #9ca3af, #6b7280)',
                  color: 'white',
                  border: 'none',
                  padding: '0.7rem 1.3rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Select This Clip
              </button>
            </div>
          </div>
        )}
        
        {/* Reward Modal */}
        {showRewardModal.value && (
          <div class="reward-modal">
            <div class="reward-content">
              {/* Sparkles Animation */}
              <div class="reward-sparkles">
                {Array.from({length: 15}).map((_, i) => (
                  <div 
                    key={i}
                    class="sparkle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.8rem', fontWeight: 'bold' }}>
                Silence Complete!
              </h2>
              
              <div style={{ fontSize: '1.05rem', marginBottom: '0.8rem', opacity: 0.9 }}>
                You practiced silence for {selectedDuration.value - Math.ceil(sessionTimer.value / 60)} minutes
                {selectedDuration.value - Math.ceil(sessionTimer.value / 60) < selectedDuration.value && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', opacity: 0.7 }}>
                    Target: {selectedDuration.value} minutes
                  </div>
                )}
              </div>
              
              {isUserLoggedIn.value ? (
                <>
                  <div class="karma-points">
                    +{earnedPoints.value} ✨
                  </div>
                  
                  <div style={{ fontSize: '1rem', marginBottom: '1.5rem', opacity: 0.9 }}>
                    Karma Points Earned!
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.9, background: 'rgba(255,255,255,0.2)', padding: '0.8rem', borderRadius: '10px', lineHeight: '1.4' }}>
                  ⚠️ Login to save sessions and earn karma points!
                </div>
              )}
              
              <button 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  padding: '0.85rem 1.7rem',
                  borderRadius: '22px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => {
                  showRewardModal.value = false;
                  closeReward();
                }}
              >
                Continue Journey 🚀
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
};

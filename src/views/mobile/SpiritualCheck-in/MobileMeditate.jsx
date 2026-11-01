import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import spiritualClipService from '../../../services/spiritualClipService.js';
import spiritualStatsService from '../../../services/spiritualStatsService.js';
import spiritualActivityService from '../../../services/spiritualActivityService.js';

export default {
  name: 'MobileMeditate',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const clips = ref([]);
    const configurations = ref([]);
    const loading = ref(true);
    const selectedConfigId = ref(null);
    const selectedEmotion = ref('happy');
    const selectedDuration = ref(5);
    const selectedVideoUrl = ref('');
    const selectedAudioUrl = ref('');
    const selectedVideoKey = ref('');
    const selectedAudioKey = ref('');
    const enableVideo = ref(false);
    const enableAudio = ref(false);
    const tempVideoUrl = ref('');
    const tempAudioUrl = ref('');
    const isSessionActive = ref(false);
    const sessionTimer = ref(0);
    const timerInterval = ref(null);
    const showRewardModal = ref(false);
    const earnedPoints = ref(0);
    const isUserLoggedIn = ref(false);
    const backgroundVideo = ref(null);
    const backgroundAudio = ref(null);
    const selectedClip = ref(null);
    const selectedConfig = ref(null);
    const availableClips = ref([]);
    const showClipPreview = ref(false);
    const previewClip = ref(null);
    const isVideoPlaying = ref(false);
    const isAudioPlaying = ref(false);
    const emotionSliderRef = ref(null);
    const autoSelectTimeout = ref(null);
    
    // Check if user is logged in
    const checkUserAuth = () => {
      const token = localStorage.getItem('token_user');
      isUserLoggedIn.value = !!token;
      return !!token;
    };
    
    const goBack = () => {
      router.push('/mobile/user/spiritual-checkin');
    };

    // Fetch meditation configurations
    const fetchMeditationConfigurations = async () => {
      try {
        const activityType = route.query.type || 'meditation';
        const categoryId = route.query.categoryId;
        
        
        let response;
        if (categoryId) {
          // Try category ID first
          response = await spiritualActivityService.getSingleCheckinAllConfigration(categoryId);
          
          // If no results, fallback to type-based filtering
          if (!response.success || !response.data || response.data.length === 0) {
            response = await spiritualActivityService.getAllSpiritualCheckinConfigurations(activityType);
          }
        } else {
          // Fallback to type-based filtering
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

    const fetchMeditationClips = async () => {
      try {
        loading.value = true;
        const response = await spiritualClipService.getAllClips({ type: 'meditation' });
        
        if (response.success && response.data && response.data.length > 0) {
          clips.value = response.data;
        } else {
          clips.value = [
            {
              _id: 'fallback-1',
              title: 'Morning Mindfulness',
              description: 'Start your day with peaceful awareness and gentle breathing exercises.',
              type: 'meditation'
            },
            {
              _id: 'fallback-2', 
              title: 'Deep Relaxation',
              description: 'Release tension and find inner calm through guided meditation.',
              type: 'meditation'
            }
          ];
        }
      } catch (error) {
        console.error('Error fetching meditation clips:', error);
        clips.value = [
          {
            _id: 'error-1',
            title: 'Connection Error - Morning Mindfulness',
            description: 'Start your day with peaceful awareness (offline mode).',
            type: 'meditation'
          }
        ];
      } finally {
        loading.value = false;
      }
    };

    const startSession = () => {
      beginMeditation();
    };

    // Computed filtered configurations based on selected emotion AND duration
    const filteredConfigurations = computed(() => {
      
      // Filter by emotion first
      let emotionFiltered = configurations.value.filter(config => 
        config.emotion?.toLowerCase() === selectedEmotion.value.toLowerCase()
      );
      
      if (emotionFiltered.length === 0) {
        return [];
      }
      
      // Try exact duration match
      const durationStr = `${selectedDuration.value} minute${selectedDuration.value > 1 ? 's' : ''}`;
      const exactMatch = emotionFiltered.filter(config => config.duration === durationStr);
      
      if (exactMatch.length > 0) {
        return exactMatch;
      }
      
      // Fallback: Find closest duration
      const sorted = emotionFiltered.slice().sort((a, b) => {
        const aDuration = parseInt(a.duration);
        const bDuration = parseInt(b.duration);
        return Math.abs(aDuration - selectedDuration.value) - Math.abs(bDuration - selectedDuration.value);
      });
      
      return [sorted[0]];
    });

    // Computed filtered clips based on selected emotion
    const filteredClips = computed(() => {
      if (!selectedEmotion.value) return clips.value;
      const filtered = clips.value.filter(clip => {
        return clip.emotion?.toLowerCase() === selectedEmotion.value.toLowerCase();
      });
      return filtered.length > 0 ? filtered : clips.value;
    });

    // Auto-select clip based on emotion
    const autoSelectClipForEmotion = async () => {
      const configs = filteredConfigurations.value;
      
      // Calculate fallback karma points: 3 + (duration - 1) * 1.33 to get range 3-15
      const fallbackKarma = Math.min(15, Math.max(3, Math.round(3 + (selectedDuration.value - 1) * 1.33)));
      
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
            // No clips found - use fallback
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
          // Error occurred - use fallback
          selectedClip.value = null;
          selectedConfig.value = { karmaPoints: fallbackKarma };
          availableClips.value = [];
          selectedVideoUrl.value = '';
          selectedAudioUrl.value = '';
          selectedVideoKey.value = '';
          selectedAudioKey.value = '';
        }
      } else {
        // No configurations found - use fallback
        selectedClip.value = null;
        selectedConfig.value = { karmaPoints: fallbackKarma };
        availableClips.value = [];
        selectedVideoUrl.value = '';
        selectedAudioUrl.value = '';
        selectedVideoKey.value = '';
        selectedAudioKey.value = '';
      }
    };
    
    // Debounced version to prevent race conditions
    const debouncedAutoSelect = () => {
      if (autoSelectTimeout.value) {
        clearTimeout(autoSelectTimeout.value);
      }
      autoSelectTimeout.value = setTimeout(() => {
        autoSelectClipForEmotion();
      }, 300);
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

    const saveSession = async (targetDuration, actualDuration, emotion, karmaPoints) => {
      try {
        const token = localStorage.getItem('token_user');
        if (!token) {
          alert('⚠️ Please log in to save your meditation sessions and earn karma points!');
          return;
        }
        
        const sessionData = {
          type: 'meditation',
          title: 'Meditation Session',
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
            // Show status message to user
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

    const beginMeditation = () => {
      isSessionActive.value = true;
      sessionTimer.value = selectedDuration.value * 60;
      
      // Start background media playback after a short delay to ensure elements are mounted
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
          
          // Stop background media
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
          earnedPoints.value = selectedConfig.value?.karmaPoints || Math.min(15, Math.max(3, Math.round(3 + (selectedDuration.value - 1) * 1.33)));
          saveSession(selectedDuration.value, selectedDuration.value, selectedEmotion.value, earnedPoints.value);
          showRewardModal.value = true;
        }
      }, 1000);
    };

    const endSession = () => {
      isSessionActive.value = false;
      clearInterval(timerInterval.value);
      sessionTimer.value = 0;
      alert('🧘♀️ Meditation session completed! Well done!');
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
      await fetchMeditationConfigurations();
      await fetchMeditationClips();
      await autoSelectClipForEmotion();
      
      // Scroll to show happy emotion in the middle (index 4) - only on mobile
      setTimeout(() => {
        if (emotionSliderRef.value && window.innerWidth < 768) {
          const container = emotionSliderRef.value;
          const happyIndex = 4; // happy is at index 4
          const cardWidth = container.offsetWidth / 3; // Each card takes 1/3 of container
          const gap = parseFloat(getComputedStyle(container).gap) || 8;
          // Scroll to position happy in the middle slot
          const scrollPosition = (happyIndex * (cardWidth + gap)) - cardWidth;
          container.scrollLeft = scrollPosition;
        }
      }, 100);
    });

    return () => (
      <div class="meditate-page">
        {/* Floating Particles */}
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          
          html, body, #app {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            position: relative;
          }
          
          body {
            overscroll-behavior-x: none;
          }
          
          .meditate-page {
            padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
            min-height: 100vh;
            min-height: 100dvh;
            background: #FAF8F3;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden !important;
            box-sizing: border-box;
            margin: 0;
            position: relative;
          }
          
          @media (min-width: 768px) {
            .meditate-page {
              max-width: 1100px;
              margin: 0 auto;
              width: 100%;
            }
          }
          
          @media (max-width: 480px) {
            .meditate-page {
              padding: max(0.875rem, env(safe-area-inset-top)) max(0.875rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(0.875rem, env(safe-area-inset-left));
            }
          }
          
          @media (max-width: 360px) {
            .meditate-page {
              padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
            }
          }
          
          @media (max-width: 320px) {
            .meditate-page {
              padding: max(0.4rem, env(safe-area-inset-top)) max(0.4rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.4rem, env(safe-area-inset-left));
            }
          }
          
          /* Scrollbar styling */
          .meditate-page ::-webkit-scrollbar {
            height: 3px;
            width: 3px;
          }
          
          .meditate-page ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          
          .meditate-page ::-webkit-scrollbar-thumb {
            background: #FF8C42;
            border-radius: 10px;
          }
          
          /* Range slider styling */
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            border-radius: 5px;
            outline: none;
            cursor: pointer;
            touch-action: none;
            background: #F4E4C1;
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #FF8C42;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(255, 140, 66, 0.4);
            transition: transform 0.2s ease;
          }
          
          input[type="range"]::-webkit-slider-thumb:active {
            transform: scale(1.2);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #FF8C42;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 8px rgba(255, 140, 66, 0.4);
          }
          
          .page-header {
            background: #FF8C42;
            color: white;
            padding: 0.75rem;
            margin: 0 0 1rem 0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow: hidden;
          }
          
          @media (max-width: 375px) {
            .page-header {
              padding: 0.6rem;
              margin-bottom: 0.75rem;
            }
          }
          
          .back-btn, .share-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            touch-action: manipulation;
          }
          
          .back-btn {
            padding: 0.4rem 0.75rem;
            font-size: 0.8rem;
          }
          
          .share-btn {
            padding: 0.4rem;
            font-size: 1rem;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          @media (max-width: 375px) {
            .back-btn {
              padding: 0.35rem 0.6rem;
              font-size: 0.75rem;
            }
            .share-btn {
              width: 28px;
              height: 28px;
            }
          }
          
          .back-btn:active, .share-btn:active {
            transform: scale(0.95);
            background: rgba(255, 255, 255, 0.3);
          }
          
          .header-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
            justify-content: center;
          }
          
          .activity-icon {
            font-size: 1.25rem;
          }
          
          .activity-title {
            font-size: 1rem;
            font-weight: 600;
            margin: 0;
            color: white;
          }
          
          @media (max-width: 375px) {
            .activity-icon {
              font-size: 1.1rem;
            }
            .activity-title {
              font-size: 0.9rem;
            }
          }
          
          .meditation-content, .session-setup {
            background: #FFFFFF;
            border-radius: clamp(10px, 2.5vw, 14px);
            padding: clamp(1rem, 4vw, 1.5rem);
            margin: 0 0 clamp(1rem, 2.5vw, 1.25rem) 0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.04);
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
            overflow-y: visible;
          }
          
          @media (max-width: 320px) {
            .meditation-content, .session-setup {
              padding: 0.75rem;
              margin-bottom: 0.625rem;
            }
          }
          

          
          .start-btn {
            background: #FF8C42;
            color: white;
            border: none;
            padding: 0.875rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
            max-width: 100%;
            touch-action: manipulation;
            min-height: 48px;
            box-sizing: border-box;
          }
          
          .start-btn:active {
            transform: scale(0.98);
            box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);
          }
          
          @media (max-width: 375px) {
            .start-btn {
              padding: 0.75rem 1.25rem;
              font-size: 0.9rem;
              min-height: 44px;
            }
          }
          
          .session-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            max-width: 100vw;
            height: 100vh;
            height: 100dvh;
            background: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80') center/cover,
                        linear-gradient(135deg, rgba(131, 96, 195, 0.8) 0%, rgba(46, 191, 145, 0.8) 50%, rgba(255, 236, 210, 0.8) 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            color: #f8fafc;
            text-align: center;
            overflow-x: hidden !important;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
            box-sizing: border-box;
          }
          
          @media (max-width: 375px) {
            .session-screen {
              padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
            }
          }
          
          .session-card {
            background: transparent;
            backdrop-filter: none;
            border-radius: clamp(16px, 4vw, 25px);
            padding: clamp(0.625rem, 3vw, 1rem);
            margin: 0 auto;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: none;
            max-width: min(350px, 92vw) !important;
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
          }
          
          @media (min-width: 768px) {
            .session-card {
              max-width: 350px !important;
            }
          }
          
          @media (max-width: 320px) {
            .session-card {
              padding: 0.5rem;
              max-width: 95vw;
            }
          }
          
          .session-timer {
            font-size: clamp(2.5rem, 8vw, 3rem);
            font-weight: 300;
            margin: 1rem 0;
            text-shadow: 0 0 20px rgba(30, 41, 59, 0.8);
            color: #1e293b;
          }
          
          .zen-circle {
            width: clamp(150px, 40vw, 180px);
            height: clamp(150px, 40vw, 180px);
            margin: 1rem auto;
            border-radius: 50%;
            background: #FF8C42;
            box-shadow: 0 0 40px rgba(255, 140, 66, 0.6), 0 0 80px rgba(255, 140, 66, 0.4);
            animation: breathingGlow 4s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .zen-icon {
            font-size: clamp(4rem, 12vw, 5rem);
          }
          
          @keyframes breathingGlow {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 40px rgba(255, 140, 66, 0.6), 0 0 80px rgba(255, 140, 66, 0.4);
            }
            50% { 
              transform: scale(1.1);
              box-shadow: 0 0 60px rgba(255, 140, 66, 0.8), 0 0 120px rgba(255, 140, 66, 0.6);
            }
          }
          
          .reward-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            max-width: 100vw;
            height: 100vh;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.5s ease;
            padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
            box-sizing: border-box;
            overflow-x: hidden !important;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          
          @media (max-width: 375px) {
            .reward-modal {
              padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .reward-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: clamp(16px, 4vw, 25px);
            padding: clamp(1.5rem, 5vw, 3rem) clamp(1.25rem, 4vw, 2rem);
            text-align: center;
            color: #1e293b;
            max-width: min(330px, 92vw) !important;
            width: 100%;
            animation: bounceIn 0.6s ease;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          
          @media (min-width: 768px) {
            .reward-content {
              max-width: 340px !important;
              padding: 1.5rem 1.25rem;
            }
          }
          
          @media (max-width: 320px) {
            .reward-content {
              padding: 1.25rem 1rem;
              max-width: 95vw;
            }
          }
          
          @keyframes bounceIn {
            0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          
          .karma-points {
            font-size: clamp(2.5rem, 8vw, 3rem);
            font-weight: bold;
            margin: 1rem 0;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            animation: glow 2s ease-in-out infinite;
          }
          
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
            50% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6); }
          }
          
          /* Prevent horizontal scroll on all elements */
          .meditate-page * {
            max-width: 100%;
            box-sizing: border-box;
          }
          
          /* Ensure emotion slider doesn't cause overflow */
          .emotion-slider {
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
          }
          
          /* Touch-friendly buttons */
          button {
            min-height: 44px;
            min-width: 44px;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
          }
          
          @media (hover: none) and (pointer: coarse) {
            button:hover {
              transform: none;
            }
          }
          
          /* Prevent text selection on touch */
          .emotion-slider > div,
          .session-card,
          .reward-content {
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
          
          /* Improve scrolling performance */
          .emotion-slider {
            will-change: scroll-position;
          }
          
          /* Better focus states for accessibility */
          button:focus-visible {
            outline: 2px solid #FF8C42;
            outline-offset: 2px;
          }
        `}</style>
        
        <div class="page-header">
          <button class="back-btn" onClick={goBack}>
            ← Back
          </button>
          <div class="header-content">
            <div class="activity-icon">🧘♀️</div>
            <h1 class="activity-title">Meditation</h1>
          </div>
          <button class="share-btn" onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Meditation Session - Brahmakosh',
                text: 'Join me in finding inner peace through meditation',
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
        
        <div class="meditation-content">
          <h3 style={{ marginBottom: '1.5rem', color: '#2D3748', fontSize: 'clamp(1rem, 4.5vw, 1.25rem)' }}>Guided Meditation Session</h3>
          <p style={{ marginBottom: '2rem', color: '#718096', lineHeight: '1.6', fontSize: 'clamp(0.875rem, 3.5vw, 1rem)' }}>
            Take a moment to center yourself. Close your eyes, breathe deeply, 
            and let go of all worries. Focus on your breath and find your inner calm.
          </p>
          
          {!isUserLoggedIn.value ? (
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center'
              }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                color: 'white', 
                padding: 'clamp(0.75rem, 3vw, 1rem)', 
                borderRadius: '12px',
                fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                ⚠️ Please log in to save your sessions and earn karma points!
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <button 
                class="btn btn-outline-primary"
                style={{ flex: '1', minWidth: '120px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)' }}
                onClick={() => router.push('/user/login')}
              >
                Login
              </button>
              <button 
                class="btn btn-outline-secondary"
                style={{ flex: '1', minWidth: '120px', fontSize: 'clamp(0.8rem, 3vw, 0.9rem)' }}
                onClick={() => router.push('/mobile/user/register')}
              >
                Register
              </button>
              </div>
            </div>
          ) : null}
        </div>
        
        {/* Session Setup - Now directly on page */}
        <div class="session-setup">
          <h3 style={{ marginBottom: '1.5rem', color: '#2D3748', fontSize: 'clamp(1rem, 4vw, 1.2rem)', textAlign: 'center', fontWeight: '600' }}>Customize Your Meditation</h3>
          
          <div class="emotion-selector" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#2D3748', fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', fontWeight: '500' }}>How are you feeling?</h4>
            <div 
              ref={emotionSliderRef}
              class="emotion-slider"
              style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: '0.5rem', 
                padding: '0.75rem 0',
                marginBottom: '0.75rem',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x mandatory',
                width: '100%',
                boxSizing: 'border-box',
                flexWrap: 'nowrap'
              }}>
              <style>{`
                .emotion-slider::-webkit-scrollbar {
                  display: none;
                }
                
                @media (min-width: 768px) {
                  .emotion-slider {
                    display: grid !important;
                    grid-template-columns: repeat(5, 1fr) !important;
                    overflow-x: visible !important;
                    gap: 1rem !important;
                  }
                  
                  .emotion-slider > div {
                    width: auto !important;
                    flex: none !important;
                    min-height: 90px !important;
                  }
                }
                
                @media (min-width: 1024px) {
                  .emotion-slider {
                    grid-template-columns: repeat(10, 1fr) !important;
                  }
                  
                  .emotion-slider > div {
                    min-height: 95px !important;
                  }
                }
              `}</style>
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
                  key={item.emotion}
                  onClick={() => {
                    selectedEmotion.value = item.emotion;
                    debouncedAutoSelect();
                  }}
                  style={{ 
                    width: 'calc((100% - 1rem) / 3)',
                    flex: '0 0 calc((100% - 1rem) / 3)',
                    padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(0.4rem, 1.5vw, 0.5rem)',
                    borderRadius: 'clamp(8px, 2vw, 12px)',
                    border: selectedEmotion.value === item.emotion ? '2px solid #FF8C42' : '1px solid #e2e8f0',
                    background: selectedEmotion.value === item.emotion ? '#FF8C42' : '#FFFFFF',
                    color: selectedEmotion.value === item.emotion ? 'white' : '#2D3748',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedEmotion.value === item.emotion ? '0 4px 12px rgba(255, 140, 66, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transform: selectedEmotion.value === item.emotion ? 'scale(1.05)' : 'scale(1)',
                    scrollSnapAlign: 'center',
                    minHeight: 'clamp(75px, 20vw, 88px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)', marginBottom: 'clamp(0.2rem, 1vw, 0.3rem)' }}>{item.emoji}</div>
                  <div style={{ 
                    fontSize: 'clamp(0.65rem, 2.5vw, 0.7rem)', 
                    fontWeight: selectedEmotion.value === item.emotion ? '600' : '500', 
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                    {item.emotion}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div class="duration-selector" style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#2D3748', fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', fontWeight: '500' }}>
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
                background: `linear-gradient(to right, #FF8C42 0%, #FF8C42 ${(selectedDuration.value - 1) * 11.11}%, #F4E4C1 ${(selectedDuration.value - 1) * 11.11}%, #F4E4C1 100%)`,
                outline: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#718096' }}>
              <span>1m</span>
              <span>5m</span>
              <span>10m</span>
            </div>
            {selectedDuration.value && (
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem', 
                background: '#FFFFFF', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <h5 style={{ color: '#2D3748', margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Selected Duration</h5>
                  <span style={{ 
                    background: '#FF8C42', 
                    color: 'white', 
                    padding: '0.2rem 0.4rem', 
                    borderRadius: '4px', 
                    fontSize: '0.7rem',
                    fontWeight: '500'
                  }}>
                    {selectedConfig.value?.karmaPoints || 0} pts
                  </span>
                </div>
                <p style={{ color: '#718096', fontSize: '0.8rem', margin: '0.4rem 0', lineHeight: '1.3' }}>Ideal duration for daily meditation practice</p>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#718096' }}>
                  <span>⏱️ {selectedDuration.value} minutes</span>
                  <span>🎯 Optimal</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  background: '#f0f9ff', 
                  borderRadius: '6px',
                  border: '1px solid #0ea5e9'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: '500' }}>💎 Karma Points Preview</div>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>You will earn {selectedConfig.value?.karmaPoints || 0} karma points for completing this meditation session</div>
                </div>
              </div>
            )}
          </div>
          

          
          <button class="start-btn" onClick={startSession}>
            🧘♀️ Begin Meditation
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
                overflow: 'hidden',
                // opacity: 0.7
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
            <h2 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)', marginBottom: '1rem', color: '#2D3748' }}>Meditation in Progress</h2>
            <p style={{ opacity: 0.9, marginBottom: '2rem', color: '#2D3748', fontSize: 'clamp(0.875rem, 3.5vw, 1rem)' }}>Feeling: {selectedEmotion.value}</p>
            
            <div class="zen-circle">
              <div class="zen-icon">🧘</div>
            </div>
            
            <div class="session-timer">{formatTime(sessionTimer.value)}</div>
            
            <p style={{ opacity: 0.9, lineHeight: '1.6', color: '#2D3748', fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', padding: '0 0.5rem' }}>
              Focus on your breath. Let thoughts come and go like clouds in the sky.
            </p>
            
            {/* Media Controls */}
            {(selectedVideoUrl.value || selectedAudioUrl.value) && (
              <div style={{ 
                display: 'flex', 
                gap: 'clamp(0.5rem, 2vw, 1rem)', 
                marginTop: '1.5rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {selectedVideoUrl.value && (
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#2D3748',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
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
                      color: '#2D3748',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
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
                color: '#2D3748',
                padding: '0.8rem 1.5rem',
                borderRadius: '25px',
                cursor: 'pointer',
                marginTop: '2rem'
              }}
              onClick={() => {
                isSessionActive.value = false;
                clearInterval(timerInterval.value);
                
                // Stop background media
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
                const configKarma = selectedConfig.value?.karmaPoints || 0;
                earnedPoints.value = configKarma > 0 ? Math.max(0, Math.floor((completedMinutes / selectedDuration.value) * configKarma)) : 0;
                // Save partial/incomplete session
                if (completedMinutes > 0) {
                  saveSession(selectedDuration.value, completedMinutes, selectedEmotion.value, earnedPoints.value);
                } else {
                  // Save interrupted session with 0 actual duration
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
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: 'clamp(1rem, 4vw, 1.5rem)',
                maxWidth: '95%',
                width: '100%',
                maxWidth: 'min(400px, 95vw)',
                maxHeight: '80vh',
                overflow: 'auto',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, color: '#2D3748', fontSize: 'clamp(0.9rem, 4vw, 1.1rem)', wordBreak: 'break-word', flex: 1 }}>{previewClip.value.title}</h3>
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
                    color: '#64748b'
                  }}
                >
                  ×
                </button>
              </div>
              
              {previewClip.value.description && (
                <p style={{ color: '#718096', fontSize: 'clamp(0.75rem, 3vw, 0.85rem)', marginBottom: '1rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {previewClip.value.description}
                </p>
              )}
              
              {(previewClip.value.videoUrl || previewClip.value.videoPresignedUrl) && (
                <div style={{ marginBottom: '1rem' }}>
                  <video 
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      maxHeight: 'min(300px, 40vh)'
                    }}
                    controls
                    preload="metadata"
                  >
                    <source src={previewClip.value.videoPresignedUrl || previewClip.value.videoUrl} type="video/mp4" />
                  </video>
                </div>
              )}
              
              {(previewClip.value.audioUrl || previewClip.value.audioPresignedUrl) && (
                <div style={{ marginBottom: '1rem' }}>
                  <audio 
                    style={{
                      width: '100%'
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
                  background: '#FF8C42',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
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
            <div class="reward-content" style={{
              maxWidth: window.innerWidth >= 768 ? '360px' : 'min(350px, 92vw)'
            }}>
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
              
              <div style={{ fontSize: 'clamp(2.5rem, 10vw, 3rem)', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 6vw, 1.8rem)', marginBottom: '1rem', fontWeight: 'bold' }}>
                Meditation Complete!
              </h2>
              
              <div style={{ fontSize: 'clamp(1rem, 4vw, 1.2rem)', marginBottom: '1rem', opacity: 0.9 }}>
                You meditated for {selectedDuration.value - Math.ceil(sessionTimer.value / 60)} minutes
                {selectedDuration.value - Math.ceil(sessionTimer.value / 60) < selectedDuration.value && (
                  <div style={{ fontSize: 'clamp(0.8rem, 3vw, 0.9rem)', marginTop: '0.5rem', opacity: 0.7 }}>
                    Target: {selectedDuration.value} minutes
                  </div>
                )}
              </div>
              
              {isUserLoggedIn.value ? (
                <>
                  <div class="karma-points">
                    +{earnedPoints.value} ✨
                  </div>
                  
                  <div style={{ fontSize: 'clamp(0.95rem, 4vw, 1.1rem)', marginBottom: '2rem', opacity: 0.9 }}>
                    Karma Points Earned!
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 'clamp(0.875rem, 3.5vw, 1rem)', marginBottom: '2rem', opacity: 0.9, background: 'rgba(255,255,255,0.2)', padding: 'clamp(0.75rem, 3vw, 1rem)', borderRadius: '12px' }}>
                  ⚠️ Login to save sessions and earn karma points!
                </div>
              )}
              
              <button 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  padding: 'clamp(0.875rem, 3.5vw, 1rem) clamp(1.5rem, 5vw, 2rem)',
                  borderRadius: '25px',
                  fontSize: 'clamp(0.95rem, 4vw, 1.1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '48px',
                  width: '100%',
                  maxWidth: '280px'
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

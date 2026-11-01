import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import spiritualClipService from '../../../services/spiritualClipService.js';
import spiritualStatsService from '../../../services/spiritualStatsService.js';
import spiritualActivityService from '../../../services/spiritualActivityService.js';

export default {
  name: 'MobilePray',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const clips = ref([]);
    const configurations = ref([]);
    const loading = ref(true);
    const isSessionActive = ref(false);
    const sessionTimer = ref(0);
    const selectedEmotion = ref('happy');
    const selectedVideoUrl = ref('');
    const selectedAudioUrl = ref('');
    const selectedVideoKey = ref('');
    const selectedAudioKey = ref('');
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
    const videoWatchdog = ref(null);
    const selectedClip = ref(null);
    const selectedConfig = ref(null);
    const availableClips = ref([]);
    const showClipModal = ref(false);
    const showPreviewModal = ref(false);
    const previewClip = ref(null);
    const isUserLoggedIn = ref(false);
    const showNotification = ref(false);
    const notificationMessage = ref('');
    const notificationType = ref('info');
    
    const SPARKLE_ELEMENTS = Array.from({length: 15}).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2
    }));
    
    const emotions = [
      { emoji: '😢', label: 'Sad', value: 'sad' },
      { emoji: '😠', label: 'Angry', value: 'angry' },
      { emoji: '😨', label: 'Afraid', value: 'afraid' },
      { emoji: '🥰', label: 'Loved', value: 'loved' },
      { emoji: '😊', label: 'Happy', value: 'happy' },
      { emoji: '😲', label: 'Surprised', value: 'surprised' },
      { emoji: '😌', label: 'Calm', value: 'calm' },
      { emoji: '🤢', label: 'Disgusted', value: 'disgusted' },
      { emoji: '😐', label: 'Neutral', value: 'neutral' },
      { emoji: '😰', label: 'Stressed', value: 'stressed' }
    ];
    
    const goBack = () => {
      router.push('/mobile/user/spiritual-checkin');
    };

    const checkUserAuth = () => {
      const token = localStorage.getItem('token_user');
      isUserLoggedIn.value = !!token;
      return !!token;
    };

    const filteredConfigurations = () => {
      if (!selectedEmotion.value) return [];
      return configurations.value.filter(config => 
        config.emotion?.toLowerCase() === selectedEmotion.value.toLowerCase()
      );
    };

    const filteredClips = () => {
      if (!selectedEmotion.value) return clips.value;
      const filtered = clips.value.filter(clip => 
        clip.emotion?.toLowerCase() === selectedEmotion.value.toLowerCase()
      );
      return filtered.length > 0 ? filtered : clips.value;
    };

    const fetchPrayerConfigurations = async () => {
      try {
        const activityType = route.query.type || 'prayer';
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

    const fetchPrayerClips = async () => {
      try {
        loading.value = true;
        const response = await spiritualClipService.getAllClips({ type: 'prayer' });
        
        if (response.success && response.data && response.data.length > 0) {
          clips.value = response.data;
        } else {
          clips.value = [
            {
              _id: 'fallback-1',
              title: 'Daily Gratitude Prayer',
              description: 'Express thankfulness and connect with divine grace through heartfelt prayer.',
              type: 'prayer'
            },
            {
              _id: 'fallback-2',
              title: 'Evening Reflection',
              description: 'End your day with peaceful prayer and spiritual contemplation.',
              type: 'prayer'
            }
          ];
        }
      } catch (error) {
        console.error('Error fetching prayer clips:', error);
        clips.value = [
          {
            _id: 'error-1',
            title: 'Connection Error - Daily Prayer',
            description: 'Connect with divine grace (offline mode).',
            type: 'prayer'
          }
        ];
      } finally {
        loading.value = false;
      }
    };

    const autoSelectClipForEmotion = async () => {
      const configs = filteredConfigurations();
      
      if (configs.length === 0) {
        selectedClip.value = null;
        selectedConfig.value = null;
        availableClips.value = [];
        return;
      }
      
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
          selectedConfig.value = null;
          availableClips.value = [];
        }
      } catch (error) {
        console.error('Error auto-selecting clip:', error);
        selectedClip.value = null;
        selectedConfig.value = null;
        availableClips.value = [];
      }
    };

    const selectClip = (clip) => {
      selectedClip.value = clip;
      const config = configurations.value.find(c => c._id === clip.configId);
      selectedConfig.value = config;
      
      const videoUrl = clip.videoUrl || clip.videoPresignedUrl || '';
      const audioUrl = clip.audioUrl || clip.audioPresignedUrl || '';
      const videoKey = clip.videoKey || '';
      const audioKey = clip.audioKey || '';
      
      if (videoUrl) {
        enableVideo.value = true;
        selectedVideoUrl.value = videoUrl;
        tempVideoUrl.value = videoUrl;
        selectedVideoKey.value = videoKey;
      }
      if (audioUrl) {
        enableAudio.value = true;
        selectedAudioUrl.value = audioUrl;
        tempAudioUrl.value = audioUrl;
        selectedAudioKey.value = audioKey;
      }
      
      showClipModal.value = false;
    };

    const openClipModal = () => {
      showClipModal.value = true;
    };

    const openPreview = (clip) => {
      previewClip.value = clip;
      showPreviewModal.value = true;
    };

    const startSession = () => {
      if (!selectedClip.value) {
        alert('⚠️ Please select a clip before starting the prayer session!');
        return;
      }
      beginPrayer();
    };

    const saveSession = async (targetDuration, actualDuration, emotion, karmaPoints, videoUrl = '', audioUrl = '') => {
      try {
        const token = localStorage.getItem('token_user');
        if (!token) {
          alert('⚠️ Please log in to save your prayer sessions and earn karma points!');
          return;
        }
        
        const sessionData = {
          type: 'prayer',
          title: 'Prayer Session',
          targetDuration: targetDuration,
          actualDuration: actualDuration,
          karmaPoints: karmaPoints,
          emotion: emotion,
          videoUrl: videoUrl || '',
          audioUrl: audioUrl || '',
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

    const beginPrayer = () => {
      if (!selectedClip.value) {
        alert('⚠️ Please select a clip before starting!');
        return;
      }
      
      isSessionActive.value = true;
      const duration = parseInt(selectedConfig.value?.duration) || 5;
      sessionTimer.value = duration * 60;
      
      // Start background media playback after a short delay to ensure elements are mounted
      setTimeout(() => {
        if (selectedVideoUrl.value && backgroundVideo.value) {
          isVideoPlaying.value = true;
          
          // Listen for video end event
          backgroundVideo.value.onended = () => {
            completeSession();
          };
          
          backgroundVideo.value.play().catch(e => {
            isVideoPlaying.value = false;
            notificationMessage.value = '📹 Tap the Video button to start playback';
            notificationType.value = 'info';
            showNotification.value = true;
            setTimeout(() => showNotification.value = false, 3000);
          });
        }
        if (selectedAudioUrl.value && backgroundAudio.value) {
          isAudioPlaying.value = true;
          
          // Listen for audio end event
          backgroundAudio.value.onended = () => {
            completeSession();
          };
          
          backgroundAudio.value.play().catch(e => {
            isAudioPlaying.value = false;
            notificationMessage.value = '🎵 Tap the Audio button to start playback';
            notificationType.value = 'info';
            showNotification.value = true;
            setTimeout(() => showNotification.value = false, 3000);
          });
        }
      }, 500);
      
      timerInterval.value = setInterval(() => {
        sessionTimer.value--;
        if (sessionTimer.value <= 0) {
          completeSession();
        }
      }, 1000);
    };

    const completeSession = () => {
      if (!isSessionActive.value) return;
      
      isSessionActive.value = false;
      clearInterval(timerInterval.value);
      if (videoWatchdog.value) {
        clearInterval(videoWatchdog.value);
      }
      
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
      
      const duration = parseInt(selectedConfig.value?.duration) || 5;
      const completedMinutes = duration - Math.ceil(sessionTimer.value / 60);
      sessionTimer.value = 0;
      earnedPoints.value = selectedConfig.value?.karmaPoints || 0;
      saveSession(duration, completedMinutes, selectedEmotion.value, earnedPoints.value, selectedVideoUrl.value, selectedAudioUrl.value);
      showRewardModal.value = true;
    };

    const endSession = () => {
      isSessionActive.value = false;
      clearInterval(timerInterval.value);
      if (videoWatchdog.value) {
        clearInterval(videoWatchdog.value);
      }
      
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
      
      const targetDuration = parseInt(selectedConfig.value?.duration) || 5;
      const completedMinutes = targetDuration - Math.ceil(sessionTimer.value / 60);
      sessionTimer.value = 0;
      const configKarmaPoints = selectedConfig.value?.karmaPoints || 0;
      earnedPoints.value = Math.max(0, Math.floor((completedMinutes / targetDuration) * configKarmaPoints));
      
      if (completedMinutes > 0) {
        saveSession(targetDuration, completedMinutes, selectedEmotion.value, earnedPoints.value, selectedVideoUrl.value, selectedAudioUrl.value);
      } else {
        saveSession(targetDuration, 0, selectedEmotion.value, 0, selectedVideoUrl.value, selectedAudioUrl.value);
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
      enableVideo.value = false;
      enableAudio.value = false;
      isVideoPlaying.value = false;
      isAudioPlaying.value = false;
    };

    onMounted(async () => {
      checkUserAuth();
      await fetchPrayerConfigurations();
      await fetchPrayerClips();
      await autoSelectClipForEmotion();
    });

    onUnmounted(() => {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
      }
      if (videoWatchdog.value) {
        clearInterval(videoWatchdog.value);
      }
    });

    return () => (
      <div class="prayer-page">
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
          
          .prayer-page {
            padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
            min-height: 100vh;
            min-height: 100dvh;
            background: #f8fafc;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden !important;
            box-sizing: border-box;
            margin: 0;
            position: relative;
          }
          
          @media (min-width: 768px) {
            .prayer-page {
              max-width: 1100px;
              margin: 0 auto;
              width: 100%;
            }
          }
          
          @media (max-width: 480px) {
            .prayer-page {
              padding: max(0.875rem, env(safe-area-inset-top)) max(0.875rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(0.875rem, env(safe-area-inset-left));
            }
          }
          
          @media (max-width: 360px) {
            .prayer-page {
              padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
            }
          }
          
          @media (max-width: 320px) {
            .prayer-page {
              padding: max(0.4rem, env(safe-area-inset-top)) max(0.4rem, env(safe-area-inset-right)) max(0.4rem, env(safe-area-inset-bottom)) max(0.4rem, env(safe-area-inset-left));
            }
          }
          
          .page-header {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 0.75rem;
            margin: 0 0 1rem 0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
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
          
          .prayer-content, .session-setup {
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
            .prayer-content, .session-setup {
              padding: 0.75rem;
              margin-bottom: 0.625rem;
            }
          }
          
          .start-btn {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
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
            box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
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
                        linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.8) 50%, rgba(217, 119, 6, 0.8) 100%);
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
            border-radius: 25px;
            padding: 0.75rem;
            margin: 0.5rem auto;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: none;
            max-width: 240px !important;
            width: calc(100% - 2rem);
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
          
          @media (min-width: 1024px) {
            .session-card {
              max-width: 350px !important;
            }
          }
          
          .session-timer {
            font-size: 3rem;
            font-weight: bold;
            margin: 1rem 0;
            text-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
            color: #fbbf24;
          }
          
          .prayer-circle {
            width: 150px;
            height: 150px;
            margin: 1rem auto;
            border-radius: 50%;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            box-shadow: 0 0 40px rgba(251, 191, 36, 0.6), 0 0 80px rgba(245, 158, 11, 0.4);
            animation: breathingGlow 4s ease-in-out infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .prayer-icon {
            font-size: 4rem;
          }
          
          @keyframes breathingGlow {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 40px rgba(251, 191, 36, 0.6), 0 0 80px rgba(245, 158, 11, 0.4);
            }
            50% { 
              transform: scale(1.1);
              box-shadow: 0 0 60px rgba(251, 191, 36, 0.8), 0 0 120px rgba(245, 158, 11, 0.6);
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
            border-radius: 25px;
            padding: 3rem 2rem;
            text-align: center;
            color: #1e293b;
            max-width: 90%;
            width: 350px;
            animation: bounceIn 0.6s ease;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          
          @media (min-width: 768px) {
            .reward-content {
              max-width: 340px !important;
              width: 340px !important;
              padding: 1.5rem 1.25rem;
            }
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
            font-size: 3rem;
            font-weight: bold;
            margin: 1rem 0;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            animation: glow 2s ease-in-out infinite;
          }
          
          @keyframes glow {
            0%, 100% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
            50% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.6); }
          }
          
          .prayer-page * {
            max-width: 100%;
            box-sizing: border-box;
          }
          
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
          
          .emotion-grid,
          .session-card,
          .reward-content {
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
          }
          
          button:focus-visible {
            outline: 2px solid #fbbf24;
            outline-offset: 2px;
          }
          
          .notification-toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 3000;
            animation: slideDown 0.3s ease;
            max-width: 90%;
            text-align: center;
          }
          
          @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}</style>
        
        <div class="page-header">
          <button class="back-btn" onClick={goBack}>
            ← Back
          </button>
          <div class="header-content">
            <div class="activity-icon">🙏</div>
            <h1 class="activity-title">Prayer</h1>
          </div>
          <button class="share-btn" onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Prayer Session - Brahmakosh',
                text: 'Join me in heartfelt prayer and spiritual connection',
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
        
        {showNotification.value && (
          <div class="notification-toast">
            {notificationMessage.value}
          </div>
        )}
        
        <div class="prayer-content">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.1rem', fontWeight: '700' }}>🙏 Prayer Session</h3>
            <p style={{ color: '#64748b', lineHeight: '1.5', fontSize: '0.9rem', margin: 0 }}>
              Connect with the divine through heartfelt prayer and spiritual contemplation.
            </p>
          </div>
          
          {!isUserLoggedIn.value ? (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
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
        <div class="session-setup" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#1e293b', fontSize: '1.1rem', textAlign: 'center', fontWeight: '700' }}>🙏 Prayer Session</h3>
          
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
              {emotions.map(item => (
                <div
                  class="emotion-card"
                  key={item.value}
                  onClick={() => {
                    selectedEmotion.value = item.value;
                    autoSelectClipForEmotion();
                  }}
                  style={{ 
                    padding: '0.6rem 0.5rem',
                    borderRadius: '10px',
                    border: selectedEmotion.value === item.value ? '2px solid #fbbf24' : '1px solid #e2e8f0',
                    background: selectedEmotion.value === item.value ? '#fbbf24' : '#FFFFFF',
                    color: selectedEmotion.value === item.value ? 'white' : '#2D3748',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedEmotion.value === item.value ? '0 4px 12px rgba(251, 191, 36, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transform: selectedEmotion.value === item.value ? 'scale(1.05)' : 'scale(1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '85px'
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{item.emoji}</div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: selectedEmotion.value === item.value ? '600' : '500', 
                    textTransform: 'capitalize'
                  }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedEmotion.value && selectedConfig.value && (
            <div style={{ 
              marginTop: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem', 
              background: '#fef3c7', 
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: '600', marginBottom: '0.5rem' }}>💎 Karma Points Preview</div>
              <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: '1.4' }}>
                You will earn <strong>{selectedConfig.value.karmaPoints || 0}</strong> karma points for completing this {parseInt(selectedConfig.value.duration) || 5}-minute prayer session
              </div>
            </div>
          )}

          <button class="start-btn" onClick={startSession}>
            🙏 Begin Prayer
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
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fbbf24', fontWeight: 'bold' }}>Prayer in Progress</h2>
            <p style={{ opacity: 0.9, marginBottom: '2rem', color: '#fbbf24', fontWeight: 'bold' }}>Feeling: {selectedEmotion.value}</p>
            
            <div class="prayer-circle">
              <div class="prayer-icon">🙏</div>
            </div>
            
            <div class="session-timer">{formatTime(sessionTimer.value)}</div>
            
            <p style={{ opacity: 0.9, lineHeight: '1.6', color: '#fbbf24', fontWeight: 'bold' }}>
              Connect with divine grace through heartfelt prayer.
            </p>
            
            {/* Media Controls */}
            {(selectedVideoUrl.value || selectedAudioUrl.value) && (
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1.5rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                {selectedVideoUrl.value && (
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#fbbf24',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}
                    onClick={() => {
                      if (backgroundVideo.value) {
                        if (backgroundVideo.value.paused) {
                          backgroundVideo.value.play();
                          isVideoPlaying.value = true;
                          // Restart watchdog
                          if (videoWatchdog.value) clearInterval(videoWatchdog.value);
                          videoWatchdog.value = setInterval(() => {
                            if (backgroundVideo.value && isSessionActive.value && !backgroundVideo.value.paused) {
                              if (backgroundVideo.value.ended) {
                                backgroundVideo.value.currentTime = 0;
                                backgroundVideo.value.play().catch(e => console.log('Watchdog restart error:', e));
                              }
                            }
                          }, 3000);
                        } else {
                          backgroundVideo.value.pause();
                          isVideoPlaying.value = false;
                          // Stop watchdog when manually paused
                          if (videoWatchdog.value) clearInterval(videoWatchdog.value);
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
                      color: '#fbbf24',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
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
                color: '#fbbf24',
                padding: '0.8rem 1.5rem',
                borderRadius: '25px',
                cursor: 'pointer',
                marginTop: '2rem',
                fontWeight: 'bold'
              }}
              onClick={() => {
                isSessionActive.value = false;
                clearInterval(timerInterval.value);
                if (videoWatchdog.value) {
                  clearInterval(videoWatchdog.value);
                }
                
                // Stop background media
                if (backgroundVideo.value) {
                  backgroundVideo.value.pause();
                  backgroundVideo.value.currentTime = 0;
                }
                if (backgroundAudio.value) {
                  backgroundAudio.value.pause();
                  backgroundAudio.value.currentTime = 0;
                }
                
                const targetDuration = parseInt(selectedConfig.value?.duration) || 5;
                const completedMinutes = targetDuration - Math.ceil(sessionTimer.value / 60);
                sessionTimer.value = 0;
                const configKarma = selectedConfig.value?.karmaPoints || 0;
                earnedPoints.value = Math.max(0, Math.floor((completedMinutes / targetDuration) * configKarma));
                // Save partial/incomplete session
                if (completedMinutes > 0) {
                  saveSession(targetDuration, completedMinutes, selectedEmotion.value, earnedPoints.value, selectedVideoUrl.value, selectedAudioUrl.value);
                } else {
                  // Save interrupted session with 0 actual duration
                  saveSession(targetDuration, 0, selectedEmotion.value, 0, selectedVideoUrl.value, selectedAudioUrl.value);
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
        {showPreviewModal.value && previewClip.value && (
          <div 
            class="reward-modal"
            onClick={() => {
              showPreviewModal.value = false;
              previewClip.value = null;
            }}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '90%',
                width: '400px',
                maxHeight: '80vh',
                overflow: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>{previewClip.value.title}</h3>
                <button
                  onClick={() => {
                    showPreviewModal.value = false;
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
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                  {previewClip.value.description}
                </p>
              )}
              
              {(previewClip.value.videoUrl || previewClip.value.videoPresignedUrl) && (
                <div style={{ marginBottom: '1rem' }}>
                  <video 
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      maxHeight: '300px'
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
                  showPreviewModal.value = false;
                  previewClip.value = null;
                }}
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
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
            <div class="reward-content">
              {/* Sparkles Animation */}
              <div class="reward-sparkles">
                {SPARKLE_ELEMENTS.map(sparkle => (
                  <div 
                    key={sparkle.id}
                    class="sparkle"
                    style={{
                      left: `${sparkle.left}%`,
                      top: `${sparkle.top}%`,
                      animationDelay: `${sparkle.delay}s`
                    }}
                  />
                ))}
              </div>
              
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                Prayer Complete!
              </h2>
              
              <div style={{ fontSize: '1.2rem', marginBottom: '1rem', opacity: 0.9 }}>
                You prayed for {(parseInt(selectedConfig.value?.duration) || 5) - Math.ceil(sessionTimer.value / 60)} minutes
                {(parseInt(selectedConfig.value?.duration) || 5) - Math.ceil(sessionTimer.value / 60) < (parseInt(selectedConfig.value?.duration) || 5) && (
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Target: {parseInt(selectedConfig.value?.duration) || 5} minutes
                  </div>
                )}
              </div>
              
              <div class="karma-points">
                +{earnedPoints.value} ✨
              </div>
              
              <div style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.9 }}>
                Karma Points Earned!
              </div>
              
              <button 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '25px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={closeReward}
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

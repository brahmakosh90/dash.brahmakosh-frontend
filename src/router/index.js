import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../store/auth.js';

// Import layouts
import AdminLayout from '../layouts/AdminLayout.jsx';
import ClientLayout from '../layouts/ClientLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import MobileUserLayout from '../layouts/MobileUserLayout.jsx';
import SuperAdminLayout from '../layouts/SuperAdminLayout.jsx';
import { portalRoutes, portalGuard } from '../portal/routes.js';

const routes = [
  // Referral Partner Portal (self-contained module in src/portal)
  ...portalRoutes,
  {
    path: '/',
    redirect: '/user/login'
  },
  
  // Partner routes
  {
    path: '/partner/login',
    name: 'PartnerLogin',
    component: () => import('../views/partner/PartnerLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/partner/register',
    name: 'PartnerRegister',
    component: () => import('../views/partner/PartnerRegister.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/partner/dashboard',
    name: 'PartnerDashboard',
    component: () => import('../views/partner/PartnerDashboard.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },
  {
    path: '/partner/chat',
    name: 'PartnerChat',
    component: () => import('../views/partner/PartnerChat.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },
  {
    path: '/partner/voice',
    name: 'PartnerVoiceCall',
    component: () => import('../views/partner/PartnerVoiceCall.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },
  {
    path: '/partner/earnings',
    name: 'PartnerEarningsHistory',
    component: () => import('../views/partner/PartnerEarningsHistory.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },
  
  // Auth routes - Super Admin
  {
    path: '/super-admin/login',
    name: 'SuperAdminLogin',
    component: () => import('../views/auth/SuperAdminLogin.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Auth routes - Admin
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/auth/AdminLogin.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Auth routes - Client
  {
    path: '/client/login',
    name: 'ClientLogin',
    component: () => import('../views/auth/ClientLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/client/register',
    name: 'ClientRegister',
    component: () => import('../views/auth/ClientRegister.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Auth routes - User
  {
    path: '/user/login',
    name: 'UserLogin',
    component: () => import('../views/auth/UserLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/register',
    name: 'UserRegister',
    component: () => import('../views/auth/UserRegister.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPassword.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/verify-reset-otp',
    name: 'VerifyResetOTP',
    component: () => import('../views/auth/VerifyResetOTP.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPassword.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Legacy auth routes (for backward compatibility)
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/verify-otp',
    name: 'VerifyResetOTPLegacy',
    component: () => import('../views/auth/VerifyResetOTP.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Mobile User Registration (Multi-step with OTP)
  {
    path: '/mobile/user/register',
    name: 'MobileUserRegister',
    component: () => import('../views/mobile/MobileUserRegister.jsx'),
    meta: { requiresGuest: true }
  },
  
  // Mobile user routes
  {
    path: '/mobile/user',
    component: MobileUserLayout,
    meta: { requiresAuth: true, requiresRole: 'user' },
    redirect: '/mobile/user/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'MobileUserDashboard',
        component: () => import('../views/mobile/MobileUserDashboard.jsx')
      },
      {
        path: 'profile',
        name: 'MobileUserProfile',
        component: () => import('../views/mobile/MobileUserProfile.jsx')
      },
      {
        path: 'chat',
        name: 'MobileChatPage',
        component: () => import('../views/mobile/MobileChatPage.jsx')
      },
      {
        path: 'voice',
        name: 'MobileVoicePage',
        component: () => import('../views/mobile/MobileVoicePage.jsx')
      },
      {
        path: 'realtime-agent',
        name: 'RealTimeAgent',
        component: () => import('../views/mobile/RealTimeAgent.jsx')
      },
      {
        path: 'activities',
        name: 'MobileActivities',
        component: () => import('../views/mobile/SpiritualCheck-in/SpiritualActivities.jsx')
      },
      {
        path: 'spiritual-activities',
        name: 'SpiritualActivities',
        component: () => import('../views/mobile/SpiritualCheck-in/SpiritualActivities.jsx')
      },
      {
        path: 'spiritual-stats',
        name: 'SpiritualStats',
        component: () => import('../views/mobile/SpiritualStats.jsx')
      },
      {
        path: 'ask-bi',
        name: 'MobileAskBI',
        component: () => import('../views/mobile/MobileAskBI.jsx')
      },
      {
        path: 'askbi/chat',
        name: 'MobileAskBIChat',
        component: () => import('../views/mobile/MobileAskBIChat.jsx')
      },
      {
        path: 'geeta-shlokas',
        name: 'MobileGeetaShlokas',
        component: () => import('../views/mobile/MobileGeetaShlokas.jsx')
      },
      {
        path: 'brahm-avatar-reels',
        name: 'MobileBrahmAvatarReels',
        component: () => import('../views/mobile/MobileBrahmAvatarReels.jsx')
      },
      {
        path: 'brahm-avatar',
        name: 'MobileBrahmAvatar',
        component: () => import('../views/mobile/MobileBrahmAvatarReels.jsx')
      },
      {
        path: 'brahma-bazar',
        name: 'MobileBrahmaBazar',
        component: () => import('../views/mobile/MobileBrahmaBazar.jsx')
      },
      {
        path: 'rewards',
        name: 'MobileRewards',
        component: () => import('../views/mobile/MobileRewards.jsx')
      },
      {
        path: 'sadhana',
        name: 'MobileSadhana',
        component: () => import('../views/mobile/MobileSadhana.jsx')
      },
      {
        path: 'utility',
        name: 'MobileUtility',
        component: () => import('../views/mobile/MobileUtility.jsx')
      },
      {
        path: 'coming-soon',
        name: 'ComingSoon',
        component: () => import('../views/mobile/ComingSoon.jsx')
      },
      {
        path: 'meditate',
        name: 'MobileMeditate',
        component: () => import('../views/mobile/SpiritualCheck-in/MobileMeditate.jsx')
      },
      {
        path: 'pray',
        name: 'MobilePray',
        component: () => import('../views/mobile/SpiritualCheck-in/MobilePray.jsx')
      },
      {
        path: 'chant',
        name: 'MobileChant',
        component: () => import('../views/mobile/SpiritualCheck-in/MobileChant.jsx')
      },
      {
        path: 'silence',
        name: 'MobileSilence',
        component: () => import('../views/mobile/SpiritualCheck-in/MobileSilence.jsx')
      },
      {
        path: 'home',
        name: 'MobileHome',
        component: () => import('../views/mobile/Navigation/Home.jsx')
      },
      {
        path: 'checkin',
        name: 'MobileCheckIn',
        component: () => import('../views/mobile/Navigation/CheckIn.jsx')
      },
      {
        path: 'ask-bi-nav',
        name: 'MobileAskBINav',
        component: () => import('../views/mobile/Navigation/AskBI.jsx')
      },
      {
        path: 'connect',
        name: 'MobileConnect',
        component: () => import('../views/mobile/Navigation/Connect.jsx')
      },
      {
        path: 'remedies',
        name: 'MobileRemedies',
        component: () => import('../views/mobile/Navigation/Remedies.jsx')
      },
      {
        path: 'credits-history',
        name: 'MobileCreditsHistory',
        component: () => import('../views/mobile/MobileCreditsHistory.jsx')
      },
      {
        path: 'payment',
        name: 'UserPayment',
        component: () => import('../views/user/Payment.jsx')
      },
      {
        path: 'user-chat',
        name: 'MobileUserChat',
        component: () => import('../views/mobile/UserChat.jsx')
      },
      
      {
        path: 'voice-call',
        name: 'UserVoiceCall',
        component: () => import('../views/user/UserVoiceCall.jsx'),
        meta: { requiresAuth: true, requiresRole: 'user' }
      },
      {
        path: 'sankalpas',
        name: 'MobileSankalpas',
        component: () => import('../views/mobile/MobileSankalpas.jsx')
      },
      {
        path: 'sankalpas/:id',
        name: 'MobileSankalpDetail',
        component: () => import('../views/mobile/MobileSankalpDetail.jsx')
      },
      {
        path: 'my-sankalpas',
        name: 'MobileMySankalpas',
        component: () => import('../views/mobile/MobileMySankalpas.jsx')
      },
      {
        path: 'sankalpas/progress/:id',
        name: 'MobileSankalpProgress',
        component: () => import('../views/mobile/MobileSankalpProgress.jsx')
      },
      {
        path: 'leaderboard',
        name: 'MobileLeaderboard',
        component: () => import('../views/mobile/MobileLeaderboard.jsx')
      },
      {
        path: 'analytics',
        name: 'MobileAnalytics',
        component: () => import('../views/mobile/MobileAnalytics.jsx')
      },
      {
        path: 'notifications',
        name: 'MobileNotifications',
        component: () => import('../views/mobile/MobileNotifications.jsx')
      },
      {
        path: 'swapna-decoder',
        name: 'MobileSwapnaDecoder',
        component: () => import('../views/mobile/MobileSwapnaDecoder.jsx')
      },
      {
        path: 'kundali',
        name: 'MobileKundali',
        component: () => import('../views/mobile/MobileKundali.jsx')
      }
    ]
  },
  
  // Super Admin routes
  {
    path: '/super-admin',
    component: SuperAdminLayout,
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    redirect: '/super-admin/overview',
    children: [
      {
        path: 'overview',
        name: 'SuperAdminOverview',
        component: () => import('../views/super-admin/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'SuperAdminProfile',
        component: () => import('../views/super-admin/Profile.jsx')
      },
      {
        path: 'admins',
        name: 'SuperAdminAdmins',
        component: () => import('../views/super-admin/Admins.jsx')
      },
      {
        path: 'pending-approvals',
        name: 'SuperAdminPendingApprovals',
        component: () => import('../views/super-admin/PendingApprovals.jsx')
      },
      {
        path: 'users',
        name: 'SuperAdminUsers',
        component: () => import('../views/super-admin/Users.jsx')
      }
    ]
  },
  
  // Admin routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresRole: ['admin', 'super_admin'] },
    redirect: '/admin/overview',
    children: [
      {
        path: 'overview',
        name: 'AdminOverview',
        component: () => import('../views/admin/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('../views/admin/Profile.jsx')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.jsx')
      },
      {
        path: 'clients',
        name: 'AdminClients',
        component: () => import('../views/admin/Clients.jsx')
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/admin/Settings.jsx')
      },
      {
        path: 'prompts',
        name: 'AdminPrompts',
        component: () => import('../views/admin/Prompts.jsx')
      },
      {
        path: 'payments',
        name: 'AdminPayments',
        component: () => import('../views/admin/Payments.jsx')
      },
      {
        path: 'support',
        name: 'AdminSupport',
        component: () => import('../views/admin/Support.jsx')
      },
      {
        path: 'health',
        name: 'AdminHealth',
        component: () => import('../views/admin/Health.jsx')
      },
      {
        path: 'tools',
        name: 'AdminTools',
        component: () => import('../views/admin/Tools.jsx')
      },
      {
        path: 'ai-agents',
        name: 'AdminAIAgents',
        component: () => import('../views/admin/AIAgents.jsx')
      },
      {
        path: 'credits',
        name: 'AdminCredits',
        component: () => import('../views/admin/Credits.jsx')
      },
      {
        path: 'karma-points',
        name: 'AdminKarmaPoints',
        component: () => import('../views/admin/KarmaPoints.jsx')
      }
    ]
  },
  
  // Client routes
  {
    path: '/client',
    component: ClientLayout,
    meta: { requiresAuth: true, requiresRole: ['client', 'admin', 'super_admin'] },
    redirect: '/client/overview',
    children: [
      {
        path: 'overview',
        name: 'ClientOverview',
        component: () => import('../views/client/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'ClientProfile',
        component: () => import('../views/client/Profile.jsx')
      },
      {
        path: 'spiritual-management',
        name: 'SpiritualManagement',
        component: () => import('../views/client/SpiritualManagement.jsx')
      },
      {
        path: 'spiritual-management/:category',
        name: 'SpiritualManagementCategory',
        component: () => import('../views/client/SpiritualManagement.jsx')
      },
      {
        path: 'spiritual-checkin',
        name: 'SpiritualCheckin',
        component: () => import('../views/client/SpiritualCheckin.jsx')
      },
      {
        path: 'spiritual-rewards',
        name: 'SpiritualRewards',
        component: () => import('../views/client/SpiritualRewards.jsx')
      },
      {
        path: 'karma-points',
        name: 'ClientKarmaPoints',
        component: () => import('../views/client/KarmaPoints.jsx')
      },
      {
        path: 'users',
        name: 'ClientUsers',
        component: () => import('../views/client/Users.jsx')
      },
      {
        path: 'partners/pending',
        name: 'ClientPendingPartners',
        component: () => import('../views/client/PendingPartners.jsx')
      },
      {
        path: 'credits',
        name: 'ClientCredits',
        component: () => import('../views/client/Credits.jsx')
      },
      {
        path: 'subscription-plans',
        name: 'ClientSubscriptionPlans',
        component: () => import('../views/client/SubscriptionPlans.jsx')
      },
      {
        path: 'users/:userId/kundali',
        name: 'UserKundali',
        component: () => import('../views/client/UserKundali.jsx')
      },
      {
        path: 'users/:userId/charts',
        name: 'UserCharts',
        component: () => import('../views/client/Charts.jsx')
      },
      {
        path: 'settings',
        name: 'ClientSettings',
        component: () => import('../views/client/Settings.jsx')
      },
      {
        path: 'payments',
        name: 'ClientPayments',
        component: () => import('../views/client/Payments.jsx')
      },
      {
        path: 'support',
        name: 'ClientSupport',
        component: () => import('../views/client/Support.jsx')
      },
      {
        path: 'health',
        name: 'ClientHealth',
        component: () => import('../views/client/Health.jsx')
      },
      {
        path: 'charts',
        name: 'ClientCharts',
        component: () => import('../views/client/Charts.jsx')
      },
      {
        path: 'kundali',
        name: 'ClientKundali',
        component: () => import('../views/client/Kundali.jsx')
      },
      {
        path: 'user-kundali',
        name: 'ClientUserKundaliLegacy',
        component: () => import('../views/client/UserKundali.jsx')
      },
      {
        path: 'services',
        name: 'ClientServices',
        component: () => import('../views/client/Services.jsx')
      },
      {
        path: 'ai-agents',
        name: 'ClientAIAgents',
        component: () => import('../views/client/AIAgents.jsx')
      },
      {
        path: 'agents',
        name: 'ClientAgents',
        component: () => import('../views/client/Agents.jsx')
      },
      {
        path: 'avatar',
        name: 'ClientAvatar',
        component: () => import('../views/client/Avatar.jsx')
      },
      {
        path: 'astro',
        name: 'ClientAstro',
        component: () => import('../views/client/services/ExpertConnect.jsx')
      },
      {
        path: 'expert-connect',
        name: 'ClientExpertConnect',
        component: () => import('../views/client/services/ExpertConnect.jsx')
      },
      {
        path: 'experts',
        name: 'ClientExperts',
        component: () => import('../views/client/services/ExpertManagement.jsx')
      },
      {
        path: 'expert-details/:id',
        name: 'ClientExpertDetails',
        component: () => import('../views/client/services/ExpertDetails.jsx')
      },
      {
        path: 'brahma-bazar',
        name: 'ClientBrahmaBazar',
        component: () => import('../views/client/services/BrahmaBazar.jsx')
      },
      {
        path: 'post-notification',
        name: 'ClientPostNotification',
        component: () => import('../views/client/tools/PushNotification.jsx')
      },
      {
        path: 'tools',
        name: 'ClientTools',
        component: () => import('../views/client/Tools.jsx')
      },
      // Client Tools
      {
        path: 'tools/brahm-avatar',
        name: 'BrahmAvatar',
        component: () => import('../views/client/tools/BrahmAvatar.jsx')
      },
      {
        path: 'tools/live-avatar',
        name: 'LiveAvatar',
        component: () => import('../views/client/tools/LiveAvatar.jsx')
      },
      {
        path: 'tools/branding',
        name: 'Branding',
        component: () => import('../views/client/tools/Branding.jsx')
      },
      {
        path: 'tools/founder-message',
        name: 'FounderMessage',
        component: () => import('../views/client/tools/FounderMessage.jsx')
      },
      {
        path: 'tools/testimonial',
        name: 'Testimonial',
        component: () => import('../views/client/tools/Testimonial.jsx')
      },
      {
        path: 'tools/sponsors',
        name: 'Sponsors',
        component: () => import('../views/client/tools/Sponsors.jsx')
      },
      {
        path: 'tools/rating',
        name: 'Rating',
        component: () => import('../views/client/tools/Rating.jsx')
      },
      {
        path: 'tools/survey',
        name: 'Survey',
        component: () => import('../views/client/tools/Survey.jsx')
      },
      {
        path: 'tools/tickets',
        name: 'Tickets',
        component: () => import('../views/client/tools/Tickets.jsx')
      },
      {
        path: 'tools/offers',
        name: 'Offers',
        component: () => import('../views/client/tools/Offers.jsx')
      },
      {
        path: 'tools/advertisement',
        name: 'Advertisement',
        component: () => import('../views/client/tools/Advertisement.jsx')
      },
      {
        path: 'tools/push-notification',
        name: 'PushNotification',
        component: () => import('../views/client/tools/PushNotification.jsx')
      },
      {
        path: 'tools/geeta-chapters',
        name: 'GeetaChapterManagement',
        component: () => import('../views/client/tools/geeta/GeetaChapterManagement.jsx')
      },
      {
        path: 'tools/geeta-shlokas/:chapterId',
        name: 'GeetaShlokaManagement',
        component: () => import('../views/client/tools/geeta/GeetaShlokaManagement.jsx')
      },
      {
        path: 'tools/shiv-puran',
        name: 'ShivPuranManagement',
        component: () => import('../views/client/tools/shivpuran/ShivPuranManagement.jsx')
      },
      {
        path: 'tools/shiv-puran/:partId/verses',
        name: 'ShivPuranVerseManagement',
        component: () => import('../views/client/tools/shivpuran/ShivPuranVerseManagement.jsx')
      },
      {
        path: 'tools/ramayana',
        name: 'RamayanaManagement',
        component: () => import('../views/client/tools/ramayana/RamayanaManagement.jsx')
      },
      {
        path: 'tools/ramayana/:kandaId/verses',
        name: 'RamayanaVerseManagement',
        component: () => import('../views/client/tools/ramayana/RamayanaVerseManagement.jsx')
      },
      {
        path: 'tools/durga-saptashati',
        name: 'DurgaSaptashatiManagement',
        component: () => import('../views/client/tools/durgasaptashati/DurgaSaptashatiManagement.jsx')
      },
      {
        path: 'tools/durga-saptashati/:chapterId/verses',
        name: 'DurgaSaptashatiVerseManagement',
        component: () => import('../views/client/tools/durgasaptashati/DurgaSaptashatiVerseManagement.jsx')
      },
      {
        path: 'sankalp',
        name: 'ClientSankalp',
        component: () => import('../views/client/Sankalp.jsx')
      },
      {
        path: 'puja-padhati',
        name: 'ClientPujaPadhati',
        component: () => import('../views/client/PujaPadhati.jsx')
      },
      {
        path: 'swapna-decoder',
        name: 'ClientSwapnaDecoder',
        component: () => import('../views/client/SwapnaDecoder.jsx')
      },

      // Client Services
      {
        path: 'services/brahma-bazar',
        name: 'BrahmaBazar',
        component: () => import('../views/client/services/BrahmaBazar.jsx')
      },
      {
        path: 'services/expert-connect',
        name: 'ExpertConnect',
        component: () => import('../views/client/services/ExpertConnect.jsx')
      },
      {
        path: 'services/expert-management',
        name: 'ExpertManagement',
        component: () => import('../views/client/services/ExpertManagement.jsx')
      },
      {
        path: 'services/expert-details/:id',
        name: 'ExpertDetails',
        component: () => import('../views/client/services/ExpertDetails.jsx')
      },
      // Client Activity
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('../views/client/activity/Activity.jsx')
      },
      {
        path: 'activity/meditation',
        name: 'Meditation',
        component: () => import('../views/client/activity/activityTools/Meditation.jsx')
      },
      {
        path: 'activity/chanting',
        name: 'Chanting',
        component: () => import('../views/client/activity/activityTools/Chanting.jsx')
      },
      {
        path: 'activity/prathana',
        name: 'Prathana',
        component: () => import('../views/client/activity/activityTools/Prathana.jsx')
      },
      {
        path: 'activity/silence',
        name: 'Silence',
        component: () => import('../views/client/activity/activityTools/Silence.jsx')
      },
      {
        path: 'activity/yoga',
        name: 'Yoga',
        component: () => import('../views/client/activity/activityTools/Yoga.jsx')
      },
      {
        path: 'activity/mindfulness',
        name: 'Mindfulness',
        component: () => import('../views/client/activity/activityTools/Mindfulness.jsx')
      },
      {
        path: 'activity/gratitude',
        name: 'Gratitude',
        component: () => import('../views/client/activity/activityTools/Gratitude.jsx')
      },
      {
        path: 'activity/self-reflection',
        name: 'SelfReflection',
        component: () => import('../views/client/activity/activityTools/SelfReflection.jsx')
      },
      {
        path: 'activity/soul-music',
        name: 'SoulMusic',
        component: () => import('../views/client/activity/activityTools/SoulMusic.jsx')
      },
      {
        path: 'activity/wisdom',
        name: 'Wisdom',
        component: () => import('../views/client/activity/activityTools/Wisdom.jsx')
      },
      {
        path: 'activity/prayanam',
        name: 'Prayanam',
        component: () => import('../views/client/activity/activityTools/Prayanam.jsx')
      }
    ]
  },
  
  // User routes
  {
    path: '/user',
    component: DashboardLayout,
    meta: { requiresAuth: true, requiresRole: 'user' },
    redirect: '/user/overview',
    children: [
      {
        path: 'overview',
        name: 'UserOverview',
        component: () => import('../views/user/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('../views/user/Profile.jsx')
      },
      {
        path: 'payment',
        name: 'UserPaymentWeb',
        component: () => import('../views/user/Payment.jsx')
      }
    ]
  },
  
  // Standalone pages
  {
    path: '/chat',
    name: 'ChatPage',
    component: () => import('../pages/ChatPage.jsx')
  },
  {
    path: '/voice',
    name: 'VoicePage',
    component: () => import('../pages/VoicePage.jsx')
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../pages/Home.jsx')
  },
  
  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.jsx')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Helper function to get role from path
const getRoleFromPath = (path) => {
  if (path.startsWith('/super-admin')) return 'super_admin';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/client')) return 'client';
  if (path.startsWith('/partner-portal')) return null; // standalone module, no legacy auth
  if (path.startsWith('/partner')) return 'partner';
  if (path.startsWith('/mobile/user')) return 'user'; // Check mobile/user before /user
  if (path.startsWith('/user')) return 'user';
  return null;
};

// Helper function to get role from JWT token
const getRoleFromToken = (token) => {
  try {
    const tokenToCheck = token || localStorage.getItem('token_super_admin') || 
                         localStorage.getItem('token_admin') || 
                         localStorage.getItem('token_client') || 
                         localStorage.getItem('token_user') ||
                         localStorage.getItem('partner_token');
    if (tokenToCheck) {
      const tokenParts = tokenToCheck.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        return payload.role;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
};

// Helper to check if a specific role is authenticated
const isRoleAuthenticated = (role) => {
  if (!role) return false;
  if (role === 'partner') {
    return !!localStorage.getItem('partner_token');
  }
  const token = localStorage.getItem(`token_${role}`);
  return !!token;
};

// Navigation guards
router.beforeEach(portalGuard);

router.beforeEach(async (to, from, next) => {
  const { initializeAuth, getCurrentRole, getTokenForRole } = useAuth();
  
  // Determine the role for the target route
  const targetRole = getRoleFromPath(to.path);
  
  // Handle token from query parameter (for admin login as client)
  if (to.query.token) {
    // Determine role from path or token itself
    const role = targetRole || getRoleFromToken(to.query.token);
    if (role) {
      localStorage.setItem(`token_${role}`, to.query.token);
    }
    // Remove token from URL and continue
    const { token, ...queryWithoutToken } = to.query;
    next({ path: to.path, query: queryWithoutToken, replace: true });
    return;
  }
  
  // Initialize auth state for the target role
  await initializeAuth(targetRole);
  
  // Check authentication for the specific role
  const isAuthForRole = targetRole ? isRoleAuthenticated(targetRole) : false;
  
  if (to.meta.requiresAuth && !isAuthForRole) {
    // Redirect to appropriate login page based on route
    if (to.path.startsWith('/super-admin')) {
      next('/super-admin/login');
    } else if (to.path.startsWith('/admin')) {
      next('/admin/login');
    } else if (to.path.startsWith('/client')) {
      next('/client/login');
    } else if (to.path.startsWith('/partner')) {
      next('/partner/login');
    } else {
      next('/user/login');
    }
  } else if (to.meta.requiresGuest && isAuthForRole) {
    // Redirect to appropriate dashboard based on role
    if (targetRole === 'super_admin') {
      next('/super-admin/overview');
    } else if (targetRole === 'admin') {
      next('/admin/overview');
    } else if (targetRole === 'client') {
      next('/client/overview');
    } else if (targetRole === 'partner') {
      next('/partner/dashboard');
    } else if (targetRole === 'user') {
      // Check if user is accessing web frontend or mobile
      // If coming from web routes, redirect to web dashboard
      if (from.path.startsWith('/user') && !from.path.startsWith('/mobile')) {
        next('/user/overview');
      } else {
        next('/mobile/user/dashboard'); // Default to mobile dashboard
      }
    } else {
      next('/dashboard');
    }
  } else if (to.meta.requiresRole) {
    const requiredRoles = Array.isArray(to.meta.requiresRole) 
      ? to.meta.requiresRole 
      : [to.meta.requiresRole];
    
    // Check if the target role is in the required roles and authenticated
    if (targetRole && requiredRoles.includes(targetRole) && isAuthForRole) {
      next();
    } else {
      // Redirect based on target role
      if (targetRole === 'super_admin') {
        next('/super-admin/login');
      } else if (targetRole === 'admin') {
        next('/admin/login');
      } else if (targetRole === 'client') {
        next('/client/login');
      } else if (targetRole === 'partner') {
        next('/partner/login');
      } else {
        next('/user/login');
      }
    }
  } else {
    next();
  }
});

export default router;
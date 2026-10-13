import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ChatBubbleLeftRightIcon, 
  UserIcon, 
  PaintBrushIcon, 
  BellIcon, 
  GiftIcon, 
  SpeakerWaveIcon, 
  ChartBarIcon, 
  StarIcon, 
  TicketIcon,
  ArrowRightIcon,
  ClockIcon,
  BuildingOffice2Icon,
  VideoCameraIcon,
  FilmIcon,
  BookOpenIcon,
  MoonIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'ClientTools',
  setup() {
    const router = useRouter();
    
    const tools = [
      { 
        id: 1, 
        name: 'Testimonials', 
        icon: ChatBubbleLeftRightIcon, 
        description: 'Collect and showcase customer reviews and testimonials', 
        route: '/client/tools/testimonial',
        color: '#10b981',
        category: 'Marketing'
      },
      { 
        id: 2, 
        name: 'Founder Message', 
        icon: UserIcon, 
        description: 'Create personalized messages from company leadership', 
        route: '/client/tools/founder-message',
        color: '#8b5cf6',
        category: 'Content'
      },
      { 
        id: 3, 
        name: 'Branding', 
        icon: PaintBrushIcon, 
        description: 'Manage brand assets, colors, and visual identity', 
        route: '/client/tools/branding',
        color: '#f59e0b',
        category: 'Design'
      },
      { 
        id: 4, 
        name: 'Push Notifications', 
        icon: BellIcon, 
        description: 'Send targeted notifications to engage users', 
        route: '/client/tools/push-notification',
        color: '#ef4444',
        category: 'Communication'
      },
      { 
        id: 5, 
        name: 'Offers & Promotions', 
        icon: GiftIcon, 
        description: 'Create and manage special offers and discounts', 
        route: '/client/tools/offers',
        color: '#ec4899',
        category: 'Marketing'
      },
      { 
        id: 6, 
        name: 'Advertisement', 
        icon: SpeakerWaveIcon, 
        description: 'Design and launch advertising campaigns', 
        route: '/client/tools/advertisement',
        color: '#06b6d4',
        category: 'Marketing'
      },
      { 
        id: 7, 
        name: 'Customer Survey', 
        icon: ChartBarIcon, 
        description: 'Gather feedback through customizable surveys', 
        route: '/client/tools/survey',
        color: '#3b82f6',
        category: 'Analytics'
      },
      { 
        id: 8, 
        name: 'Rating System', 
        icon: StarIcon, 
        description: 'Manage customer ratings and review system', 
        route: '/client/tools/rating',
        color: '#f59e0b',
        category: 'Analytics'
      },
      { 
        id: 9, 
        name: 'Activity', 
        icon: ClockIcon, 
        description: 'Track user activities and engagement metrics', 
        route: '/client/activity',
        color: '#14b8a6',
        category: 'Analytics'
      },
      { 
        id: 10, 
        name: 'Support Tickets', 
        icon: TicketIcon, 
        description: 'Handle customer support requests efficiently', 
        route: '/client/tools/tickets',
        color: '#6366f1',
        category: 'Support'
      },
      { 
        id: 11, 
        name: 'Sponsors', 
        icon: BuildingOffice2Icon, 
        description: 'Manage sponsorship partnerships and collaborations', 
        route: '/client/tools/sponsors',
        color: '#7c3aed',
        category: 'Marketing'
      },
      { 
        id: 12, 
        name: 'Live Avatar', 
        icon: VideoCameraIcon, 
        description: 'Create and manage interactive live avatar experiences', 
        route: '/client/tools/live-avatar',
        color: '#ff6b6b',
        category: 'Content'
      },
      { 
        id: 13, 
        name: 'Brahm Avatar', 
        icon: FilmIcon, 
        description: 'Create and manage spiritual reels and short video content', 
        route: '/client/tools/brahm-avatar',
        color: '#ff9500',
        category: 'Content'
      },
      { 
        id: 14, 
        name: 'Geeta Shloka', 
        icon: BookOpenIcon, 
        description: 'Manage Bhagavad Geeta shlokas with Sanskrit, Hindi and English meanings', 
        route: '/client/tools/geeta-chapters',
        color: '#ff6b35',
        category: 'Spiritual'
      },
      { 
        id: 15, 
        name: 'संकल्प (Sankalp)', 
        icon: StarIcon, 
        description: 'Manage spiritual resolutions and commitments for users', 
        route: '/client/sankalp',
        color: '#9333ea',
        category: 'Spiritual'
      },
      { 
        id: 16, 
        name: 'पूजा पद्धति (Puja Padhati)', 
        icon: BookOpenIcon, 
        description: 'Manage puja methods, vidhi, mantras and samagri lists', 
        route: '/client/puja-padhati',
        color: '#ff6b35',
        category: 'Spiritual'
      },
      { 
        id: 17, 
        name: 'स्वप्न डिकोडर (Swapna Decoder)', 
        icon: MoonIcon, 
        description: 'Decode and interpret dreams with spiritual and Vedic insights', 
        route: '/client/swapna-decoder',
        color: '#6366f1',
        category: 'Spiritual'
      },
      { 
        id: 18, 
        name: 'शिव पुराण (Shiv Puran)', 
        icon: BookOpenIcon, 
        description: 'Manage Shiv Puran chapters and sacred stories of Lord Shiva', 
        route: '/client/tools/shiv-puran',
        color: '#1e40af',
        category: 'Spiritual'
      },
      { 
        id: 19, 
        name: 'रामायण (Ramayana)', 
        icon: BookOpenIcon, 
        description: 'Manage Ramayana kandas and sacred verses of Lord Ram', 
        route: '/client/tools/ramayana',
        color: '#b45309',
        category: 'Spiritual'
      },
      { 
        id: 20, 
        name: 'दुर्गा सप्तशती (Durga Saptashati)', 
        icon: BookOpenIcon, 
        description: 'Manage Durga Saptashati chapters and sacred verses of Maa Durga', 
        route: '/client/tools/durga-saptashati',
        color: '#be123c',
        category: 'Spiritual'
      }
    ];

    const handleCardClick = (route) => {
      router.push(route);
    };

    const getCategoryBadgeColor = (category) => {
      const colors = {
        'Marketing': 'bg-success',
        'Content': 'bg-info',
        'Design': 'bg-warning',
        'Communication': 'bg-danger',
        'Analytics': 'bg-primary',
        'Support': 'bg-secondary',
        'Spiritual': 'bg-warning'
      };
      return colors[category] || 'bg-secondary';
    };

    return () => (
      <div class="container-fluid px-4">
        <style>{`
          .tool-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 16px;
          }
          .tool-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
          }
          .tool-icon {
            transition: all 0.3s ease;
          }
          .tool-card:hover .tool-icon {
            transform: rotate(10deg) scale(1.1);
          }
          .arrow-btn {
            transition: all 0.3s ease;
          }
          .tool-card:hover .arrow-btn {
            transform: scale(1.2);
            background-color: var(--tool-color) !important;
            color: white !important;
          }
          .hover-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .tool-card:hover .hover-overlay {
            opacity: 1;
          }
        `}</style>
        <div class="row">
          <div class="col-12">
            {/* Header Section */}
            <div class="mb-5">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h1 class="display-5 fw-bold text-dark mb-2">Business Tools</h1>
                  <p class="lead text-muted mb-0">Powerful tools to grow and manage your business efficiently</p>
                </div>
                <div class="text-end">
                  <div class="badge bg-light text-dark px-3 py-2 fs-6">
                    {tools.length} Tools Available
                  </div>
                </div>
              </div>
              <hr class="border-2 opacity-25" />
            </div>

            {/* Tools Grid */}
            <div class="row g-4">
              {tools.map(tool => (
                <div key={tool.id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                  <div 
                    class="tool-card card h-100 border-0 shadow-sm position-relative overflow-hidden" 
                    style={{ 
                      '--tool-color': tool.color,
                      background: `linear-gradient(135deg, ${tool.color}08 0%, ${tool.color}15 30%, #f8fafc 100%)`
                    }}
                    onClick={() => handleCardClick(tool.route)}
                  >
                    {/* Category Badge */}
                    <div class="position-absolute top-0 end-0 m-3">
                      <span class={`badge ${getCategoryBadgeColor(tool.category)} px-2 py-1`}>
                        {tool.category}
                      </span>
                    </div>

                    <div class="card-body p-4">
                      {/* Icon */}
                      <div class="mb-4">
                        <div 
                          class="tool-icon d-inline-flex align-items-center justify-content-center rounded-3"
                          style={{ 
                            width: '72px', 
                            height: '72px',
                            backgroundColor: `${tool.color}15`,
                            border: `2px solid ${tool.color}25`
                          }}
                        >
                          <tool.icon 
                            style={{ 
                              width: '2rem', 
                              height: '2rem',
                              color: tool.color
                            }} 
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div class="mb-4">
                        <h5 class="card-title fw-bold mb-2 text-dark">{tool.name}</h5>
                        <p class="card-text text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
                          {tool.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                          <span>Click to access</span>
                        </div>
                        <div 
                          class="arrow-btn d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: `${tool.color}10`,
                            color: tool.color
                          }}
                        >
                          <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div 
                      class="hover-overlay position-absolute top-0 start-0 w-100 h-100"
                      style={{
                        background: `linear-gradient(135deg, ${tool.color}15 0%, ${tool.color}25 100%)`,
                        pointerEvents: 'none',
                        borderRadius: '16px'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div class="mt-5 pt-4 border-top">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <p class="text-muted mb-0">
                    <strong>Need help?</strong> Contact our support team for assistance with any of these tools.
                  </p>
                </div>
                <div class="col-md-4 text-md-end">
                  <small class="text-muted">Last updated: {new Date().toLocaleDateString()}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
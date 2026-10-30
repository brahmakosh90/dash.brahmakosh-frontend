import { ref, onMounted } from 'vue';
import { useAuth } from '../../store/auth.js';
import { useRouter } from 'vue-router';
import { 
  ChatBubbleLeftRightIcon, 
  UserIcon, 
  FilmIcon,
  ArrowRightIcon,
  SparklesIcon,
  CreditCardIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'MobileUserDashboard',
  setup() {
    const router = useRouter();
    const { user } = useAuth();

    const tools = [
      {
        id: 1,
        name: '🙏 संकल्प (Sankalpas)',
        icon: SparklesIcon,
        description: 'Take spiritual resolutions and track your daily progress',
        route: '/mobile/user/sankalpas',
        color: '#9333ea'
      },
      {
        id: 2,
        name: 'Text Chat',
        icon: ChatBubbleLeftRightIcon,
        description: 'Start a conversation with AI using text messages',
        route: '/mobile/user/chat',
        color: '#10b981'
      },
      {
        id: 4,
        name: 'My Profile',
        icon: UserIcon,
        description: 'View and manage your profile information',
        route: '/mobile/user/profile',
        color: '#3b82f6'
      },
      {
        id: 5,
        name: 'BrahmAvatar Reels',
        icon: FilmIcon,
        description: 'Watch spiritual reels and divine content',
        route: '/mobile/user/brahm-avatar',
        color: '#ff9500'
      },
      {
        id: 6,
        name: '💳 Buy Credits / Plans',
        icon: CreditCardIcon,
        description: 'Purchase credit packs or subscribe to a plan via Stripe',
        route: '/mobile/user/payment',
        color: '#0ea5e9'
      }
    ];

    const handleCardClick = (route) => {
      router.push(route);
    };

    return () => (
      <div class="mobile-dashboard">
        {/* Header */}
        <div class="dashboard-header">
          <p>Access your AI-powered tools and features</p>
        </div>
        
        <style>{`
          .mobile-dashboard {
            padding: 1rem;
            min-height: 100vh;
            background: #f8fafc;
          }
          
          .dashboard-header {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 1rem 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(0, 0, 0, 0.05);
            text-align: center;
          }
          
          .dashboard-header p {
            margin: 0;
            font-size: 1rem;
            color: #1e293b;
            font-weight: 500;
          }
          
          .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
          }
          
          @media (max-width: 768px) {
            .mobile-dashboard {
              padding: 0.75rem;
            }
            
            .tools-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            
            .dashboard-header {
              padding: 0.75rem 1rem;
              margin-bottom: 1.5rem;
            }
            
            .dashboard-header p {
              font-size: 0.9rem;
            }
          }
          
          @media (max-width: 480px) {
            .mobile-dashboard {
              padding: 0.5rem;
            }
            
            .tools-grid {
              gap: 0.75rem;
            }
            
            .dashboard-header {
              padding: 0.5rem 0.75rem;
              margin-bottom: 1rem;
            }
          }
          
          .tool-card {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
          }
          
          .tool-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          
          .tool-icon-container {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
            transition: all 0.3s ease;
          }
          
          .tool-card:hover .tool-icon-container {
            transform: scale(1.1);
          }
          
          .tool-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.5rem;
          }
          
          .tool-description {
            font-size: 0.9rem;
            color: #64748b;
            line-height: 1.4;
            margin-bottom: 1rem;
          }
          
          .tool-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .tool-action-text {
            font-size: 0.8rem;
            color: #94a3b8;
          }
          
          .tool-arrow {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          
          .tool-card:hover .tool-arrow {
            transform: scale(1.2);
          }
          
          @media (max-width: 768px) {
            .tool-card {
              padding: 1.25rem;
            }
            
            .tool-icon-container {
              width: 50px;
              height: 50px;
            }
            
            .tool-title {
              font-size: 1rem;
            }
            
            .tool-description {
              font-size: 0.85rem;
            }
          }
          
          @media (max-width: 480px) {
            .tool-card {
              padding: 1rem;
            }
            
            .tool-icon-container {
              width: 45px;
              height: 45px;
            }
            
            .tool-title {
              font-size: 0.95rem;
            }
            
            .tool-description {
              font-size: 0.8rem;
            }
            
            .tool-arrow {
              width: 28px;
              height: 28px;
            }
          }
        `}</style>
        
        {/* Tools Grid */}
        <div class="tools-grid">
          {tools.map(tool => (
            <div 
              key={tool.id}
              class="tool-card"
              style={{
                background: `linear-gradient(135deg, ${tool.color}08 0%, ${tool.color}15 30%, #ffffff 100%)`
              }}
              onClick={() => handleCardClick(tool.route)}
            >
              <div 
                class="tool-icon-container"
                style={{
                  backgroundColor: `${tool.color}15`,
                  border: `2px solid ${tool.color}25`
                }}
              >
                <tool.icon 
                  style={{ 
                    width: '1.5rem', 
                    height: '1.5rem',
                    color: tool.color
                  }} 
                />
              </div>
              
              <div class="tool-title">{tool.name}</div>
              <div class="tool-description">{tool.description}</div>
              
              <div class="tool-action">
                <div class="tool-action-text">Tap to access</div>
                <div 
                  class="tool-arrow"
                  style={{
                    backgroundColor: `${tool.color}10`,
                    color: tool.color
                  }}
                >
                  <ArrowRightIcon style={{ width: '1rem', height: '1rem' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
};


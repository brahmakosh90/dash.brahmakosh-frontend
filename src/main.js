import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App.jsx'
import router from './router/index.js'
import { useAuth } from './store/auth.js'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Add global CSS for layout fixes
const globalStyles = `
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
  
  #app {
    min-height: 100vh;
  }
`;

// Inject global styles
const styleSheet = document.createElement('style');
styleSheet.textContent = globalStyles;
document.head.appendChild(styleSheet);

const app = createApp(App)
app.use(router)
app.use(Toast, {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
})

// Initialize auth on app start (non-blocking)
const { initializeAuth } = useAuth()
initializeAuth().catch(() => {})

app.mount('#app')

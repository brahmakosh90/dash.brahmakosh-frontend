import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../../store/auth.js';
import api from '../../services/api.js';

export default {
  name: 'UserLogin',
  setup() {
    const router = useRouter();
    const { login } = useAuth();
    const email = ref('');
    const password = ref('');
    const loading = ref(false);
    const error = ref('');

    const handleLogin = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      
      try {
        // Use the original user auth endpoint
        const response = await api.request('/auth/user/login', {
          method: 'POST',
          body: {
            email: email.value,
            password: password.value
          }
        });

        if (response.success) {
          // Store token
          localStorage.setItem('token_user', response.data.token);
          // Only store clientId if it's actually valid (not null/undefined)
          if (response.data.clientId) {
            localStorage.setItem('user_client_id', response.data.clientId);
          }
          if (response.data.clientName) {
            localStorage.setItem('user_client_name', response.data.clientName);
          }
          router.push('/mobile/user/dashboard');
        }
      } catch (err) {
        error.value = err.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    };

    let googleInitialized = false;

    onMounted(() => {
      if (!window.google?.accounts?.id) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => initGoogle();
        document.body.appendChild(script);
      } else {
        initGoogle();
      }
    });
 
    function initGoogle() {
      if (!window.google?.accounts?.id || googleInitialized) return;
      googleInitialized = true;
      window.google.accounts.id.initialize({
        client_id: '449350149768-a1a1qn8siakh4hq7tejj60ri81c6hh85.apps.googleusercontent.com',
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'large', width: 340 }
      );
    }
 
    async function handleGoogleCredential(response) {
      loading.value = true;
      error.value = '';
      try {
        // Google login also auto-determines client
        const { data } = await api.post('/auth/user/google', {
          idToken: response.credential
        });
        
        localStorage.setItem('token_user', data.data.token);
        localStorage.setItem('user_client_id', data.data.clientId);
        localStorage.setItem('user_client_name', data.data.clientName);
        
        router.push('/mobile/user/dashboard');
      } catch (e) {
        error.value = e.response?.data?.message || 'Google login failed';
      } finally {
        loading.value = false;
      }
    }

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '2rem' }}>User Login</h1>
          {error.value && <div class="alert alert-danger">{error.value}</div>}
          <form onSubmit={handleLogin}>
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input
                id="email"
                name="email"
                value={email.value}
                onInput={(e) => email.value = e.target.value}
                type="email"
                class="form-control"
                required
                placeholder="Enter user email"
                autocomplete="email"
              />
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input
                id="password"
                name="password"
                value={password.value}
                onInput={(e) => password.value = e.target.value}
                type="password"
                class="form-control"
                required
                placeholder="Enter password"
                autocomplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
              {loading.value ? 'Logging in...' : 'Login'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
              <RouterLink to="/user/forgot-password" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
                Forgot Password?
              </RouterLink>
            </p>
            <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
              Don't have an account?{' '}
              <RouterLink to="/mobile/user/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 'bold' }}>
                Register
              </RouterLink>
            </p>
          </form>
          
          {/* Google Sign-In */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#6b7280', position: 'relative' }}>
              <span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e5e7eb', zIndex: 0 }}></div>
            </div>
            <div id="g_id_signin" style={{ display: 'flex', justifyContent: 'center' }}></div>
          </div>
        </div>
      </div>
    );
  }
};
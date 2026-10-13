import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'UserLogin',
  setup() {
    const router = useRouter();
    const DEFAULT_CLIENT_ID = 'CLI-KBHUMT';

    // Tab: 'email' or 'phone'
    const activeTab = ref('phone');

    // Email login
    const email = ref('');
    const password = ref('');

    // Phone OTP login
    const mobile = ref('');
    const otpMethod = ref('whatsapp');
    const otp = ref('');
    const otpSent = ref(false);

    const loading = ref(false);
    const error = ref('');

    // Email + Password Login
    const handleEmailLogin = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/login', {
          method: 'POST',
          body: { email: email.value, password: password.value, clientId: DEFAULT_CLIENT_ID }
        });
        if (response.success) {
          localStorage.setItem('token_user', response.data.token);
          if (response.data.clientId) localStorage.setItem('user_client_id', response.data.clientId);
          if (response.data.clientName) localStorage.setItem('user_client_name', response.data.clientName);
          router.push('/mobile/user/dashboard');
        }
      } catch (err) {
        error.value = err.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    };

    // Phone: Send OTP
    const handleSendOTP = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/login/phone', {
          method: 'POST',
          body: { mobile: mobile.value, otpMethod: otpMethod.value, clientId: DEFAULT_CLIENT_ID }
        });
        if (response.success) {
          otpSent.value = true;
        }
      } catch (err) {
        error.value = err.message || 'Failed to send OTP';
      } finally {
        loading.value = false;
      }
    };

    // Phone: Verify OTP
    const handleVerifyOTP = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/login/phone/verify', {
          method: 'POST',
          body: { mobile: mobile.value, otp: otp.value, clientId: DEFAULT_CLIENT_ID }
        });
        if (response.success) {
          localStorage.setItem('token_user', response.data.token);
          if (response.data.clientId) localStorage.setItem('user_client_id', response.data.clientId);
          if (response.data.clientName) localStorage.setItem('user_client_name', response.data.clientName);
          router.push('/mobile/user/dashboard');
        }
      } catch (err) {
        error.value = err.message || 'Invalid OTP';
      } finally {
        loading.value = false;
      }
    };

    const resendOTP = async () => {
      try {
        await api.request('/mobile/user/login/phone', {
          method: 'POST',
          body: { mobile: mobile.value, otpMethod: otpMethod.value, clientId: DEFAULT_CLIENT_ID }
        });
        alert('OTP resent');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    // Google Login
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
        const { data } = await api.post('/auth/user/google', { idToken: response.credential });
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

    const tabStyle = (tab) => ({
      flex: 1,
      padding: '10px',
      textAlign: 'center',
      cursor: 'pointer',
      borderBottom: activeTab.value === tab ? '2px solid #6366f1' : '2px solid transparent',
      color: activeTab.value === tab ? '#6366f1' : '#6b7280',
      fontWeight: activeTab.value === tab ? '600' : '400',
      background: 'none',
      border: 'none',
      borderBottom: activeTab.value === tab ? '2px solid #6366f1' : '2px solid #e5e7eb',
    });

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1f2937', fontSize: '1.8rem' }}>Login</h1>

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '1.5rem' }}>
            <button style={tabStyle('phone')} onClick={() => { activeTab.value = 'phone'; error.value = ''; otpSent.value = false; }}>
              📱 Phone OTP
            </button>
            <button style={tabStyle('email')} onClick={() => { activeTab.value = 'email'; error.value = ''; }}>
              ✉️ Email
            </button>
          </div>

          {error.value && <div class="alert alert-danger">{error.value}</div>}

          {/* Phone OTP Login */}
          {activeTab.value === 'phone' && (
            <form onSubmit={otpSent.value ? handleVerifyOTP : handleSendOTP}>
              <div class="mb-3">
                <label class="form-label">Mobile Number</label>
                <input
                  value={mobile.value}
                  onInput={(e) => mobile.value = e.target.value}
                  type="tel"
                  class="form-control"
                  required
                  disabled={otpSent.value}
                  placeholder="e.g. 9876543210"
                />
              </div>
              {!otpSent.value && (
                <div class="mb-3">
                  <label class="form-label">OTP Method</label>
                  <select value={otpMethod.value} onChange={(e) => otpMethod.value = e.target.value} class="form-control">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="twilio">SMS (Twilio)</option>
                    <option value="gupshup">SMS (Gupshup)</option>
                  </select>
                </div>
              )}
              {otpSent.value && (
                <>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>OTP sent to <strong>{mobile.value}</strong></p>
                  <div class="mb-3">
                    <label class="form-label">Enter OTP</label>
                    <input
                      value={otp.value}
                      onInput={(e) => otp.value = e.target.value}
                      type="text"
                      class="form-control"
                      required
                      placeholder="Enter 6-digit OTP"
                      maxLength="6"
                    />
                  </div>
                  <button type="button" onClick={resendOTP} class="btn btn-link" style={{ padding: 0, marginBottom: '1rem' }}>
                    Resend OTP
                  </button>
                </>
              )}
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Please wait...' : otpSent.value ? 'Verify & Login' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* Email + Password Login */}
          {activeTab.value === 'email' && (
            <form onSubmit={handleEmailLogin}>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input
                  value={email.value}
                  onInput={(e) => email.value = e.target.value}
                  type="email"
                  class="form-control"
                  required
                  placeholder="Enter email"
                  autocomplete="email"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input
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
              <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                <RouterLink to="/user/forgot-password" style={{ color: '#6366f1', fontSize: '0.9rem' }}>Forgot Password?</RouterLink>
              </p>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
            Don't have an account?{' '}
            <RouterLink to="/mobile/user/register" style={{ color: '#6366f1', fontWeight: 'bold' }}>Register</RouterLink>
          </p>

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

import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'MobileUserRegister',
  setup() {
    const router = useRouter();
    const DEFAULT_CLIENT_ID = 'CLI-KBHUMT';

    // Steps: 1=Mobile OTP, 2=Verify OTP, 3=Profile, 4=Image
    const step = ref(1);

    // Step 1
    const mobile = ref('');
    const otpMethod = ref('whatsapp');

    // Step 2
    const mobileOtp = ref('');

    // Step 3
    const email = ref('');
    const password = ref('');
    const profile = ref({
      name: '',
      dob: '',
      timeOfBirth: '',
      placeOfBirth: '',
      latitude: null,
      longitude: null,
      gowthra: '',
      profession: ''
    });

    // Step 4
    const imageFile = ref(null);
    const userToken = ref(null);

    // Location
    const locationSearchResults = ref([]);
    const isSearchingLocation = ref(false);
    const locationSearchQuery = ref('');
    const isGettingLocation = ref(false);

    const loading = ref(false);
    const error = ref('');

    // Step 1: Send Mobile OTP
    const handleStep1 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/register/step1', {
          method: 'POST',
          body: { mobile: mobile.value, otpMethod: otpMethod.value, clientId: DEFAULT_CLIENT_ID }
        });
        if (response.success) {
          step.value = 2;
        }
      } catch (err) {
        error.value = err.message || 'Failed to send OTP';
      } finally {
        loading.value = false;
      }
    };

    // Step 2: Verify Mobile OTP
    const handleStep2Verify = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/register/step1/verify', {
          method: 'POST',
          body: { mobile: mobile.value, otp: mobileOtp.value, clientId: DEFAULT_CLIENT_ID }
        });
        if (response.success) {
          step.value = 3;
        }
      } catch (err) {
        error.value = err.message || 'Invalid OTP';
      } finally {
        loading.value = false;
      }
    };

    // Resend OTP
    const resendOTP = async () => {
      try {
        await api.request('/mobile/user/register/step1', {
          method: 'POST',
          body: { mobile: mobile.value, otpMethod: otpMethod.value, clientId: DEFAULT_CLIENT_ID }
        });
        alert('OTP resent');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    // Location Search
    const searchLocation = async () => {
      if (!locationSearchQuery.value || locationSearchQuery.value.length < 3) {
        locationSearchResults.value = [];
        return;
      }
      isSearchingLocation.value = true;
      try {
        const response = await api.request(`/mobile/user/search-location?q=${encodeURIComponent(locationSearchQuery.value)}`);
        if (response.success) locationSearchResults.value = response.data.locations;
      } catch (err) {
        locationSearchResults.value = [];
      } finally {
        isSearchingLocation.value = false;
      }
    };

    const selectLocation = (location) => {
      profile.value.placeOfBirth = location.displayName;
      profile.value.latitude = location.lat;
      profile.value.longitude = location.lon;
      locationSearchQuery.value = location.displayName;
      locationSearchResults.value = [];
    };

    const useCurrentLocation = () => {
      if (!navigator.geolocation) { error.value = 'Geolocation not supported'; return; }
      isGettingLocation.value = true;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          profile.value.latitude = latitude;
          profile.value.longitude = longitude;
          try {
            const response = await api.request(`/mobile/user/reverse-geocode?lat=${latitude}&lon=${longitude}`);
            if (response.success && response.data.location) {
              profile.value.placeOfBirth = response.data.location.formattedAddress;
              locationSearchQuery.value = response.data.location.formattedAddress;
            }
          } catch (_) {}
          isGettingLocation.value = false;
        },
        () => { error.value = 'Failed to get location'; isGettingLocation.value = false; },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Step 3: Complete Profile
    const handleStep3 = async (e) => {
      e.preventDefault();
      if (!profile.value.latitude || !profile.value.longitude) {
        error.value = 'Please select a location';
        return;
      }
      loading.value = true;
      error.value = '';
      try {
        const response = await api.request('/mobile/user/register/step3', {
          method: 'POST',
          body: {
            mobile: mobile.value,
            email: email.value,
            password: password.value,
            clientId: DEFAULT_CLIENT_ID,
            ...profile.value
          }
        });
        if (response.success) {
          userToken.value = response.data?.token || null;
          step.value = 4;
        }
      } catch (err) {
        error.value = err.message || 'Failed to complete registration';
      } finally {
        loading.value = false;
      }
    };

    // Step 4: Upload Profile Image
    const handleStep4 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        if (!imageFile.value) throw new Error('Please select an image');
        if (!userToken.value) throw new Error('Missing token. Please complete profile again.');
        const formData = new FormData();
        formData.append('image', imageFile.value);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/mobile/user/profile/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken.value}` },
          body: formData
        });
        const data = await response.json();
        if (data.success) {
          router.push('/user/login');
        } else {
          throw new Error(data.message || 'Failed to upload image');
        }
      } catch (err) {
        error.value = err.message || 'Failed to upload image';
      } finally {
        loading.value = false;
      }
    };

    const stepLabels = ['Mobile OTP', 'Verify OTP', 'Profile', 'Photo'];

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f5f5f5' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '1.8rem' }}>Register</h1>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px', background: step.value >= i + 1 ? '#6366f1' : '#e0e0e0', color: step.value >= i + 1 ? 'white' : '#666', borderRadius: '8px', margin: '0 4px', fontSize: '0.8rem' }}>
                {label}
              </div>
            ))}
          </div>

          {error.value && <div class="alert alert-danger" style={{ marginBottom: '1rem' }}>{error.value}</div>}

          {/* Step 1: Send Mobile OTP */}
          {step.value === 1 && (
            <form onSubmit={handleStep1}>
              <div class="mb-3">
                <label class="form-label">Mobile Number</label>
                <input
                  value={mobile.value}
                  onInput={(e) => mobile.value = e.target.value}
                  type="tel"
                  class="form-control"
                  required
                  placeholder="Enter mobile number (e.g. 9876543210)"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">OTP Method</label>
                <select value={otpMethod.value} onChange={(e) => otpMethod.value = e.target.value} class="form-control">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="twilio">SMS (Twilio)</option>
                  <option value="gupshup">SMS (Gupshup)</option>
                </select>
              </div>
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Sending...' : 'Send OTP'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
                Already have an account? <RouterLink to="/user/login" style={{ color: '#6366f1' }}>Login</RouterLink>
              </p>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step.value === 2 && (
            <form onSubmit={handleStep2Verify}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>OTP sent to <strong>{mobile.value}</strong></p>
              <div class="mb-3">
                <label class="form-label">Enter OTP</label>
                <input
                  value={mobileOtp.value}
                  onInput={(e) => mobileOtp.value = e.target.value}
                  type="text"
                  class="form-control"
                  required
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                />
              </div>
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button type="button" onClick={resendOTP} class="btn btn-link w-100" style={{ marginTop: '0.5rem' }}>
                Resend OTP
              </button>
            </form>
          )}

          {/* Step 3: Profile */}
          {step.value === 3 && (
            <form onSubmit={handleStep3}>
              <div class="mb-3">
                <label class="form-label">Full Name *</label>
                <input value={profile.value.name} onInput={(e) => profile.value.name = e.target.value} type="text" class="form-control" required placeholder="Enter your name" />
              </div>
              <div class="mb-3">
                <label class="form-label">Email *</label>
                <input value={email.value} onInput={(e) => email.value = e.target.value} type="email" class="form-control" required placeholder="Enter email" />
              </div>
              <div class="mb-3">
                <label class="form-label">Password *</label>
                <input value={password.value} onInput={(e) => password.value = e.target.value} type="password" class="form-control" required placeholder="Create password" />
              </div>
              <div class="mb-3">
                <label class="form-label">Date of Birth</label>
                <input value={profile.value.dob} onInput={(e) => profile.value.dob = e.target.value} type="date" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Time of Birth</label>
                <input value={profile.value.timeOfBirth} onInput={(e) => profile.value.timeOfBirth = e.target.value} type="time" class="form-control" />
              </div>
              <div class="mb-3" style={{ position: 'relative' }}>
                <label class="form-label">Place of Birth *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={locationSearchQuery.value}
                    onInput={(e) => { locationSearchQuery.value = e.target.value; searchLocation(); }}
                    type="text"
                    class="form-control"
                    placeholder="Search location..."
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={useCurrentLocation} disabled={isGettingLocation.value} class="btn btn-outline-primary" style={{ whiteSpace: 'nowrap' }}>
                    {isGettingLocation.value ? '...' : '📍 My Location'}
                  </button>
                </div>
                {locationSearchResults.value.length > 0 && (
                  <div style={{ position: 'absolute', zIndex: 1000, background: 'white', border: '1px solid #ddd', borderRadius: '4px', marginTop: '2px', maxHeight: '200px', overflowY: 'auto', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {locationSearchResults.value.map((loc, i) => (
                      <div key={i} onClick={() => selectLocation(loc)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                        {loc.displayName}
                      </div>
                    ))}
                  </div>
                )}
                {profile.value.latitude && (
                  <small class="text-success">✓ {profile.value.latitude.toFixed(4)}, {profile.value.longitude.toFixed(4)}</small>
                )}
              </div>
              <div class="mb-3">
                <label class="form-label">Profession</label>
                <input value={profile.value.profession} onInput={(e) => profile.value.profession = e.target.value} type="text" class="form-control" placeholder="e.g. Engineer, Teacher" />
              </div>
              <div class="mb-3">
                <label class="form-label">Gowthra</label>
                <input value={profile.value.gowthra} onInput={(e) => profile.value.gowthra = e.target.value} type="text" class="form-control" placeholder="Enter gowthra" />
              </div>
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Saving...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Step 4: Profile Image */}
          {step.value === 4 && (
            <form onSubmit={handleStep4}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Registration complete! Upload a profile photo (optional).</p>
              <div class="mb-3">
                <label class="form-label">Profile Image</label>
                <input type="file" accept="image/*" onChange={(e) => imageFile.value = e.target.files[0]} class="form-control" required />
              </div>
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Uploading...' : 'Upload & Finish'}
              </button>
              <button type="button" onClick={() => router.push('/user/login')} class="btn btn-link w-100" style={{ marginTop: '0.5rem' }}>
                Skip for now
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }
};

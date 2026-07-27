import { ref, onMounted } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'PartnerProfile',
  setup() {
    const partner = ref(null);
    const loading = ref(true);
    const saving = ref(false);
    const editMode = ref(false);
    const successMsg = ref('');
    const errorMsg = ref('');

    const form = ref({
      name: '',
      bio: '',
      phone: '',
      experience: 0,
      experienceRange: '',
      expertiseCategory: '',
      specialization: [],
      languages: [],
      consultationModes: [],
      availabilityPreference: [],
      location: { city: '', country: '' }
    });

    const specializationInput = ref('');
    const languageInput = ref('');

    const EXPERTISE_CATEGORIES = ['Astrology', 'Vastu', 'Reiki', 'Healer', 'Numerology', 'Others'];
    const EXPERIENCE_RANGES = ['0-2', '3-5', '6-10', '10+'];
    const CONSULTATION_MODES = ['Call', 'Chat', 'Video'];
    const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Flexible'];

    const loadProfile = async () => {
      loading.value = true;
      try {
        const res = await api.request('/mobile/partner/profile');
        if (res?.success && res.data?.partner) {
          partner.value = res.data.partner;
          const p = res.data.partner;
          form.value = {
            name: p.name || '',
            bio: p.bio || '',
            phone: p.phone || '',
            experience: p.experience || 0,
            experienceRange: p.experienceRange || '',
            expertiseCategory: p.expertiseCategory || '',
            specialization: Array.isArray(p.specialization) ? [...p.specialization] : [],
            languages: Array.isArray(p.languages) ? [...p.languages] : [],
            consultationModes: Array.isArray(p.consultationModes) ? [...p.consultationModes] : [],
            availabilityPreference: Array.isArray(p.availabilityPreference) ? [...p.availabilityPreference] : [],
            location: {
              city: p.location?.city || '',
              country: p.location?.country || ''
            }
          };
        }
      } catch (e) {
        errorMsg.value = 'Failed to load profile';
      } finally {
        loading.value = false;
      }
    };

    const saveProfile = async () => {
      saving.value = true;
      errorMsg.value = '';
      successMsg.value = '';
      try {
        const res = await api.request('/mobile/partner/profile', {
          method: 'PUT',
          body: JSON.stringify(form.value)
        });
        if (res?.success) {
          partner.value = res.data.partner;
          successMsg.value = 'Profile updated successfully!';
          editMode.value = false;
          setTimeout(() => { successMsg.value = ''; }, 3000);
        } else {
          errorMsg.value = res?.message || 'Failed to update profile';
        }
      } catch (e) {
        errorMsg.value = e?.message || 'Failed to update profile';
      } finally {
        saving.value = false;
      }
    };

    const toggleMode = (mode) => {
      const arr = form.value.consultationModes;
      const idx = arr.indexOf(mode);
      if (idx === -1) arr.push(mode);
      else arr.splice(idx, 1);
    };

    const toggleAvailability = (opt) => {
      const arr = form.value.availabilityPreference;
      const idx = arr.indexOf(opt);
      if (idx === -1) arr.push(opt);
      else arr.splice(idx, 1);
    };

    const addSpecialization = () => {
      const val = specializationInput.value.trim();
      if (val && !form.value.specialization.includes(val)) {
        form.value.specialization.push(val);
      }
      specializationInput.value = '';
    };

    const removeSpecialization = (idx) => {
      form.value.specialization.splice(idx, 1);
    };

    const addLanguage = () => {
      const val = languageInput.value.trim();
      if (val && !form.value.languages.includes(val)) {
        form.value.languages.push(val);
      }
      languageInput.value = '';
    };

    const removeLanguage = (idx) => {
      form.value.languages.splice(idx, 1);
    };

    const cancelEdit = () => {
      editMode.value = false;
      errorMsg.value = '';
      // Reset form to current partner data
      if (partner.value) {
        const p = partner.value;
        form.value = {
          name: p.name || '',
          bio: p.bio || '',
          phone: p.phone || '',
          experience: p.experience || 0,
          experienceRange: p.experienceRange || '',
          expertiseCategory: p.expertiseCategory || '',
          specialization: Array.isArray(p.specialization) ? [...p.specialization] : [],
          languages: Array.isArray(p.languages) ? [...p.languages] : [],
          consultationModes: Array.isArray(p.consultationModes) ? [...p.consultationModes] : [],
          availabilityPreference: Array.isArray(p.availabilityPreference) ? [...p.availabilityPreference] : [],
          location: { city: p.location?.city || '', country: p.location?.country || '' }
        };
      }
    };

    onMounted(loadProfile);

    const inputStyle = 'width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; outline:none; box-sizing:border-box; font-family:inherit;';
    const labelStyle = 'display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;';
    const sectionStyle = 'background:white; border-radius:12px; padding:24px; border:1px solid #e5e7eb; margin-bottom:16px;';
    const sectionTitleStyle = 'font-size:15px; font-weight:700; color:#111827; margin:0 0 18px 0; padding-bottom:12px; border-bottom:1px solid #f3f4f6;';
    const tagStyle = (active) => `display:inline-flex; align-items:center; padding:6px 12px; border-radius:9999px; font-size:13px; font-weight:500; cursor:pointer; border:none; ${active ? 'background:#6366f1; color:white;' : 'background:#f3f4f6; color:#374151;'}`;

    return () => (
      <div style="max-width:760px; margin:0 auto; padding:8px 0;">

        {/* Header */}
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
          <h2 style="margin:0; font-size:22px; font-weight:700; color:#111827;">My Profile</h2>
          {!editMode.value ? (
            <button
              onClick={() => { editMode.value = true; errorMsg.value = ''; }}
              style="padding:9px 18px; background:#6366f1; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;"
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <div style="display:flex; gap:10px;">
              <button
                onClick={cancelEdit}
                style="padding:9px 18px; background:#f3f4f6; color:#374151; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving.value}
                style={`padding:9px 18px; background:${saving.value ? '#9ca3af' : '#6366f1'}; color:white; border:none; border-radius:8px; font-weight:600; cursor:${saving.value ? 'not-allowed' : 'pointer'}; font-size:14px;`}
              >
                {saving.value ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Success / Error */}
        {successMsg.value && (
          <div style="padding:12px 16px; background:#d1fae5; color:#065f46; border-radius:8px; margin-bottom:16px; font-size:14px; font-weight:500;">
            ✅ {successMsg.value}
          </div>
        )}
        {errorMsg.value && (
          <div style="padding:12px 16px; background:#fee2e2; color:#991b1b; border-radius:8px; margin-bottom:16px; font-size:14px; font-weight:500;">
            ❌ {errorMsg.value}
          </div>
        )}

        {loading.value ? (
          <div style="text-align:center; padding:60px; color:#6b7280;">
            <div style="width:40px; height:40px; border:3px solid #e5e7eb; border-top-color:#6366f1; border-radius:50%; margin:0 auto 12px; animation:spin 1s linear infinite;" />
            <p style="margin:0;">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Avatar + Basic Info */}
            <div style={sectionStyle}>
              <div style="display:flex; align-items:center; gap:20px; margin-bottom:20px;">
                <div style="width:72px; height:72px; background:linear-gradient(135deg,#7c3aed,#2563eb); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <span style="color:white; font-size:28px; font-weight:700;">
                    {(partner.value?.name || 'P').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div style="font-size:20px; font-weight:700; color:#111827;">{partner.value?.name || '—'}</div>
                  <div style="font-size:14px; color:#6b7280; margin-top:2px;">{partner.value?.email}</div>
                  <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
                    <span style={`padding:3px 10px; border-radius:9999px; font-size:12px; font-weight:600; ${partner.value?.isActive ? 'background:#d1fae5; color:#065f46;' : 'background:#fef3c7; color:#92400e;'}`}>
                      {partner.value?.isActive ? '🟢 Active' : '🟡 Pending'}
                    </span>
                    <span style="padding:3px 10px; border-radius:9999px; font-size:12px; font-weight:600; background:#ede9fe; color:#5b21b6;">
                      ⭐ {(partner.value?.rating || 0).toFixed(1)} rating
                    </span>
                  </div>
                </div>
              </div>

              <p style={sectionTitleStyle}>Basic Information</p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                  <label style={labelStyle}>Full Name</label>
                  {editMode.value ? (
                    <input
                      type="text"
                      value={form.value.name}
                      onInput={(e) => form.value.name = e.target.value}
                      style={inputStyle}
                      placeholder="Your name"
                    />
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.name || '—'}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  {editMode.value ? (
                    <input
                      type="text"
                      value={form.value.phone}
                      onInput={(e) => form.value.phone = e.target.value}
                      style={inputStyle}
                      placeholder="+91 9876543210"
                    />
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.phone || '—'}</p>
                  )}
                </div>
                <div style="grid-column:1/-1;">
                  <label style={labelStyle}>Bio <span style="font-weight:400; color:#9ca3af;">(max 300 chars)</span></label>
                  {editMode.value ? (
                    <textarea
                      value={form.value.bio}
                      onInput={(e) => form.value.bio = e.target.value}
                      rows={3}
                      maxlength={300}
                      style={inputStyle + 'resize:vertical;'}
                      placeholder="Tell users about yourself..."
                    />
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px; line-height:1.5;">{partner.value?.bio || 'No bio added yet.'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Info */}
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Professional Details</p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                  <label style={labelStyle}>Expertise Category</label>
                  {editMode.value ? (
                    <select
                      value={form.value.expertiseCategory}
                      onChange={(e) => form.value.expertiseCategory = e.target.value}
                      style={inputStyle}
                    >
                      <option value="">Select category</option>
                      {EXPERTISE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.expertiseCategory || '—'}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Experience Range</label>
                  {editMode.value ? (
                    <select
                      value={form.value.experienceRange}
                      onChange={(e) => form.value.experienceRange = e.target.value}
                      style={inputStyle}
                    >
                      <option value="">Select range</option>
                      {EXPERIENCE_RANGES.map(r => (
                        <option key={r} value={r}>{r} years</option>
                      ))}
                    </select>
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.experienceRange ? `${partner.value.experienceRange} years` : '—'}</p>
                  )}
                </div>

                {/* Specialization tags */}
                <div style="grid-column:1/-1;">
                  <label style={labelStyle}>Specializations</label>
                  {editMode.value ? (
                    <>
                      <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                        {form.value.specialization.map((s, i) => (
                          <span key={i} style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; background:#ede9fe; color:#5b21b6; border-radius:9999px; font-size:13px; font-weight:500;">
                            {s}
                            <button onClick={() => removeSpecialization(i)} style="background:none; border:none; cursor:pointer; color:#7c3aed; font-size:14px; padding:0; line-height:1;">×</button>
                          </span>
                        ))}
                      </div>
                      <div style="display:flex; gap:8px;">
                        <input
                          type="text"
                          value={specializationInput.value}
                          onInput={(e) => specializationInput.value = e.target.value}
                          onKeypress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialization(); } }}
                          style={inputStyle + 'flex:1;'}
                          placeholder="Type and press Enter"
                        />
                        <button onClick={addSpecialization} style="padding:10px 16px; background:#6366f1; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Add</button>
                      </div>
                    </>
                  ) : (
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                      {(partner.value?.specialization || []).length > 0
                        ? partner.value.specialization.map((s, i) => (
                            <span key={i} style="padding:5px 12px; background:#ede9fe; color:#5b21b6; border-radius:9999px; font-size:13px; font-weight:500;">{s}</span>
                          ))
                        : <span style="color:#9ca3af; font-size:14px;">No specializations added</span>
                      }
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div style="grid-column:1/-1;">
                  <label style={labelStyle}>Languages</label>
                  {editMode.value ? (
                    <>
                      <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                        {form.value.languages.map((l, i) => (
                          <span key={i} style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; background:#dbeafe; color:#1d4ed8; border-radius:9999px; font-size:13px; font-weight:500;">
                            {l}
                            <button onClick={() => removeLanguage(i)} style="background:none; border:none; cursor:pointer; color:#2563eb; font-size:14px; padding:0; line-height:1;">×</button>
                          </span>
                        ))}
                      </div>
                      <div style="display:flex; gap:8px;">
                        <input
                          type="text"
                          value={languageInput.value}
                          onInput={(e) => languageInput.value = e.target.value}
                          onKeypress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } }}
                          style={inputStyle + 'flex:1;'}
                          placeholder="e.g. Hindi, English"
                        />
                        <button onClick={addLanguage} style="padding:10px 16px; background:#6366f1; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Add</button>
                      </div>
                    </>
                  ) : (
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                      {(partner.value?.languages || []).length > 0
                        ? partner.value.languages.map((l, i) => (
                            <span key={i} style="padding:5px 12px; background:#dbeafe; color:#1d4ed8; border-radius:9999px; font-size:13px; font-weight:500;">{l}</span>
                          ))
                        : <span style="color:#9ca3af; font-size:14px;">No languages added</span>
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Consultation Modes */}
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Consultation Modes</p>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                {CONSULTATION_MODES.map(mode => {
                  const active = editMode.value
                    ? form.value.consultationModes.includes(mode)
                    : (partner.value?.consultationModes || []).includes(mode);
                  return (
                    <button
                      key={mode}
                      onClick={() => { if (editMode.value) toggleMode(mode); }}
                      style={tagStyle(active) + (editMode.value ? '' : 'cursor:default;')}
                    >
                      {mode === 'Call' ? '📞' : mode === 'Chat' ? '💬' : '🎥'} {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Availability Preference</p>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                {AVAILABILITY_OPTIONS.map(opt => {
                  const active = editMode.value
                    ? form.value.availabilityPreference.includes(opt)
                    : (partner.value?.availabilityPreference || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => { if (editMode.value) toggleAvailability(opt); }}
                      style={tagStyle(active) + (editMode.value ? '' : 'cursor:default;')}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Location</p>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                  <label style={labelStyle}>City</label>
                  {editMode.value ? (
                    <input
                      type="text"
                      value={form.value.location.city}
                      onInput={(e) => form.value.location.city = e.target.value}
                      style={inputStyle}
                      placeholder="e.g. Mumbai"
                    />
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.location?.city || '—'}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  {editMode.value ? (
                    <input
                      type="text"
                      value={form.value.location.country}
                      onInput={(e) => form.value.location.country = e.target.value}
                      style={inputStyle}
                      placeholder="e.g. India"
                    />
                  ) : (
                    <p style="margin:0; font-size:14px; color:#111827; padding:10px 14px; background:#f9fafb; border-radius:8px;">{partner.value?.location?.country || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Account Stats</p>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
                {[
                  { label: 'Total Sessions', value: partner.value?.totalSessions || 0, color: '#dbeafe', text: '#1d4ed8' },
                  { label: 'Completed', value: partner.value?.completedSessions || 0, color: '#d1fae5', text: '#065f46' },
                  { label: 'This Month', value: `${(partner.value?.stats?.thisMonthEarnings || 0).toFixed(1)} cr`, color: '#fef3c7', text: '#92400e' },
                  { label: 'Total Earned', value: `${(partner.value?.creditsEarnedTotal || partner.value?.stats?.totalEarnings || 0).toFixed(1)} cr`, color: '#ede9fe', text: '#5b21b6' },
                  { label: 'Credits Balance', value: `${(partner.value?.creditsEarnedBalance || 0).toFixed(1)} cr`, color: '#d1fae5', text: '#065f46' },
                  { label: 'Avg Session', value: `${(partner.value?.stats?.averageSessionDuration || 0).toFixed(1)} min`, color: '#fce7f3', text: '#9d174d' }
                ].map(stat => (
                  <div key={stat.label} style={`padding:16px; background:${stat.color}; border-radius:10px; text-align:center;`}>
                    <p style={`margin:0 0 4px; font-size:22px; font-weight:700; color:${stat.text};`}>{stat.value}</p>
                    <p style="margin:0; font-size:12px; font-weight:600; color:#374151;">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
};

import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'ClientAgents',
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const success = ref(null);

    const agents = ref([]);
    const voices = ref([]);

    // UI state
    const showForm = ref(false);
    const editingAgent = ref(null); // null = create mode, agent object = edit mode

    const emptyForm = () => ({
      name: '',
      description: '',
      voiceName: '',
      systemPrompt: '',
      firstMessage: '',
      isActive: true,
    });

    // TTS play state
    const playingAgentId = ref(null);  // which agent card is playing
    const playingForm = ref(false);    // is the form preview playing
    const playingLogKey = ref(null);   // which log message is playing: 'chatId-msgIdx'
    let currentAudio = null;

    const stopAudio = () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      playingAgentId.value = null;
      playingForm.value = false;
      playingLogKey.value = null;
    };

    const playFromUrl = (url, logKey = null) => {
      if (!url) return;
      stopAudio();
      if (logKey) playingLogKey.value = logKey;
      try {
        currentAudio = new Audio(url);
        currentAudio.onended = stopAudio;
        currentAudio.onerror = stopAudio;
        currentAudio.play();
      } catch (e) {
        stopAudio();
        error.value = e.message || 'Failed to play audio';
      }
    };

    // Preview speaks a sample name instead of the literal {name} placeholder
    const previewGreeting = (text) => String(text || '').replace(/\{\{?\s*name\s*\}\}?/gi, 'Anil');

    const playTTS = async (text, voiceName, agentId = null, isFormPreview = false, logKey = null) => {
      if (!text?.trim()) return;

      stopAudio();
      if (agentId) playingAgentId.value = agentId;
      if (isFormPreview) playingForm.value = true;
      if (logKey) playingLogKey.value = logKey;

      try {
        const res = await api.request('/tts/synthesize', {
          method: 'POST',
          body: { text: text.trim(), voiceName },
        });

        let audioSrc = res?.audioUrl || res?.data?.audioUrl;
        if (!audioSrc && (res?.audioContent || res?.data?.audioContent)) {
          const b64 = res?.audioContent || res?.data?.audioContent;
          audioSrc = `data:audio/mpeg;base64,${b64}`;
        }
        if (!audioSrc) throw new Error('No audio returned');

        currentAudio = new Audio(audioSrc);
        currentAudio.onended = stopAudio;
        currentAudio.onerror = stopAudio;
        await currentAudio.play();
      } catch (e) {
        stopAudio();
        error.value = e.message || 'Failed to play audio';
      }
    };

    const form = ref(emptyForm());

    const isEditMode = computed(() => editingAgent.value !== null);

    const canSubmit = computed(() => {
      return (
        form.value.name.trim().length > 0 &&
        form.value.voiceName.trim().length > 0 &&
        form.value.systemPrompt.trim().length > 0
      );
    });

    const loadVoices = async () => {
      const res = await api.request('/voice-config', { method: 'GET' });
      if (res?.success && Array.isArray(res?.data)) {
        voices.value = res.data;
      } else if (res?.success && Array.isArray(res?.data?.data)) {
        voices.value = res.data.data;
      } else {
        voices.value = res?.data || [];
      }
      if (!form.value.voiceName && voices.value.length > 0) {
        form.value.voiceName = voices.value[0].name;
      }
    };

    const loadAgents = async () => {
      const res = await api.request('/client/agents', { method: 'GET' });
      agents.value = res?.data || [];
    };

    // ─── Conversation logs (voice agent sessions) ─────────────────────────────
    const conversationLogs = ref([]);
    const loadingLogs = ref(false);
    const logsPage = ref(1);
    const logsMeta = ref({ page: 1, limit: 20, total: 0, pages: 0 });
    const selectedAgentFilter = ref('');  // '' = all agents
    const expandedLogId = ref(null);

    const loadConversationLogs = async () => {
      loadingLogs.value = true;
      try {
        const params = { page: logsPage.value, limit: 20 };
        if (selectedAgentFilter.value) params.agentId = selectedAgentFilter.value;
        const res = await api.request('/client/agents/conversation-logs', {
          method: 'GET',
          params,
        });
        conversationLogs.value = res?.data || [];
        logsMeta.value = res?.meta || logsMeta.value;
      } catch (e) {
        error.value = e.message || 'Failed to load conversation logs';
      } finally {
        loadingLogs.value = false;
      }
    };

    const onLogsPageChange = (p) => {
      logsPage.value = p;
      loadConversationLogs();
    };

    const onAgentFilterChange = () => {
      logsPage.value = 1;
      loadConversationLogs();
    };

    const formatCallDuration = (sec) => {
      const total = Math.max(0, Math.round(sec || 0));
      const m = Math.floor(total / 60);
      const r = String(total % 60).padStart(2, '0');
      return m > 0 ? `${m}m ${r}s` : `${total}s`;
    };
    const formatLogDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
    const formatLogTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—');

    // Plays every recorded message of a call back to back (the full call recording)
    const playingAllId = ref(null);
    let allAudio = null;
    const stopAll = () => {
      playingAllId.value = null;
      if (allAudio) { allAudio.onended = allAudio.onerror = null; allAudio.pause(); allAudio = null; }
    };
    const playAll = (log) => {
      if (playingAllId.value === log._id) { stopAll(); return; }
      const urls = (log.messages || []).filter((m) => m.audioUrl).map((m) => m.audioUrl);
      if (!urls.length) return;
      stopAudio();
      stopAll();
      playingAllId.value = log._id;
      let i = 0;
      const next = () => {
        if (playingAllId.value !== log._id || i >= urls.length) { stopAll(); return; }
        allAudio = new Audio(urls[i++]);
        allAudio.onended = next;
        allAudio.onerror = next;
        allAudio.play().catch(next);
      };
      next();
    };

    const refresh = async () => {
      loading.value = true;
      error.value = null;
      try {
        await Promise.all([loadVoices(), loadAgents(), loadConversationLogs()]);
      } catch (e) {
        error.value = e.message || 'Failed to load agents';
      } finally {
        loading.value = false;
      }
    };

    const openCreateForm = () => {
      editingAgent.value = null;
      form.value = emptyForm();
      if (voices.value.length > 0) {
        form.value.voiceName = voices.value[0].name;
      }
      showForm.value = true;
      setTimeout(() => {
        document.getElementById('agent-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    };

    const openEditForm = (agent) => {
      editingAgent.value = agent;
      form.value = {
        name: agent.name || '',
        description: agent.description || '',
        voiceName: agent.voiceName || '',
        systemPrompt: agent.systemPrompt || '',
        firstMessage: agent.firstMessage || '',
        isActive: !!agent.isActive,
      };
      showForm.value = true;
      setTimeout(() => {
        document.getElementById('agent-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    };

    const closeForm = () => {
      showForm.value = false;
      editingAgent.value = null;
      form.value = emptyForm();
      error.value = null;
      success.value = null;
    };

    const saveAgent = async () => {
      if (!canSubmit.value) return;
      saving.value = true;
      error.value = null;
      success.value = null;

      try {
        const payload = {
          name: form.value.name.trim(),
          description: form.value.description.trim(),
          voiceName: form.value.voiceName,
          systemPrompt: form.value.systemPrompt.trim(),
          firstMessage: form.value.firstMessage.trim(),
          isActive: !!form.value.isActive,
        };

        if (isEditMode.value) {
          await api.request(`/client/agents/${editingAgent.value._id}`, { method: 'PUT', body: payload });
          success.value = 'Agent updated successfully';
        } else {
          await api.request('/client/agents', { method: 'POST', body: payload });
          success.value = 'Agent created successfully';
        }

        await loadAgents();
        setTimeout(() => {
          closeForm();
          success.value = isEditMode.value ? 'Agent updated successfully' : 'Agent created successfully';
          setTimeout(() => { success.value = null; }, 3000);
        }, 600);
      } catch (e) {
        error.value = e.message || 'Failed to save agent';
      } finally {
        saving.value = false;
      }
    };

    const toggleAgent = async (agentId) => {
      try {
        await api.request(`/client/agents/${agentId}/toggle`, { method: 'PATCH', body: {} });
        await loadAgents();
      } catch (e) {
        error.value = e.message || 'Failed to toggle agent';
      }
    };

    onMounted(refresh);

    // ─── Styles ───────────────────────────────────────────────────────────────

    const card = {
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    };

    const inputStyle = {
      padding: '0.65rem 0.85rem',
      borderRadius: '10px',
      border: '1px solid #d1d5db',
      fontSize: '0.9rem',
      width: '100%',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.15s',
      fontFamily: 'inherit',
      background: '#fafafa',
    };

    const labelStyle = {
      fontSize: '0.78rem',
      fontWeight: 700,
      color: '#374151',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    };

    return () => (
      <div style={{ display: 'grid', gap: '1.25rem', fontFamily: 'inherit' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>Agents</h1>
            <p style={{ margin: '0.3rem 0 0', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Create AI agent presets with voice &amp; system prompt. Mobile users can select an agent to start a configured session.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
            <button
              disabled={loading.value}
              onClick={refresh}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: loading.value ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button
              onClick={showForm.value ? closeForm : openCreateForm}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                border: 'none',
                background: showForm.value && !isEditMode.value ? '#374151' : '#111827',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                transition: 'background 0.15s',
              }}
            >
              {showForm.value && !isEditMode.value ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Global alerts ── */}
        {error.value && !showForm.value && (
          <div style={{ ...card, padding: '0.85rem 1rem', borderColor: '#fecaca', background: '#fff5f5', color: '#991b1b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error.value}
          </div>
        )}
        {success.value && !showForm.value && (
          <div style={{ ...card, padding: '0.85rem 1rem', borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {success.value}
          </div>
        )}

        {/* ── Create / Edit Form ── */}
        {showForm.value && (
          <div id="agent-form-card" style={{
            ...card,
            padding: '1.5rem',
            borderColor: isEditMode.value ? '#bfdbfe' : '#e5e7eb',
            background: isEditMode.value ? '#f8fbff' : '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Accent top bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: isEditMode.value ? 'linear-gradient(90deg, #3b82f6, #6366f1)' : 'linear-gradient(90deg, #111827, #374151)',
              borderRadius: '16px 16px 0 0',
            }} />

            {/* Form header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: isEditMode.value ? '#eff6ff' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isEditMode.value ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                    {isEditMode.value ? `Edit Agent` : 'New Agent'}
                  </h2>
                  {isEditMode.value && (
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>
                      Editing: <strong style={{ color: '#374151' }}>{editingAgent.value.name}</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeForm}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem', borderRadius: '6px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Inline form alerts */}
            {error.value && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff5f5', color: '#991b1b', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error.value}
              </div>
            )}

            {/* Row 1: Name + Voice */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <label style={labelStyle}>Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={form.value.name}
                  onInput={(e) => (form.value.name = e.target.value)}
                  placeholder="e.g., Krishna Guidance Agent"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <label style={labelStyle}>Voice <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  value={form.value.voiceName}
                  onChange={(e) => (form.value.voiceName = e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {voices.value.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.displayName || v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Description */}
            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.4rem' }}>
              <label style={labelStyle}>Description <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input
                value={form.value.description}
                onInput={(e) => (form.value.description = e.target.value)}
                placeholder="Brief description of what this agent does"
                style={inputStyle}
              />
            </div>

            {/* Row 3: System Prompt */}
            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>System Prompt <span style={{ color: '#ef4444' }}>*</span></label>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{form.value.systemPrompt.length} chars</span>
              </div>
              <textarea
                value={form.value.systemPrompt}
                onInput={(e) => (form.value.systemPrompt = e.target.value)}
                rows={6}
                placeholder="Write the system prompt that controls how the agent responds..."
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: 1.6,
                  minHeight: '120px',
                }}
              />
            </div>

            {/* Row 4: First Message */}
            <div style={{ marginTop: '1rem', display: 'grid', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>
                  First Message
                  <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '0.35rem' }}>{"(spoken once when the call starts · use {name} for the user's first name · empty = default short greeting)"}</span>
                </label>
                {form.value.firstMessage.trim() && form.value.voiceName && (
                  <button
                    onClick={() => playingForm.value
                      ? stopAudio()
                      : playTTS(previewGreeting(form.value.firstMessage), form.value.voiceName, null, true)
                    }
                    title={playingForm.value ? 'Stop preview' : 'Preview first message'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.3rem 0.7rem',
                      borderRadius: '999px',
                      border: `1px solid ${playingForm.value ? '#fca5a5' : '#d1d5db'}`,
                      background: playingForm.value ? '#fff5f5' : '#f9fafb',
                      color: playingForm.value ? '#dc2626' : '#374151',
                      fontSize: '0.75rem', fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {playingForm.value ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        Preview
                      </>
                    )}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={form.value.firstMessage}
                  onInput={(e) => (form.value.firstMessage = e.target.value)}
                  rows={3}
                  placeholder="e.g. Hello, {name}. I am Rashmi. How can I help you?"
                  maxLength={160}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    lineHeight: 1.6,
                    paddingRight: '2.5rem',
                  }}
                />
                {playingForm.value && (
                  <div style={{
                    position: 'absolute', bottom: '0.6rem', right: '0.6rem',
                    display: 'flex', alignItems: 'center', gap: '2px',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '3px', height: `${8 + i * 4}px`,
                        background: '#3b82f6', borderRadius: '2px',
                        animation: `soundbar 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: Active toggle + Submit */}
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                {/* Toggle switch */}
                <div
                  onClick={() => (form.value.isActive = !form.value.isActive)}
                  style={{
                    width: '40px', height: '22px', borderRadius: '11px',
                    background: form.value.isActive ? '#111827' : '#d1d5db',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: form.value.isActive ? '21px' : '3px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                  {form.value.isActive ? 'Active' : 'Inactive'}
                </span>
              </label>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={closeForm}
                  style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!canSubmit.value || saving.value}
                  onClick={saveAgent}
                  style={{
                    padding: '0.65rem 1.3rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: !canSubmit.value || saving.value
                      ? '#9ca3af'
                      : isEditMode.value ? '#3b82f6' : '#111827',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: !canSubmit.value || saving.value ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    transition: 'background 0.15s',
                  }}
                >
                  {saving.value ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                        <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                      </svg>
                      Saving...
                    </>
                  ) : isEditMode.value ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Save Changes
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Create Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Call History (voice agent sessions) ── */}
        <div style={{ ...card, padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
              Call History
              {logsMeta.value.total > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#f3f4f6', color: '#6b7280' }}>
                  {logsMeta.value.total} sessions
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <select
                value={selectedAgentFilter.value}
                onChange={(e) => { selectedAgentFilter.value = e.target.value; onAgentFilterChange(); }}
                style={{ ...inputStyle, padding: '0.5rem 0.75rem', width: 'auto', minWidth: '160px', cursor: 'pointer' }}
              >
                <option value="">All agents</option>
                {agents.value.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
              <button
                disabled={loadingLogs.value}
                onClick={loadConversationLogs}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: loadingLogs.value ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {loadingLogs.value ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
              Loading call history...
            </div>
          ) : conversationLogs.value.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
              No voice agent calls yet. Calls will appear here after users talk to an agent.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {['#', 'Date', 'Start Time', 'User', 'Agent', 'Duration', 'Messages', 'Credits', 'Status', 'Recording', 'Transcript'].map((h) => (
                      <th key={h} style={{ padding: '0.65rem 0.8rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', background: '#f9fafb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conversationLogs.value.map((log, i) => {
                    const isExpanded = expandedLogId.value === log._id;
                    const voiceName = log.agent?.voiceName || 'krishna1';
                    const hasRecording = (log.messages || []).some((m) => m.audioUrl);
                    const ongoing = log.status === 'ongoing';
                    const rowNo = (logsMeta.value.page - 1) * logsMeta.value.limit + i + 1;
                    return [
                      <tr key={log._id} style={{ background: isExpanded ? '#f9fafb' : '#fff' }}>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{rowNo}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{formatLogDate(log.startTime)}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{formatLogTime(log.startTime)}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{log.user?.name || 'Unknown user'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{log.user?.email || log.user?.mobile || ''}</div>
                        </td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', whiteSpace: 'nowrap' }}>
                            {log.agent?.name || 'Voice Agent'}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{ongoing ? '—' : formatCallDuration(log.durationSeconds)}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{log.messages?.length || 0}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>{log.creditsUsed ?? 0}</td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.55rem', borderRadius: '999px', background: ongoing ? '#fef3c7' : '#dcfce7', color: ongoing ? '#92400e' : '#166534' }}>
                            {ongoing ? 'Ongoing' : 'Completed'}
                          </span>
                        </td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                          {hasRecording ? (
                            <button
                              onClick={() => playAll(log)}
                              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: 'none', background: playingAllId.value === log._id ? '#dc2626' : '#0284c7', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {playingAllId.value === log._id ? 'Stop' : 'Play call'}
                            </button>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.7rem 0.8rem', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => { expandedLogId.value = isExpanded ? null : log._id; }}
                            style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`${log._id}-detail`}>
                          <td colSpan={11} style={{ padding: '0 1rem 1rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {(log.messages || []).length === 0 && (
                              <div style={{ padding: '0.75rem 0', color: '#9ca3af', fontSize: '0.85rem' }}>No messages in this call.</div>
                            )}
                            {(log.messages || []).map((msg, idx) => {
                              const key = `${log._id}-${idx}`;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    marginTop: '0.6rem',
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '10px',
                                    background: msg.role === 'user' ? '#fff' : '#f0f9ff',
                                    border: msg.role === 'user' ? '1px solid #e5e7eb' : '1px solid #bae6fd',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.6rem',
                                  }}
                                >
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: msg.role === 'user' ? '#6b7280' : '#0284c7', textTransform: 'uppercase', flexShrink: 0, width: '62px' }}>
                                    {msg.role === 'user' ? 'User' : 'Agent'}
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.86rem', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.15rem' }}>{formatLogTime(msg.timestamp)}</div>
                                  </div>
                                  {(msg.audioUrl || (msg.role === 'assistant' && msg.content?.trim())) && (
                                    <button
                                      onClick={() => {
                                        stopAll();
                                        if (playingLogKey.value === key) stopAudio();
                                        else if (msg.audioUrl) playFromUrl(msg.audioUrl, key);
                                        else playTTS(msg.content, voiceName, null, false, key);
                                      }}
                                      title={msg.audioUrl ? 'Play recorded audio' : 'Play (TTS)'}
                                      style={{ flexShrink: 0, padding: '0.25rem 0.6rem', borderRadius: '6px', border: 'none', background: playingLogKey.value === key ? '#dc2626' : '#0284c7', color: '#fff', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      {playingLogKey.value === key ? 'Stop' : 'Play'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </td>
                        </tr>
                      )
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
          {logsMeta.value.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem' }}>
              <button
                disabled={logsPage.value <= 1}
                onClick={() => onLogsPageChange(logsPage.value - 1)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.8rem', cursor: logsPage.value <= 1 ? 'not-allowed' : 'pointer', opacity: logsPage.value <= 1 ? 0.5 : 1 }}
              >
                Prev
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#6b7280' }}>
                Page {logsPage.value} of {logsMeta.value.pages}
              </span>
              <button
                disabled={logsPage.value >= logsMeta.value.pages}
                onClick={() => onLogsPageChange(logsPage.value + 1)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontSize: '0.8rem', cursor: logsPage.value >= logsMeta.value.pages ? 'not-allowed' : 'pointer', opacity: logsPage.value >= logsMeta.value.pages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* ── Agents List ── */}
        <div style={{ ...card, padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
              Agents
              {agents.value.length > 0 && (
                <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#f3f4f6', color: '#6b7280' }}>
                  {agents.value.length}
                </span>
              )}
            </h2>
          </div>

          {loading.value ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <div>Loading agents...</div>
            </div>
          ) : agents.value.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>No agents yet. Click <strong>Add Agent</strong> to create one.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {agents.value.map((a) => (
                <div
                  key={a._id}
                  style={{
                    border: `1px solid ${editingAgent.value?._id === a._id ? '#bfdbfe' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    background: editingAgent.value?._id === a._id ? '#f8fbff' : '#fff',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Agent name + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{a.name}</span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px',
                          background: a.isActive ? '#dcfce7' : '#fee2e2',
                          color: a.isActive ? '#166534' : '#991b1b',
                          letterSpacing: '0.05em',
                        }}>
                          {a.isActive ? '● ACTIVE' : '○ INACTIVE'}
                        </span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 500, padding: '0.2rem 0.55rem', borderRadius: '999px',
                          background: '#eef2ff', color: '#4338ca',
                        }}>
                          🎙 {a.voiceName}
                        </span>
                      </div>

                      {/* Description */}
                      {a.description && (
                        <p style={{ margin: '0.35rem 0 0', color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {a.description}
                        </p>
                      )}

                      {/* System prompt preview */}
                      <div style={{
                        marginTop: '0.6rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        background: '#f9fafb',
                        border: '1px solid #f3f4f6',
                        fontSize: '0.82rem',
                        color: '#374151',
                        lineHeight: 1.5,
                        maxHeight: '72px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}>
                        <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt · </span>
                        {a.systemPrompt?.length > 160 ? a.systemPrompt.slice(0, 160) + '…' : a.systemPrompt}
                      </div>

                      {/* First message row */}
                      {a.firstMessage && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          fontSize: '0.82rem',
                          color: '#0c4a6e',
                          lineHeight: 1.5,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.6rem',
                        }}>
                          <button
                            onClick={() => playingAgentId.value === a._id
                              ? stopAudio()
                              : playTTS(previewGreeting(a.firstMessage), a.voiceName, a._id)
                            }
                            title={playingAgentId.value === a._id ? 'Stop' : 'Play first message'}
                            style={{
                              flexShrink: 0,
                              width: '26px', height: '26px',
                              borderRadius: '50%',
                              border: 'none',
                              background: playingAgentId.value === a._id ? '#0ea5e9' : '#0284c7',
                              color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}
                          >
                            {playingAgentId.value === a._id ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                              </svg>
                            ) : (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '1px' }}>
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            )}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                              First Message
                              {playingAgentId.value === a._id && (
                                <span style={{ marginLeft: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  {[0,1,2].map(i => (
                                    <span key={i} style={{
                                      display: 'inline-block', width: '3px', height: `${6 + i * 3}px`,
                                      background: '#0ea5e9', borderRadius: '2px',
                                      animation: `soundbar 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                                    }} />
                                  ))}
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#0c4a6e' }}>
                              {a.firstMessage.length > 120 ? a.firstMessage.slice(0, 120) + '…' : a.firstMessage}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0, alignItems: 'center' }}>
                      <button
                        onClick={() => openEditForm(a)}
                        title="Edit agent"
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '9px',
                          border: '1px solid #d1d5db',
                          background: editingAgent.value?._id === a._id ? '#eff6ff' : '#fff',
                          color: editingAgent.value?._id === a._id ? '#3b82f6' : '#374151',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAgent(a._id)}
                        title={a.isActive ? 'Disable agent' : 'Enable agent'}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '9px',
                          border: `1px solid ${a.isActive ? '#fca5a5' : '#86efac'}`,
                          background: a.isActive ? '#fff5f5' : '#f0fdf4',
                          color: a.isActive ? '#dc2626' : '#16a34a',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {a.isActive ? (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                            </svg>
                            Disable
                          </>
                        ) : (
                          <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                            Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spin keyframe injection */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes soundbar { from { transform: scaleY(0.4); opacity: 0.7; } to { transform: scaleY(1); opacity: 1; } }
        `}</style>
      </div>
    );
  }
};
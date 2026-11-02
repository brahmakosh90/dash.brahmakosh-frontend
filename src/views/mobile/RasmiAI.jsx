import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import {
  SparklesIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline';
import api from '../../services/api.js';
import { useAuth } from '../../store/auth.js';
import { getSocketServerUrl } from '../../utils/socketUrl.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const REALTIME_SAMPLE_RATE = 24000;   // OpenAI Realtime expects PCM16 @ 24kHz mono
const START_TIMEOUT_MS = 15000;
const MIC_RESUME_TAIL_MS = 350;
const VOICE_CHAT_TITLE = 'Voice Agent Chat';

// Downsample mic to 24kHz and emit ~100ms PCM16 chunks
const WORKLET_SOURCE = `
class RasmiCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / ${REALTIME_SAMPLE_RATE};
    this.pos = 0;
    this.prev = 0;
    this.out = new Int16Array(2400);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch || ch.length === 0) return true;
    while (this.pos < ch.length - 1) {
      const i0 = Math.floor(this.pos);
      const frac = this.pos - i0;
      const s0 = i0 < 0 ? this.prev : ch[i0];
      const s1 = ch[i0 + 1];
      const s = Math.max(-1, Math.min(1, s0 + (s1 - s0) * frac));
      this.out[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      this.pos += this.ratio;
      if (this.n === this.out.length) {
        const chunk = this.out;
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this.out = new Int16Array(2400);
        this.n = 0;
      }
    }
    this.prev = ch[ch.length - 1];
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor('rasmi-capture', RasmiCapture);
`;

const ERROR_MESSAGES = {
  NO_TOKEN: 'Aapka session expire ho gaya hai. Please dobara login karein.',
  INVALID_TOKEN: 'Aapka session expire ho gaya hai. Please dobara login karein.',
  INVALID_ROLE: 'Ye feature sirf user account ke liye hai.',
  INSUFFICIENT_CREDITS: 'Aapke credits khatam ho gaye hain. Call band kar di gayi hai.',
  MISSING_API_KEYS: 'Voice service abhi available nahi hai. Thodi der baad try karein.',
};

const STATUS_LABEL = {
  connecting: 'Connecting…',
  listening: 'Listening…',
  processing: 'Thinking…',
  speaking: 'Speaking… (tap to interrupt)',
  muted: 'Mic muted'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toWsUrl = (token, agentId) => {
  const base = getSocketServerUrl().replace(/\/+$/, '');
  const wsBase = base.replace(/^http/i, 'ws');
  const agentParam = agentId ? `&agentId=${encodeURIComponent(agentId)}` : '';
  return `${wsBase}/realtime?token=${encodeURIComponent(token)}${agentParam}`;
};

const bytesToBase64 = (bytes) => {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
};

const base64ToInt16 = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length - (bin.length % 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
};

const formatDuration = (sec) => {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// PCM16 AudioContext player for OpenAI Realtime audio chunks
const createPcmPlayer = ({ onStart, onEnd }) => {
  let ctx = null;
  let nextStart = 0;
  let playing = new Set();
  let started = false;

  const ensureCtx = () => {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext({ sampleRate: REALTIME_SAMPLE_RATE });
      nextStart = 0;
    }
    return ctx;
  };

  return {
    push(b64) {
      const pcm = base64ToInt16(b64);
      if (!pcm.length) return;
      const c = ensureCtx();
      const buf = c.createBuffer(1, pcm.length, REALTIME_SAMPLE_RATE);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      const startAt = Math.max(c.currentTime + 0.02, nextStart);
      src.start(startAt);
      nextStart = startAt + buf.duration;
      playing.add(src);
      if (!started) { started = true; onStart(); }
      src.onended = () => {
        playing.delete(src);
        try { src.disconnect(); } catch (_) {}
        if (playing.size === 0) { started = false; onEnd(); }
      };
    },
    stop() {
      for (const s of playing) {
        s.onended = null;
        try { s.stop(); s.disconnect(); } catch (_) {}
      }
      playing.clear();
      nextStart = 0;
      if (started) { started = false; onEnd(); }
    },
    close() {
      this.stop();
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
      ctx = null;
    }
  };
};

// ─── Component ───────────────────────────────────────────────────────────────
export default {
  name: 'RasmiAI',
  setup() {
    const { getTokenForRole } = useAuth();

    // Selection screen
    const view = ref('select');            // select | call | transcript
    const tab = ref('guides');             // guides | history
    const agents = ref([]);
    const voices = ref([]);
    const loadingGuides = ref(true);
    const guidesError = ref('');
    const history = ref([]);
    const historyLoading = ref(false);
    const historyError = ref('');
    const transcriptTitle = ref('');
    const transcriptMessages = ref([]);
    const transcriptLoading = ref(false);

    // Call screen
    const selected = ref(null);            // { agentId?, voiceName, name, description }
    const callState = ref('idle');         // idle | connecting | live | ended
    const agentState = ref('listening');   // server driven: listening | processing | speaking
    const isPlaying = ref(false);
    const muted = ref(false);
    const messages = ref([]);
    const liveCaption = ref('');
    const callError = ref('');
    const seconds = ref(0);
    const balance = ref(null);
    const listRef = ref(null);

    // Non-reactive runtime handles
    let ws = null;
    let mediaStream = null;
    let audioCtx = null;
    let captureNode = null;
    let silentGain = null;
    let sourceNode = null;
    let timerId = null;
    let startTimeoutId = null;
    let player = null;
    let currentItemId = null;
    let currentResponseId = null;
    let cancelledResponses = new Set();
    let aiTranscript = '';
    let micResumeAt = 0;
    let msgId = 0;
    let closing = false;

    const getToken = () => getTokenForRole('user') || localStorage.getItem('token_user');

    const scrollToBottom = async () => {
      await nextTick();
      if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
    };

    const addMessage = (role, text) => {
      if (!text) return;
      messages.value.push({ id: ++msgId, role, text });
      scrollToBottom();
    };

    // ── Data loading ─────────────────────────────────────────────────────────
    const loadGuides = async () => {
      loadingGuides.value = true;
      guidesError.value = '';
      const token = getToken();
      const [agentRes, voiceRes] = await Promise.allSettled([
        api.get('/mobile/agents', { token }),
        api.get('/voice-config', { token })
      ]);

      agents.value =
        agentRes.status === 'fulfilled' && Array.isArray(agentRes.value.data?.data)
          ? agentRes.value.data.data
          : [];
      voices.value =
        voiceRes.status === 'fulfilled' && Array.isArray(voiceRes.value.data?.data)
          ? voiceRes.value.data.data.filter((v) => v.isActive !== false)
          : [];

      if (agentRes.status === 'rejected' && voiceRes.status === 'rejected') {
        guidesError.value = 'Guides load nahi ho paye. Internet check karke dobara try karein.';
      }
      loadingGuides.value = false;
    };

    const loadHistory = async () => {
      historyLoading.value = true;
      historyError.value = '';
      try {
        const res = await api.getChats(getToken());
        const chats = res.data?.chats || res.data?.data?.chats || [];
        history.value = chats
          .filter((c) => c.title === VOICE_CHAT_TITLE && c.messageCount > 0)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      } catch (err) {
        history.value = [];
        historyError.value = 'History load nahi ho payi.';
      } finally {
        historyLoading.value = false;
      }
    };

    const openTranscript = async (chat) => {
      view.value = 'transcript';
      transcriptTitle.value = formatDate(chat.createdAt);
      transcriptMessages.value = [];
      transcriptLoading.value = true;
      try {
        const res = await api.getChat(chat.chatId, getToken());
        transcriptMessages.value = (res.data?.messages || res.data?.data?.messages || []).map((m, i) => ({
          id: m._id || i,
          role: m.role === 'assistant' ? 'ai' : 'user',
          text: m.content
        }));
      } catch (err) {
        transcriptMessages.value = [];
      } finally {
        transcriptLoading.value = false;
      }
    };

    const switchTab = (next) => {
      tab.value = next;
      if (next === 'history') loadHistory();
    };

    // ── Playback ─────────────────────────────────────────────────────────────
    const ensurePlayer = () => {
      if (player) return player;
      player = createPcmPlayer({
        onStart: () => { isPlaying.value = true; agentState.value = 'speaking'; },
        onEnd: () => {
          isPlaying.value = false;
          agentState.value = 'listening';
          micResumeAt = Date.now() + MIC_RESUME_TAIL_MS;
        }
      });
      return player;
    };

    const stopPlayback = () => {
      currentItemId = null;
      if (player) player.stop();
      isPlaying.value = false;
    };

    // ── Microphone capture ───────────────────────────────────────────────────
    const canSendAudio = () =>
      ws &&
      ws.readyState === WebSocket.OPEN &&
      callState.value === 'live' &&
      !muted.value &&
      !isPlaying.value &&
      agentState.value !== 'speaking' &&
      Date.now() >= micResumeAt;

    const onFrame = (pcmBuffer) => {
      if (!canSendAudio()) return;
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: bytesToBase64(new Uint8Array(pcmBuffer)),
      }));
    };

    const startMic = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MIC_UNSUPPORTED');
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      sourceNode = audioCtx.createMediaStreamSource(mediaStream);
      silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      const blobUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
      try { await audioCtx.audioWorklet.addModule(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
      captureNode = new AudioWorkletNode(audioCtx, 'rasmi-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      captureNode.port.onmessage = (e) => onFrame(e.data);
      sourceNode.connect(captureNode);
      captureNode.connect(silentGain);
      silentGain.connect(audioCtx.destination);
    };

    const stopMic = () => {
      try { if (captureNode) captureNode.disconnect(); } catch (_) { /* ignore */ }
      try { if (sourceNode) sourceNode.disconnect(); } catch (_) { /* ignore */ }
      try { if (silentGain) silentGain.disconnect(); } catch (_) { /* ignore */ }
      if (captureNode && captureNode.port) captureNode.port.onmessage = null;
      if (captureNode && 'onaudioprocess' in captureNode) captureNode.onaudioprocess = null;
      captureNode = null;
      sourceNode = null;
      silentGain = null;
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    };

    // ── Session lifecycle ────────────────────────────────────────────────────
    const clearTimers = () => {
      if (timerId) { clearInterval(timerId); timerId = null; }
      if (startTimeoutId) { clearTimeout(startTimeoutId); startTimeoutId = null; }
    };

    const teardown = (finalState = 'ended') => {
      if (closing) return;
      closing = true;
      clearTimers();
      stopPlayback();
      stopMic();
      if (ws) {
        const socket = ws;
        ws = null;
        socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
        try {
          socket.close();
        } catch (_) { /* socket already closed */ }
      }
      if (callState.value !== 'idle') callState.value = finalState;
      liveCaption.value = '';
      closing = false;
    };

    const failCall = (message) => {
      callError.value = message;
      teardown('ended');
    };

    const handleServerMessage = (data) => {
      switch (data.type) {
        case 'session.created':
          if (startTimeoutId) { clearTimeout(startTimeoutId); startTimeoutId = null; }
          if (callState.value !== 'connecting') break;
          callState.value = 'live';
          agentState.value = 'listening';
          seconds.value = 0;
          timerId = setInterval(() => { seconds.value += 1; }, 1000);
          break;

        case 'input_audio_buffer.speech_started':
          // User barge-in: drop whatever the agent is still saying
          if (currentResponseId) cancelledResponses.add(currentResponseId);
          stopPlayback();
          agentState.value = 'listening';
          liveCaption.value = 'Listening…';
          break;

        case 'input_audio_buffer.speech_stopped':
          liveCaption.value = '';
          agentState.value = 'processing';
          break;

        case 'conversation.item.input_audio_transcription.completed':
          addMessage('user', (data.transcript || '').trim());
          break;

        case 'response.created':
          currentResponseId = data.response?.id || null;
          aiTranscript = '';
          if (!isPlaying.value) agentState.value = 'processing';
          break;

        case 'response.output_audio.delta':
          if (!data.delta || cancelledResponses.has(data.response_id)) break;
          currentItemId = data.item_id || currentItemId;
          ensurePlayer().push(data.delta);
          break;

        case 'response.output_audio_transcript.delta':
          if (!cancelledResponses.has(data.response_id)) aiTranscript += data.delta || '';
          break;

        case 'response.output_audio_transcript.done':
          if (!cancelledResponses.has(data.response_id)) addMessage('ai', (data.transcript || aiTranscript).trim());
          aiTranscript = '';
          break;

        case 'response.done':
          if (!isPlaying.value) agentState.value = 'listening';
          break;

        case 'proxy.error':
          failCall(data.message || 'Voice service abhi available nahi hai. Thodi der baad try karein.');
          break;

        case 'credit:update':
          balance.value = data.remainingBalance;
          break;

        case 'credit:warning':
          balance.value = data.remainingBalance ?? 0;
          failCall(ERROR_MESSAGES.INSUFFICIENT_CREDITS);
          break;

        case 'error':
          // Harmless races: cancelling a reply that just finished, or a duplicate cancel
          if (['response_cancel_not_active', 'conversation_already_has_active_response'].includes(data.error?.code)) break;
          if (callState.value !== 'live') {
            failCall(data.error?.message || 'Call shuru nahi ho payi. Dobara try karein.');
          } else {
            addMessage('system', 'Kuch gadbad hui, dobara bolein.');
            stopPlayback();
          }
          break;

        default:
          break;
      }
    };

    const startCall = async (target) => {
      if (callState.value === 'connecting' || callState.value === 'live') return;

      const token = getToken();
      if (!token) {
        selected.value = target;
        view.value = 'call';
        callState.value = 'ended';
        callError.value = ERROR_MESSAGES.NO_TOKEN;
        return;
      }

      selected.value = target;
      view.value = 'call';
      messages.value = [];
      liveCaption.value = '';
      callError.value = '';
      muted.value = false;
      seconds.value = 0;
      agentState.value = 'listening';
      isPlaying.value = false;
      currentItemId = null;
      currentResponseId = null;
      cancelledResponses = new Set();
      aiTranscript = '';
      callState.value = 'connecting';

      try {
        await startMic();
        if (callState.value !== 'connecting') {
          // Call was cancelled while the mic permission prompt was open
          stopMic();
          return;
        }
      } catch (err) {
        const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
        const missing = err?.name === 'NotFoundError' || err?.message === 'MIC_UNSUPPORTED';
        failCall(
          denied
            ? 'Microphone ki permission chahiye. Browser settings me mic allow karein.'
            : missing
              ? 'Microphone nahi mila, ya ye browser/connection (HTTPS) support nahi karta.'
              : 'Microphone start nahi ho paya.'
        );
        return;
      }

      try {
        ws = new WebSocket(toWsUrl(token, target.agentId));
      } catch (err) {
        failCall('Server se connect nahi ho paya.');
        return;
      }

      ws.onopen = () => {
        startTimeoutId = setTimeout(() => {
          if (callState.value === 'connecting') failCall('Server ne jawab nahi diya. Dobara try karein.');
        }, START_TIMEOUT_MS);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (_) {
          return;
        }
        handleServerMessage(data);
      };

      ws.onerror = () => {
        if (callState.value === 'connecting') failCall('Server se connect nahi ho paya.');
      };

      ws.onclose = (event) => {
        if (callState.value === 'live' || callState.value === 'connecting') {
          const byCode = {
            4008: 'Call ki maximum duration poori ho gayi. Dobara call shuru kar sakte hain.',
            4009: 'Aapne dusri jagah call shuru ki hai, isliye ye call band ho gayi.',
            4010: ERROR_MESSAGES.INSUFFICIENT_CREDITS
          };
          failCall(callError.value || byCode[event?.code] || 'Connection toot gaya. Dobara call shuru karein.');
        }
      };
    };

    const endCall = () => {
      teardown('ended');
    };

    const leaveCall = () => {
      teardown('idle');
      callState.value = 'idle';
      view.value = 'select';
      if (tab.value === 'history') loadHistory();
    };

    const toggleMute = () => {
      muted.value = !muted.value;
      if (mediaStream) mediaStream.getAudioTracks().forEach((t) => { t.enabled = !muted.value; });
    };

    const interrupt = () => {
      if (callState.value !== 'live') return;
      if (agentState.value !== 'speaking' && !isPlaying.value) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'response.cancel' }));
      }
      if (currentResponseId) cancelledResponses.add(currentResponseId);
      stopPlayback();
      agentState.value = 'listening';
    };

    onMounted(loadGuides);
    onUnmounted(() => teardown('idle'));

    const orbState = computed(() => {
      if (callState.value === 'connecting') return 'connecting';
      if (muted.value) return 'muted';
      if (isPlaying.value || agentState.value === 'speaking') return 'speaking';
      return agentState.value;
    });

    // ── Rendering ────────────────────────────────────────────────────────────
    const card = {
      background: '#fff',
      borderRadius: '1rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    };

    const header = (title, subtitle, onBack) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
          color: '#fff'
        }}
      >
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowLeftIcon style={{ width: '18px', height: '18px' }} />
          </button>
        ) : (
          <SparklesIcon style={{ width: '28px', height: '28px' }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{subtitle}</div>}
        </div>
      </div>
    );

    const guideCard = (g) => (
      <button
        key={g.key}
        onClick={() => startCall(g.target)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.9rem',
          width: '100%',
          textAlign: 'left',
          padding: '0.9rem 1rem',
          background: '#fff',
          border: '1px solid #fce7f3',
          borderRadius: '0.9rem',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MicrophoneIcon style={{ width: '22px', height: '22px' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#1f2937' }}>{g.name}</div>
          {g.description && (
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {g.description}
            </div>
          )}
          {g.meta && <div style={{ fontSize: '0.75rem', color: '#be185d', marginTop: '3px' }}>{g.meta}</div>}
        </div>
      </button>
    );

    const bubble = (m) => {
      if (m.role === 'system') {
        return (
          <div key={m.id} style={{ textAlign: 'center', fontSize: '0.8rem', color: '#b45309' }}>
            {m.text}
          </div>
        );
      }
      const isUser = m.role === 'user';
      return (
        <div key={m.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <div
            style={{
              maxWidth: '82%',
              padding: '0.65rem 0.95rem',
              borderRadius: isUser ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
              background: isUser ? '#ec4899' : '#ffffff',
              color: isUser ? '#fff' : '#1f2937',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              lineHeight: 1.5,
              fontSize: '0.93rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {m.text}
          </div>
        </div>
      );
    };

    const renderSelect = () => {
      const guides = [
        ...agents.value.map((a) => ({
          key: `agent-${a._id}`,
          name: a.name,
          description: a.description,
          meta: a.voiceConfig?.displayName ? `Voice: ${a.voiceConfig.displayName}` : null,
          target: { agentId: a._id, voiceName: a.voiceName, name: a.name, description: a.description }
        })),
        ...(agents.value.length === 0
          ? voices.value.map((v) => ({
              key: `voice-${v.name}`,
              name: v.displayName || v.name,
              description: v.description,
              meta: v.gender ? `${v.gender.charAt(0).toUpperCase()}${v.gender.slice(1)} voice` : null,
              target: { voiceName: v.name, name: v.displayName || v.name, description: v.description }
            }))
          : [])
      ];

      const tabBtn = (id, label) => (
        <button
          onClick={() => switchTab(id)}
          style={{
            flex: 1,
            padding: '0.6rem',
            border: 'none',
            borderRadius: '999px',
            fontWeight: 600,
            cursor: 'pointer',
            background: tab.value === id ? '#ec4899' : 'transparent',
            color: tab.value === id ? '#fff' : '#6b7280'
          }}
        >
          {label}
        </button>
      );

      return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)', background: '#fdf2f8' }}>
          {header('Rasmi AI', 'Voice par baat karein, apne guide ke saath')}
          <div style={{ display: 'flex', gap: '0.25rem', margin: '1rem 1rem 0', padding: '0.25rem', background: '#fff', borderRadius: '999px', border: '1px solid #fce7f3' }}>
            {tabBtn('guides', 'Guides')}
            {tabBtn('history', 'History')}
          </div>

          <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tab.value === 'guides' && (
              <>
                {loadingGuides.value && <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>Loading guides…</div>}
                {!loadingGuides.value && guidesError.value && (
                  <div style={{ textAlign: 'center', color: '#b91c1c', padding: '1rem' }}>
                    {guidesError.value}
                    <div><button onClick={loadGuides} style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', borderRadius: '999px', border: '1px solid #f9a8d4', background: '#fff', color: '#be185d', cursor: 'pointer' }}>Retry</button></div>
                  </div>
                )}
                {!loadingGuides.value && !guidesError.value && guides.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>Abhi koi guide available nahi hai.</div>
                )}
                {guides.map(guideCard)}
              </>
            )}

            {tab.value === 'history' && (
              <>
                {historyLoading.value && <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>Loading history…</div>}
                {!historyLoading.value && historyError.value && <div style={{ textAlign: 'center', color: '#b91c1c', padding: '1rem' }}>{historyError.value}</div>}
                {!historyLoading.value && !historyError.value && history.value.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>Abhi tak koi voice conversation nahi hui.</div>
                )}
                {history.value.map((c) => (
                  <button
                    key={c.chatId}
                    onClick={() => openTranscript(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', padding: '0.8rem 1rem', background: '#fff', border: '1px solid #fce7f3', borderRadius: '0.9rem', cursor: 'pointer' }}
                  >
                    <ClockIcon style={{ width: '22px', height: '22px', color: '#be185d', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{formatDate(c.createdAt)}</div>
                      <div style={{ fontSize: '0.82rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.lastMessage || `${c.messageCount} messages`}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.messageCount} msgs</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      );
    };

    const renderTranscript = () => (
      <div style={{ ...card, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: '#fdf2f8' }}>
        {header('Conversation', transcriptTitle.value, () => { view.value = 'select'; })}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {transcriptLoading.value && <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</div>}
          {!transcriptLoading.value && transcriptMessages.value.length === 0 && (
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Is conversation me koi message nahi mila.</div>
          )}
          {transcriptMessages.value.map(bubble)}
        </div>
      </div>
    );

    const orbColors = {
      connecting: '#9ca3af',
      listening: '#ec4899',
      processing: '#8b5cf6',
      speaking: '#f59e0b',
      muted: '#6b7280'
    };

    const renderCall = () => {
      const live = callState.value === 'live';
      const ended = callState.value === 'ended';
      const state = orbState.value;
      const color = orbColors[state] || '#ec4899';
      const canInterrupt = live && state === 'speaking';

      return (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', background: '#fdf2f8' }}>
          <style>{`
            @keyframes rasmi-pulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.55); opacity: 0; } }
            @keyframes rasmi-think { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
          `}</style>

          {header(
            selected.value?.name || 'Rasmi AI',
            live ? `${formatDuration(seconds.value)}${balance.value !== null ? ` · ${balance.value} credits` : ''}` : ended ? 'Call ended' : 'Connecting…',
            live || callState.value === 'connecting' ? null : leaveCall
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem 1rem 0.5rem' }}>
            <div
              onClick={canInterrupt ? interrupt : undefined}
              role={canInterrupt ? 'button' : undefined}
              aria-label={canInterrupt ? 'Interrupt' : undefined}
              style={{ position: 'relative', width: '120px', height: '120px', cursor: canInterrupt ? 'pointer' : 'default' }}
            >
              {(state === 'listening' || state === 'speaking') && live && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'rasmi-pulse 1.6s ease-out infinite' }} />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: '10px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${color}, #8b5cf6)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: `0 6px 20px ${color}66`,
                  animation: state === 'processing' ? 'rasmi-think 1.1s ease-in-out infinite' : 'none'
                }}
              >
                <MicrophoneIcon style={{ width: '38px', height: '38px' }} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontWeight: 600, color: '#374151', minHeight: '1.4rem' }}>
              {ended ? 'Call ended' : STATUS_LABEL[state]}
            </div>
            <div style={{ minHeight: '1.4rem', maxWidth: '100%', fontSize: '0.88rem', color: '#9d174d', fontStyle: 'italic', textAlign: 'center', padding: '0 0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {liveCaption.value}
            </div>
          </div>

          {callError.value && (
            <div style={{ margin: '0 1rem 0.5rem', padding: '0.7rem 0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', color: '#991b1b', fontSize: '0.88rem' }}>
              <ExclamationTriangleIcon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>{callError.value}</span>
            </div>
          )}

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {messages.value.length === 0 && !ended && (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                {live ? 'Bolna shuru karein — main sun raha hoon.' : 'Mic aur server se connect ho raha hai…'}
              </div>
            )}
            {messages.value.map(bubble)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.25rem', padding: '0.9rem', background: '#fff', borderTop: '1px solid #fce7f3' }}>
            {ended ? (
              <>
                <button
                  onClick={() => startCall(selected.value)}
                  style={{ padding: '0.7rem 1.6rem', borderRadius: '999px', border: 'none', background: '#ec4899', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Start again
                </button>
                <button
                  onClick={leaveCall}
                  style={{ padding: '0.7rem 1.4rem', borderRadius: '999px', border: '1px solid #f9a8d4', background: '#fff', color: '#be185d', fontWeight: 600, cursor: 'pointer' }}
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  disabled={!live}
                  aria-label={muted.value ? 'Unmute' : 'Mute'}
                  style={{ width: '52px', height: '52px', borderRadius: '50%', border: 'none', background: muted.value ? '#374151' : '#fce7f3', color: muted.value ? '#fff' : '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: live ? 'pointer' : 'not-allowed', opacity: live ? 1 : 0.5, position: 'relative' }}
                >
                  <MicrophoneIcon style={{ width: '24px', height: '24px' }} />
                  {muted.value && <span style={{ position: 'absolute', width: '30px', height: '2px', background: '#fff', transform: 'rotate(-45deg)' }} />}
                </button>
                <button
                  onClick={endCall}
                  aria-label="End call"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}
                >
                  <PhoneXMarkIcon style={{ width: '28px', height: '28px' }} />
                </button>
              </>
            )}
          </div>
        </div>
      );
    };

    return () => (
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        {view.value === 'select' && renderSelect()}
        {view.value === 'transcript' && renderTranscript()}
        {view.value === 'call' && renderCall()}
      </div>
    );
  }
};

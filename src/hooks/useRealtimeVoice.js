import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocketServerUrl } from '../utils/socketUrl';

// OpenAI Realtime speaks 24 kHz mono PCM16 in both directions.
const REALTIME_SAMPLE_RATE = 24000;

// AudioWorklet that downsamples the mic to 24 kHz and emits ~100 ms PCM16 chunks.
// Inlined as a Blob so no separate public/ asset has to be deployed.
const WORKLET_SOURCE = `
class PCM16CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / ${REALTIME_SAMPLE_RATE};
    this.pos = 0;     // read position, in input samples, relative to the current block
    this.prev = 0;    // last sample of the previous block (for interpolation across blocks)
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
registerProcessor('pcm16-capture', PCM16CaptureProcessor);
`;

const getRealtimeUrl = (token) => {
  const explicit = import.meta.env.VITE_REALTIME_URL;
  const base = explicit || `${getSocketServerUrl().replace(/^http/, 'ws').replace(/\/$/, '')}/realtime`;
  return `${base}?token=${encodeURIComponent(token)}`;
};

const bytesToBase64 = (bytes) => {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(binary);
};

const base64ToInt16 = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length - (binary.length % 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
};

const CLOSE_MESSAGES = {
  4008: 'Session time limit reached',
  4009: 'Session was opened on another device',
};

/**
 * Voice-to-voice conversation over the backend's /realtime OpenAI proxy.
 *
 * @param {{ token?: string, url?: string }} [options]
 *   token – app JWT (defaults to localStorage `token_user`)
 *   url   – full ws(s) URL override (token is appended as ?token=)
 */
export default function useRealtimeVoice(options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const wsRef = useRef(null);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const workletRef = useRef(null);
  const sinkRef = useRef(null);
  const workletUrlRef = useRef(null);

  // playback state
  const playingRef = useRef(new Set());   // active AudioBufferSourceNodes
  const nextStartRef = useRef(0);
  const currentItemRef = useRef(null);    // { id, startedAt } of the assistant item being played

  const generationRef = useRef(0);        // invalidates in-flight startSession after endSession

  const stopPlayback = useCallback(() => {
    for (const src of playingRef.current) {
      src.onended = null;
      try { src.stop(); } catch { /* already stopped */ }
      try { src.disconnect(); } catch { /* ignore */ }
    }
    playingRef.current.clear();
    nextStartRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const playChunk = useCallback((b64, itemId) => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const pcm = base64ToInt16(b64);
    if (pcm.length === 0) return;

    const buffer = ctx.createBuffer(1, pcm.length, REALTIME_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime + 0.02, nextStartRef.current);
    if (!currentItemRef.current || currentItemRef.current.id !== itemId) {
      currentItemRef.current = { id: itemId, startedAt: startAt };
    }
    src.start(startAt);
    nextStartRef.current = startAt + buffer.duration;

    playingRef.current.add(src);
    setIsSpeaking(true);
    src.onended = () => {
      playingRef.current.delete(src);
      try { src.disconnect(); } catch { /* ignore */ }
      if (playingRef.current.size === 0) setIsSpeaking(false);
    };
  }, []);

  // User started talking over the assistant: cut playback and tell OpenAI how much was heard.
  const handleInterruption = useCallback(() => {
    const ctx = ctxRef.current;
    const item = currentItemRef.current;
    const ws = wsRef.current;

    if (item && ctx && ws?.readyState === WebSocket.OPEN && playingRef.current.size > 0) {
      const playedMs = Math.max(0, Math.floor((ctx.currentTime - item.startedAt) * 1000));
      ws.send(JSON.stringify({
        type: 'conversation.item.truncate',
        item_id: item.id,
        content_index: 0,
        audio_end_ms: playedMs,
      }));
    }
    currentItemRef.current = null;
    stopPlayback();
  }, [stopPlayback]);

  const teardown = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try { ws.close(1000, 'client ended'); } catch { /* ignore */ }
    }

    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      try { workletRef.current.disconnect(); } catch { /* ignore */ }
      workletRef.current = null;
    }
    try { sourceNodeRef.current?.disconnect(); } catch { /* ignore */ }
    sourceNodeRef.current = null;
    try { sinkRef.current?.disconnect(); } catch { /* ignore */ }
    sinkRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    stopPlayback();
    currentItemRef.current = null;

    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});

    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current);
      workletUrlRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
  }, [stopPlayback]);

  const endSession = useCallback(() => {
    generationRef.current += 1;
    teardown();
  }, [teardown]);

  const startSession = useCallback(async () => {
    if (wsRef.current) return; // already running or starting

    const token = optionsRef.current.token || localStorage.getItem('token_user');
    if (!token) {
      setError('Please sign in to start a voice session');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorklet) {
      setError('Voice is not supported in this browser');
      return;
    }

    setError(null);
    const generation = ++generationRef.current;
    const aborted = () => generation !== generationRef.current;

    try {
      // 1. Mic (inside the user gesture so the permission prompt + AudioContext resume are allowed)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (aborted()) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;

      // 2. Audio graph: mic -> worklet -> (muted sink, so the worklet keeps being pulled)
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
      workletUrlRef.current = workletUrl;
      await ctx.audioWorklet.addModule(workletUrl);
      if (aborted()) { teardown(); return; }

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm16-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      const sink = ctx.createGain();
      sink.gain.value = 0;
      source.connect(worklet);
      worklet.connect(sink);
      sink.connect(ctx.destination);
      sourceNodeRef.current = source;
      workletRef.current = worklet;
      sinkRef.current = sink;

      // 3. WebSocket to the proxy
      const url = optionsRef.current.url
        ? `${optionsRef.current.url}${optionsRef.current.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : getRealtimeUrl(token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      worklet.port.onmessage = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: bytesToBase64(new Uint8Array(e.data)),
        }));
      };

      ws.onopen = () => {
        if (aborted()) return;
        setIsConnected(true);
        setIsListening(true);
      };

      ws.onmessage = (msg) => {
        let event;
        try { event = JSON.parse(msg.data); } catch { return; }

        switch (event.type) {
          case 'response.audio.delta':          // beta event name
          case 'response.output_audio.delta':   // GA event name
            if (event.delta) playChunk(event.delta, event.item_id);
            break;
          case 'input_audio_buffer.speech_started':
            handleInterruption();
            break;
          case 'error':
            console.error('[Realtime] OpenAI error:', event.error);
            setError(event.error?.message || 'Voice service error');
            break;
          case 'proxy.error':
            console.error('[Realtime] Proxy error:', event.message);
            setError(event.message || 'Voice service error');
            break;
          default:
            break;
        }
      };

      ws.onerror = () => {
        if (aborted()) return;
        setError('Could not connect to voice service');
      };

      ws.onclose = (e) => {
        if (aborted() || wsRef.current !== ws) return;
        if (e.code !== 1000) {
          setError((prev) => prev || CLOSE_MESSAGES[e.code] || e.reason || 'Voice connection lost');
        }
        generationRef.current += 1;
        teardown();
      };
    } catch (err) {
      if (aborted()) return;
      console.error('[Realtime] Failed to start session:', err);
      setError(err?.name === 'NotAllowedError' ? 'Microphone permission denied' : (err?.message || 'Failed to start voice session'));
      generationRef.current += 1;
      teardown();
    }
  }, [handleInterruption, playChunk, teardown]);

  // Release mic / socket / AudioContext if the component unmounts mid-call.
  useEffect(() => () => {
    generationRef.current += 1;
    teardown();
  }, [teardown]);

  return { isConnected, isListening, isSpeaking, error, startSession, endSession };
}

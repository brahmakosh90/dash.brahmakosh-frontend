import React from 'react';
import useRealtimeVoice from '../hooks/useRealtimeVoice';

function VoicePage() {
  const { isConnected, isListening, isSpeaking, error, startSession, endSession } = useRealtimeVoice();

  const status = !isConnected
    ? 'Click to start'
    : isSpeaking
    ? 'AI is speaking…'
    : isListening
    ? 'Listening… speak now'
    : 'Connected';

  const btnColor = !isConnected ? '#3498db' : isSpeaking ? '#f39c12' : '#27ae60';

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '8px' }}>Voice Chat</h1>
      <p style={{ color: '#7f8c8d', marginBottom: '40px' }}>Powered by OpenAI Realtime</p>

      <div
        style={{
          padding: '40px',
          border: '2px dashed #ddd',
          borderRadius: '16px',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={isConnected ? endSession : startSession}
          style={{
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: btnColor,
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: isConnected ? `0 0 0 8px ${btnColor}33` : 'none',
          }}
        >
          {!isConnected ? '🎤 Start' : isSpeaking ? '🔊 Speaking' : '⏹ End'}
        </button>

        <p style={{ marginTop: '20px', color: '#7f8c8d', fontWeight: 500 }}>{status}</p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fdecea',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#c0392b',
            fontSize: '14px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#95a5a6' }}>
        💡 Speak naturally — AI will respond in real-time with voice.
      </p>
    </div>
  );
}

export default VoicePage;

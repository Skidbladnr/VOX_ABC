import { useEffect, useMemo, useRef, useState } from 'react';
import { postJson } from '../api.js';
import './VoiceInputPanel.css';

const SOURCE_LANGUAGE_OPTIONS = [
  { code: 'en-US', label: 'English / en-US' },
  { code: 'ja-JP', label: 'Japanese / ja-JP' }
];

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function splitForSend(text, maxChars = 180) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks = [];
  let buffer = '';
  const words = normalized.split(/\s+/u);

  const flush = () => {
    const chunk = buffer.trim();
    if (chunk) chunks.push(chunk);
    buffer = '';
  };

  for (const word of words) {
    buffer = buffer ? `${buffer} ${word}` : word;
    if (/[.!?。！？]$/u.test(buffer) || buffer.length >= maxChars) flush();
  }
  flush();
  return chunks;
}

function makeEventId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function VoiceInputPanel({ sourceLanguage, onSourceLanguageChange, onRefresh }) {
  const Recognition = useMemo(getSpeechRecognitionConstructor, []);
  const recognitionRef = useRef(null);
  const wantsListeningRef = useRef(false);
  const lastSentRef = useRef({ text: '', at: 0 });
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [log, setLog] = useState([]);
  const [pending, setPending] = useState(false);

  const supported = Boolean(Recognition);

  useEffect(() => {
    return () => {
      wantsListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors from browser speech engines.
      }
    };
  }, []);

  function appendLog(entry) {
    setLog((items) => [entry, ...items].slice(0, 7));
  }

  async function sendChunk(text, { source = 'browser-speech', forceFinal = true } = {}) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return;

    const now = Date.now();
    if (normalized === lastSentRef.current.text && now - lastSentRef.current.at < 1600) {
      appendLog({ kind: 'skip', text: normalized, detail: 'duplicate final ignored' });
      return;
    }
    lastSentRef.current = { text: normalized, at: now };

    setPending(true);
    try {
      const payload = await postJson('/api/asr', {
        eventId: makeEventId(),
        source,
        sourceLanguage,
        text: normalized,
        isFinal: forceFinal,
        timestamp: now
      });
      appendLog({
        kind: payload.emittedUnits ? 'sent' : 'held',
        text: normalized,
        detail: `${payload.emittedUnits || 0} translation unit${payload.emittedUnits === 1 ? '' : 's'}`
      });
      onRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to send ASR event.');
    } finally {
      setPending(false);
    }
  }

  async function sendFinalText(text) {
    const chunks = splitForSend(text);
    for (const chunk of chunks) {
      await sendChunk(chunk);
    }
  }

  function createRecognition() {
    const recognition = new Recognition();
    recognition.lang = sourceLanguage;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError('');
    };

    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed'
        ? 'Microphone permission was blocked. Allow mic access and try again.'
        : `Speech recognition error: ${event.error || 'unknown'}`;
      setError(message);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (!wantsListeningRef.current) return;
      // Chrome often ends a continuous session after silence. Restart gently so
      // the operator does not have to keep clicking the mic button.
      setTimeout(() => {
        if (!wantsListeningRef.current) return;
        try {
          recognition.start();
        } catch {
          // Ignore duplicate-start races.
        }
      }, 300);
    };

    recognition.onresult = (event) => {
      let interim = '';
      const finals = [];

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || '';
        if (!transcript.trim()) continue;
        if (result.isFinal) finals.push(transcript);
        else interim += transcript;
      }

      setInterimText(interim.trim());
      for (const finalText of finals) {
        void sendFinalText(finalText);
      }
    };

    return recognition;
  }

  function startListening() {
    if (!supported) {
      setError('This browser does not expose SpeechRecognition. Use Chrome, Edge, or Safari for this POC mic path.');
      return;
    }

    wantsListeningRef.current = true;
    const recognition = createRecognition();
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      setError(err.message || 'Could not start microphone recognition.');
    }
  }

  function stopListening() {
    wantsListeningRef.current = false;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors.
    }
  }

  async function commitInterim() {
    if (!interimText.trim()) return;
    const text = interimText;
    setInterimText('');
    await sendFinalText(text);
  }

  return (
    <section className="admin-card voice-card">
      <div className="voice-header">
        <div>
          <p className="eyebrow">Operator microphone</p>
          <h2>Browser voice input</h2>
          <p className="muted">Uses browser speech recognition for the POC. Finalized phrases are sent to the backend ASR endpoint, chunked, then fanned out to active language streams.</p>
        </div>
        <div className={`mic-indicator ${listening ? 'mic-indicator--live' : ''}`}>
          <span />
          {listening ? 'Listening' : 'Stopped'}
        </div>
      </div>

      <div className="voice-controls">
        <label>
          Source language
          <select value={sourceLanguage} onChange={(event) => onSourceLanguageChange(event.target.value)} disabled={listening}>
            {SOURCE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>{option.label}</option>
            ))}
          </select>
        </label>
        <div className="voice-buttons">
          <button onClick={startListening} disabled={!supported || listening}>Start mic</button>
          <button onClick={stopListening} disabled={!listening}>Stop</button>
          <button onClick={commitInterim} disabled={!interimText.trim() || pending}>Commit interim</button>
        </div>
      </div>

      {!supported ? <p className="error-text">SpeechRecognition is unavailable in this browser. Use the manual phrase box below, or test mic capture in Chrome/Safari.</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="interim-box">
        <span>Interim speech</span>
        <p>{interimText || 'Interim recognition text will appear here before the browser finalizes it.'}</p>
      </div>

      <div className="voice-log" aria-live="polite">
        {log.length ? log.map((item, index) => (
          <div key={`${item.kind}-${index}`} className={`voice-log-row voice-log-row--${item.kind}`}>
            <strong>{item.kind}</strong>
            <span>{item.detail}</span>
            <p>{item.text}</p>
          </div>
        )) : <p className="muted">No mic chunks sent yet.</p>}
      </div>
    </section>
  );
}

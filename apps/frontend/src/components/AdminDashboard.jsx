import { useEffect, useState } from 'react';
import { LANGUAGES } from '../../../../shared/contracts/languages.js';
import { getJson, postJson } from '../api.js';
import { VoiceInputPanel } from './VoiceInputPanel.jsx';

const SAMPLE = 'Please watch the lauter flow rate and wort clarity before increasing the sparge temperature.';

export function AdminDashboard() {
  const [health, setHealth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [manualText, setManualText] = useState(SAMPLE);
  const [sourceLanguage, setSourceLanguage] = useState('en-US');
  const [targetLanguage, setTargetLanguage] = useState('ja-JP');
  const [testResult, setTestResult] = useState(null);
  const [lastAsrResult, setLastAsrResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [nextHealth, nextProvider] = await Promise.all([
        getJson('/api/health'),
        getJson('/api/provider-status')
      ]);
      setHealth(nextHealth);
      setProvider(nextProvider);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => clearInterval(timer);
  }, []);

  async function sendManualCaption() {
    setBusy(true);
    try {
      const result = await postJson('/api/asr', {
        text: manualText,
        isFinal: true,
        sourceLanguage,
        source: 'manual-admin',
        eventId: `manual-${Date.now()}`,
        timestamp: Date.now()
      });
      setLastAsrResult(result);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function flushAsrBuffer() {
    setBusy(true);
    try {
      const result = await postJson('/api/asr/flush', { sourceLanguage });
      setLastAsrResult(result);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runSingleTargetTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await postJson('/api/test-translation', { text: manualText, sourceLanguage, targetLanguage });
      setTestResult(result);
      await refresh();
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function nextSlide() {
    await postJson('/api/demo/next-slide', {});
    await refresh();
  }

  return (
    <main className="admin-page">
      <section className="admin-card admin-card--hero">
        <div>
          <p className="eyebrow">Internal dashboard</p>
          <h1>Vox live control</h1>
          <p className="muted">Test real GPT translation, inject finalized ASR phrases, run browser mic input, and watch per-language latency/error health.</p>
        </div>
        <ProviderBadge provider={provider} />
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <VoiceInputPanel sourceLanguage={sourceLanguage} onSourceLanguageChange={setSourceLanguage} onRefresh={refresh} />

      <section className="admin-card">
        <p className="eyebrow">Manual phrase injection</p>
        <textarea value={manualText} onChange={(event) => setManualText(event.target.value)} rows={4} />
        <div className="admin-form-row">
          <label>
            Source
            <select value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value)}>
              <option value="en-US">English / en-US</option>
              <option value="ja-JP">Japanese / ja-JP</option>
            </select>
          </label>
          <label>
            Single-test target
            <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>{language.english} / {language.code}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-actions">
          <button onClick={runSingleTargetTest} disabled={busy}>Test one target only</button>
          <button onClick={sendManualCaption} disabled={busy}>Send to active live streams</button>
          <button onClick={flushAsrBuffer} disabled={busy}>Flush ASR buffer</button>
          <button onClick={nextSlide}>Advance slide</button>
        </div>
        {lastAsrResult ? (
          <div className="test-result">
            <span>ASR accepted · {lastAsrResult.emittedUnits || 0} emitted unit{lastAsrResult.emittedUnits === 1 ? '' : 's'}</span>
            <p>{lastAsrResult.preview?.join(' / ') || 'No translation unit emitted. This is normal for interim/duplicate input.'}</p>
          </div>
        ) : null}
        {testResult ? (
          <div className={`test-result ${testResult.ok ? '' : 'test-result--error'}`}>
            <span>{testResult.ok ? `${testResult.provider} · ${testResult.latencyMs}ms` : 'Translation test failed'}</span>
            <p>{testResult.text || testResult.error}</p>
          </div>
        ) : null}
      </section>

      <section className="admin-card asr-card">
        <p className="eyebrow">ASR / segmentation state</p>
        <div className="asr-grid">
          <Metric label="ASR events" value={health?.asr?.receivedEvents ?? 0} />
          <Metric label="Finalized" value={health?.asr?.finalizedEvents ?? 0} />
          <Metric label="Translation units" value={health?.asr?.emittedUnits ?? 0} />
          <Metric label="Buffered partial" value={health?.asr?.segmenter?.partialText ? 'yes' : 'no'} />
        </div>
        <p className="muted">Last input: {health?.asr?.lastTextPreview || 'none yet'}</p>
      </section>

      <section className="admin-table-card">
        <div className="admin-summary">
          <strong>{health?.totalClients ?? 0}</strong>
          <span>connected clients</span>
          <span>{health?.provider ? `Provider: ${health.provider}` : ''}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Language</th>
              <th>Clients</th>
              <th>Latency</th>
              <th>Segments</th>
              <th>Errors</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(health?.languages || []).map((metric) => (
              <tr key={metric.language}>
                <td>{metric.language}</td>
                <td>{metric.clients}</td>
                <td className={latencyClass(metric.lastLatencyMs)}>{metric.lastLatencyMs == null ? '—' : `${metric.lastLatencyMs}ms`}</td>
                <td>{metric.translatedSegments}</td>
                <td>{metric.errors}</td>
                <td><span className={`metric-status metric-status--${metric.status}`}>{metric.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function ProviderBadge({ provider }) {
  const effective = provider?.effectiveProvider || 'loading';
  return (
    <div className={`provider-badge provider-badge--${effective}`}>
      <span>{effective}</span>
      <small>{provider?.openai?.apiKeyPresent ? provider.openai.model : 'no API key / mock mode'}</small>
      <small>{provider?.activeLanguages?.length ? `${provider.activeLanguages.length} active streams` : ''}</small>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="asr-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function latencyClass(value) {
  if (value == null) return '';
  if (value >= 5000) return 'latency latency--bad';
  if (value >= 3000) return 'latency latency--warn';
  return 'latency latency--good';
}

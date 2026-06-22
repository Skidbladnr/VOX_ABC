import { useEffect, useMemo, useState } from 'react';
import { LANGUAGES } from '../../../../shared/contracts/languages.js';
import { getJson, postJson } from '../api.js';
import { VoiceInputPanel } from './VoiceInputPanel.jsx';

const SAMPLE = 'Please watch the lauter flow rate and wort clarity before increasing the sparge temperature.';

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function AdminDashboard() {
  const [health, setHealth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [ragStatus, setRagStatus] = useState(null);
  const [ragSearchResult, setRagSearchResult] = useState(null);
  const [manualText, setManualText] = useState(SAMPLE);
  const [sourceLanguage, setSourceLanguage] = useState('en-US');
  const [targetLanguage, setTargetLanguage] = useState('ja-JP');
  const [primaryModel, setPrimaryModel] = useState('');
  const [fallbackModel, setFallbackModel] = useState('');
  const [customPrimaryModel, setCustomPrimaryModel] = useState('');
  const [customFallbackModel, setCustomFallbackModel] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [lastAsrResult, setLastAsrResult] = useState(null);
  const [modelUpdateResult, setModelUpdateResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const [nextHealth, nextProvider, nextModelConfig, nextRagStatus] = await Promise.all([
        getJson('/api/health'),
        getJson('/api/provider-status'),
        getJson('/api/model-config'),
        getJson('/api/rag/status')
      ]);
      setHealth(nextHealth);
      setProvider(nextProvider);
      setModelConfig(nextModelConfig);
      setRagStatus(nextRagStatus);
      setPrimaryModel((current) => current || nextModelConfig.primaryModel || nextProvider.openai?.model || '');
      setFallbackModel((current) => current || nextModelConfig.fallbackModel || nextProvider.openai?.fallbackModel || '');
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

  const modelOptions = useMemo(() => unique([
    ...(modelConfig?.modelOptions || []),
    ...(provider?.openai?.modelOptions || []),
    primaryModel,
    fallbackModel,
    'gpt-5.4-mini',
    'gpt-5-mini',
    'gpt-4.1-mini',
    'gpt-5.2'
  ]), [modelConfig, provider, primaryModel, fallbackModel]);

  const selectedPrimaryModel = primaryModel === '__custom__' ? customPrimaryModel.trim() : primaryModel;
  const selectedFallbackModel = fallbackModel === '__custom__' ? customFallbackModel.trim() : fallbackModel;

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

  async function runRagSearch() {
    setBusy(true);
    setRagSearchResult(null);
    try {
      const result = await postJson('/api/rag/search', { text: manualText });
      setRagSearchResult(result);
      await refresh();
    } catch (err) {
      setRagSearchResult({ ok: false, error: err.message, matches: [] });
    } finally {
      setBusy(false);
    }
  }

  async function runSingleTargetTest() {
    setBusy(true);
    setTestResult(null);
    try {
      const result = await postJson('/api/test-translation', {
        text: manualText,
        sourceLanguage,
        targetLanguage,
        primaryModel: selectedPrimaryModel,
        fallbackModel: selectedFallbackModel
      });
      setTestResult(result);
      await refresh();
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function applyModelConfig() {
    setBusy(true);
    setModelUpdateResult(null);
    try {
      const result = await postJson('/api/model-config', {
        primaryModel: selectedPrimaryModel,
        fallbackModel: selectedFallbackModel
      });
      setModelUpdateResult(result);
      if (result.primaryModel) setPrimaryModel(result.primaryModel);
      if (result.fallbackModel !== undefined) setFallbackModel(result.fallbackModel || '');
      setCustomPrimaryModel('');
      setCustomFallbackModel('');
      await refresh();
    } catch (err) {
      setModelUpdateResult({ ok: false, error: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function resetModelForm() {
    const next = await getJson('/api/model-config');
    setModelConfig(next);
    setPrimaryModel(next.primaryModel || '');
    setFallbackModel(next.fallbackModel || '');
    setCustomPrimaryModel('');
    setCustomFallbackModel('');
    setModelUpdateResult(null);
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
          <p className="muted">Test real GPT translation, switch models, inspect brewery-term retrieval, inject finalized ASR phrases, run browser mic input, and watch per-language latency/error health.</p>
        </div>
        <ProviderBadge provider={provider} />
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="admin-card model-card">
        <div className="model-card__header">
          <div>
            <p className="eyebrow">Translation model</p>
            <h2>Live OpenAI model switcher</h2>
            <p className="muted">Applies to new live translation segments immediately. Existing in-flight segments continue with the model they already started on.</p>
          </div>
          <div className="model-current">
            <span>Current</span>
            <strong>{modelConfig?.primaryModel || provider?.openai?.model || '—'}</strong>
            <small>Fallback: {modelConfig?.fallbackModel || provider?.openai?.fallbackModel || 'mock / none'}</small>
          </div>
        </div>

        <div className="admin-form-row admin-form-row--models">
          <label>
            Primary model
            <select value={primaryModel} onChange={(event) => setPrimaryModel(event.target.value)}>
              {modelOptions.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
              <option value="__custom__">Custom model…</option>
            </select>
          </label>
          {primaryModel === '__custom__' ? (
            <label>
              Custom primary
              <input
                value={customPrimaryModel}
                onChange={(event) => setCustomPrimaryModel(event.target.value)}
                placeholder="e.g. gpt-5.4-mini"
              />
            </label>
          ) : null}
          <label>
            Fallback model
            <select value={fallbackModel} onChange={(event) => setFallbackModel(event.target.value)}>
              <option value="">No OpenAI fallback / use provider default</option>
              {modelOptions.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
              <option value="__custom__">Custom model…</option>
            </select>
          </label>
          {fallbackModel === '__custom__' ? (
            <label>
              Custom fallback
              <input
                value={customFallbackModel}
                onChange={(event) => setCustomFallbackModel(event.target.value)}
                placeholder="e.g. gpt-4.1-mini"
              />
            </label>
          ) : null}
        </div>

        <div className="admin-actions">
          <button onClick={applyModelConfig} disabled={busy || !selectedPrimaryModel}>Apply to live stream</button>
          <button onClick={runSingleTargetTest} disabled={busy || !selectedPrimaryModel}>Test selected model only</button>
          <button className="ghost-button" onClick={resetModelForm} disabled={busy}>Reset form</button>
        </div>

        {modelUpdateResult ? (
          <div className={`test-result ${modelUpdateResult.ok === false ? 'test-result--error' : ''}`}>
            <span>{modelUpdateResult.ok === false ? 'Model update failed' : 'Live model updated'}</span>
            <p>{modelUpdateResult.ok === false ? modelUpdateResult.error : `${modelUpdateResult.primaryModel} · fallback ${modelUpdateResult.fallbackModel || 'none'}`}</p>
          </div>
        ) : null}
      </section>

      <section className="admin-card rag-card">
        <div className="model-card__header">
          <div>
            <p className="eyebrow">Brewery terminology retrieval</p>
            <h2>Rudimentary local RAG</h2>
            <p className="muted">Matches technical beer/brewery terms in the current phrase and injects only the relevant entries into the GPT prompt. This is local and in-memory, so it adds almost no live latency.</p>
          </div>
          <div className={`rag-badge ${ragStatus?.enabled ? 'rag-badge--on' : ''}`}>
            <span>{ragStatus?.enabled ? 'Enabled' : 'Disabled'}</span>
            <small>{ragStatus?.knowledgeStats?.entries ?? 0} entries · max {ragStatus?.maxEntries ?? '—'} per chunk</small>
          </div>
        </div>

        <div className="admin-actions">
          <button onClick={runRagSearch} disabled={busy || !manualText.trim()}>Preview retrieval for manual text</button>
        </div>

        {ragSearchResult ? (
          <div className={`rag-results ${ragSearchResult.ok === false ? 'test-result--error' : ''}`}>
            <strong>{ragSearchResult.ok === false ? 'Retrieval failed' : `${ragSearchResult.matches?.length || 0} matched entr${ragSearchResult.matches?.length === 1 ? 'y' : 'ies'}`}</strong>
            {ragSearchResult.error ? <p>{ragSearchResult.error}</p> : null}
            <div className="rag-chip-row">
              {(ragSearchResult.matches || []).map((match) => (
                <span className="rag-chip" key={match.id} title={match.matched?.join(', ') || ''}>
                  {match.term} <small>{match.score}</small>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {ragStatus?.lastMatches?.length ? (
          <p className="muted">Last live retrieval: {ragStatus.lastMatches.map((match) => match.term).join(', ')}</p>
        ) : (
          <p className="muted">No live retrieval matches yet. Try phrases like “wort clarity”, “hop creep”, “diacetyl rest”, or “CIP caustic wash”.</p>
        )}
      </section>

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
          <button onClick={runSingleTargetTest} disabled={busy || !selectedPrimaryModel}>Test one target only</button>
          <button className="ghost-button" onClick={runRagSearch} disabled={busy || !manualText.trim()}>Preview RAG</button>
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
            {testResult.ragMatches?.length ? (
              <div className="rag-chip-row rag-chip-row--compact">
                {testResult.ragMatches.map((match) => (
                  <span className="rag-chip" key={match.id}>{match.term}</span>
                ))}
              </div>
            ) : null}
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
          <Metric label="RAG chunks" value={health?.rag?.retrievedChunks ?? 0} />
          <Metric label="RAG matches" value={health?.rag?.totalMatches ?? 0} />
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
              <th>RAG hits</th>
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
                <td>{metric.ragHits ?? 0}</td>
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

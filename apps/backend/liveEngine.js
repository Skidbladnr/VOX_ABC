import { WebSocket } from 'ws';
import { encodeMessage } from '../../shared/contracts/messages.js';
import { configuredLanguages, config, updateOpenAIModelConfig, modelConfigSnapshot } from './config.js';
import { PhraseSegmenter } from './segmentation.js';
import { getCurrentSlide } from './slides.js';
import { makeProviders } from './providers/index.js';

const DEMO_LINES = [
  'Good morning and welcome to Asia Brew Conference.',
  'Our first session looks at malt quality, mash temperature, and brewhouse efficiency.',
  'When we discuss lauter performance, please pay close attention to wort clarity and grain bed compaction.',
  'For dry-hop timing, oxygen pickup is often just as important as contact time.',
  'We will leave room for questions after the speaker finishes this section.'
];

function now() {
  return Date.now();
}

function createMetric(language) {
  return {
    language,
    clients: 0,
    translatedSegments: 0,
    errors: 0,
    lastLatencyMs: null,
    status: 'idle'
  };
}

export class LiveTranslationEngine {
  constructor() {
    this.session = {
      id: config.sessionId,
      title: 'Opening Keynote: Brewing Across Asia',
      speaker: 'ABC Main Stage',
      label: 'Demo Session'
    };
    this.segmenter = new PhraseSegmenter();
    this.providers = makeProviders();
    this.effectiveProvider = this.providers.effectiveProvider || this.providers.primary?.name || 'unknown';
    this.languages = configuredLanguages();
    this.clientsByLanguage = new Map(this.languages.map((language) => [language.code, new Set()]));
    this.latestCaptionByLanguage = new Map();
    this.metrics = new Map(this.languages.map((language) => [language.code, createMetric(language.code)]));
    this.currentSlideIndex = 0;
    this.demoTimer = null;
    this.demoIndex = 0;
    this.asr = {
      receivedEvents: 0,
      finalizedEvents: 0,
      emittedUnits: 0,
      lastEventAt: null,
      lastSource: null,
      lastSourceLanguage: 'en-US',
      lastTextPreview: ''
    };
  }

  start() {
    if (!config.demoAsr) return;
    this.demoTimer = setInterval(() => {
      const line = DEMO_LINES[this.demoIndex % DEMO_LINES.length];
      this.demoIndex += 1;
      this.feedAsrEvent({ text: line, isFinal: true, sourceLanguage: 'en-US', source: 'demo-asr', timestamp: now() });
      if (this.demoIndex % 3 === 0) this.advanceSlide();
    }, 2800);
  }

  stop() {
    if (this.demoTimer) clearInterval(this.demoTimer);
  }

  addClient(ws, language) {
    this.ensureLanguage(language);
    ws.voxLanguage = language;
    this.clientsByLanguage.get(language).add(ws);
    this.refreshClientCounts();

    this.send(ws, {
      type: 'hello',
      sessionId: this.session.id,
      language,
      timestamp: now(),
      connectionCount: this.totalClients()
    });

    this.send(ws, {
      type: 'status',
      sessionId: this.session.id,
      language,
      status: 'connected',
      detail: 'Subscribed to live captions.',
      timestamp: now()
    });

    const latest = this.latestCaptionByLanguage.get(language);
    if (latest) this.send(ws, latest);
    this.sendSlide(ws, language);
  }

  removeClient(ws) {
    const language = ws.voxLanguage;
    if (language && this.clientsByLanguage.has(language)) {
      this.clientsByLanguage.get(language).delete(ws);
      this.refreshClientCounts();
    }
  }

  resubscribe(ws, nextLanguage) {
    this.removeClient(ws);
    this.addClient(ws, nextLanguage);
  }

  feedAsrEvent(event) {
    const text = String(event?.text || '').trim();
    if (!text) return [];

    this.asr.receivedEvents += 1;
    this.asr.lastEventAt = event.timestamp || now();
    this.asr.lastSource = event.source || 'unknown';
    this.asr.lastSourceLanguage = event.sourceLanguage || 'en-US';
    this.asr.lastTextPreview = text.slice(0, 160);
    if (event.isFinal || event.forceFlush) this.asr.finalizedEvents += 1;

    const units = this.segmenter.push(event);
    this.asr.emittedUnits += units.length;

    for (const unit of units) {
      this.fanOut(unit);
    }

    return units;
  }

  flushAsrBuffer({ sourceLanguage = this.asr.lastSourceLanguage || 'en-US' } = {}) {
    const units = this.segmenter.flushPartial({ sourceLanguage, timestamp: now(), source: 'manual-flush' });
    this.asr.finalizedEvents += units.length ? 1 : 0;
    this.asr.emittedUnits += units.length;
    for (const unit of units) {
      this.fanOut(unit);
    }
    return units;
  }

  fanOut(unit) {
    for (const language of this.languages) {
      this.translateForLanguage(unit, language.code).catch((error) => {
        console.error(`[vox] language pipeline failed for ${language.code}`, error);
      });
    }
  }

  async translateForLanguage(unit, language) {
    const metric = this.ensureMetric(language);
    metric.status = 'active';
    const startedAt = now();
    let accumulated = '';

    const runProvider = async (provider) => {
      for await (const delta of provider.translate({
        sourceText: unit.sourceText,
        sourceLanguage: unit.sourceLanguage,
        targetLanguage: language
      })) {
        accumulated += delta;
        const message = this.captionMessage({ unit, language, text: accumulated, isFinal: false, provider: provider.name, startedAt });
        this.latestCaptionByLanguage.set(language, message);
        this.broadcast(language, message);
      }
      return provider.name;
    };

    try {
      const providerName = await runProvider(this.providers.primary);
      const finalMessage = this.captionMessage({ unit, language, text: accumulated || unit.sourceText, isFinal: true, provider: providerName, startedAt });
      this.latestCaptionByLanguage.set(language, finalMessage);
      this.broadcast(language, finalMessage);
      metric.translatedSegments += 1;
      metric.lastLatencyMs = finalMessage.latencyMs;
      metric.status = 'idle';
    } catch (error) {
      metric.errors += 1;
      metric.status = 'degraded';
      this.broadcast(language, this.statusMessage(language, 'reconnecting', `Primary provider failed: ${error.message || 'unknown error'}`));

      if (!this.providers.fallback) return;

      try {
        accumulated = '';
        const providerName = await runProvider(this.providers.fallback);
        const finalMessage = this.captionMessage({ unit, language, text: accumulated || unit.sourceText, isFinal: true, provider: providerName, startedAt });
        this.latestCaptionByLanguage.set(language, finalMessage);
        this.broadcast(language, finalMessage);
        metric.translatedSegments += 1;
        metric.lastLatencyMs = finalMessage.latencyMs;
        metric.status = 'idle';
      } catch (fallbackError) {
        metric.errors += 1;
        metric.status = 'degraded';
        this.broadcast(language, this.statusMessage(language, 'degraded', `Fallback provider failed: ${fallbackError.message || 'unknown error'}`));
      }
    }
  }

  getModelConfig() {
    return modelConfigSnapshot();
  }

  setModelConfig({ primaryModel, fallbackModel }) {
    const snapshot = updateOpenAIModelConfig({ primaryModel, fallbackModel });
    this.providers = makeProviders();
    this.effectiveProvider = this.providers.effectiveProvider || this.providers.primary?.name || 'unknown';

    for (const language of this.languages) {
      this.broadcast(language.code, this.statusMessage(
        language.code,
        'connected',
        `Translation model switched to ${snapshot.primaryModel}${snapshot.fallbackModel ? ` / fallback ${snapshot.fallbackModel}` : ''}.`
      ));
    }

    return {
      ok: true,
      ...snapshot,
      effectiveProvider: this.effectiveProvider
    };
  }

  async translateOnce({ text, sourceLanguage = 'en-US', targetLanguage = 'ja-JP', primaryModel, fallbackModel }) {
    const startedAt = now();
    const previous = {
      primaryModel: config.openai.model,
      fallbackModel: config.openai.fallbackModel
    };
    const usesTemporaryModel = Boolean(primaryModel || fallbackModel !== undefined);
    let activeProviders = this.providers;

    if (usesTemporaryModel) {
      updateOpenAIModelConfig({ primaryModel, fallbackModel });
      activeProviders = makeProviders();
    }

    try {
      const providers = [activeProviders.primary, activeProviders.fallback].filter(Boolean);
      let lastError = null;

      for (const provider of providers) {
        let accumulated = '';
        try {
          for await (const delta of provider.translate({
            sourceText: text,
            sourceLanguage,
            targetLanguage
          })) {
            accumulated += delta;
          }
          return {
            ok: true,
            text: accumulated || text,
            provider: provider.name,
            latencyMs: now() - startedAt,
            targetLanguage,
            model: provider.model || provider.name
          };
        } catch (error) {
          lastError = error;
        }
      }

      return {
        ok: false,
        error: lastError?.message || 'No translation provider succeeded.',
        latencyMs: now() - startedAt,
        targetLanguage
      };
    } finally {
      if (usesTemporaryModel) updateOpenAIModelConfig(previous);
    }
  }

  captionMessage({ unit, language, text, isFinal, provider, startedAt }) {
    return {
      type: 'caption',
      sessionId: this.session.id,
      segmentId: unit.segmentId,
      language,
      isFinal,
      text,
      timestamp: now(),
      latencyMs: now() - startedAt,
      provider
    };
  }

  statusMessage(language, status, detail) {
    return {
      type: 'status',
      sessionId: this.session.id,
      language,
      status,
      detail,
      timestamp: now()
    };
  }

  advanceSlide() {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % 3;
    for (const language of this.languages) {
      this.broadcast(language.code, this.slideMessage(language.code));
    }
  }

  slideMessage(language) {
    return {
      type: 'slide',
      sessionId: this.session.id,
      language,
      ...getCurrentSlide(language, this.currentSlideIndex),
      timestamp: now()
    };
  }

  sendSlide(ws, language) {
    this.send(ws, this.slideMessage(language));
  }

  send(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(encodeMessage(message));
  }

  broadcast(language, message) {
    const clients = this.clientsByLanguage.get(language) || new Set();
    for (const client of clients) this.send(client, message);
  }

  ensureLanguage(language) {
    if (!this.clientsByLanguage.has(language)) this.clientsByLanguage.set(language, new Set());
    this.ensureMetric(language);
  }

  ensureMetric(language) {
    if (!this.metrics.has(language)) this.metrics.set(language, createMetric(language));
    return this.metrics.get(language);
  }

  refreshClientCounts() {
    for (const [language, clients] of this.clientsByLanguage.entries()) {
      this.ensureMetric(language).clients = clients.size;
    }
  }

  totalClients() {
    let total = 0;
    for (const clients of this.clientsByLanguage.values()) total += clients.size;
    return total;
  }

  health() {
    this.refreshClientCounts();
    return {
      type: 'health',
      sessionId: this.session.id,
      timestamp: now(),
      totalClients: this.totalClients(),
      provider: this.effectiveProvider,
      asr: {
        ...this.asr,
        segmenter: this.segmenter.snapshot()
      },
      languages: Array.from(this.metrics.values())
    };
  }
}

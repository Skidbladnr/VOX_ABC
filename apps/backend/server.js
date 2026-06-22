import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer } from 'ws';
import { config, configuredLanguages, providerRuntimeStatus } from './config.js';
import { LiveTranslationEngine } from './liveEngine.js';
import { getSlides } from './slides.js';
import { isClientMessage, safeJsonParse } from '../../shared/contracts/messages.js';

const engine = new LiveTranslationEngine();

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  try {
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
      return json(res, 200, { ok: true, sessionId: config.sessionId, ...providerRuntimeStatus() });
    }

    if (req.method === 'GET' && url.pathname === '/api/session') {
      return json(res, 200, engine.session);
    }

    if (req.method === 'GET' && url.pathname === '/api/languages') {
      return json(res, 200, { languages: configuredLanguages() });
    }

    if (req.method === 'GET' && url.pathname === '/api/slides') {
      const language = url.searchParams.get('lang') || 'en-US';
      return json(res, 200, { language, slides: getSlides(language) });
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, engine.health());
    }

    if (req.method === 'GET' && url.pathname === '/api/provider-status') {
      return json(res, 200, providerRuntimeStatus());
    }

    if (req.method === 'GET' && url.pathname === '/api/model-config') {
      return json(res, 200, { ok: true, ...engine.getModelConfig(), effectiveProvider: providerRuntimeStatus().effectiveProvider });
    }

    if (req.method === 'POST' && url.pathname === '/api/model-config') {
      const body = await readJsonBody(req);
      const result = engine.setModelConfig({
        primaryModel: body.primaryModel || body.model,
        fallbackModel: body.fallbackModel ?? body.fallback
      });
      return json(res, 202, result);
    }

    if (req.method === 'POST' && url.pathname === '/api/test-translation') {
      const body = await readJsonBody(req);
      const result = await engine.translateOnce({
        text: String(body.text || ''),
        sourceLanguage: body.sourceLanguage || 'en-US',
        targetLanguage: body.targetLanguage || 'ja-JP',
        primaryModel: body.primaryModel || body.model || undefined,
        fallbackModel: body.fallbackModel ?? body.fallback
      });
      return json(res, result.ok ? 200 : 502, result);
    }

    if (req.method === 'POST' && url.pathname === '/api/asr') {
      const body = await readJsonBody(req);
      const units = engine.feedAsrEvent({
        text: String(body.text || ''),
        isFinal: body.isFinal !== false,
        forceFlush: Boolean(body.forceFlush),
        sourceLanguage: body.sourceLanguage || 'en-US',
        source: body.source || 'manual',
        eventId: body.eventId || undefined,
        timestamp: Number(body.timestamp) || Date.now()
      });
      return json(res, 202, {
        ok: true,
        accepted: true,
        emittedUnits: units.length,
        segmentIds: units.map((unit) => unit.segmentId),
        preview: units.map((unit) => unit.sourceText)
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/asr/flush') {
      const body = await readJsonBody(req);
      const units = engine.flushAsrBuffer({ sourceLanguage: body.sourceLanguage || 'en-US' });
      return json(res, 202, {
        ok: true,
        emittedUnits: units.length,
        segmentIds: units.map((unit) => unit.segmentId),
        preview: units.map((unit) => unit.sourceText)
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/demo/next-slide') {
      engine.advanceSlide();
      return json(res, 202, { ok: true });
    }

    return json(res, 404, { ok: false, error: 'Not found' });
  } catch (error) {
    console.error('[vox] HTTP error', error);
    return json(res, 500, { ok: false, error: error.message || 'Internal server error' });
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/ws', `http://${req.headers.host || 'localhost'}`);
  const requestedLanguage = url.searchParams.get('lang') || 'en-US';
  const enabledLanguages = configuredLanguages();
  const enabledCodes = new Set(enabledLanguages.map((languageConfig) => languageConfig.code));
  const language = enabledCodes.has(requestedLanguage) ? requestedLanguage : enabledLanguages[0].code;

  engine.addClient(ws, language);

  ws.on('message', (raw) => {
    const message = safeJsonParse(raw.toString());
    if (!isClientMessage(message)) {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid client message', timestamp: Date.now() }));
      return;
    }

    if (message.type === 'subscribe') {
      const enabledLanguages = configuredLanguages();
      const enabledCodes = new Set(enabledLanguages.map((languageConfig) => languageConfig.code));
      const nextLanguage = enabledCodes.has(message.language) ? message.language : enabledLanguages[0].code;
      engine.resubscribe(ws, nextLanguage);
      return;
    }

    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now(), clientTimestamp: message.timestamp }));
    }
  });

  ws.on('close', () => engine.removeClient(ws));
  ws.on('error', () => engine.removeClient(ws));
});

server.listen(config.port, config.host, () => {
  engine.start();
  console.log(`[vox] backend listening on http://${config.host}:${config.port}`);
  console.log(`[vox] ws endpoint ws://${config.host}:${config.port}/ws`);
  const providerStatus = providerRuntimeStatus();
  console.log(`[vox] translation provider: ${providerStatus.effectiveProvider} (requested: ${providerStatus.requestedProvider})`);
  console.log(`[vox] active languages: ${providerStatus.activeLanguages.join(', ')}`);
});

process.on('SIGTERM', () => {
  engine.stop();
  wss.close();
  server.close(() => process.exit(0));
});

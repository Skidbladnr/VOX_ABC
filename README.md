# Vox ABC — Live Translation POC

Plain JavaScript POC for the Asia Brew Conference live translation system.

This repo intentionally avoids TypeScript. The shared contracts are plain JS modules with JSDoc typedefs and runtime validators, which keeps frontend/backend message shapes centralized without TS compiler or module-resolution overhead.

## Current state

This version is wired for two modes:

1. **Mock mode** — no API key, automatic demo captions, safe for UI/dev.
2. **Real GPT mode** — server-side OpenAI Responses API streaming translation, manual ASR phrase injection from the admin screen, and per-language WebSocket fan-out.

The API key is only read by the Node backend. The browser never receives it.

## What this POC includes

- React PWA attendee screen
- Brewer's Proof low-glare UI direction from the spec
- Separate slide/material panel and caption panel for future responsive layouts
- WebSocket live caption stream
- Per-language fan-out architecture
- Isolated language pipelines with primary/fallback provider flow
- OpenAI GPT API translation provider with streaming
- Mock translation provider for no-key local demos
- Static translated slide/material path
- Internal health/control dashboard
- One-target translation tester to avoid accidentally firing all 15 paid streams while debugging
- Manual ASR injection path for realistic end-to-end testing before Google STT is added
- WebSocket load-test script
- Event-day runbook draft

## What it does not include yet

- Real Google Cloud Speech-to-Text adapter
- Real slide deck ingestion
- Native speaker review workflow UI
- Production auth for the admin dashboard
- Live audio/TTS, which remains out of scope for v1

## Install

```bash
npm config set registry https://registry.npmjs.org/
npm install
```

This scaffold is pinned to Vite 5 so it works on Node 20.14.0 and avoids the Vite 8/Rolldown native-binding issue.

## Run local mock demo

```bash
npm run start
```

In another terminal:

```bash
npm run dev:frontend
```

Open:

- Attendee app: <http://localhost:5173>
- Internal dashboard/control panel: <http://localhost:5173/?admin=1>

## Use real GPT translation

Create `.env` from the example:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DEMO_ASR=false
TRANSLATION_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.2
OPENAI_FALLBACK_MODEL=gpt-5.2
TRANSLATION_TIMEOUT_MS=5000
ACTIVE_LANGUAGES=en-US,ja-JP
```

`ACTIVE_LANGUAGES` is important while testing. A live phrase fans out to every active language, so keep it to one or two paid target streams until you are intentionally testing all languages.

Start the backend:

```bash
npm run start
```

The backend auto-loads `.env` and `.env.local`; no `source .env` step is required.

Then start the frontend:

```bash
npm run dev:frontend
```

Open the admin page:

```text
http://localhost:5173/?admin=1
```

Use:

- **Test one target only** — calls the GPT provider once for the selected target language.
- **Send to active live streams** — injects the phrase as finalized ASR and fans out to every language listed in `ACTIVE_LANGUAGES`.

## HTTP smoke tests

Provider status:

```bash
curl http://localhost:8787/api/provider-status
```

One-target GPT translation test:

```bash
curl -X POST http://localhost:8787/api/test-translation \
  -H 'content-type: application/json' \
  -d '{"text":"Please watch the lauter flow rate and wort clarity.","sourceLanguage":"en-US","targetLanguage":"ja-JP"}'
```

Manual live ASR injection:

```bash
curl -X POST http://localhost:8787/api/asr \
  -H 'content-type: application/json' \
  -d '{"text":"Please watch the lauter flow rate and wort clarity.","isFinal":true,"sourceLanguage":"en-US"}'
```

## Build frontend

```bash
npm run build
```

## Doctor check

```bash
npm run doctor
```

Doctor verifies:

- required files exist
- no `.ts` or `.tsx` files remain in the runtime tree
- backend health endpoint starts
- WebSocket hello handshake works

## Load test

Start the backend first, then:

```bash
CLIENTS=500 DURATION_MS=30000 npm run load-test
```

## Repo structure

```text
apps/backend/            Node.js HTTP + WebSocket backend
apps/backend/providers/  mock and OpenAI streaming translation providers
apps/frontend/           React PWA attendee/admin UI
shared/contracts/        JSDoc contracts, validators, languages, glossary
tools/                   doctor and WebSocket load test
docs/                    runbook and provider notes
```

## Important open questions to keep visible

- Final language list is not confirmed.
- Source-caption visibility is configurable with `INCLUDE_SOURCE_CAPTIONS`.
- Lower-resource languages need explicit quality spikes.
- Scripted vs. unscripted session split changes how heavily the live pipeline is exercised.
- Client device strategy is still a product/ops decision.

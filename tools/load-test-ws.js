import { WebSocket } from 'ws';
import { LANGUAGES } from '../shared/contracts/languages.js';

const TOTAL = Number.parseInt(process.env.CLIENTS || '500', 10);
const URL = process.env.WS_URL || 'ws://localhost:8787/ws';
const clients = [];
let open = 0;
let messages = 0;
let failures = 0;

for (let i = 0; i < TOTAL; i += 1) {
  const language = LANGUAGES[i % LANGUAGES.length].code;
  const ws = new WebSocket(`${URL}?lang=${encodeURIComponent(language)}`);
  clients.push(ws);
  ws.on('open', () => {
    open += 1;
    ws.send(JSON.stringify({ type: 'subscribe', language }));
  });
  ws.on('message', () => {
    messages += 1;
  });
  ws.on('error', () => {
    failures += 1;
  });
}

const startedAt = Date.now();
const timer = setInterval(() => {
  const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  console.log({ open, total: TOTAL, messages, failures, messagesPerSecond: Math.round(messages / seconds) });
}, 1000);

setTimeout(() => {
  clearInterval(timer);
  for (const ws of clients) ws.close();
  console.log('Load test complete.');
  process.exit(failures ? 1 : 0);
}, Number.parseInt(process.env.DURATION_MS || '30000', 10));

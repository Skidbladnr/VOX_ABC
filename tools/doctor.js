import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

const root = process.cwd();
const required = [
  'package.json',
  'apps/backend/server.js',
  'apps/backend/providers/openaiProvider.js',
  'apps/frontend/src/App.jsx',
  'shared/contracts/messages.js',
  'shared/contracts/languages.js'
];

function assertFile(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${file}`);
}

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

function assertNoTypeScriptRuntime() {
  const badFiles = collectFiles(root).filter((file) => /\.(ts|tsx|d\.ts)$/.test(file));
  if (badFiles.length) {
    throw new Error(`TypeScript files remain:\n${badFiles.map((file) => `- ${path.relative(root, file)}`).join('\n')}`);
  }
}

async function smokeBackend() {
  const port = 8799;
  const child = spawn(process.execPath, ['apps/backend/server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DEMO_ASR: 'false', TRANSLATION_PROVIDER: 'mock' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const cleanup = () => child.kill('SIGTERM');

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Backend did not start within 4s')), 4000);
      child.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('backend listening')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code !== null && code !== 0) reject(new Error(`Backend exited early with code ${code}`));
      });
    });

    const health = await fetch(`http://127.0.0.1:${port}/health`).then((res) => res.json());
    if (!health.ok) throw new Error('Health endpoint returned non-ok payload');

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?lang=ja-JP`);
      const timer = setTimeout(() => reject(new Error('WebSocket hello timed out')), 3000);
      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString());
        if (message.type === 'hello') {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      });
      ws.on('error', reject);
    });
  } finally {
    cleanup();
  }
}

try {
  required.forEach(assertFile);
  assertNoTypeScriptRuntime();
  await smokeBackend();
  console.log('vox doctor OK: JS-only runtime, required files present, backend + WebSocket smoke test passed.');
} catch (error) {
  console.error(`vox doctor failed: ${error.message}`);
  process.exit(1);
}

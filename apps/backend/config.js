import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTargetLanguages, findLanguage } from '../../shared/contracts/languages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const originalEnv = new Set(Object.keys(process.env));
const fileEnvKeys = new Set();

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [match[1], value];
}

function loadEnvFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (originalEnv.has(key)) continue;
    process.env[key] = value;
    fileEnvKeys.add(key);
  }
}

// No dependency needed: `node apps/backend/server.js` now loads local env files automatically.
loadEnvFile('.env');
loadEnvFile('.env.local');

function boolFromEnv(value, fallback) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function intFromEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csvFromEnv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: intFromEnv(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  sessionId: process.env.SESSION_ID || 'abc-demo-main',
  demoAsr: boolFromEnv(process.env.DEMO_ASR, true),
  includeSourceCaptions: boolFromEnv(process.env.INCLUDE_SOURCE_CAPTIONS, true),
  activeLanguageCodes: csvFromEnv(process.env.ACTIVE_LANGUAGES),
  translationProvider: process.env.TRANSLATION_PROVIDER || 'mock',
  translationTimeoutMs: intFromEnv(process.env.TRANSLATION_TIMEOUT_MS, 5000),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-5.2',
    fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-5.2'
  }
};

export function configuredLanguages() {
  const base = getTargetLanguages(config.includeSourceCaptions);
  if (!config.activeLanguageCodes.length) return base;
  const allowed = new Set(base.map((language) => language.code));
  const selected = config.activeLanguageCodes
    .filter((code) => allowed.has(code))
    .map((code) => findLanguage(code));
  return selected.length ? selected : base;
}

export function providerRuntimeStatus() {
  const apiKeyPresent = Boolean(config.openai.apiKey && !config.openai.apiKey.includes('your-key'));
  return {
    requestedProvider: config.translationProvider,
    effectiveProvider: config.translationProvider === 'openai' && apiKeyPresent ? 'openai' : 'mock',
    demoAsr: config.demoAsr,
    timeoutMs: config.translationTimeoutMs,
    activeLanguages: configuredLanguages().map((language) => language.code),
    openai: {
      apiKeyPresent,
      model: config.openai.model,
      fallbackModel: config.openai.fallbackModel || null
    },
    envFilesLoaded: Array.from(fileEnvKeys).length > 0
  };
}

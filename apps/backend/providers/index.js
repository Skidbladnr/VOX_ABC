import { config } from '../config.js';
import { MockTranslationProvider } from './mockProvider.js';
import { OpenAITranslationProvider } from './openaiProvider.js';

function hasOpenAIKey() {
  return Boolean(config.openai.apiKey && !config.openai.apiKey.includes('your-key'));
}

export function makeProviders() {
  const mock = new MockTranslationProvider();

  if (config.translationProvider !== 'openai') {
    return { primary: mock, fallback: null, effectiveProvider: 'mock' };
  }

  if (!hasOpenAIKey()) {
    console.warn('[vox] TRANSLATION_PROVIDER=openai but OPENAI_API_KEY is missing. Falling back to mock provider.');
    return { primary: mock, fallback: null, effectiveProvider: 'mock' };
  }

  const primary = new OpenAITranslationProvider({
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    timeoutMs: config.translationTimeoutMs,
    name: `openai:${config.openai.model}`
  });

  const fallback = config.openai.fallbackModel && config.openai.fallbackModel !== config.openai.model
    ? new OpenAITranslationProvider({
        apiKey: config.openai.apiKey,
        model: config.openai.fallbackModel,
        timeoutMs: config.translationTimeoutMs,
        name: `openai:${config.openai.fallbackModel}`
      })
    : mock;

  return { primary, fallback, effectiveProvider: 'openai' };
}

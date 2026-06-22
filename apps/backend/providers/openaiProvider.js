import OpenAI from 'openai';
import { findLanguage } from '../../../shared/contracts/languages.js';
import { BREWING_GLOSSARY, formatGlossaryForPrompt } from '../../../shared/contracts/glossary.js';
import { formatBrewingContextForPrompt } from '../rag/brewingRag.js';

function extractDelta(event) {
  if (!event || typeof event !== 'object') return '';
  if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') return event.delta;
  if (event.type === 'response.text.delta' && typeof event.delta === 'string') return event.delta;
  if (typeof event.delta === 'string') return event.delta;
  return '';
}

function buildInstructions({ sourceLanguage, target, glossary, ragMatches }) {
  const retrievedContext = formatBrewingContextForPrompt(ragMatches || [], target.code);

  return [
    'You are a live conference caption translator for Asia Brew Conference.',
    `Translate from ${sourceLanguage} into ${target.english} (${target.code}).`,
    'Return only the translated caption. Do not add notes, brackets, explanations, markdown, or quotation marks.',
    'Keep the register professional, concise, and easy to read on a phone screen.',
    'Prefer short caption phrasing over literary style. Preserve numbers, units, brewery names, beer styles, and acronyms.',
    'Prioritize brewing terminology accuracy over decorative fluency embellishment.',
    'When a brewing term has a specialized meaning, translate that specialized meaning instead of the ordinary dictionary meaning.',
    `Static base glossary:\n${formatGlossaryForPrompt(glossary)}`,
    retrievedContext || 'No extra retrieved brewery terminology context matched this phrase.'
  ].join('\n\n');
}

export class OpenAITranslationProvider {
  constructor({ apiKey, model, timeoutMs = 5000, name = 'openai' }) {
    this.name = name;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.client = new OpenAI({ apiKey });
  }

  async *translate({ sourceText, sourceLanguage = 'en-US', targetLanguage, glossary = BREWING_GLOSSARY, ragMatches = [] }) {
    const target = findLanguage(targetLanguage);
    if (target.code === sourceLanguage) {
      yield sourceText;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Translation timeout after ${this.timeoutMs}ms`)), this.timeoutMs);

    try {
      const stream = await this.client.responses.create(
        {
          model: this.model,
          instructions: buildInstructions({ sourceLanguage, target, glossary, ragMatches }),
          input: sourceText,
          stream: true,
          max_output_tokens: 500
        },
        { signal: controller.signal }
      );

      for await (const event of stream) {
        const delta = extractDelta(event);
        if (delta) yield delta;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

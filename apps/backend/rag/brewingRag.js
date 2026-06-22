import { BREWING_KNOWLEDGE } from '../../../shared/contracts/brewingKnowledge.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'before', 'by', 'for', 'from', 'if', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'our', 'please', 'so', 'that', 'the', 'then', 'this', 'to', 'we', 'when', 'with', 'you',
  'your', 'about', 'after', 'during', 'than', 'over', 'under', 'up', 'down', 'out'
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9°%+/.'-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '');
}

function tokens(value) {
  return normalize(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function termForms(entry) {
  return unique([entry.term, ...(entry.aliases || [])]);
}

function containsPhrase(haystack, phrase) {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  if (haystack.normalized.includes(normalizedPhrase)) return true;

  // Catches ASR-ish variants such as "dry hop" vs "dry-hop", "i b u" vs "IBU".
  const compactPhrase = compact(normalizedPhrase);
  if (compactPhrase.length >= 3 && haystack.compact.includes(compactPhrase)) return true;

  return false;
}

function scoreEntry(entry, haystack, queryTokens) {
  let score = 0;
  const matched = [];

  for (const form of termForms(entry)) {
    if (containsPhrase(haystack, form)) {
      score += form === entry.term ? 12 : 9;
      matched.push(form);
    }
  }

  const entryText = normalize([
    entry.term,
    ...(entry.aliases || []),
    entry.category,
    entry.meaning,
    entry.translationGuidance
  ].join(' '));

  for (const token of queryTokens) {
    if (entryText.includes(token)) score += 1;
  }

  // Prefer exact phrase/alias matches over vague token overlap.
  if (!matched.length && score < 3) return null;

  return {
    id: entry.id,
    term: entry.term,
    aliases: entry.aliases || [],
    category: entry.category,
    meaning: entry.meaning,
    translationGuidance: entry.translationGuidance,
    targetHints: entry.targetHints || {},
    score,
    matched: unique(matched)
  };
}

/**
 * Retrieve relevant brewery terminology entries for a short ASR phrase.
 * This is deliberately local/in-memory to avoid adding network latency to live captions.
 *
 * @param {string} sourceText
 * @param {{ maxEntries?: number, minScore?: number }} [options]
 */
export function retrieveBrewingContext(sourceText, options = {}) {
  const maxEntries = Math.max(1, Number(options.maxEntries || 6));
  const minScore = Math.max(1, Number(options.minScore || 2));
  const normalized = normalize(sourceText);
  if (!normalized) return [];

  const haystack = {
    normalized,
    compact: compact(sourceText)
  };
  const queryTokens = tokens(sourceText);

  return BREWING_KNOWLEDGE
    .map((entry) => scoreEntry(entry, haystack, queryTokens))
    .filter((result) => result && result.score >= minScore)
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, maxEntries);
}

/**
 * @param {ReturnType<typeof retrieveBrewingContext>} matches
 * @param {string} targetLanguage
 */
export function formatBrewingContextForPrompt(matches, targetLanguage) {
  if (!matches?.length) return '';

  const lines = matches.map((match) => {
    const targetHint = match.targetHints?.[targetLanguage];
    const matched = match.matched?.length ? ` Matched source words: ${match.matched.join(', ')}.` : '';
    const hint = targetHint ? ` Target-language hint: ${targetHint}` : '';
    return `- ${match.term} [${match.category}]: ${match.meaning} Guidance: ${match.translationGuidance}.${matched}${hint}`;
  });

  return [
    'Retrieved brewery terminology context for THIS source phrase:',
    ...lines,
    'Use these entries only when relevant to the source phrase. Do not mention that retrieval was used.'
  ].join('\n');
}

export function ragDebugPayload(matches) {
  return matches.map((match) => ({
    id: match.id,
    term: match.term,
    category: match.category,
    score: match.score,
    matched: match.matched
  }));
}

export function brewingKnowledgeStats() {
  const categories = {};
  for (const entry of BREWING_KNOWLEDGE) {
    categories[entry.category] = (categories[entry.category] || 0) + 1;
  }
  return {
    entries: BREWING_KNOWLEDGE.length,
    categories
  };
}

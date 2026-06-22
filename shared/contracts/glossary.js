/**
 * @typedef {Object} GlossaryEntry
 * @property {string} term
 * @property {string} definition
 * @property {string} preferredTranslationHint
 */

/** @type {GlossaryEntry[]} */
export const BREWING_GLOSSARY = [
  { term: 'ABV', definition: 'Alcohol by volume, a percentage measurement of alcohol content.', preferredTranslationHint: 'Preserve abbreviation ABV and explain only if needed.' },
  { term: 'mash', definition: 'The mixture of crushed malted grain and hot water used to convert starches into sugars.', preferredTranslationHint: 'Use the accepted brewing term in the target language.' },
  { term: 'lauter', definition: 'The process of separating sweet wort from the spent grain bed.', preferredTranslationHint: 'Prefer technical brewing terminology over generic filtering.' },
  { term: 'sparge', definition: 'Rinsing the grain bed to extract remaining sugars.', preferredTranslationHint: 'Keep distinct from lauter.' },
  { term: 'wort', definition: 'Sugar-rich liquid extracted from the mash before fermentation.', preferredTranslationHint: 'Use brewing-specific term; do not translate as generic juice.' },
  { term: 'dry-hop', definition: 'Adding hops after boiling, usually during or after fermentation, to increase aroma.', preferredTranslationHint: 'Keep hyphenated brewing meaning, not literal dry hops only.' },
  { term: 'attenuation', definition: 'The degree to which yeast ferments sugars into alcohol and CO2.', preferredTranslationHint: 'Prefer technical brewing term.' },
  { term: 'IBU', definition: 'International Bitterness Units, a measure of bitterness.', preferredTranslationHint: 'Preserve IBU abbreviation.' },
  { term: 'specific gravity', definition: 'Density of wort or beer compared with water, used to estimate sugar and alcohol.', preferredTranslationHint: 'Use brewing/lab measurement term.' },
  { term: 'yeast pitch', definition: 'The act or amount of yeast added to wort.', preferredTranslationHint: 'Do not translate as throwing yeast casually.' }
];

export function formatGlossaryForPrompt(entries = BREWING_GLOSSARY) {
  return entries.map((entry) => `- ${entry.term}: ${entry.definition} Hint: ${entry.preferredTranslationHint}`).join('\n');
}

/**
 * Local brewery terminology knowledge base for Vox.
 *
 * This is intentionally lightweight and version-controlled. It is not a vector DB.
 * The backend retrieves a few relevant entries from this corpus per ASR chunk and
 * injects only those entries into the translation prompt.
 *
 * @typedef {Object} BrewingKnowledgeEntry
 * @property {string} id Stable machine-readable identifier.
 * @property {string} term Primary English term or phrase.
 * @property {string[]} aliases Common variants, abbreviations, spellings, and ASR confusions.
 * @property {string} category Broad brewery domain category.
 * @property {string} meaning Short technical meaning for translators.
 * @property {string} translationGuidance How the translator should handle the term.
 * @property {Record<string,string>} [targetHints] Optional target-language-specific hints.
 */

/** @type {BrewingKnowledgeEntry[]} */
export const BREWING_KNOWLEDGE = [
  {
    id: 'abv',
    term: 'ABV',
    aliases: ['alcohol by volume', 'a b v'],
    category: 'quality / analysis',
    meaning: 'Alcohol by volume; percentage measurement of alcohol content in beer.',
    translationGuidance: 'Preserve ABV as an abbreviation. Explain as alcohol percentage only if the phrase requires it.',
    targetHints: {
      'ja-JP': '通常は ABV を保持。必要なら「アルコール度数」を添える。',
      'ko-KR': 'ABV 약어를 유지. 필요 시 알코올 도수 의미를 보완.',
      'zh-TW': '保留 ABV；必要時表達為酒精濃度。'
    }
  },
  {
    id: 'ibu',
    term: 'IBU',
    aliases: ['international bitterness units', 'bitterness units', 'i b u'],
    category: 'quality / analysis',
    meaning: 'International Bitterness Units; analytical bitterness measurement.',
    translationGuidance: 'Preserve IBU. Do not translate as generic bitterness only.',
    targetHints: {
      'ja-JP': 'IBU を保持。「苦味単位」とだけ曖昧にしない。',
      'zh-TW': '保留 IBU，不要只譯成「苦味」。'
    }
  },
  {
    id: 'wort',
    term: 'wort',
    aliases: ['sweet wort', 'cast wort', 'knockout wort', 'work clarity', 'word clarity'],
    category: 'brewhouse',
    meaning: 'Sugar-rich liquid extracted from mash before fermentation.',
    translationGuidance: 'Use the accepted brewing term for wort, not generic juice, soup, work, or word.',
    targetHints: {
      'ja-JP': '「麦汁」を優先。ASR が work/word と誤認しても文脈上 wort なら麦汁。',
      'ko-KR': '맥즙/워트 계열의 양조 용어를 사용.',
      'zh-TW': '優先使用「麥汁」。不要譯成工作/文字。',
      'vi-VN': 'Ưu tiên thuật ngữ dịch nha / wort trong bối cảnh nấu bia.'
    }
  },
  {
    id: 'mash',
    term: 'mash',
    aliases: ['mashing', 'mash tun', 'mash temperature', 'mash rest', 'mesh temperature'],
    category: 'brewhouse',
    meaning: 'Mixture of crushed malt and hot water; process converting starches to fermentable sugars.',
    translationGuidance: 'Use brewing-specific mash terminology. Do not translate as crushing or mixing only.',
    targetHints: {
      'ja-JP': '「糖化」「マッシュ」を文脈で使い分け。mesh ではない。',
      'zh-TW': '使用糖化/麥醪相關術語，不是一般混合。'
    }
  },
  {
    id: 'lauter',
    term: 'lauter',
    aliases: ['lautering', 'lauter tun', 'lautering rate', 'lauder', 'lotter', 'loader'],
    category: 'brewhouse',
    meaning: 'Separating sweet wort from the spent grain bed after mashing.',
    translationGuidance: 'Prefer technical brewing terminology for lautering. Do not render as generic filtration only.',
    targetHints: {
      'ja-JP': '「ろ過」「ローターリング」を文脈で。loader/lotter と誤認しても lauter。',
      'zh-TW': '使用過濾/洗糟相關釀造術語，避免泛稱過濾。'
    }
  },
  {
    id: 'sparge',
    term: 'sparge',
    aliases: ['sparging', 'batch sparge', 'fly sparge', 'sparse', 'spurge'],
    category: 'brewhouse',
    meaning: 'Rinsing the grain bed with hot water to extract remaining sugars.',
    translationGuidance: 'Keep distinct from lautering; sparging is the rinse step.',
    targetHints: {
      'ja-JP': '「スパージ」「洗い湯」など。ローターリングと同一視しない。',
      'zh-TW': '與 lautering 區分；sparge 是洗糟/沖洗步驟。'
    }
  },
  {
    id: 'vorlauf',
    term: 'vorlauf',
    aliases: ['recirculation', 'mash recirculation', 'vorloff', 'vorlaufing'],
    category: 'brewhouse',
    meaning: 'Recirculating early wort until it runs clearer before collection.',
    translationGuidance: 'Treat as a specific brewing recirculation/clarification step.',
    targetHints: {
      'ja-JP': '「ヴォルラウフ」または「循環ろ過」。',
      'zh-TW': '可譯為回流/循環澄清步驟。'
    }
  },
  {
    id: 'grist',
    term: 'grist',
    aliases: ['grain bill', 'malt bill', 'grist composition'],
    category: 'raw materials',
    meaning: 'The crushed grain mixture used for a batch.',
    translationGuidance: 'Use grain/malt bill terminology. Do not translate as generic dirt or grit.'
  },
  {
    id: 'adjunct',
    term: 'adjunct',
    aliases: ['adjuncts', 'rice adjunct', 'corn adjunct', 'sugar adjunct'],
    category: 'raw materials',
    meaning: 'Fermentable ingredient other than standard malted barley, such as rice, corn, sugar, or other grains.',
    translationGuidance: 'Translate as brewing adjunct, not an assistant/person or add-on service.'
  },
  {
    id: 'mash-out',
    term: 'mash-out',
    aliases: ['mash out', 'mashout'],
    category: 'brewhouse',
    meaning: 'Raising mash temperature near the end of mashing to stop enzymatic activity and improve lautering.',
    translationGuidance: 'Keep as a brewing process step, not leaving or exiting the mash.'
  },
  {
    id: 'alpha-amylase',
    term: 'alpha amylase',
    aliases: ['α-amylase', 'alpha-amylase'],
    category: 'enzymes',
    meaning: 'Enzyme that breaks starch into dextrins; active at warmer mash rests.',
    translationGuidance: 'Preserve enzyme name accurately; do not simplify to generic enzyme if the speaker names it.'
  },
  {
    id: 'beta-amylase',
    term: 'beta amylase',
    aliases: ['β-amylase', 'beta-amylase'],
    category: 'enzymes',
    meaning: 'Enzyme that produces maltose; important for fermentability and attenuation.',
    translationGuidance: 'Preserve enzyme name accurately; distinguish from alpha amylase.'
  },
  {
    id: 'original-gravity',
    term: 'original gravity',
    aliases: ['OG', 'o g', 'starting gravity', 'initial gravity'],
    category: 'quality / analysis',
    meaning: 'Specific gravity of wort before fermentation, used to estimate fermentable extract and potential alcohol.',
    translationGuidance: 'Preserve OG if used. Translate as brewing gravity measurement, not physical gravity.'
  },
  {
    id: 'final-gravity',
    term: 'final gravity',
    aliases: ['FG', 'f g', 'terminal gravity'],
    category: 'quality / analysis',
    meaning: 'Specific gravity after fermentation, used to estimate attenuation and residual extract.',
    translationGuidance: 'Preserve FG if used. Keep distinct from original gravity.'
  },
  {
    id: 'plato',
    term: 'degrees Plato',
    aliases: ['Plato', 'degree plato', 'degrees plato', '°P', 'brix'],
    category: 'quality / analysis',
    meaning: 'Scale for dissolved extract concentration in wort/beer.',
    translationGuidance: 'Preserve Plato/°P as measurement terminology. Do not translate as the philosopher.'
  },
  {
    id: 'attenuation',
    term: 'attenuation',
    aliases: ['apparent attenuation', 'real attenuation', 'attenuate', 'attenuated'],
    category: 'fermentation',
    meaning: 'Extent to which yeast ferments sugars into alcohol and CO2.',
    translationGuidance: 'Use technical fermentation term; do not translate as weakening in a generic sense.'
  },
  {
    id: 'pitching-rate',
    term: 'pitching rate',
    aliases: ['yeast pitch', 'pitch rate', 'pitching yeast', 'cells per milliliter per plato'],
    category: 'fermentation',
    meaning: 'Amount of yeast added to wort, often expressed as cells per mL per °P.',
    translationGuidance: 'Do not translate pitch as throwing/casting casually. Use yeast inoculation/addition terminology.'
  },
  {
    id: 'flocculation',
    term: 'flocculation',
    aliases: ['flocculate', 'flocculent', 'floc', 'yeast flocculation'],
    category: 'fermentation',
    meaning: 'Yeast cells clumping and settling out of suspension.',
    translationGuidance: 'Use microbiology/brewing term for aggregation/settling, not generic precipitation only.'
  },
  {
    id: 'krausen',
    term: 'krausen',
    aliases: ['kräusen', 'high krausen', 'kroyzen', 'croisin'],
    category: 'fermentation',
    meaning: 'Foamy yeast head on fermenting beer; also related to kräusening process.',
    translationGuidance: 'Treat as brewing fermentation foam/head term; preserve German loanword if common.'
  },
  {
    id: 'diacetyl',
    term: 'diacetyl',
    aliases: ['diacetyl rest', 'buttery off flavor', 'butterscotch note'],
    category: 'sensory / off-flavors',
    meaning: 'Butter/butterscotch-like compound; often controlled by a diacetyl rest.',
    translationGuidance: 'Preserve chemical/off-flavor term. Do not reduce to generic butter unless describing sensory note.'
  },
  {
    id: 'dms',
    term: 'DMS',
    aliases: ['dimethyl sulfide', 'cooked corn', 'vegetal aroma', 'd m s'],
    category: 'sensory / off-flavors',
    meaning: 'Dimethyl sulfide; off-flavor often perceived as cooked corn or vegetal.',
    translationGuidance: 'Preserve DMS/dimethyl sulfide; include cooked-corn note only if speaker mentions sensory impact.'
  },
  {
    id: 'acetaldehyde',
    term: 'acetaldehyde',
    aliases: ['green apple', 'green apple off flavor'],
    category: 'sensory / off-flavors',
    meaning: 'Intermediate fermentation compound often perceived as green apple when excessive.',
    translationGuidance: 'Preserve chemical term when named; use green-apple note for sensory description.'
  },
  {
    id: 'oxidation',
    term: 'oxidation',
    aliases: ['oxidized', 'oxygen pickup', 'oxygen ingress', 'staling', 'cardboard note'],
    category: 'quality / packaging',
    meaning: 'Oxygen-driven staling and flavor degradation; common packaging risk.',
    translationGuidance: 'In beer context, connect oxygen pickup to staling/quality loss, not only chemical oxidation.'
  },
  {
    id: 'dissolved-oxygen',
    term: 'dissolved oxygen',
    aliases: ['DO', 'd o', 'low DO', 'oxygen pickup', 'total packaged oxygen', 'TPO'],
    category: 'quality / packaging',
    meaning: 'Oxygen dissolved in beer/wort; critical for flavor stability, especially after fermentation.',
    translationGuidance: 'Preserve DO/TPO abbreviations if used. Avoid confusing with dissolved gas generally.'
  },
  {
    id: 'hot-side-aeration',
    term: 'hot-side aeration',
    aliases: ['HSA', 'hot side aeration', 'hot-side oxygen pickup'],
    category: 'brewhouse / oxygen',
    meaning: 'Oxygen pickup on the hot side of brewing, debated but relevant for flavor stability and process control.',
    translationGuidance: 'Keep as hot-side oxygen/aeration process term; do not imply fermentation aeration.'
  },
  {
    id: 'dry-hop',
    term: 'dry-hop',
    aliases: ['dry hop', 'dry hopping', 'dry hopped', 'post-fermentation hop addition'],
    category: 'hops / aroma',
    meaning: 'Adding hops after boiling, usually during or after fermentation, for aroma and flavor.',
    translationGuidance: 'Use the accepted dry-hopping term. Do not translate literally as physically dry hops only.'
  },
  {
    id: 'hop-creep',
    term: 'hop creep',
    aliases: ['hop-creep', 'secondary fermentation from dry hop', 'dry-hop refermentation'],
    category: 'hops / fermentation',
    meaning: 'Enzymatic activity from dry hops causing further fermentation, gravity drop, or diacetyl risk.',
    translationGuidance: 'Preserve as a technical dry-hop phenomenon, not simply hops moving slowly.'
  },
  {
    id: 'biotransformation',
    term: 'biotransformation',
    aliases: ['bio transformation', 'hop biotransformation', 'thiol release'],
    category: 'hops / yeast interaction',
    meaning: 'Yeast-driven transformation of hop compounds affecting aroma, often discussed with thiols and terpenes.',
    translationGuidance: 'Use biochemical/fermentation term; do not translate as generic change.'
  },
  {
    id: 'whirlpool',
    term: 'whirlpool',
    aliases: ['whirlpooling', 'whirlpool hop', 'hop stand', 'hot steep'],
    category: 'brewhouse / hops',
    meaning: 'Post-boil vessel/process for trub separation and sometimes hop aroma extraction.',
    translationGuidance: 'Use brewery whirlpool process term, not bathtub or natural whirlpool imagery.'
  },
  {
    id: 'trub',
    term: 'trub',
    aliases: ['hot trub', 'cold trub', 'troob', 'trueb'],
    category: 'brewhouse',
    meaning: 'Protein/hop/solid sediment produced during boiling/cooling.',
    translationGuidance: 'Treat as brewing sediment/trub; preserve loanword if standard in target language.'
  },
  {
    id: 'hot-break',
    term: 'hot break',
    aliases: ['protein break', 'boil break'],
    category: 'brewhouse',
    meaning: 'Protein coagulation during wort boiling.',
    translationGuidance: 'Translate as brewing protein coagulation/break, not an equipment failure.'
  },
  {
    id: 'cold-break',
    term: 'cold break',
    aliases: ['chill haze precursors', 'cold protein break'],
    category: 'brewhouse',
    meaning: 'Protein/polyphenol precipitation during wort cooling.',
    translationGuidance: 'Translate as cold-side precipitation/break, not a pause or fracture.'
  },
  {
    id: 'brewhouse-efficiency',
    term: 'brewhouse efficiency',
    aliases: ['brew house efficiency', 'extract efficiency', 'conversion efficiency'],
    category: 'process performance',
    meaning: 'How effectively malt extract is converted and recovered into wort in the brewhouse.',
    translationGuidance: 'Use process/yield efficiency terminology, not workplace efficiency.'
  },
  {
    id: 'cip',
    term: 'CIP',
    aliases: ['clean in place', 'clean-in-place', 'c i p'],
    category: 'cleaning / sanitation',
    meaning: 'Cleaning tanks/pipes/equipment without disassembly.',
    translationGuidance: 'Preserve CIP and translate as clean-in-place; do not treat as a place/location.'
  },
  {
    id: 'caustic',
    term: 'caustic',
    aliases: ['caustic soda', 'sodium hydroxide', 'alkaline cleaner', 'caustic wash'],
    category: 'cleaning / sanitation',
    meaning: 'Alkaline brewery cleaning chemical, commonly sodium hydroxide based.',
    translationGuidance: 'In brewery context, translate as caustic/alkaline cleaner, not a caustic personality/tone.'
  },
  {
    id: 'peracetic-acid',
    term: 'peracetic acid',
    aliases: ['PAA', 'p a a', 'peroxyacetic acid', 'sanitizer'],
    category: 'cleaning / sanitation',
    meaning: 'Common no-rinse sanitizer used in breweries.',
    translationGuidance: 'Preserve PAA/peracetic acid if used. Do not confuse with acetic acid/vinegar only.'
  },
  {
    id: 'fob',
    term: 'FOB',
    aliases: ['foam on beer', 'foam-on-beer', 'fob detector'],
    category: 'cellar / packaging',
    meaning: 'Foam-on-beer device/detector used around kegging/packaging and draft operations.',
    translationGuidance: 'In brewery context, FOB may mean foam-on-beer, not freight on board. Use context.'
  }
];

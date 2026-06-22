/**
 * Shared language list for frontend and backend.
 * Keep this as the single source of truth until the client confirms the final list.
 *
 * @typedef {Object} LanguageConfig
 * @property {string} code BCP-47-ish app language code.
 * @property {string} label Native/local display label.
 * @property {string} english English label for admin and logs.
 * @property {boolean} rtl Whether the script is right-to-left.
 * @property {boolean} needsQualitySpike Whether this language should be tested explicitly before event day.
 */

/** @type {LanguageConfig[]} */
export const LANGUAGES = [
  { code: 'en-US', label: 'English', english: 'English source captions', rtl: false, needsQualitySpike: false },
  { code: 'ja-JP', label: '日本語', english: 'Japanese', rtl: false, needsQualitySpike: false },
  { code: 'ko-KR', label: '한국어', english: 'Korean', rtl: false, needsQualitySpike: false },
  { code: 'zh-CN', label: '简体中文', english: 'Simplified Chinese', rtl: false, needsQualitySpike: false },
  { code: 'zh-TW', label: '繁體中文', english: 'Traditional Chinese', rtl: false, needsQualitySpike: false },
  { code: 'th-TH', label: 'ไทย', english: 'Thai', rtl: false, needsQualitySpike: false },
  { code: 'vi-VN', label: 'Tiếng Việt', english: 'Vietnamese', rtl: false, needsQualitySpike: false },
  { code: 'id-ID', label: 'Bahasa Indonesia', english: 'Indonesian', rtl: false, needsQualitySpike: false },
  { code: 'ms-MY', label: 'Bahasa Melayu', english: 'Malay', rtl: false, needsQualitySpike: false },
  { code: 'fil-PH', label: 'Filipino', english: 'Filipino', rtl: false, needsQualitySpike: false },
  { code: 'hi-IN', label: 'हिन्दी', english: 'Hindi', rtl: false, needsQualitySpike: false },
  { code: 'km-KH', label: 'ខ្មែរ', english: 'Khmer', rtl: false, needsQualitySpike: true },
  { code: 'lo-LA', label: 'ລາວ', english: 'Lao', rtl: false, needsQualitySpike: true },
  { code: 'my-MM', label: 'မြန်မာ', english: 'Burmese', rtl: false, needsQualitySpike: true },
  { code: 'mn-MN', label: 'Монгол', english: 'Mongolian', rtl: false, needsQualitySpike: true }
];

export function findLanguage(code) {
  return LANGUAGES.find((language) => language.code === code) || LANGUAGES[0];
}

export function isSupportedLanguage(code, includeSourceCaptions = true) {
  if (!includeSourceCaptions && code === 'en-US') return false;
  return LANGUAGES.some((language) => language.code === code);
}

export function getTargetLanguages(includeSourceCaptions = true) {
  return includeSourceCaptions ? LANGUAGES : LANGUAGES.filter((language) => language.code !== 'en-US');
}

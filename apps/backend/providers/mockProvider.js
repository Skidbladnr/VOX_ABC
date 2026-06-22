import { findLanguage } from '../../../shared/contracts/languages.js';

const PREFIX = {
  'ja-JP': '【日本語】',
  'ko-KR': '【한국어】',
  'zh-CN': '【简中】',
  'zh-TW': '【繁中】',
  'th-TH': '【ไทย】',
  'vi-VN': '【Tiếng Việt】',
  'id-ID': '【Indonesia】',
  'ms-MY': '【Melayu】',
  'fil-PH': '【Filipino】',
  'hi-IN': '【हिन्दी】',
  'km-KH': '【ខ្មែរ】',
  'lo-LA': '【ລາວ】',
  'my-MM': '【မြန်မာ】',
  'mn-MN': '【Монгол】'
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockTranslationProvider {
  constructor() {
    this.name = 'mock';
  }

  async *translate({ sourceText, sourceLanguage = 'en-US', targetLanguage }) {
    const language = findLanguage(targetLanguage);
    const prefix = PREFIX[language.code] || `[${language.english}]`;
    const fake = language.code === sourceLanguage ? sourceText : `${prefix} ${sourceText}`;
    const chunks = fake.match(/.{1,10}(\s|$)|.{1,10}/gu) || [fake];
    for (const chunk of chunks) {
      await sleep(55 + Math.floor(Math.random() * 45));
      yield chunk;
    }
  }
}

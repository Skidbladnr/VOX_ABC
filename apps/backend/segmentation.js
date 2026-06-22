const HARD_BOUNDARY = /[.!?。！？]\s*$/u;
const SOFT_BOUNDARY = /[,;:、，；：]\s*$/u;

function normalizeSpeechText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:、。！？，；：])/gu, '$1')
    .trim();
}

function findLastWordBreak(text, minIndex) {
  for (let index = text.length - 1; index >= minIndex; index -= 1) {
    if (/\s/u.test(text[index])) return index;
  }
  return -1;
}

/**
 * Phrase-level segmentation buffer for finalized ASR text.
 *
 * v1 intentionally does not translate unconfirmed ASR partials. Partial events are
 * stored for operator visibility and optional flush, but only final/forced events
 * emit translation units. This follows the current Vox spec's v1 stance: avoid
 * speculative translation flicker until we have real ASR revision data.
 */
export class PhraseSegmenter {
  constructor({ minChars = 24, softMaxChars = 115, maxChars = 175, dedupeWindowMs = 1800 } = {}) {
    this.minChars = minChars;
    this.softMaxChars = softMaxChars;
    this.maxChars = maxChars;
    this.dedupeWindowMs = dedupeWindowMs;
    this.counter = 0;
    this.partialText = '';
    this.lastInputAt = 0;
    this.lastFinalText = '';
    this.lastFinalAt = 0;
  }

  /**
   * @param {{ text: string, isFinal?: boolean, forceFlush?: boolean, sourceLanguage?: string, timestamp?: number, eventId?: string, source?: string }} event
   * @returns {Array<{ segmentId: string, sourceText: string, sourceLanguage: string, isFinal: boolean, createdAt: number, asrEventId?: string, source?: string }>}
   */
  push(event) {
    const now = Number(event?.timestamp) || Date.now();
    const text = normalizeSpeechText(event?.text);
    if (!text) return [];

    this.lastInputAt = now;

    if (!event?.isFinal && !event?.forceFlush) {
      this.partialText = text;
      return [];
    }

    this.partialText = '';

    // Browser and cloud ASR providers sometimes resend the same finalized phrase
    // after a pause. Do not pay to translate exact duplicates.
    if (text === this.lastFinalText && now - this.lastFinalAt < this.dedupeWindowMs) {
      return [];
    }

    this.lastFinalText = text;
    this.lastFinalAt = now;

    return this.#buildUnits({
      text,
      sourceLanguage: event.sourceLanguage || 'en-US',
      createdAt: now,
      asrEventId: event.eventId,
      source: event.source
    });
  }

  /**
   * Converts the current interim partial into a final translation unit.
   * This is useful when an operator stops the browser mic before the browser emits
   * a final SpeechRecognition result.
   */
  flushPartial({ sourceLanguage = 'en-US', timestamp = Date.now(), source = 'flush' } = {}) {
    const text = normalizeSpeechText(this.partialText);
    if (!text) return [];
    return this.push({ text, isFinal: true, forceFlush: true, sourceLanguage, timestamp, source });
  }

  #buildUnits({ text, sourceLanguage, createdAt, asrEventId, source }) {
    const chunks = this.#splitIntoPhraseChunks(text);
    return chunks.map((sourceText) => {
      this.counter += 1;
      return {
        segmentId: `seg-${createdAt}-${this.counter}`,
        sourceText,
        sourceLanguage,
        isFinal: true,
        createdAt,
        asrEventId,
        source
      };
    });
  }

  #splitIntoPhraseChunks(text) {
    const words = text.split(/\s+/u).filter(Boolean);
    const chunks = [];
    let buffer = '';

    const flush = () => {
      const chunk = normalizeSpeechText(buffer);
      if (chunk) chunks.push(chunk);
      buffer = '';
    };

    for (const word of words) {
      buffer = buffer ? `${buffer} ${word}` : word;

      if (HARD_BOUNDARY.test(buffer) && buffer.length >= this.minChars) {
        flush();
        continue;
      }

      if (SOFT_BOUNDARY.test(buffer) && buffer.length >= this.softMaxChars * 0.65) {
        flush();
        continue;
      }

      if (buffer.length >= this.maxChars) {
        const breakAt = findLastWordBreak(buffer, Math.floor(this.maxChars * 0.55));
        if (breakAt > 0) {
          const head = normalizeSpeechText(buffer.slice(0, breakAt));
          const tail = normalizeSpeechText(buffer.slice(breakAt + 1));
          if (head) chunks.push(head);
          buffer = tail;
        } else {
          flush();
        }
      }
    }

    flush();
    return chunks;
  }

  snapshot() {
    return {
      partialText: this.partialText,
      lastInputAt: this.lastInputAt,
      lastFinalAt: this.lastFinalAt,
      emittedSegments: this.counter
    };
  }
}

/**
 * Vox shared WebSocket contracts.
 * These JSDoc typedefs are the app's frontend/backend contract. Change message shapes here first.
 *
 * @typedef {'subscribe'|'ping'} ClientMessageType
 * @typedef {'hello'|'caption'|'status'|'slide'|'health'|'pong'|'error'} ServerMessageType
 *
 * @typedef {Object} ClientSubscribeMessage
 * @property {'subscribe'} type
 * @property {string} language
 *
 * @typedef {Object} ClientPingMessage
 * @property {'ping'} type
 * @property {number} timestamp
 *
 * @typedef {ClientSubscribeMessage|ClientPingMessage} ClientMessage
 *
 * @typedef {Object} CaptionMessage
 * @property {'caption'} type
 * @property {string} sessionId
 * @property {string} segmentId
 * @property {string} language
 * @property {boolean} isFinal
 * @property {string} text
 * @property {number} timestamp
 * @property {number} latencyMs
 * @property {string} provider
 *
 * @typedef {Object} StatusMessage
 * @property {'status'} type
 * @property {string} sessionId
 * @property {string} language
 * @property {'connected'|'reconnecting'|'degraded'|'offline'} status
 * @property {string} detail
 * @property {number} timestamp
 *
 * @typedef {Object} HelloMessage
 * @property {'hello'} type
 * @property {string} sessionId
 * @property {string} language
 * @property {number} timestamp
 * @property {number} connectionCount
 *
 * @typedef {Object} SlideMessage
 * @property {'slide'} type
 * @property {string} sessionId
 * @property {string} language
 * @property {number} index
 * @property {number} total
 * @property {string} title
 * @property {string} body
 * @property {string} imageLabel
 * @property {number} timestamp
 *
 * @typedef {Object} HealthLanguageMetric
 * @property {string} language
 * @property {number} clients
 * @property {number} translatedSegments
 * @property {number} errors
 * @property {number|null} lastLatencyMs
 * @property {'idle'|'active'|'degraded'|'offline'} status
 *
 * @typedef {Object} HealthMessage
 * @property {'health'} type
 * @property {string} sessionId
 * @property {number} timestamp
 * @property {number} totalClients
 * @property {string} provider
 * @property {HealthLanguageMetric[]} languages
 *
 * @typedef {CaptionMessage|StatusMessage|HelloMessage|SlideMessage|HealthMessage} ServerMessage
 */

export const SERVER_MESSAGE_TYPES = new Set(['hello', 'caption', 'status', 'slide', 'health', 'pong', 'error']);
export const CLIENT_MESSAGE_TYPES = new Set(['subscribe', 'ping']);

export function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isClientMessage(value) {
  if (!value || typeof value !== 'object') return false;
  if (!CLIENT_MESSAGE_TYPES.has(value.type)) return false;
  if (value.type === 'subscribe') return typeof value.language === 'string';
  if (value.type === 'ping') return typeof value.timestamp === 'number';
  return false;
}

export function isCaptionMessage(value) {
  return Boolean(
    value &&
      value.type === 'caption' &&
      typeof value.sessionId === 'string' &&
      typeof value.segmentId === 'string' &&
      typeof value.language === 'string' &&
      typeof value.isFinal === 'boolean' &&
      typeof value.text === 'string' &&
      typeof value.timestamp === 'number'
  );
}

export function encodeMessage(message) {
  return JSON.stringify(message);
}

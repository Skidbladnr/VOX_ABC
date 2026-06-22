export const HTTP_BASE = import.meta.env.VITE_BACKEND_HTTP_URL || 'http://localhost:8787';
export const WS_BASE = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8787/ws';

export async function getJson(path) {
  const response = await fetch(`${HTTP_BASE}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
  return response.json();
}

export async function postJson(path, body = {}) {
  const response = await fetch(`${HTTP_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`POST ${path} failed: ${response.status}`);
  return response.json();
}

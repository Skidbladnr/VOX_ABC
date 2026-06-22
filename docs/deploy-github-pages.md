# Deploying Vox ABC frontend to GitHub Pages

GitHub Pages should host only the static React/PWA frontend. The Vox backend is a Node/WebSocket server and must run somewhere else, such as Railway, Fly.io, Render, or a VPS.

## Required repository variables

In GitHub, open:

Settings → Secrets and variables → Actions → Variables

Add:

```text
VITE_BASE_PATH=/vox-abc/
VITE_BACKEND_HTTP_URL=https://YOUR-BACKEND-HOST.example.com
VITE_BACKEND_WS_URL=wss://YOUR-BACKEND-HOST.example.com/ws
```

Use `/` for `VITE_BASE_PATH` only if the site is served from a custom domain or a root user/org Pages site such as `https://USERNAME.github.io/`.

For a normal project site such as `https://USERNAME.github.io/vox-abc/`, use `/vox-abc/`.

## Enable Pages

Open:

Settings → Pages → Build and deployment → Source → GitHub Actions

Then push to `main`. The workflow `.github/workflows/pages.yml` will build `apps/frontend/dist` and publish it.

## Backend requirement

The deployed frontend must use HTTPS/WSS backend URLs. Browser microphone access and requests from an HTTPS GitHub Pages frontend will not work reliably against a plain `http://` backend URL.

Local development can still use:

```text
VITE_BACKEND_HTTP_URL=http://localhost:8787
VITE_BACKEND_WS_URL=ws://localhost:8787/ws
```

Production should use:

```text
VITE_BACKEND_HTTP_URL=https://...
VITE_BACKEND_WS_URL=wss://.../ws
```

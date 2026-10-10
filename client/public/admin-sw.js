/* GTYF admin service worker: makes the admin installable and keeps the app shell
   available on a flaky connection. It never caches API data, so figures are always live. */
const SHELL = 'gtyf-admin-shell-v1';
const OFFLINE_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#F4F6F9;color:#0B1422;text-align:center;padding:24px"><div><h1 style="font-size:1.5rem">You’re offline</h1><p>Check your connection, then pull down to try again.</p></div>`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.add('/200.html')).catch(() => undefined).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Only the admin pages themselves: network first, saved shell when offline.
  if (req.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(SHELL).then((c) => c.put('/200.html', res.clone()));
          return res;
        })
        .catch(async () => (await caches.match('/200.html')) || new Response(OFFLINE_HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })),
    );
  }
});

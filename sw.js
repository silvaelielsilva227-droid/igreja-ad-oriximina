/* Service worker: deixa o site instalável e abre mais rápido.
   Estratégia "rede primeiro": sempre tenta a versão mais nova; sem internet usa o cache. */
const CACHE = 'ad-oriximina-v3';
const BASICO = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/firebase-config.js', 'img/logo.png', 'img/igreja.jpg', 'img/emblema.png', 'img/icons/icon-192.png', 'img/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICO)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Firebase e fontes: direto na rede
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {}); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

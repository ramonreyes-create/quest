const CACHE = 'deutschquest-3-0-1';
const ASSETS = ['./','./index.html?v=3.0.1','./css/styles.css?v=3.0.1','./js/app.js?v=3.0.1','./data/content.json?v=3.0.1','./manifest.json?v=3.0.1'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });

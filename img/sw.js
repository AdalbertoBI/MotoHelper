const CACHE_NAME = 'motohelper-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/mapa.js',
  '/img/icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;
      if (!navigator.onLine) {
        return new Response('Você está offline. Conecte-se à internet para usar o MotoHelper.', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
      return fetch(e.request);
    })
  );
});
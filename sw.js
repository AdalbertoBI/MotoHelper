const CACHE_NAME = 'motoca-br-v2.2';
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css?v=2.2',
    '/mapa.js?v=2.2',
    '/script.js?v=2.2',
    '/frete.js?v=2.2',
    '/financeiro.js?v=2.2',
    '/manifest.json',
    '/img/icon-192x192.png'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando versão 2.2');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Armazenando arquivos em cache');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Ativando versão 2.2');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
            .catch(() => {
                return caches.match('/index.html');
            })
    );
});
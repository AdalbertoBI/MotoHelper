const CACHE_NAME = 'motoca-br-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/script.js',
    '/mapa.js',
    '/frete.js',
    '/pesquisa.js',
    '/financeiro.js',
    '/sos.js',
    '/img/icon-192x192.png',
    '/img/icon-512x512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
    console.log('[sw.js] Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[sw.js] Cache aberto, adicionando arquivos...');
            return cache.addAll(urlsToCache).catch(err => {
                console.error('[sw.js] Erro ao adicionar arquivos ao cache:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[sw.js] Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[sw.js] Deletando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('[sw.js] Cache antigo limpo.');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    console.log('[sw.js] Fetch:', event.request.url);
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                console.log('[sw.js] Servindo do cache:', event.request.url);
                return response;
            }
            console.log('[sw.js] Buscando na rede:', event.request.url);
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                    console.log('[sw.js] Armazenado no cache:', event.request.url);
                });
                return networkResponse;
            }).catch(err => {
                console.error('[sw.js] Erro na busca:', err);
                return caches.match('/index.html');
            });
        })
    );
});
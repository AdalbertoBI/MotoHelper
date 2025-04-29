const CACHE_NAME = 'motoca-br-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/mapa.js',
    '/frete.js',
    '/pesquisa.js',
    '/financeiro.js',
    '/sos.js',
    '/manifest.json',
    '/img/icon-192x192.png',
    '/img/icon-512x512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    console.log('[sw.js] Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[sw.js] Cache aberto:', CACHE_NAME);
            return cache.addAll(urlsToCache);
        }).catch(error => {
            console.error('[sw.js] Erro ao abrir cache:', error);
        })
    );
    self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    console.log('[sw.js] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[sw.js] Removendo cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('[sw.js] Service Worker ativado.');
            return self.clients.claim();
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isApiRequest = url.pathname.includes('/api/') || url.hostname.includes('nominatim.openstreetmap.org') || 
                         url.hostname.includes('graphhopper.com') || url.hostname.includes('overpass-api.de');

    if (event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse && !isApiRequest) {
                console.log('[sw.js] Retornando do cache:', event.request.url);
                return cachedResponse;
            }

            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                    console.log('[sw.js] Cache atualizado:', event.request.url);
                });

                return networkResponse;
            }).catch(error => {
                console.error('[sw.js] Erro na requisição:', error);
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline: Conteúdo não disponível.', { status: 503 });
            });
        })
    );
});
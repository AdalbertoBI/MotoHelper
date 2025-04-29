const CACHE_NAME = 'motoca-br-cache-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/financeiro.js',
    '/mapa.js',
    '/frete.js',
    '/pesquisa.js',
    '/sos.js',
    '/manifest.json',
    '/img/icon-192x192.png',
    '/img/icon-512x512.png'
];

// Modo de depuração (desativar em produção)
const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };
const errorLog = console.error.bind(console);

// Evento de instalação
self.addEventListener('install', event => {
    log('[sw.js] Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                log('[sw.js] Cache aberto, armazenando arquivos...');
                return cache.addAll(urlsToCache)
                    .catch(error => {
                        errorLog('[sw.js] Falha ao armazenar em cache:', error);
                    });
            })
            .then(() => {
                log('[sw.js] Service Worker instalado com sucesso.');
                return self.skipWaiting();
            })
    );
});

// Evento de ativação
self.addEventListener('activate', event => {
    log('[sw.js] Ativando Service Worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        log('[sw.js] Removendo cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            log('[sw.js] Service Worker ativado.');
            return self.clients.claim();
        })
    );
});

// Evento de fetch
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;

    event.respondWith(
        // Priorizar cache (offline-first)
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    log('[sw.js] Servindo do cache:', url.pathname);
                    return cachedResponse;
                }

                log('[sw.js] Buscando na rede:', url.pathname);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Verificar se a resposta é válida para cache
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // Cache dinâmico para recursos válidos (mesmo de terceiros)
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                                log('[sw.js] Armazenado no cache:', url.pathname);
                            })
                            .catch(error => {
                                errorLog('[sw.js] Erro ao armazenar no cache:', error);
                            });

                        return networkResponse;
                    })
                    .catch(error => {
                        errorLog('[sw.js] Erro na requisição:', url.pathname, error);
                        return new Response('Erro de rede. Verifique sua conexão.', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});
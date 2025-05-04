const CACHE_NAME = 'motocabr-cache-v5'; // Incrementado para v5 para forçar atualização
const urlsToCache = [
    '/MotocaBR/',
    '/MotocaBR/index.html',
    '/MotocaBR/style.css',
    '/MotocaBR/script.js',
    '/MotocaBR/mapa.js',
    '/MotocaBR/frete.js',
    '/MotocaBR/financeiro.js',
    '/MotocaBR/manifest.json',
    '/MotocaBR/img/icon-192x192.png',
    '/MotocaBR/img/icon-512x512.png',
    '/MotocaBR/img/icon-144x144.png',
    '/MotocaBR/img/icon-96x96.png'
];

// Instala o Service Worker e armazena arquivos em cache
self.addEventListener('install', event => {
    console.log('[sw.js] Instalando Service Worker...');
    self.skipWaiting(); // Força o Service Worker a ativar imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[sw.js] Cache aberto:', CACHE_NAME);
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.error(`[sw.js] Erro ao adicionar ${url} ao cache:`, err);
                        });
                    })
                );
            })
            .catch(err => {
                console.error('[sw.js] Erro ao abrir o cache:', err);
            })
    );
});

// Ativa o Service Worker e remove caches antigos
self.addEventListener('activate', event => {
    console.log('[sw.js] Ativando Service Worker...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[sw.js] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[sw.js] Service Worker ativado com sucesso.');
            return self.clients.claim(); // Assume o controle das páginas imediatamente
        })
    );
});

// Intercepta requisições e retorna recursos do cache, se disponíveis
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[sw.js] Retornando do cache:', event.request.url);
                    return response;
                }
                console.log('[sw.js] Buscando na rede:', event.request.url);
                return fetch(event.request).then(fetchResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                }).catch(() => {
                    console.warn('[sw.js] Falha na rede, retornando fallback:', event.request.url);
                    return caches.match('/MotocaBR/index.html');
                });
            })
    );
});
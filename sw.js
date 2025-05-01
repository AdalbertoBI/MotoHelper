const CACHE_NAME = 'motocabr-cache-v4'; // Alterado para v4 para forçar atualização
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
    self.skipWaiting(); // Força o Service Worker a ativar imediatamente
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.error(`Erro ao adicionar ${url} ao cache:`, err);
                        });
                    })
                );
            })
            .catch(err => {
                console.error('Erro ao abrir o cache:', err);
            })
    );
});

// Ativa o Service Worker e remove caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Intercepta requisições e retorna recursos do cache, se disponíveis
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(() => {
                    // Fallback para quando a requisição falhar (offline)
                    return caches.match('/MotocaBR/index.html');
                });
            })
    );
});
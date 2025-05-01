const CACHE_NAME = 'motocabr-cache-v3'; // Alterado para v3 para forçar atualização
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/mapa.js',
    '/frete.js',
    '/financeiro.js'
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
                    return caches.match('/index.html');
                });
            })
    );
});
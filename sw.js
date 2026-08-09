const CACHE_NAME = 'code39-cache-v2'; // Mudamos para v2 para forçar o celular a atualizar

// Apenas arquivos locais do seu próprio repositório
const localUrlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png', // Lembre-se de subir os ícones para o GitHub
  './icon-512.png'
];

// Instalação instantânea
self.addEventListener('install', event => {
  self.skipWaiting(); // Força o Service Worker a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Arquivos locais em cache');
        // Usamos catch para não travar a instalação se faltar algum ícone
        return cache.addAll(localUrlsToCache).catch(err => console.log('Erro ao fazer cache local:', err));
      })
  );
});

// Limpa caches antigos (o v1 que falhou)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégia de Cache Dinâmico
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam padrão (como extensões)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Se o arquivo já está no cache, devolve ele na hora (mesmo sem internet)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Se não está no cache (ex: fontes do FontAwesome, Tailwind CDN), busca na internet
      return fetch(event.request).then(networkResponse => {
        // Se a resposta for inválida, apenas a retorna
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // 3. Salva uma cópia no cache para a próxima vez que faltar internet
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Se falhar (sem internet e arquivo não está no cache), ignora silenciosamente.
        console.log('Modo offline restrito. Arquivo não disponível no cache:', event.request.url);
      });
    })
  );
});

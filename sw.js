// Driven Dashboard - Service Worker
// Cachuje statické súbory pre offline prístup

const CACHE_NAME = 'driven-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

// Install - nacacheuj statické súbory
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES.map(url => new Request(url, { cache: 'reload' })))
        .catch(() => {
          // Ignoruj chyby - niektoré súbory nemusia existovať
        });
    })
  );
  self.skipWaiting();
});

// Activate - vyčisti staré cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - cache first pre statické, network first pre API
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Apps Script API volania - vždy network (potrebujeme čerstvé dáta)
  if (url.includes('script.google.com')) {
    return; // Nezasahuj, nechaj prejsť cez network
  }
  
  // Statické súbory - cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache new requests
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline - vrať čo máme
        return caches.match('./index.html');
      });
    })
  );
});

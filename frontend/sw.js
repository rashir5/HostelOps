// SPIT Hostel Ops — Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'spit-hostel-ops-v12';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/register.html',
  '/css/spit.css',
  '/css/dashboard.css',
  '/js/api.js',
  '/js/pwa-installer.js',
  '/assets/spit_logo.png',
  '/assets/favicon.png',
  '/assets/app_icon_192.png',
  '/assets/app_icon_512.png',
  '/assets/app_icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache pre-fetch non-fatal warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pass all API requests directly to the network
  if (e.request.url.includes('/api/')) {
    return;
  }

  // Network-first with cache fallback for static app assets
  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        return networkRes;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});

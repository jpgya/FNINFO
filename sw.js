self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('app-cache').then((cache) => {
      return cache.addAll([
        './v1/index.html',
        './v1/styles.css',
        './v1/script.js',
        './a0970552-2c0e-4f72-8761-16c3ba8a4f17.png',
        './index.html'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

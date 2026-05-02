const CACHE_NAME = 'circode-v1';
const ASSETS = [
    './',
    './index.html',
    './docs.html',
    './styles.css',
    './app.js',
    './icon-192.png',
    './icon-512.png',
    'https://docs.opencv.org/4.8.0/opencv.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Space+Mono:wght@400;700&display=swap'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => response || fetch(e.request))
    );
});

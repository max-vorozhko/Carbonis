// Сервіс-воркер Carbonis BBQ: швидкий запуск з іконки на екрані й робота без інтернету (калькулятор і гра; рейтинг — лише онлайн).
// Сторінки беремо з мережі, а якщо її немає — з кешу; решту файлів — з кешу з оновленням у фоні.
// Firebase, шрифти Google і статистика йдуть повз кеш (інші домени).
const CACHE = 'carbonis-bbq-v3';
const CORE = [
  './', 'index.html', 'calculator/', 'calculator/index.html', 'guide/', 'guide/index.html', 'game/', 'game/index.html',
  'js/common.js', 'manifest.webmanifest', 'assets/fonts/fonts.css',
  'assets/fonts/unbounded-cyrillic-wght-normal.woff2', 'assets/fonts/unbounded-latin-wght-normal.woff2',
  'assets/fonts/golos-text-cyrillic-wght-normal.woff2', 'assets/fonts/golos-text-latin-wght-normal.woff2',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-64.png', 'assets/icons/badge.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Сторінка: спершу мережа (оновлення приходять одразу), без мережі — збережена копія
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Скрипти, картинки, маніфест: з кешу, а в фоні оновлюємо
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

// Kinh Thánh Mỗi Ngày — service worker
// Precache the app shell only. Bible text loads per-book (data/bible/<id>.json)
// and other data JSON are cached on first fetch (cache-first), so install
// never risks failing on a big file.
var CACHE = 'hkt-v6';
var SHELL = [
  './',
  'index.html',
  'doc.html',
  'tim-kiem.html',
  'ke-hoach.html',
  'suy-ngam.html',
  'chu-de.html',
  'danh-dau.html',
  'tu-ngu.html',
  'style.css',
  'app.js',
  'favicon.svg',
  'manifest.json',
  'data/books.json',
  'data/notes.json',
  'data/topics.json',
  'data/giaoly.json',
  'data/nhanvat.json',
  'data/prayers.json',
  'data/parables.json',
  'data/names.json',
  'data/prophecies.json',
  'data/creeds.json',
  'data/glossary.json',
  'thu-vien.html',
  'giao-ly.html',
  'nhan-vat.html',
  'ban-do.html',
  'chuyen-de.html',
  'tien-tri.html',
  'tin-dieu.html',
  'thuat-ngu.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave third-party alone

  e.respondWith(
    caches.match(req, { ignoreSearch: false }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // Cache successful same-origin responses (incl. data/*.json) for offline use.
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // Offline: try the same page ignoring query/hash (chapter deep-links),
        // then fall back to the home page for navigations.
        return caches.match(req, { ignoreSearch: true }).then(function (page) {
          if (page) return page;
          if (req.mode === 'navigate') return caches.match('index.html');
          throw new Error('offline');
        });
      });
    })
  );
});

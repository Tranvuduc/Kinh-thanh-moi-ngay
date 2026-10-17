/* Kinh Thánh Mỗi Ngày — shared helpers (app.js) */
(function () {
  'use strict';

  var jsonCache = {};

  /** Fetch JSON once and memoize (returns a Promise). */
  function loadJSON(url) {
    if (jsonCache[url]) return jsonCache[url];
    var p = fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
    jsonCache[url] = p;
    return p;
  }

  /**
   * Strip Vietnamese diacritics for accent-insensitive search.
   * NOTE: length-preserving for Vietnamese (NFD removes combining marks only,
   * đ→d is 1:1), so indexes into the normalized string map to the original.
   */
  function normalizeVN(s) {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /** 1-based day of year (Jan 1 => 1). */
  function dayOfYear(d) {
    d = d || new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 864e5);
  }

  /** Format "Sáng Thế Ký 1:1" — needs the bible array. */
  function fmtRef(books, bookIdx, ch, v) {
    if (!books || !books[bookIdx]) return '';
    return books[bookIdx].name + ' ' + ch + ':' + v;
  }

  /** Format a plan segment: "Sáng Thế Ký 1–4" or "Sáng Thế Ký 1". */
  function fmtSeg(books, seg) {
    var name = books[seg.b] ? books[seg.b].name : '';
    if (seg.c1 === seg.c2) return name + ' ' + seg.c1;
    return name + ' ' + seg.c1 + '–' + seg.c2;
  }

  /* ---------- bible data (per-book lazy loading) ---------- */
  /** Book metadata: [{id,name,t,nc:[verse counts per chapter]}] (~6KB). */
  function loadBooks() {
    return loadJSON('data/books.json');
  }
  /** Full book text: {id,name,t,ch:[[verses]...]}. Memoized per book. */
  function loadBook(id) {
    return loadJSON('data/bible/' + id + '.json');
  }

  /* ---------- theme (light/dark, stored in localStorage) ---------- */
  var THEME_KEY = 'hkt-theme';

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      var label = b.querySelector('.theme-label');
      if (label) label.textContent = t === 'dark' ? '☀️ Sáng' : '🌙 Tối';
    });
  }

  function currentTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark' : 'light';
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }

  function initTheme() {
    applyTheme(currentTheme());
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      if (!b.dataset.wired) {
        b.dataset.wired = '1';
        b.addEventListener('click', toggleTheme);
      }
    });
  }

  /* ---------- localStorage helpers ---------- */
  function storeGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function storeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /** Parse ?b= &c= query params into {b, c} with sane defaults. */
  function readChapterParams() {
    var q = new URLSearchParams(window.location.search);
    var b = parseInt(q.get('b'), 10);
    var c = parseInt(q.get('c'), 10);
    if (!isFinite(b) || b < 0) b = null;
    if (!isFinite(c) || c < 1) c = null;
    return { b: b, c: c };
  }

  window.HKT = {
    loadJSON: loadJSON,
    loadBooks: loadBooks,
    loadBook: loadBook,
    normalizeVN: normalizeVN,
    dayOfYear: dayOfYear,
    fmtRef: fmtRef,
    fmtSeg: fmtSeg,
    initTheme: initTheme,
    toggleTheme: toggleTheme,
    storeGet: storeGet,
    storeSet: storeSet,
    readChapterParams: readChapterParams
  };
})();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

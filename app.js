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

  /* ---------- verse marks: bookmarks, highlights, personal notes ---------- */
  var MARKS_KEY = 'hkt-marks';
  var HL_COLORS = ['yellow', 'green', 'blue', 'pink'];

  function getMarks() {
    var m = storeGet(MARKS_KEY, null);
    if (!m || typeof m !== 'object') m = {};
    if (!m.bm) m.bm = {};
    if (!m.hl) m.hl = {};
    if (!m.nt) m.nt = {};
    return m;
  }
  function saveMarks(m) { storeSet(MARKS_KEY, m); }

  /** Canonical verse key: "joh:3:16". */
  function verseKey(bookId, c, v) { return bookId + ':' + c + ':' + v; }

  /** "joh:3:16" -> {b: bookIndex, c, v} using the books array. */
  function keyToIndices(books, key) {
    var p = (key || '').split(':');
    var bi = -1;
    if (books) books.forEach(function (bk, i) { if (bk.id === p[0]) bi = i; });
    return { b: bi, c: parseInt(p[1], 10) || 1, v: parseInt(p[2], 10) || 1 };
  }

  /** "joh:3:16" -> "Giăng 3:16" using the books array. */
  function keyToRef(books, key) {
    var k = keyToIndices(books, key);
    if (k.b < 0 || !books[k.b]) return key;
    return books[k.b].name + ' ' + k.c + ':' + k.v;
  }

  /* ---------- cross references (data/xref/<bookId>.json, lazy) ---------- */
  var xrefCache = {};
  function loadXref(bookId) {
    if (xrefCache[bookId]) return xrefCache[bookId];
    var p = loadJSON('data/xref/' + bookId + '.json').catch(function () { return {}; });
    xrefCache[bookId] = p;
    return p;
  }

  /* ---------- audio: read aloud via the device's own speech engine ----------
     Free, on-device, no downloads. Parts are spoken one by one so the UI
     can highlight each part as it is read. */
  function speakSequence(parts, onPart, onDone, onError) {
    var synth = window.speechSynthesis;
    if (!synth || !parts || !parts.length) return null;
    try { synth.getVoices(); } catch (e) {} // prime voice list
    var ctrl = { stopped: false, i: 0 };
    function viVoice() {
      try {
        var vs = synth.getVoices() || [];
        for (var i = 0; i < vs.length; i++) {
          if (vs[i].lang && vs[i].lang.toLowerCase().indexOf('vi') === 0) return vs[i];
        }
      } catch (e) {}
      return null;
    }
    var vv = viVoice();
    function next() {
      if (ctrl.stopped) return;
      if (ctrl.i >= parts.length) {
        ctrl.stopped = true;
        if (onDone) onDone();
        return;
      }
      var idx = ctrl.i;
      var u = new SpeechSynthesisUtterance(parts[idx]);
      u.lang = 'vi-VN';
      u.rate = 0.95;
      if (vv) u.voice = vv;
      u.onend = function () { if (ctrl.stopped) return; ctrl.i++; next(); };
      // NB: synth.cancel() fires 'error' (interrupted/canceled) in Chrome —
      // a user-initiated stop must NOT be treated as "finished" (no onDone).
      u.onerror = function () {
        if (ctrl.stopped) return;
        ctrl.stopped = true;
        if (onError) { try { onError(); } catch (e) {} }
      };
      if (onPart) { try { onPart(idx); } catch (e) {} }
      synth.speak(u);
    }
    ctrl.stop = function () {
      ctrl.stopped = true;
      try { synth.cancel(); } catch (e) {}
    };
    try { synth.cancel(); } catch (e) {}
    next();
    return ctrl;
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
    readChapterParams: readChapterParams,
    getMarks: getMarks,
    saveMarks: saveMarks,
    verseKey: verseKey,
    keyToIndices: keyToIndices,
    keyToRef: keyToRef,
    loadXref: loadXref,
    HL_COLORS: HL_COLORS,
    speakSequence: speakSequence
  };
})();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

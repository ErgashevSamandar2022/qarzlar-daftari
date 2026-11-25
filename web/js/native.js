/* native.js: telefon ilovasi (Capacitor) bilan aloqa qatlami. Oddiy brauzerda hech narsa qilmaydi.
   - Q.store: ma'lumotni ilova ichidagi SQLite bazaga yozadi (localStorage bilan birga, zaxira sifatida).
   - Q.native.saveFile: faylni saqlash yoki ulashish oynasi (Excel, PDF, zaxira).
   - Q.native.onBack: Android "orqaga" tugmasi.
   Plaginlar Capacitor.registerPlugin orqali nomi bilan chaqiriladi, shuning uchun alohida yig'ish (bundler) kerak emas. */
(function (Q) {
  'use strict';
  var CAP = window.Capacitor, N = {}, cache = {};
  N.isNative = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());
  N.platform = CAP && CAP.getPlatform ? CAP.getPlatform() : 'web';
  N.plugin = function (name) {
    if (!N.isNative) return null;
    if (cache[name]) return cache[name];
    /* Capacitor ish vaqtida bundlersiz: registerPlugin bo'lmasa, native ko'prik bergan Plugins ishlatiladi */
    var p = typeof CAP.registerPlugin === 'function' ? CAP.registerPlugin(name) : (CAP.Plugins && CAP.Plugins[name]);
    if (!p) throw new Error('Plagin topilmadi: ' + name);
    return (cache[name] = p);
  };

  /* ---------- baza ---------- */
  var KEY = 'qarzlar-daftari-v3', DBN = 'qarzlar', mem = null, sq = null, engine = 'localStorage', err = '', wt = 0, ready = null;
  function lsGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* xotira to'la yoki yopiq */ } }
  function base() { return { database: DBN, readonly: false }; }
  function put(k, v) { return sq.run({ database: DBN, statement: 'INSERT OR REPLACE INTO kv (k, v, t) VALUES (?, ?, ?);', values: [k, v, new Date().toISOString()], transaction: false, readonly: false }); }
  function get(k) {
    return sq.query({ database: DBN, statement: 'SELECT v FROM kv WHERE k = ?;', values: [k], readonly: false }).then(function (r) {
      var row = r && r.values && r.values.filter(function (x) { return x && x.v != null; })[0]; return row ? row.v : null;
    });
  }
  function flush() { if (sq && mem) put('state', mem).catch(function (e) { err = String(e && e.message || e); }); }

  var store = {
    /* ilova ishga tushishdan oldin bir marta chaqiriladi */
    init: function () {
      if (ready) return ready;
      mem = lsGet();
      ready = !N.isNative ? Promise.resolve() : (function () {
        try { N.plugin('CapacitorSQLite'); } catch (e0) { err = String(e0.message || e0); return Promise.resolve(); }
        var stuck = new Promise(function (res) { setTimeout(function () { if (engine !== 'sqlite') { err = err || 'SQLite 6 soniyada javob bermadi'; sq = null; } res(); }, 6000); });
        var work = (function () {
        try { sq = N.plugin('CapacitorSQLite'); } catch (e) { err = String(e && e.message || e); sq = null; return Promise.resolve(); }
        return Promise.resolve()
          .then(function () { return sq.createConnection({ database: DBN, version: 1, encrypted: false, mode: 'no-encryption', readonly: false }).catch(function () { /* bor bo'lsa, davom etamiz */ }); })
          .then(function () { return sq.open(base()); })
          .then(function () { return sq.execute({ database: DBN, statements: 'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL, t TEXT);', transaction: false, readonly: false }); })
          .then(function () { return get('state'); })
          .then(function (row) {
            /* baza ustuvor; bo'sh bo'lsa, eski (localStorage) ma'lumot bazaga ko'chiriladi */
            if (row) mem = row; else if (mem) return put('state', mem);
          })
          .then(function () { engine = 'sqlite'; return store.daily(); })
          .catch(function (e) { err = String(e && e.message || e); sq = null; engine = 'localStorage'; });
        })();
        return Promise.race([work, stuck]);
      })();
      return ready;
    },
    read: function () { return mem; },
    write: function (json) {
      mem = json; lsSet(json);
      if (sq) { clearTimeout(wt); wt = setTimeout(flush, 250); }
    },
    flush: function () { clearTimeout(wt); flush(); },
    info: function () { return { engine: engine, error: err }; },
    /* har kuni birinchi ochilishda kechagi holat nusxasi saqlanadi, 7 kun turadi */
    daily: function () {
      var U = Q.utils, day = 'snap:' + U.today(), old = 'snap:' + U.addDays(U.today(), -7);
      return get(day).then(function (v) { if (!v && mem) return put(day, mem); })
        .then(function () { return sq.run({ database: DBN, statement: "DELETE FROM kv WHERE k LIKE 'snap:%' AND k < ?;", values: [old], transaction: false, readonly: false }); });
    },
    snapshots: function () {
      if (!sq) return Promise.resolve([]);
      return sq.query({ database: DBN, statement: "SELECT k, v FROM kv WHERE k LIKE 'snap:%' ORDER BY k DESC;", values: [], readonly: false }).then(function (r) {
        return ((r && r.values) || []).filter(function (x) { return x && x.k; }).map(function (x) { return { day: x.k.slice(5), raw: x.v }; });
      }).catch(function () { return []; });
    },
    /* baza ishlayotganini tekshiradi: yozadi, o'qiydi, o'chiradi */
    test: function () {
      if (!sq) return Promise.resolve({ ok: false, msg: err || 'SQLite faqat telefon ilovasida bor' });
      var t = String(Date.now());
      return put('test', t).then(function () { return get('test'); }).then(function (v) {
        return sq.run({ database: DBN, statement: "DELETE FROM kv WHERE k = 'test';", values: [], transaction: false, readonly: false }).then(function () { return { ok: v === t, msg: v === t ? '' : 'Yozilgan qiymat qaytmadi' }; });
      }).catch(function (e) { return { ok: false, msg: String(e && e.message || e) }; });
    }
  };
  Q.store = store;
  document.addEventListener('visibilitychange', function () { if (document.hidden) store.flush(); });
  window.addEventListener('pagehide', function () { store.flush(); });

  /* ---------- fayl saqlash / ulashish ---------- */
  function toB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = function () { rej(r.error); }; r.readAsDataURL(blob);
    });
  }
  N.saveFile = function (name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    if (!N.isNative) {
      try { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); return Promise.resolve(true); }
      catch (e) { return Promise.resolve(false); }
    }
    return N.hold(toB64(blob).then(function (b64) { return N.plugin('Filesystem').writeFile({ path: name, data: b64, directory: 'CACHE' }); })
      .then(function (r) { return N.plugin('Share').share({ title: name, url: r.uri, dialogTitle: 'Faylni saqlang yoki yuboring' }); })
      .then(function () { return true; })
      .catch(function (e) { return /cancel/i.test(String(e && e.message || e)); }));
  };

  /* ---------- orqaga tugmasi ---------- */
  N.onBack = function (fn) {
    if (!N.isNative) return;
    var App = N.plugin('App');
    App.addListener('backButton', function () {
      if (fn()) return;
      if (App.minimizeApp) App.minimizeApp().catch(function () { App.exitApp(); }); else App.exitApp();
    });
  };

  /* holat paneli rangi ilova fonidan olinadi (yorug' yoki qorong'i) */
  N.bars = function () {
    if (!N.isNative) return;
    try {
      var c = getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255], hex = '#' + c.slice(0, 3).map(function (x) { return ('0' + Number(x).toString(16)).slice(-2); }).join('');
      var dark = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 128, SB = N.plugin('StatusBar');
      SB.setBackgroundColor({ color: hex }).catch(function () {}); SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(function () {});
    } catch (e) { /* muhim emas */ }
  };
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { setTimeout(N.bars, 50); }); } catch (e) { /* eski brauzer */ } }
  /* klaviatura ochilganda maydon ko'rinib turishi uchun */
  document.addEventListener('focusin', function (e) {
    var t = e.target; if (!N.isNative || !t.matches || !t.matches('input, textarea, select')) return;
    setTimeout(function () { try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* yo'q */ } }, 350);
  });

  /* tizim oynalari (ulashish, ruxsat) ochilganda ilova "chiqib ketdi" deb hisoblanmasin */
  var held = 0, heldUntil = 0;
  N.hold = function (pr) { held++; return Promise.resolve(pr).then(function (v) { held--; heldUntil = Date.now() + 1500; return v; }, function (e) { held--; heldUntil = Date.now() + 1500; throw e; }); };
  N.held = function () { return held > 0 || Date.now() < heldUntil; };
  Q.native = N;
})(window.QD = window.QD || {});

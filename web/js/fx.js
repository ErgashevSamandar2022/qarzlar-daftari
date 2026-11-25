/* fx.js: valyuta kurslari (so'm, dollar, yevro).
   Internet bo'lsa Markaziy bankdan yangilanadi, bo'lmasa oxirgi saqlangan kurs ishlatiladi.
   Kursni qo'lda o'zgartirish mumkin, qo'lda kiritilgani Markaziy bank kursidan ustun turadi. */
(function (Q) {
  'use strict';
  var U = Q.utils, F = { busy: false, failed: false };
  var URL = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/';

  function fx() { return Q.db.state().fx; }
  function toIso(s) { var p = String(s || '').split('.'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : ''; }

  /* 1 birlik valyuta necha so'm: qo'lda kiritilgan bo'lsa shu, bo'lmasa saqlangan Markaziy bank kursi */
  F.rate = function (c) {
    if (c === 'UZS') return 1;
    var f = fx(), m = f.manual && f.manual[c];
    return m > 0 ? m : (f.rates[c] || 0);
  };
  F.cbuRate = function (c) { return c === 'UZS' ? 1 : (fx().rates[c] || 0); };
  F.convert = function (a, from, to) {
    if (from === to) return a;
    var rf = F.rate(from), rt = F.rate(to);
    return rt ? a * rf / rt : a;
  };
  F.isManual = function () { var m = fx().manual || {}; return m.USD > 0 || m.EUR > 0; };
  F.status = function () {
    var f = fx(), d = f.date ? U.short(f.date) : '';
    if (F.busy) return { tone: 'busy', text: 'Kurs yangilanmoqda...' };
    if (F.isManual()) return { tone: 'manual', text: "Qo'lda kiritilgan kurs" };
    if (F.failed) return { tone: 'off', text: "Internet yo'q. Oxirgi saqlangan kurs · " + d };
    return { tone: 'ok', text: 'Markaziy bank · ' + d };
  };

  F.setManual = function (usd, eur) {
    var f = fx();
    f.manual = { USD: usd > 0 ? usd : 0, EUR: eur > 0 ? eur : 0 };
    Q.db.save();
  };
  F.clearManual = function () { fx().manual = { USD: 0, EUR: 0 }; Q.db.save(); };

  /* Markaziy bankdan olish. Muvaffaqiyatli bo'lsa true, bo'lmasa false (eski kurs saqlanib qoladi). */
  F.refresh = function () {
    if (F.busy) return Promise.resolve(false);
    F.busy = true;
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(URL, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (list) {
        var f = fx(), got = false;
        list.forEach(function (x) {
          if (x.Ccy === 'USD' || x.Ccy === 'EUR') {
            var v = Number(String(x.Rate).replace(',', '.')) / (Number(x.Nominal) || 1);
            if (v > 0) { f.rates[x.Ccy] = v; f.date = toIso(x.Date) || f.date; got = true; }
          }
        });
        if (!got) throw new Error('empty');
        f.fetchedAt = new Date().toISOString();
        F.failed = false; Q.db.save();
        return true;
      })
      .catch(function () { F.failed = true; return false; })
      .then(function (ok) { clearTimeout(timer); F.busy = false; return ok; });
  };

  Q.fx = F;
})(window.QD = window.QD || {});

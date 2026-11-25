/* db.js: baza qatlami. Hozir brauzer xotirasida (localStorage) saqlaydi.
   Boshqa ilovalar faqat shu fayldagi funksiyalar orqali ma'lumot oladi va yozadi.
   Keyin React Native'ga o'tilganda faqat shu fayl SQLite uchun almashtiriladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, KEY = 'qarzlar-daftari-v3', S = null;

  /* fx: valyuta kurslari (1 birlik = necha so'm), manual: qo'lda kiritilgan kurslar */
  /* birinchi ishga tushganda internet bo'lmasa ishlatiladigan Markaziy bank kursi (20-noyabr 2026) */
  function blankFx() { return { rates: { USD: 12004.48, EUR: 13155.71 }, date: '2026-11-20', fetchedAt: '', manual: { USD: 0, EUR: 0 } }; }
  function blank() {
    return { profile: { name: '', cur: 'UZS', lead: 3, theme: 'system', pin: null, autoLock: 5, times: ['09:00', '15:00', '21:00'], tpl: {}, lastBackup: '', welcomed: false }, fx: blankFx(), debts: [], entries: [], reminders: [], messages: [], recurring: [], sample: false };
  }
  /* saqlangan matnni tekshirib, yangi tuzilishga keltiradi; yaroqsiz bo'lsa null */
  function parse(r) {
    try {
      if (!r) return null;
      var o = JSON.parse(r), b = blank();
      if (!o || !Array.isArray(o.debts)) return null;
      /* eski o'rnatilgan nusxalarda xush kelibsiz oynasi bo'lmagan: ularga ko'rsatilmaydi */
      if (o.profile && o.profile.welcomed === undefined) o.profile.welcomed = true;
      o.profile = Object.assign(b.profile, o.profile || {});
      o.fx = Object.assign(b.fx, o.fx || {});
      o.fx.rates = Object.assign({ USD: 12000, EUR: 13000 }, o.fx.rates || {});
      o.fx.manual = Object.assign({ USD: 0, EUR: 0 }, o.fx.manual || {});
      ['entries', 'reminders', 'messages'].forEach(function (k) { o[k] = o[k] || []; });
      o.recurring = o.recurring || [];
      o.entries.forEach(migrateEntry);
      o.reminders.forEach(function (r) { r.kind = r.kind || 'personal'; r.repeat = r.repeat || 'none'; r.time = r.time || ''; r.note = r.note || ''; });
      return o;
    } catch (e) { return null; }
  }
  function load() { return parse(Q.store ? Q.store.read() : (function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } })()); }
  /* eski yozuvlar (category matni) yangi tuzilishga o'tkaziladi: type + src/cat + other */
  var OLD = { 'maosh': 'oylik', "qo'shimcha daromad": 'qoshimcha', 'oziq-ovqat': 'bozorlik', 'transport': 'transport', 'kommunal': 'kommunal' };
  function migrateEntry(e) {
    if (e.src || e.cat) return;
    var c = String(e.category || '').trim(), k = OLD[c.toLowerCase()];
    if (e.type === 'in') e.src = k || 'boshqa'; else e.cat = k || 'boshqa';
    if (!k && c) e.other = c;
    delete e.category;
  }
  function save() {
    var j; try { j = JSON.stringify(S); } catch (e) { return; }
    if (Q.store) Q.store.write(j); else { try { localStorage.setItem(KEY, j); } catch (e2) { /* xotira yopiq bo'lsa, sessiya davomida ishlaydi */ } }
    if (Q.notify) Q.notify.sync();
  }

  function C() { return Q.calc; }
  var DB = {
    init: function () {
      S = load();
      /* eski namuna ma'lumotlar bog'lanishsiz edi: yangisiga almashtiriladi (kurslar va profil saqlanadi) */
      if (S && S.sample && S.v !== 6) { var n = Q.seed(); n.fx = S.fx; n.profile = S.profile; S = n; }
      if (!S) S = blank();
      S.profile = Object.assign(blank().profile, S.profile || {});
      S.recurring = S.recurring || []; S.v = 6; save(); return S;
    },
    state: function () { return S; },
    setProfile: function (patch) { Object.assign(S.profile, patch); save(); return S.profile; },
    /* zaxira nusxa: PIN kodi fayl ichiga yozilmaydi */
    exportData: function () {
      var p = Object.assign({}, S.profile); delete p.pin;
      return { app: 'qarzlar-daftari', version: 6, at: new Date().toISOString(), data: { profile: p, fx: S.fx, debts: S.debts, entries: S.entries, reminders: S.reminders, messages: S.messages, recurring: S.recurring } };
    },
    /* tekshiradi va qisqacha ma'lumot qaytaradi; xato bo'lsa null */
    checkBackup: function (o) {
      if (!o || o.app !== 'qarzlar-daftari' || !o.data || !Array.isArray(o.data.debts) || !Array.isArray(o.data.entries)) return null;
      return { debts: o.data.debts.length, entries: o.data.entries.length, reminders: (o.data.reminders || []).length, messages: (o.data.messages || []).length, at: o.at || '' };
    },
    importData: function (o) {
      var keep = S.profile, d = o.data, n = blank();
      n.debts = d.debts; n.entries = d.entries; n.reminders = d.reminders || []; n.messages = d.messages || [];
      n.fx = Object.assign(n.fx, d.fx || {}); n.sample = false; n.v = 6; n.recurring = d.recurring || [];
      n.profile = Object.assign(n.profile, d.profile || {}, { pin: keep.pin, autoLock: keep.autoLock });
      n.entries.forEach(migrateEntry);
      n.reminders.forEach(function (r) { r.kind = r.kind || 'personal'; r.repeat = r.repeat || 'none'; r.time = r.time || ''; r.note = r.note || ''; });
      S = n; save();
    },
    save: save,
    /* birinchi ochilish: namuna ma'lumot bilan boshlash (ism va valyuta saqlanadi) */
    startSample: function () {
      var n = Q.seed(); n.fx = S.fx; n.profile = Object.assign(blank().profile, S.profile, { welcomed: true }); S = n; save();
    },
    /* avtomatik nusxadan tiklash (PIN o'zgarmaydi) */
    restoreRaw: function (raw) {
      var o = parse(raw); if (!o) return false;
      o.profile.pin = S.profile.pin; o.profile.autoLock = S.profile.autoLock; o.profile.welcomed = true;
      S = o; save(); return true;
    },

    /* qarzlar */
    addDebt: function (d) { d.id = d.id || U.uid(); d.payments = d.payments || []; S.debts.push(d); save(); return d; },
    updateDebt: function (id, patch) { var d = S.debts.filter(function (x) { return x.id === id; })[0]; if (d) { Object.assign(d, patch); save(); } return d; },
    /* qarz o'chsa, unga bog'langan kirim-chiqim yozuvlari qoladi, faqat bog'lanish uziladi */
    removeDebt: function (id) {
      S.debts = S.debts.filter(function (x) { return x.id !== id; });
      S.entries.forEach(function (e) { if (e.link && e.link.debtId === id) delete e.link; });
      save();
    },
    addPayment: function (id, p) {
      var d = S.debts.filter(function (x) { return x.id === id; })[0];
      if (d) { p.id = p.id || U.uid(); d.payments.push(p); save(); }
      return d;
    },

    /* kirim-chiqim */
    addEntry: function (e) { e.id = e.id || U.uid(); S.entries.push(e); save(); return e; },
    entry: function (id) { return S.entries.filter(function (x) { return x.id === id; })[0]; },
    /* bog'lanish: opts.newDebt (yangi qarz yaratadi) yoki opts.payDebtId + opts.payAmount (qarz valyutasida) */
    addCash: function (e, opts) {
      opts = opts || {};
      if (opts.newDebt) {
        var d = DB.addDebt(opts.newDebt);
        e.link = { debtId: d.id, made: true };
      } else if (opts.payDebtId) {
        var p = { id: U.uid(), amount: opts.payAmount, date: e.date, note: 'Kirim-chiqimdan' };
        DB.addPayment(opts.payDebtId, p);
        e.link = { debtId: opts.payDebtId, paymentId: p.id };
      }
      return DB.addEntry(e);
    },
    /* yozuvni tahrirlash: qarz bilan bog'langan bo'lsa, qarz yoki to'lov ham yangilanadi */
    updateEntry: function (id, patch, opts) {
      var e = DB.entry(id); if (!e) return null; opts = opts || {};
      Object.assign(e, patch);
      var d = e.link ? DB.debt(e.link.debtId) : null;
      if (d && e.link.made) {
        Object.assign(d, { amount: e.amount, cur: e.cur, date: e.date, person: e.who, phone: e.phone, tg: e.tg, note: e.note });
        if (opts.due !== undefined) { d.due = opts.due; d.termV = ''; }
      } else if (d && e.link.paymentId) {
        d.payments.forEach(function (p) { if (p.id === e.link.paymentId) { p.amount = opts.payAmount; p.date = e.date; } });
      }
      save(); return e;
    },
    /* Qarzlarim yoki Haqlarim ichida qo'shilgan qarzni kirim-chiqimga ham yozish */
    logDebt: function (d) {
      var owe = d.type === 'owe', e = { type: owe ? 'in' : 'out', amount: d.amount, cur: d.cur, date: d.date, who: d.person, phone: d.phone || '', tg: d.tg || '', place: '', other: '', note: d.note || '', link: { debtId: d.id, made: true } };
      e[owe ? 'src' : 'cat'] = owe ? 'qarz_olish' : 'qarz_berish';
      return DB.addEntry(e);
    },
    /* qarz tahrirlansa, uni yaratgan kirim-chiqim yozuvi ham yangilanadi */
    syncDebtEntry: function (d) {
      S.entries.forEach(function (e) {
        if (e.link && e.link.made && e.link.debtId === d.id) { e.amount = d.amount; e.cur = d.cur; e.date = d.date; e.who = d.person; e.phone = d.phone || ''; e.tg = d.tg || ''; }
      });
      save();
    },
    /* yozuv o'chsa: u yaratgan qarz ham o'chadi, to'lov bo'lsa qarzdan ayriladi */
    removeEntry: function (id) {
      var e = DB.entry(id);
      if (e && e.link) {
        if (e.link.made) { S.debts = S.debts.filter(function (x) { return x.id !== e.link.debtId; }); S.entries.forEach(function (x) { if (x.id !== id && x.link && x.link.debtId === e.link.debtId) delete x.link; }); }
        else if (e.link.paymentId) { var d = DB.debt(e.link.debtId); if (d) d.payments = d.payments.filter(function (p) { return p.id !== e.link.paymentId; }); }
      }
      S.entries = S.entries.filter(function (x) { return x.id !== id; });
      save();
    },

    /* eslatmalar */
    addReminder: function (r) { r.id = r.id || U.uid(); r.done = !!r.done; r.kind = r.kind || 'personal'; r.repeat = r.repeat || 'none'; S.reminders.push(r); save(); return r; },
    reminder: function (id) { return S.reminders.filter(function (x) { return x.id === id; })[0]; },
    updateReminder: function (id, patch) { var r = DB.reminder(id); if (r) { Object.assign(r, patch); save(); } return r; },
    removeReminder: function (id) { S.reminders = S.reminders.filter(function (x) { return x.id !== id; }); save(); },
    /* bajarildi: takrorlanuvchi bo'lsa keyingi sanaga o'tadi, tug'ilgan kun shu yil uchun yopiladi */
    completeReminder: function (id) {
      var r = DB.reminder(id); if (!r) return null;
      if (r.kind === 'birthday') r.doneYear = Number(C().birthdayNext(r).slice(0, 4));
      else if (r.repeat && r.repeat !== 'none') r.date = C().advance(r);
      else r.done = true;
      save(); return r;
    },
    reopenReminder: function (id) { var r = DB.reminder(id); if (r) { r.done = false; save(); } return r; },

    /* doimiy to'lovlar: har oy bir kunda kirim yoki chiqim yozuvi o'zi paydo bo'ladi */
    recs: function () { return S.recurring; },
    rec: function (id) { return S.recurring.filter(function (x) { return x.id === id; })[0]; },
    addRec: function (r) { r.id = r.id || U.uid(); r.active = r.active !== false; S.recurring.push(r); save(); return r; },
    updateRec: function (id, patch) { var r = DB.rec(id); if (r) { Object.assign(r, patch); save(); } return r; },
    removeRec: function (id) { S.recurring = S.recurring.filter(function (x) { return x.id !== id; }); save(); },
    /* muddati kelgan yozuvlarni yaratadi (ilova ochilganda ishlaydi); nechta yozuv yaratilganini qaytaradi */
    runRecurring: function () {
      var t = U.today(), made = 0;
      S.recurring.forEach(function (r) {
        var guard = 0;
        while (r.active && r.next && r.next <= t && guard++ < 36) {
          if (r.end && r.next > r.end) { r.active = false; break; }
          var debt = r.debtId ? DB.debt(r.debtId) : null;
          if (r.key === 'qarz_tolash' && r.debtId && (!debt || C().isClosed(debt))) { r.active = false; r.paused = 'debt'; break; }
          var e = { type: r.type, amount: r.amount, cur: r.cur, date: r.next, who: r.who || '', phone: '', tg: '', place: '', other: r.key === 'boshqa' ? (r.other || '') : '', note: r.note || '', rec: r.id };
          e[r.type === 'in' ? 'src' : 'cat'] = r.key;
          if (debt) DB.addCash(e, { payDebtId: debt.id, payAmount: Math.min(C().rem(debt), Math.round(Q.fx.convert(r.amount, r.cur, debt.cur) * 100) / 100) });
          else DB.addEntry(e);
          r.last = r.next; r.next = C().recAfter(r.next, r.day); made++;
        }
      });
      if (made) save();
      return made;
    },

    /* xabarlar */
    updateMessage: function (id, patch) { S.messages.forEach(function (m) { if (m.id === id) Object.assign(m, patch); }); save(); },
    removeMessage: function (id) { S.messages = S.messages.filter(function (m) { return m.id !== id; }); save(); },
    addMessage: function (m) { m.id = m.id || U.uid(); m.at = m.at || new Date().toISOString(); S.messages.unshift(m); S.messages = S.messages.slice(0, 200); save(); return m; },

    /* tizim */
    clearSample: function () { S.debts = []; S.entries = []; S.reminders = []; S.messages = []; S.recurring = []; S.sample = false; save(); },
    debt: function (id) { return S.debts.filter(function (x) { return x.id === id; })[0]; },
    resetAll: function () { var fx = S.fx, pr = S.profile; S = blank(); S.fx = fx; S.profile = pr; S.v = 6; save(); }
  };

  Q.db = DB;
})(window.QD = window.QD || {});

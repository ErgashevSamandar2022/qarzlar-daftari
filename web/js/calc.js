/* calc.js: hisob-kitob. Holat (S) argument sifatida beriladi, DOM ishlatilmaydi.
   Valyuta almashtirish uchun faqat Q.fx.convert chaqiriladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = {};

  C.paid = function (d) { return d.payments.reduce(function (a, p) { return a + p.amount; }, 0); };
  C.rem = function (d) { return Math.max(0, d.amount - C.paid(d)); };
  C.isClosed = function (d) { return C.rem(d) < 0.005; };
  C.daysTo = function (due) { return U.diff(due, U.today()); };

  /* type: 'owed' = haqlarim (menga qarzdor), 'owe' = qarzlarim (men qarzdorman) */
  C.openDebts = function (S, type) {
    return S.debts.filter(function (d) { return d.type === type && !C.isClosed(d); });
  };
  /* har bir valyutadagi qoldiq (almashtirilmagan) */
  C.totals = function (S, type) {
    var o = { UZS: 0, USD: 0, EUR: 0 };
    C.openDebts(S, type).forEach(function (d) { o[d.cur] += C.rem(d); });
    return o;
  };
  /* hammasi bitta valyutada (kurs bo'yicha) */
  C.totalIn = function (S, type, cur) {
    return C.openDebts(S, type).reduce(function (a, d) { return a + Q.fx.convert(C.rem(d), d.cur, cur); }, 0);
  };
  C.mixed = function (S, type, cur) {
    return C.openDebts(S, type).some(function (d) { return d.cur !== cur; });
  };
  C.people = function (S, type) {
    var m = {};
    C.openDebts(S, type).forEach(function (d) { m[d.person.trim().toLowerCase()] = 1; });
    return Object.keys(m).length;
  };
  C.overdueCount = function (S, type) {
    return C.openDebts(S, type).filter(function (d) { return d.due && C.daysTo(d.due) < 0; }).length;
  };
  /* qaytarilgan ulush (yopilganlar ham hisobga olinadi), tanlangan valyutada */
  C.repaid = function (S, type, cur) {
    var paid = 0, total = 0;
    S.debts.forEach(function (d) {
      if (d.type !== type) return;
      paid += Q.fx.convert(Math.min(C.paid(d), d.amount), d.cur, cur);
      total += Q.fx.convert(d.amount, d.cur, cur);
    });
    return { paid: paid, total: total, pct: total ? Math.round(paid / total * 100) : 0 };
  };
  C.topOpen = function (S, type, n) {
    return C.openDebts(S, type).sort(function (a, b) {
      var x = a.due || '9999-12-31', y = b.due || '9999-12-31';
      return x < y ? -1 : x > y ? 1 : 0;
    }).slice(0, n);
  };

  /* ---------- kirim va chiqim turlari ----------
     Qarz bilan bog'liq turlar (qarz_*) foyda hisobiga kirmaydi: qarz olish daromad emas,
     qarz berish esa xarajat emas, pul qaytib kelishi mumkin. */
  C.SRC = [['oylik', 'Oylik'], ['biznes', 'Biznes daromadi'], ['qoshimcha', "Qo'shimcha daromad"], ['sovga', "Sovg'a yoki yordam"],
    ['qarz_olish', 'Qarz olish'], ['qarz_qaytdi', 'Berilgan qarz qaytdi'], ['boshqa', 'Boshqa']];
  C.CAT = [['bozorlik', 'Bozorlik'], ['kommunal', 'Kommunal'], ['transport', 'Transport'], ['kiyim', 'Kiyim-kechak'], ['talim', "Ta'lim"],
    ['texnika', 'Texnika'], ['xomashyo', 'Xomashyo'], ['qarz_berish', 'Qarz berish'], ['qarz_tolash', "Qarzni to'lash"], ['boshqa', 'Boshqa']];
  var DEBT_KEYS = ['qarz_olish', 'qarz_qaytdi', 'qarz_berish', 'qarz_tolash'];
  C.key = function (e) { return e.type === 'in' ? e.src : e.cat; };
  C.isDebtFlow = function (e) { return DEBT_KEYS.indexOf(C.key(e)) >= 0; };
  C.label = function (e) {
    var list = e.type === 'in' ? C.SRC : C.CAT, k = C.key(e), l = list.filter(function (x) { return x[0] === k; })[0];
    if (k === 'boshqa' && e.other) return e.other;
    return l ? l[1] : 'Boshqa';
  };
  C.labelOf = function (type, k) {
    var l = (type === 'in' ? C.SRC : C.CAT).filter(function (x) { return x[0] === k; })[0];
    return l ? l[1] : 'Boshqa';
  };
  C.ym = function (off) { var d = new Date(); d = new Date(d.getFullYear(), d.getMonth() + (off || 0), 1); return d.getFullYear() + '-' + U.pad(d.getMonth() + 1); };
  C.monthEntries = function (S, ym) {
    return S.entries.filter(function (e) { return e.date.slice(0, 7) === ym; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); });
  };
  /* bir oyning yig'indisi: jami kirim/chiqim, foyda (qarzsiz), qarz harakati, turlar bo'yicha */
  C.cashSummary = function (S, ym, cur) {
    var o = { inc: 0, out: 0, net: 0, incOp: 0, outOp: 0, profit: 0, borrowed: 0, repaid: 0, lent: 0, gotBack: 0, byIn: {}, byOut: {}, nIn: 0, nOut: 0 };
    C.monthEntries(S, ym).forEach(function (e) {
      var v = Q.fx.convert(e.amount, e.cur, cur), k = C.key(e), dbt = C.isDebtFlow(e);
      if (e.type === 'in') { o.inc += v; o.nIn++; o.byIn[k] = (o.byIn[k] || 0) + v; if (!dbt) o.incOp += v; }
      else { o.out += v; o.nOut++; o.byOut[k] = (o.byOut[k] || 0) + v; if (!dbt) o.outOp += v; }
      if (k === 'qarz_olish') o.borrowed += v; else if (k === 'qarz_tolash') o.repaid += v;
      else if (k === 'qarz_berish') o.lent += v; else if (k === 'qarz_qaytdi') o.gotBack += v;
    });
    o.net = o.inc - o.out; o.profit = o.incOp - o.outOp;
    return o;
  };
  C.mixedEntries = function (S, ym, cur) { return C.monthEntries(S, ym).some(function (e) { return e.cur !== cur; }); };

  /* oylik hisobot: daromad - xarajat (qarz harakatlari hisobga olinmaydi), tanlangan valyutada */
  C.monthlyReport = function (S, n, cur) {
    var now = new Date(), rows = [], i;
    for (i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      rows.push({ key: d.getFullYear() + '-' + U.pad(d.getMonth() + 1), m: d.getMonth(), label: U.MS[d.getMonth()], inc: 0, out: 0, net: 0 });
    }
    S.entries.forEach(function (e) {
      if (C.isDebtFlow(e)) return;
      var k = e.date.slice(0, 7), v = Q.fx.convert(e.amount, e.cur, cur);
      rows.forEach(function (r) { if (r.key === k) { if (e.type === 'in') r.inc += v; else r.out += v; } });
    });
    rows.forEach(function (r) { r.net = r.inc - r.out; });
    return rows;
  };

  /* ---------- doimiy to'lovlar (har oy) ---------- */
  function monthDay(y, m, day) { return y + '-' + U.pad(m + 1) + '-' + U.pad(Math.min(day, new Date(y, m + 1, 0).getDate())); }
  /* boshlanish sanasidan keyingi birinchi to'lov kuni */
  C.recFirst = function (start, day) {
    var d = U.parse(start), x = monthDay(d.getFullYear(), d.getMonth(), day);
    return x >= start ? x : monthDay(d.getFullYear(), d.getMonth() + 1, day);
  };
  C.recAfter = function (date, day) { var d = U.parse(date); return monthDay(d.getFullYear(), d.getMonth() + 1, day); };
  /* aktiv doimiy to'lovlarning oylik yig'indisi (tanlangan valyutada) */
  C.recMonthly = function (S, cur) {
    var o = { inc: 0, out: 0, n: 0, mixed: false };
    (S.recurring || []).forEach(function (r) {
      if (!r.active) return; o.n++; if (r.cur !== cur) o.mixed = true;
      var v = Q.fx.convert(r.amount, r.cur, cur); if (r.type === 'in') o.inc += v; else o.out += v;
    });
    return o;
  };

  /* ---------- qaytarish ehtimoli: Haqlarimdagi har bir odam bo'yicha ----------
     Faqat muddati bor qarzlar hisoblanadi: yopilgan (muddatida yoki kechikib) va hozir muddati o'tib turgan.
     Ball = (o'z vaqtida qaytgan + 1) / (baholangan + 2): tarix kam bo'lsa ball o'rtacha atrofida turadi.
     Kechikkan kunlar ballni 30 gacha kamaytiradi. */
  C.lastPay = function (d) { return d.payments.reduce(function (m, p) { return p.date > m ? p.date : m; }, ''); };
  C.TRUST = { good: ['Ishonchli', 'done'], mid: ["O'rtacha", 'warn'], bad: ['Kechiktiradi', 'bad'], none: ["Tarix yo'q", ''] };
  C.trustAll = function (S) {
    var m = {}, t = U.today();
    S.debts.forEach(function (d) {
      if (d.type !== 'owed') return;
      var k = d.person.trim().toLowerCase(), o = m[k] || (m[k] = { key: k, person: d.person.trim(), debts: 0, closed: 0, n: 0, onTime: 0, late: 0, overdue: 0, lateDays: 0, open: 0 });
      o.debts++;
      var cl = C.isClosed(d);
      if (cl) o.closed++; else o.open++;
      if (!d.due) return;
      if (cl) {
        var fin = C.lastPay(d) || d.date, ld = U.diff(fin, d.due);
        o.n++; if (ld <= 0) o.onTime++; else { o.late++; o.lateDays += ld; }
      } else if (d.due < t) { var od = U.diff(t, d.due); o.n++; o.late++; o.overdue++; o.lateDays += od; }
    });
    return Object.keys(m).map(function (k) {
      var o = m[k];
      if (!o.n) { o.score = null; o.level = 'none'; return o; }
      var avg = o.late ? o.lateDays / o.late : 0;
      o.avgLate = Math.round(avg);
      o.score = Math.max(0, Math.min(100, Math.round((o.onTime + 1) / (o.n + 2) * 100 - Math.min(30, avg * .8))));
      o.level = o.score >= 75 ? 'good' : o.score >= 50 ? 'mid' : 'bad';
      return o;
    }).sort(function (a, b) { return (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score) || a.person.localeCompare(b.person); });
  };
  C.trustOf = function (S, person) {
    var k = String(person || '').trim().toLowerCase();
    return C.trustAll(S).filter(function (x) { return x.key === k; })[0] || null;
  };

  /* ---------- yillik hisobot (qarz harakatlari foydaga kirmaydi) ---------- */
  C.yearReport = function (S, year, cur) {
    var months = [], i, o = { year: year, months: months, inc: 0, out: 0, profit: 0, byIn: {}, byOut: {}, borrowed: 0, repaid: 0, lent: 0, gotBack: 0, n: 0, mixed: false, best: null, worst: null };
    for (i = 0; i < 12; i++) months.push({ m: i, label: U.MS[i], inc: 0, out: 0, net: 0, n: 0 });
    S.entries.forEach(function (e) {
      if (e.date.slice(0, 4) !== String(year)) return;
      var v = Q.fx.convert(e.amount, e.cur, cur), k = C.key(e), mo = months[Number(e.date.slice(5, 7)) - 1];
      o.n++; mo.n++; if (e.cur !== cur) o.mixed = true;
      if (k === 'qarz_olish') o.borrowed += v; else if (k === 'qarz_tolash') o.repaid += v; else if (k === 'qarz_berish') o.lent += v; else if (k === 'qarz_qaytdi') o.gotBack += v;
      if (C.isDebtFlow(e)) return;
      if (e.type === 'in') { mo.inc += v; o.inc += v; o.byIn[k] = (o.byIn[k] || 0) + v; } else { mo.out += v; o.out += v; o.byOut[k] = (o.byOut[k] || 0) + v; }
    });
    months.forEach(function (m) {
      m.net = m.inc - m.out;
      if (!m.n) return;
      if (!o.best || m.net > o.best.net) o.best = m;
      if (!o.worst || m.net < o.worst.net) o.worst = m;
    });
    o.profit = o.inc - o.out;
    o.active = months.filter(function (m) { return m.n; }).length;
    o.avg = o.active ? o.profit / o.active : 0;
    return o;
  };
  C.years = function (S) {
    var y = {}, cy = new Date().getFullYear(); y[cy] = 1;
    S.entries.forEach(function (e) { y[e.date.slice(0, 4)] = 1; });
    return Object.keys(y).map(Number).sort();
  };

  /* ---------- eslatmalar: shaxsiy, tug'ilgan kun, boshqa; takrorlanuvchi bo'lishi mumkin ---------- */
  C.REM_KINDS = { personal: 'Shaxsiy', birthday: "Tug'ilgan kun", other: 'Boshqa' };
  C.REPEATS = [['none', 'Bir marta'], ['daily', 'Har kuni'], ['weekly', 'Har hafta'], ['monthly', 'Har oy'], ['yearly', 'Har yil']];
  C.repeatLabel = function (k) { var l = C.REPEATS.filter(function (x) { return x[0] === k; })[0]; return l ? l[1] : ''; };
  function addPeriod(date, rep) {
    var d = U.parse(date), day = d.getDate();
    if (rep === 'daily') return U.addDays(date, 1);
    if (rep === 'weekly') return U.addDays(date, 7);
    if (rep === 'monthly') { d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return U.iso(d); }
    if (rep === 'yearly') { d.setDate(1); d.setFullYear(d.getFullYear() + 1); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return U.iso(d); }
    return date;
  }
  /* takrorlanuvchi eslatma bajarilganda keyingi sana (bugundan keyin) */
  C.advance = function (r) {
    var d = r.date, g = 0;
    do { d = addPeriod(d, r.repeat); g++; } while (d <= U.today() && g < 800);
    return d;
  };
  /* tug'ilgan kunning eng yaqin sanasi (bu yil yoki keyingi yil) */
  C.birthdayNext = function (r) {
    var dob = U.parse(r.date), t = U.today(), y = Number(t.slice(0, 4));
    var occ = function (yy) { return yy + '-' + U.pad(dob.getMonth() + 1) + '-' + U.pad(dob.getDate()); };
    var d = occ(y); if (d < t) { y++; d = occ(y); }
    if (r.doneYear === y) { y++; d = occ(y); }
    return d;
  };
  C.age = function (r) { var y = Number(U.parse(r.date).getFullYear()), o = Number(C.birthdayNext(r).slice(0, 4)); return y > 1900 && y < o ? o - y : 0; };
  /* eslatmaning hozirgi muddati; bajarilgan bo'lsa null */
  C.remDate = function (r) {
    if (r.kind === 'birthday') return C.birthdayNext(r);
    return r.done ? null : r.date;
  };
  C.remItems = function (S, kind) {
    return S.reminders.filter(function (r) { return r.kind === kind && C.remDate(r); }).map(function (r) {
      var d = C.remDate(r); return { r: r, date: d, n: U.diff(d, U.today()) };
    }).sort(function (a, b) { if (a.n !== b.n) return a.n - b.n; var x = a.r.time || '', y = b.r.time || ''; return x < y ? -1 : x > y ? 1 : 0; });
  };
  C.remDone = function (S, kind) {
    return S.reminders.filter(function (r) { return r.kind === kind && r.kind !== 'birthday' && r.done; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  };
  /* muddati o'tgan qarzlar: owe = qarzlarim, owed = haqlarim */
  C.overdueDebts = function (S, type) {
    return C.openDebts(S, type).filter(function (d) { return d.due && C.daysTo(d.due) < 0; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  };
  C.soonDebts = function (S, type, days) {
    return C.openDebts(S, type).filter(function (d) { var n = d.due ? C.daysTo(d.due) : 999; return n >= 0 && n <= days; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  };

  /* yaqin kunlar ichidagi eslatmalar: qarz muddatlari va boshqa eslatmalar (tug'ilgan kunlar ham) */
  C.upcoming = function (S, horizon) {
    var a = [];
    S.debts.forEach(function (d) {
      if (C.isClosed(d) || !d.due) return;
      var n = C.daysTo(d.due);
      if (n <= horizon) a.push({ kind: 'debt', d: d, n: n });
    });
    S.reminders.forEach(function (r) {
      var date = C.remDate(r); if (!date) return;
      var n = U.diff(date, U.today());
      if (n <= horizon) a.push({ kind: 'rem', r: r, n: n, date: date });
    });
    a.sort(function (x, y) { return x.n - y.n; });
    return a;
  };

  C.messageStats = function (S) {
    var ym = U.today().slice(0, 7), sent = 0, draft = 0;
    S.messages.forEach(function (m) {
      if (m.status === 'sent' && m.at.slice(0, 7) === ym) sent++;
      if (m.status === 'draft') draft++;
    });
    return { sentThisMonth: sent, drafts: draft, total: S.messages.length };
  };

  /* eslatma sozlamalari: {on, before:[kun oldin], afterDaily, perDay} */
  C.defaultRemind = function () { return { on: true, before: [3, 1, 0], afterDaily: true, perDay: 2 }; };
  /* kuniga n marta: 09:00 dan 21:00 gacha teng taqsimlanadi */
  /* eslatma vaqtlari: Sozlamalardagi ro'yxatning birinchi n tasi; yetmasa standart vaqtlar to'ldiradi */
  C.userTimes = null;
  C.reminderTimes = function (n) {
    n = Math.max(1, Math.min(5, Number(n) || 1));
    var def = [], i;
    if (n === 1) def = ['09:00']; else for (i = 0; i < n; i++) def.push(U.pad(Math.round(9 + i * 12 / (n - 1))) + ':00');
    var t = (C.userTimes && C.userTimes.length ? C.userTimes.slice().sort() : []).slice(0, n);
    def.forEach(function (x) { if (t.length < n && t.indexOf(x) < 0) t.push(x); });
    return t.sort();
  };
  C.reminderText = function (r) {
    if (!r || !r.on) return "Eslatma o'chirilgan";
    var parts = (r.before || []).slice().sort(function (a, b) { return b - a; }).map(function (n) { return n === 0 ? 'muddat kuni' : n + ' kun oldin'; });
    if (r.afterDaily) parts.push('muddatdan keyin har kuni');
    var p = r.perDay || 1;
    return (parts.length ? parts.join(', ') : 'Vaqt tanlanmagan') + ' · kuniga ' + p + ' marta (' + C.reminderTimes(p).join(', ') + ')';
  };

  /* ---------- bildirishnoma rejasi (budilnik kabi, aniq vaqtda) ----------
     Yaqin `horizon` kun ichida kelishi kerak bo'lgan hamma bildirishnomalar ro'yxati. Telefon ilovasi shuni tizimga topshiradi.
     Qarz: muddatdan oldingi kunlar, muddat kuni va muddatdan keyin har kuni; eslatmalar: o'z vaqtida (takrorlanuvchilar ham). */
  C.notifyPlan = function (S, now, horizon, max) {
    now = now || new Date(); horizon = horizon || 30; max = max || 300;
    var out = [], today = U.iso(now), endDay = U.addDays(today, horizon), first = C.reminderTimes(1)[0] || '09:00';
    function stamp(day, time) { var p = String(time || first).split(':'), d = U.parse(day); d.setHours(Number(p[0]) || 0, Number(p[1]) || 0, 0, 0); return d; }
    function push(day, time, title, body) {
      if (day < today || day > endDay) return;
      var at = stamp(day, time); if (at.getTime() <= now.getTime() + 5000) return;
      out.push({ at: at, title: title, body: body });
    }
    S.debts.forEach(function (d) {
      if (C.isClosed(d) || !d.due || !d.remind || !d.remind.on) return;
      var owed = d.type === 'owed', times = C.reminderTimes(d.remind.perDay || 1), sum = U.money(C.rem(d), d.cur), k, day;
      (d.remind.before || []).forEach(function (n) {
        var t = (owed ? 'Haq: ' : 'Qarz: ') + d.person;
        var b = n === 0 ? 'Bugun ' + sum + ' qaytarish muddati.' : n + ' kun qoldi. ' + (owed ? d.person + ' ' + sum + ' qaytarishi kerak.' : sum + ' qaytarishingiz kerak.');
        times.forEach(function (tm) { push(U.addDays(d.due, -n), tm, t, b); });
      });
      if (d.remind.afterDaily) {
        for (k = 1; k <= 14; k++) {
          day = U.addDays(d.due, k);
          times.forEach(function (tm) { push(day, tm, 'Muddati o\'tdi: ' + d.person, k + ' kun kechikdi. Qoldiq ' + sum + '.'); });
        }
      }
    });
    S.reminders.forEach(function (r) {
      var g = 0, day;
      if (r.kind === 'birthday') {
        var age = C.age(r); day = C.birthdayNext(r);
        push(day, first, 'Tug\'ilgan kun: ' + r.text, age ? 'Bugun ' + age + ' yoshga to\'ladi.' : 'Bugun tug\'ilgan kun.');
        return;
      }
      if (r.done) return;
      day = r.date;
      while (day <= endDay && g++ < 400) {
        push(day, r.time, r.text, r.note || 'Eslatma');
        if (!r.repeat || r.repeat === 'none') break;
        day = addPeriod(day, r.repeat);
      }
    });
    out.sort(function (a, b) { return a.at - b.at; });
    return out.slice(0, max);
  };

  /* qarzdorga xabar matni */
  C.TPL = {
    soft: "Assalomu alaykum, {ism}! {summa} qarz haqida eslatib o'tmoqchiman. Qulay vaqtda qaytarsangiz, rahmat.",
    exact: "Assalomu alaykum, {ism}. {summa} qarzni {muddat} qaytarish kelishilgan edi. Iltimos, to'lov vaqtini yozib yuboring.",
    firm: "{ism}, {summa} qarzning muddati o'tdi. Iltimos, bugun qaytaring yoki aniq sana ayting."
  };
  C.TPL_NAMES = { soft: 'Yumshoq', exact: 'Aniq muddat bilan', firm: "Qat'iy" };
  C.messageText = function (S, d, key) {
    var custom = S.profile.tpl || {}, t = custom[key] || C.TPL[key] || C.TPL.soft, name = S.profile.name;
    t = t.replace(/\{ism\}/g, d.person.trim().split(/\s+/)[0])
      .replace(/\{summa\}/g, U.money(C.rem(d), d.cur))
      .replace(/\{muddat\}/g, d.due ? U.dateTo(d.due) : 'yaqin orada');
    return t + (name ? ' — ' + name : '');
  };

  Q.calc = C;
})(window.QD = window.QD || {});

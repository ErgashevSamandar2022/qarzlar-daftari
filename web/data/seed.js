/* seed.js: namuna ma'lumotlar. Sanalar bugunga nisbatan hisoblanadi.
   Haqiqiy ma'lumot kiritilgach, Sozlamalar orqali tozalanadi.
   Kurslar: Markaziy bank, 20-noyabr 2026 (oxirgi saqlangan kurs sifatida). */
(function (Q) {
  'use strict';
  Q.seed = function () {
    var U = Q.utils, t = U.today(), now = new Date();

    function ym(off) {
      var d = new Date(now.getFullYear(), now.getMonth() + off, 1);
      return d.getFullYear() + '-' + U.pad(d.getMonth() + 1);
    }
    function ago(days, hours) { return new Date(now.getTime() - days * 86400000 - (hours || 0) * 3600000).toISOString(); }
    function rm(before, perDay, after) { return { on: true, before: before, afterDaily: after, perDay: perDay }; }

    /* oyma-oy daromad va xarajatlar: [oy siljishi, daromadlar, xarajatlar]; kalitlar calc.js dagi SRC va CAT bilan bir xil */
    var plan = [
      [-5, [[6500000, 'oylik'], [1200000, 'qoshimcha']], [[2100000, 'bozorlik'], [900000, 'transport'], [1400000, 'kommunal'], [800000, 'boshqa', 'Dam olish']]],
      [-4, [[6500000, 'oylik']], [[2300000, 'bozorlik'], [1000000, 'transport'], [1500000, 'kommunal'], [2900000, 'boshqa', "To'y sovg'asi"]]],
      [-3, [[6500000, 'oylik'], [2000000, 'biznes']], [[2200000, 'bozorlik'], [800000, 'transport'], [1400000, 'kommunal'], [1100000, 'kiyim']]],
      [-2, [[6500000, 'oylik'], [700000, 'qoshimcha']], [[2400000, 'bozorlik'], [900000, 'transport'], [1500000, 'kommunal'], [1700000, 'talim']]],
      [-1, [[6500000, 'oylik']], [[2500000, 'bozorlik'], [1100000, 'transport'], [1500000, 'kommunal'], [3600000, 'boshqa', "Ta'mirlash"]]],
      [0, [[6500000, 'oylik']], [[1800000, 'bozorlik'], [700000, 'transport'], [1500000, 'kommunal']]]
    ];
    var PLACES = { bozorlik: 'Chorsu bozori', transport: 'Yoqilg\'i', kommunal: 'Kommunal xizmatlar', kiyim: 'Do\'kon', talim: 'Kurs to\'lovi' };
    var entries = [];
    plan.forEach(function (p) {
      var inDays = [5, 12], outDays = [8, 11, 14, 17], last = p[0] === 0 ? now.getDate() : 28;
      p[1].forEach(function (x, k) { entries.push({ id: U.uid(), type: 'in', src: x[1], amount: x[0], cur: 'UZS', date: ym(p[0]) + '-' + U.pad(Math.min(inDays[k] || 5, last)), who: x[1] === 'oylik' ? 'Ish joyi' : '', phone: '', tg: '', place: '', other: '', note: '' }); });
      p[2].forEach(function (x, k) { entries.push({ id: U.uid(), type: 'out', cat: x[1], amount: x[0], cur: 'UZS', date: ym(p[0]) + '-' + U.pad(Math.min(outDays[k] || 17, last)), who: '', phone: '', tg: '', place: PLACES[x[1]] || '', other: x[2] || '', note: '' }); });
    });

    /* qarzlar bilan bog'langan yozuvlar: qarz olish, berish, qaytish, to'lash */
    function flow(type, key, debtId, amount, cur, date, who, extra) {
      var e = { id: U.uid(), type: type, amount: amount, cur: cur, date: date, who: who || '', phone: '', tg: '', place: '', other: '', note: '', link: { debtId: debtId } };
      if (type === 'in') e.src = key; else e.cat = key;
      Object.assign(e.link, extra || {});
      entries.push(e);
    }
    flow('out', 'qarz_berish', 'd1', 1500000, 'UZS', U.addDays(t, -20), 'Aziz Karimov', { made: true });
    flow('in', 'qarz_qaytdi', 'd1', 500000, 'UZS', U.addDays(t, -10), 'Aziz Karimov', { paymentId: 'p1' });
    flow('out', 'qarz_berish', 'd2', 800000, 'UZS', U.addDays(t, -8), 'Madina Yusupova', { made: true });
    flow('out', 'qarz_berish', 'd3', 200, 'USD', U.addDays(t, -30), 'Jasur Toshmatov', { made: true });
    flow('out', 'qarz_berish', 'd4', 300000, 'UZS', U.addDays(t, -45), 'Sardor Aliyev', { made: true });
    flow('in', 'qarz_qaytdi', 'd4', 300000, 'UZS', U.addDays(t, -20), 'Sardor Aliyev', { paymentId: 'p4' });
    flow('out', 'qarz_berish', 'd7', 150, 'EUR', U.addDays(t, -6), 'Otabek Rahimov', { made: true });
    flow('in', 'qarz_olish', 'd5', 3000000, 'UZS', U.addDays(t, -15), 'Dilshod aka', { made: true });
    flow('out', 'qarz_tolash', 'd5', 1000000, 'UZS', U.addDays(t, -5), 'Dilshod aka', { paymentId: 'p5' });
    flow('in', 'qarz_olish', 'd8', 500, 'USD', U.addDays(t, -40), 'Xalq banki', { made: true });
    flow('out', 'qarz_tolash', 'd8', 100, 'USD', U.addDays(t, -10), 'Xalq banki', { paymentId: 'p8' });

    var debts = [
      { id: 'd1', type: 'owed', kind: 'shaxs', person: 'Aziz Karimov', phone: '+998 90 123 45 67', tg: '@aziz_karimov', amount: 1500000, cur: 'UZS', date: U.addDays(t, -20), termV: 17, termU: 'kun', due: U.addDays(t, -3), note: 'Shartnoma avansi', method: 'karta', channel: 'both', tpl: 'firm', autoSend: false, remind: rm([3, 1, 0], 2, true), payments: [{ id: 'p1', amount: 500000, date: U.addDays(t, -10), note: '' }] },
      { id: 'd2', type: 'owed', kind: 'shaxs', person: 'Madina Yusupova', phone: '+998 93 555 12 34', tg: '@madina_y', amount: 800000, cur: 'UZS', date: U.addDays(t, -8), termV: 12, termU: 'kun', due: U.addDays(t, 4), note: "Telefon ta'miri uchun", method: 'naqd', channel: 'telegram', tpl: 'soft', autoSend: false, remind: rm([3, 0], 1, false), payments: [] },
      { id: 'd3', type: 'owed', kind: 'shaxs', person: 'Jasur Toshmatov', phone: '', tg: '', amount: 200, cur: 'USD', date: U.addDays(t, -30), termV: 50, termU: 'kun', due: U.addDays(t, 20), note: 'Safar uchun', method: 'naqd', channel: 'sms', tpl: 'exact', autoSend: false, remind: rm([7, 1], 1, true), payments: [] },
      { id: 'd4', type: 'owed', kind: 'shaxs', person: 'Sardor Aliyev', phone: '', tg: '', amount: 300000, cur: 'UZS', date: U.addDays(t, -45), termV: 15, termU: 'kun', due: U.addDays(t, -30), note: '', method: 'naqd', channel: 'sms', tpl: 'soft', autoSend: false, remind: rm([1, 0], 1, true), payments: [{ id: 'p4', amount: 300000, date: U.addDays(t, -20), note: "To'liq qaytardi" }] },
      { id: 'd7', type: 'owed', kind: 'shaxs', person: 'Otabek Rahimov', phone: '+998 91 300 40 50', tg: '+998913004050', amount: 150, cur: 'EUR', date: U.addDays(t, -6), termV: 1, termU: 'oy', due: U.addDays(t, 24), note: 'Kurs to\'lovi', method: 'bank', channel: 'telegram', tpl: 'soft', autoSend: false, remind: rm([3, 1], 1, true), payments: [] },
      { id: 'd5', type: 'owe', kind: 'shaxs', person: 'Dilshod aka', phone: '+998 97 700 11 22', tg: '@dilshod_aka', amount: 3000000, cur: 'UZS', date: U.addDays(t, -15), termV: 24, termU: 'kun', due: U.addDays(t, 9), note: 'Mashina ehtiyot qismlari', remind: rm([3, 1, 0], 2, true), payments: [{ id: 'p5', amount: 1000000, date: U.addDays(t, -5), note: '' }] },
      { id: 'd6', type: 'owe', kind: 'tashkilot', person: "Do'kon: Baraka", phone: '', tg: '', amount: 450000, cur: 'UZS', date: U.addDays(t, -3), termV: 3, termU: 'kun', due: t, note: 'Nasiya xarid', remind: rm([0], 3, true), payments: [] },
      { id: 'd8', type: 'owe', kind: 'bank', person: 'Xalq banki', phone: '', tg: '', amount: 500, cur: 'USD', date: U.addDays(t, -40), termV: 3, termU: 'oy', due: U.addDays(t, 50), note: 'Iste\'mol krediti', remind: rm([7, 3, 1, 0], 2, true), payments: [{ id: 'p8', amount: 100, date: U.addDays(t, -10), note: '' }] }
    ];

    /* oldingi, yopilgan qarzlar: Haqlarimdagi "qaytarish ehtimoli" shularga qarab hisoblanadi */
    function old(id, person, amount, cur, dayAgo, dueAgo, paidAgo) {
      return { id: id, type: 'owed', kind: 'shaxs', person: person, phone: '', tg: '', amount: amount, cur: cur, date: U.addDays(t, -dayAgo), termV: dayAgo - dueAgo, termU: 'kun', due: U.addDays(t, -dueAgo), note: '', method: 'naqd', channel: 'sms', tpl: 'soft', autoSend: false, remind: rm([1, 0], 1, true), payments: [{ id: id + 'p', amount: amount, date: U.addDays(t, -paidAgo), note: '' }] };
    }
    debts.push(old('h1', 'Madina Yusupova', 600000, 'UZS', 70, 50, 52), old('h6', 'Madina Yusupova', 300000, 'UZS', 120, 100, 101),
      old('h2', 'Aziz Karimov', 400000, 'UZS', 90, 60, 48), old('h3', 'Jasur Toshmatov', 100, 'USD', 80, 55, 56), old('h7', 'Jasur Toshmatov', 50, 'USD', 130, 110, 111),
      old('h4', 'Sardor Aliyev', 250000, 'UZS', 110, 90, 70), old('h5', 'Otabek Rahimov', 100, 'EUR', 60, 40, 41));

    function dob(days, year) { return year + U.addDays(t, days).slice(4); }
    var reminders = [
      { id: U.uid(), kind: 'personal', text: "Dilshod akaga qo'ng'iroq qilish", date: U.addDays(t, 6), time: '15:00', repeat: 'none', note: "Qarzning ikkinchi qismi haqida gaplashish", done: false },
      { id: U.uid(), kind: 'personal', text: 'Mashinani texnik ko\'rikdan o\'tkazish', date: U.addDays(t, -2), time: '', repeat: 'none', note: 'Hujjatlarni olishni unutmang', done: false },
      { id: U.uid(), kind: 'personal', text: 'Shifokorga yozilish', date: U.addDays(t, 1), time: '10:00', repeat: 'weekly', note: '', done: false },
      { id: U.uid(), kind: 'personal', text: 'Kitob do\'koniga borish', date: U.addDays(t, -9), time: '', repeat: 'none', note: '', done: true },
      { id: U.uid(), kind: 'other', text: "Kommunal to'lovlarni to'lash", date: U.addDays(t, 2), time: '', repeat: 'monthly', note: 'Elektr, gaz, suv', done: false },
      { id: U.uid(), kind: 'other', text: "Internet to'lovi", date: U.addDays(t, 5), time: '', repeat: 'monthly', note: '', done: false },
      { id: U.uid(), kind: 'other', text: 'Sug\'urta polisini yangilash', date: U.addDays(t, 41), time: '', repeat: 'yearly', note: '', done: false },
      { id: U.uid(), kind: 'birthday', text: 'Aziz Karimov', date: dob(3, 1990), phone: '+998 90 123 45 67', tg: '@aziz_karimov', time: '', repeat: 'yearly', note: 'Do\'sti, sovg\'a olib borish', done: false },
      { id: U.uid(), kind: 'birthday', text: 'Onam', date: dob(12, 1968), phone: '', tg: '', time: '', repeat: 'yearly', note: '', done: false },
      { id: U.uid(), kind: 'birthday', text: 'Madina Yusupova', date: dob(45, 1995), phone: '+998 93 555 12 34', tg: '@madina_y', time: '', repeat: 'yearly', note: '', done: false }
    ];

    var messages = [
      { id: U.uid(), debtId: 'd1', person: 'Aziz Karimov', channel: 'sms', status: 'sent', at: ago(2, 3), text: "Assalomu alaykum, Aziz. 1 000 000 so'm qarzning muddati o'tib ketdi. Bugun yoki ertaga qaytara olasizmi?" },
      { id: U.uid(), debtId: 'd2', person: 'Madina Yusupova', channel: 'telegram', status: 'sent', at: ago(1, 5), text: "Assalomu alaykum, Madina! Muddat yaqinlashmoqda, 800 000 so'm haqida eslatib o'tmoqchiman." },
      { id: U.uid(), debtId: 'd1', person: 'Aziz Karimov', channel: 'telegram', status: 'sent', at: ago(9, 1), text: "Assalomu alaykum, Aziz! 1 000 000 so'm qarz haqida eslatib qo'ymoqchi edim." },
      { id: U.uid(), debtId: 'd2', person: 'Madina Yusupova', channel: 'sms', status: 'sent', at: ago(4, 2), text: "Assalomu alaykum, Madina. 800 000 so'm qarz muddati 2-dekabrda. Iltimos, eslab qoling." },
      { id: U.uid(), debtId: 'd3', person: 'Jasur Toshmatov', channel: 'telegram', status: 'sent', at: ago(15, 4), text: "Assalomu alaykum, Jasur! 200 $ haqida eslatib qo'ymoqchi edim." },
      { id: U.uid(), debtId: 'd3', person: 'Jasur Toshmatov', channel: 'sms', status: 'draft', at: ago(0, 1), text: "Assalomu alaykum, Jasur. 200 $ qarzni qaytarish muddati yaqinlashmoqda." }
    ];

    return {
      profile: { name: '', cur: 'UZS', lead: 3 },
      fx: { rates: { USD: 12004.48, EUR: 13155.71 }, date: '2026-11-20', fetchedAt: '', manual: { USD: 0, EUR: 0 } },
      debts: debts, entries: entries, reminders: reminders, messages: messages, sample: true, v: 6, recurring: []
    };
  };
})(window.QD = window.QD || {});

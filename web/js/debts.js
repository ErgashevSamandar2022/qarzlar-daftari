/* debts.js: Qarzlarim ('owe') va Haqlarim ('owed') bo'limlari.
   Ro'yxat kartalari, qo'shish va tahrirlash formasi, eslatma sozlamalari, xabar tayyorlash. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, F = Q.fx, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }
  Q.views = Q.views || {};

  var V = { f: { owe: 'all', owed: 'all' }, q: { owe: '', owed: '' } };
  var KINDS = [['shaxs', 'Shaxsdan'], ['bank', 'Bankdan'], ['tashkilot', "Tashkilot yoki do'kondan"], ['boshqa', 'Boshqa']];
  var KIND_LABEL = { shaxs: 'Shaxs', bank: 'Bank', tashkilot: 'Tashkilot', boshqa: 'Boshqa' };
  var NAME_LABEL = { shaxs: 'Ismi', bank: 'Bank nomi', tashkilot: 'Tashkilot yoki do\'kon nomi', boshqa: 'Nomi' };
  var METHODS = [['naqd', 'Naqd'], ['karta', 'Karta'], ['bank', "Bank o'tkazma"], ['kelishilmagan', 'Kelishilmagan']];
  var CHANNELS = [['sms', 'SMS'], ['telegram', 'Telegram'], ['both', 'Ikkalasi']];
  var TPLS = [['soft', 'Yumshoq'], ['exact', 'Aniq muddat bilan'], ['firm', "Qat'iy"]];
  var BEFORE = [7, 3, 1, 0];
  Q.debtMeta = { KINDS: KINDS };

  function chip(cls, text) { return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + text + '</span>'; }
  function dueChip(d) {
    if (C.isClosed(d)) return chip('done', 'Yopilgan');
    if (!d.due) return chip('', 'Muddatsiz');
    var n = C.daysTo(d.due);
    return n < 0 ? chip('bad', (-n) + " kun o'tgan") : n === 0 ? chip('warn', 'Bugun') : chip(n <= Q.db.state().profile.lead ? 'warn' : '', n + ' kun qoldi');
  }
  function radioChoices(name, list, value) {
    return '<div class="choices">' + list.map(function (x) {
      return '<label class="choice"><input type="radio" name="' + name + '" value="' + x[0] + '"' + (value === x[0] ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
    }).join('') + '</div>';
  }

  /* ---------- karta ---------- */
  function card(S, d) {
    var owed = d.type === 'owed', cl = C.isClosed(d), disp = S.profile.cur;
    var shown = cl ? d.amount : C.rem(d), paid = C.paid(d), pct = Math.min(100, paid / d.amount * 100);
    var eq = d.cur !== disp ? '<span class="eq">≈ ' + U.money(F.convert(shown, d.cur, disp), disp) + '</span>' : '';
    var tg = U.tgInfo(d.tg);
    var contacts = (d.phone ? '<span>' + ic('phone', 14) + esc(d.phone) + '</span>' : '') + (tg.text && tg.kind !== 'bad' ? '<span>' + ic('tg', 14) + esc(tg.text) + '</span>' : '');
    return '<article class="slip ' + d.type + (cl ? ' closed' : '') + '">' +
      '<div class="slip-top"><span class="ava">' + esc(U.ini(d.person)) + '</span><div class="mid"><h3 class="nm">' + esc(d.person) + '</h3><p class="sub">' + (d.note ? esc(d.note) : (owed ? 'Berilgan ' : 'Olingan ') + U.short(d.date)) + '</p></div>' +
      (owed ? Q.trust.chip(S, d) : '<span class="kind">' + KIND_LABEL[d.kind || 'shaxs'] + '</span>') + '</div>' +
      '<div class="slip-amt"><b class="amt">' + U.money(shown, d.cur) + '</b>' + eq + '</div>' +
      '<p class="sub">Jami ' + U.money(d.amount, d.cur) + (paid > 0 ? ' · ' + (owed ? 'qaytarilgan ' : "to'langan ") + U.money(paid, d.cur) : '') + '</p>' +
      (paid > 0 ? '<div class="pbar" role="img" aria-label="' + Math.round(pct) + ' foiz"><i style="width:' + pct + '%"></i></div>' : '') +
      '<div class="slip-dates"><span>' + U.short(d.date) + '</span><i class="line"></i><span>' + (d.due ? U.short(d.due) : 'Muddatsiz') + '</span>' + dueChip(d) + '</div>' +
      (contacts ? '<div class="slip-contacts">' + contacts + '</div>' : '') +
      '<div class="slip-fill"></div><div class="tear" aria-hidden="true"></div>' +
      '<div class="slip-rem">' + ic('bell', 16) + '<span>' + esc(C.reminderText(d.remind)) + '</span></div>' +
      '<div class="slip-actions">' + (owed && !cl ? '<button type="button" class="btn sm" data-act="msg" data-id="' + d.id + '">' + ic('tg', 15) + 'Xabar</button>' : '') +
      (!cl ? '<button type="button" class="btn sm" data-act="cf-pay" data-id="' + d.id + '">' + ic('swap', 15) + (owed ? 'Qaytdi' : "To'lov") + '</button>' : '') +
      '<button type="button" class="btn sm" data-act="remind" data-id="' + d.id + '">' + ic('bell', 15) + 'Eslatma</button>' +
      '<button type="button" class="btn sm" data-act="edit" data-id="' + d.id + '">' + ic('edit', 15) + 'Tahrirlash</button></div></article>';
  }
  function cards(S, type) {
    var f = V.f[type], q = V.q[type].trim().toLowerCase();
    var l = S.debts.filter(function (d) {
      if (d.type !== type) return false;
      if (q && (d.person + ' ' + (d.note || '')).toLowerCase().indexOf(q) < 0) return false;
      if (f === 'open') return !C.isClosed(d);
      if (f === 'overdue') return !C.isClosed(d) && d.due && C.daysTo(d.due) < 0;
      if (f === 'closed') return C.isClosed(d);
      return true;
    });
    l.sort(function (a, b) {
      var ca = C.isClosed(a), cb = C.isClosed(b);
      if (ca !== cb) return ca ? 1 : -1;
      var x = a.due || '9999', y = b.due || '9999';
      return x < y ? -1 : x > y ? 1 : 0;
    });
    if (!l.length) {
      var any = S.debts.some(function (d) { return d.type === type; });
      return '<div class="empty" style="grid-column:1/-1"><img src="assets/images/empty.svg" alt="" width="180" height="112"><p>' + (any ? 'Hech narsa topilmadi.' : (type === 'owe' ? "Hozircha qarzingiz yo'q." : 'Hozircha hech kim sizga qarzdor emas.')) + '</p>' +
        (any ? '' : '<button type="button" class="btn primary" data-act="add" data-type="' + type + '">' + ic('plus', 18) + (type === 'owe' ? "Qarz qo'shish" : "Haq qo'shish") + '</button>') + '</div>';
    }
    return l.map(function (d) { return card(S, d); }).join('');
  }

  /* ---------- bo'lim sahifasi ---------- */
  Q.views.debts = function (S, type) {
    var owed = type === 'owed', cur = S.profile.cur;
    var open = C.openDebts(S, type), over = C.overdueCount(S, type), next = C.topOpen(S, type, 1)[0];
    var tot = C.totalIn(S, type, cur), mixed = C.mixed(S, type, cur);
    var tabs = [['all', 'Hammasi'], ['open', 'Ochiq'], ['overdue', "Muddati o'tgan"], ['closed', 'Yopilgan']];
    return '<div class="page-head"><div><h1>' + (owed ? 'Haqlarim' : 'Qarzlarim') + '</h1><p>' + (owed ? "Sizga qaytarilishi kerak bo'lgan pullar" : "Siz qaytarishingiz kerak bo'lgan qarzlar") + '</p></div>' +
      '<button type="button" class="btn primary" data-act="add" data-type="' + type + '">' + ic('plus', 18) + (owed ? "Haq qo'shish" : "Qarz qo'shish") + '</button></div>' +
      '<div class="tiles ' + type + '"><div class="tile big"><span>Jami qolgan</span><b>' + (mixed ? '≈ ' : '') + U.money(tot, cur) + '</b></div>' +
      '<div class="tile"><span>Ochiq</span><b>' + open.length + '</b></div>' +
      '<div class="tile"><span>Muddati o\'tgan</span><b class="' + (over ? 'bad' : '') + '">' + over + '</b></div>' +
      '<div class="tile"><span>Eng yaqin muddat</span><b>' + (next && next.due ? U.short(next.due) : '—') + '</b></div></div>' +
      (owed ? Q.trust.panel(S) : '') +
      '<div class="tabs" role="group" aria-label="Filtr">' + tabs.map(function (t) { return '<button type="button" data-act="filter" data-type="' + type + '" data-v="' + t[0] + '" aria-pressed="' + (V.f[type] === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="search"><input id="dsearch" data-type="' + type + '" type="search" placeholder="Ism yoki izoh bo\'yicha qidirish" value="' + esc(V.q[type]) + '" aria-label="Qidirish" autocomplete="off"></div>' +
      '<div class="cards-grid" id="dlist">' + cards(S, type) + '</div>';
  };

  /* ---------- eslatma bloki ---------- */
  function remBlock(r, type) {
    r = r || C.defaultRemind();
    return '<div class="fs rem-block' + (r.on ? '' : ' off') + '"><div class="fs-head"><div><b>' + (type === 'owed' ? 'Qarzdorga eslatma xabari' : 'Eslatma') + '</b><p class="muted">Qachon va kuniga necha marta eslatilsin</p></div>' +
      '<label class="switch"><input type="checkbox" name="remOn"' + (r.on ? ' checked' : '') + '><i></i><span class="sr">Eslatmani yoqish</span></label></div>' +
      '<div class="rem-body"><p class="lbl">Qachon</p><div class="choices">' +
      BEFORE.map(function (n) { return '<label class="choice"><input type="checkbox" name="before" value="' + n + '"' + (r.before.indexOf(n) >= 0 ? ' checked' : '') + '><span>' + (n === 0 ? 'Muddat kuni' : n + ' kun oldin') + '</span></label>'; }).join('') +
      '<label class="choice"><input type="checkbox" name="afterDaily"' + (r.afterDaily ? ' checked' : '') + '><span>Muddatdan keyin har kuni</span></label></div>' +
      "<p class=\"lbl\">O'sha kuni necha marta</p><div class=\"stepper\"><button type=\"button\" data-act=\"step\" data-d=\"-1\" aria-label=\"Kamaytirish\">−</button><output class=\"perout\">" + r.perDay + '</output><button type="button" data-act="step" data-d="1" aria-label="Ko\'paytirish">+</button><input type="hidden" name="perDay" value="' + r.perDay + '"></div>' +
      '<p class="muted timesout" style="margin-top:8px">Vaqtlar: ' + C.reminderTimes(r.perDay).join(', ') + '</p></div></div>';
  }
  function readRemind(f) {
    var before = [].slice.call(f.querySelectorAll('input[name="before"]:checked')).map(function (x) { return Number(x.value); });
    return { on: f.elements.remOn.checked, before: before, afterDaily: f.elements.afterDaily.checked, perDay: Math.max(1, Math.min(5, Number(f.elements.perDay.value) || 1)) };
  }

  /* ---------- qo'shish va tahrirlash formasi ---------- */
  function formHTML(type, d) {
    var S = Q.db.state(), owed = type === 'owed', edit = !!d;
    d = d || { kind: 'shaxs', cur: S.profile.cur, date: U.today(), termV: '', termU: 'kun', due: '', remind: C.defaultRemind(), method: 'naqd', channel: 'sms', tpl: 'soft', phone: '', tg: '', note: '', person: '', amount: '' };
    var title = owed ? (edit ? 'Haqni tahrirlash' : "Haq qo'shish") : (edit ? 'Qarzni tahrirlash' : "Qarz qo'shish");
    var kind = d.kind || 'shaxs';
    return '<div class="sh"><div><p class="eyebrow ' + type + '">' + (owed ? 'Haqlarim · menga qarzdor' : 'Qarzlarim · men qarzdorman') + '</p><h2>' + title + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<form data-form="debt" data-type="' + type + '" data-id="' + (edit ? d.id : '') + '" novalidate>' +
      (owed ? '' : '<div class="field"><span class="lbl">Qayerdan olgansiz?</span>' + radioChoices('kind', KINDS, kind) + '</div>') +
      '<div class="field"><label for="f-person" id="f-nameLbl">' + (owed ? 'Haqdor shaxs ismi' : NAME_LABEL[kind]) + '</label><input id="f-person" name="person" value="' + esc(d.person) + '" autocomplete="off" placeholder="' + (owed ? 'Masalan: Aziz Karimov' : 'Masalan: Dilshod aka') + '"><div id="f-trust" class="tr-slot"></div></div>' +
      '<div class="grid2"><div class="field"><label for="f-amount">Summa</label><input id="f-amount" name="amount" inputmode="decimal" value="' + esc(d.amount) + '" autocomplete="off" placeholder="500 000"></div>' +
      '<div class="field"><span class="lbl">Valyuta</span><div class="choices seg3">' + U.CURS.map(function (c) { return '<label class="choice"><input type="radio" name="cur" value="' + c + '"' + (d.cur === c ? ' checked' : '') + '><span>' + (c === 'UZS' ? "So'm" : U.CUR_SIGN[c]) + '</span></label>'; }).join('') + '</div></div></div>' +
      '<div class="grid2"><div class="field"><label for="f-date">' + (owed ? 'Berilgan sana' : 'Olingan sana') + '</label><input id="f-date" name="date" type="date" value="' + d.date + '"></div>' +
      '<div class="field"><label for="f-termV">Qancha muddatga</label><div class="fr"><input id="f-termV" name="termV" type="number" min="1" inputmode="numeric" value="' + esc(d.termV) + '" placeholder="30"><select id="f-termU" name="termU" aria-label="Muddat birligi">' +
      [['kun', 'kun'], ['hafta', 'hafta'], ['oy', 'oy']].map(function (x) { return '<option value="' + x[0] + '"' + (d.termU === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="field"><label for="f-due">Qaytarish sanasi</label><input id="f-due" name="due" type="date" value="' + (d.due || '') + '"><div class="quick"><button type="button" class="btn sm" data-act="quick" data-v="7:kun">1 hafta</button><button type="button" class="btn sm" data-act="quick" data-v="14:kun">2 hafta</button><button type="button" class="btn sm" data-act="quick" data-v="1:oy">1 oy</button><button type="button" class="btn sm" data-act="quick" data-v="3:oy">3 oy</button></div></div>' +
      '<div class="grid2"><div class="field"><label for="f-phone">Telefon raqami</label><input id="f-phone" name="phone" type="tel" value="' + esc(d.phone) + '" autocomplete="off" placeholder="+998 90 123 45 67"></div>' +
      '<div class="field"><label for="f-tg">Telegram (raqam yoki @username)</label><input id="f-tg" name="tg" value="' + esc(d.tg) + '" autocomplete="off" placeholder="@username"></div></div>' +
      '<div class="field"><label for="f-note">Izoh</label><textarea id="f-note" name="note" placeholder="Nima uchun, qanday kelishilgan">' + esc(d.note) + '</textarea></div>' +
      (owed ? '<div class="fs"><div class="fs-head"><div><b>Xabar yuborish</b><p class="muted">Qarzdorga eslatma xabari qanday boradi</p></div></div>' +
        '<p class="lbl" style="margin-top:12px">Kanal</p>' + radioChoices('channel', CHANNELS, d.channel || 'sms') +
        '<p class="lbl">Xabar uslubi</p>' + radioChoices('tpl', TPLS, d.tpl || 'soft') +
        '<p class="lbl">Qaytarish usuli</p>' + radioChoices('method', METHODS, d.method || 'naqd') +
        '<div class="fs-head" style="margin-top:4px"><div><b>Avtomatik yuborish</b><p class="muted">Telegram bot ulangach faollashadi</p></div><label class="switch"><input type="checkbox" name="autoSend" disabled><i></i><span class="sr">Avtomatik yuborish</span></label></div></div>' : '') +
      remBlock(d.remind, type) +
      (edit ? '' : '<div class="fs"><div class="fs-head"><div><b>Kirim-chiqimga ham yozish</b><p class="muted">' + (owed ? 'Bu pul chiqim bo\'lib yoziladi' : 'Bu pul kirim bo\'lib yoziladi') + '</p></div><label class="switch"><input type="checkbox" name="cash" checked><i></i><span class="sr">Kirim-chiqimga ham yozish</span></label></div></div>') +
      '<p class="err" id="f-err" role="alert" hidden></p>' +
      '<div class="btns" id="f-btns"><button type="submit" class="btn primary">Saqlash</button>' +
      (edit ? '<button type="button" class="btn danger" data-act="askdel" data-id="' + d.id + '">' + "O'chirish</button>" : '<button type="button" class="btn" data-sheet-close>Bekor qilish</button>') + '</div></form>';
  }

  function remindSheet(d) {
    return '<div class="sh"><div><p class="eyebrow ' + d.type + '">' + esc(d.person) + '</p><h2>Eslatma sozlamalari</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<form data-form="remind" data-id="' + d.id + '">' + remBlock(d.remind, d.type) + '<button type="submit" class="btn primary full">Saqlash</button></form>';
  }

  /* ---------- xabar tayyorlash (haqlar uchun) ---------- */
  function msgSheet(d, ch, text) {
    var S = Q.db.state(), tg = U.tgInfo(d.tg);
    ch = ch || (d.channel === 'telegram' ? 'telegram' : 'sms');
    text = text != null ? text : C.messageText(S, d, d.tpl || 'soft');
    var phone = U.digits(d.phone) ? '+' + U.digits(d.phone) : '';
    var seg = [['sms', 'SMS'], ['telegram', 'Telegram']].map(function (x) { return '<button type="button" data-act="msgch" data-ch="' + x[0] + '" aria-pressed="' + (ch === x[0]) + '">' + x[1] + '</button>'; }).join('');
    var target = ch === 'sms' ? (phone ? 'Raqam: <b>' + esc(d.phone) + '</b>' : "Telefon raqami kiritilmagan. Tahrirlash orqali qo'shing.") : (tg.kind === 'user' || tg.kind === 'phone' ? 'Telegram: <b>' + esc(tg.text) + '</b>' : 'Telegram username yoki raqami kiritilmagan.');
    var href = ch === 'sms' ? (phone ? 'sms:' + phone + '?&body=' + encodeURIComponent(text) : '') : (tg.url || '');
    return '<div class="sh"><div><p class="eyebrow owed">Qarzdorga xabar</p><h2>' + esc(d.person) + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<div class="cur-seg wide" role="group" aria-label="Kanal" data-id="' + d.id + '">' + seg + '</div>' +
      '<div class="field" style="margin-top:14px"><label for="m-text">Xabar matni</label><textarea id="m-text" data-id="' + d.id + '" data-ch="' + ch + '">' + esc(text) + '</textarea></div>' +
      '<p class="phoneline" style="margin-bottom:14px">' + target + '</p>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="msgcopy" data-id="' + d.id + '" data-ch="' + ch + '">Nusxalash</button>' +
      (href ? '<a class="btn" id="m-open" data-act="msgopen" data-id="' + d.id + '" data-ch="' + ch + '" href="' + esc(href) + '"' + (ch === 'telegram' ? ' target="_blank" rel="noopener"' : '') + '>' + (ch === 'sms' ? 'SMS ilovasida ochish' : 'Telegramda ochish') + '</a>' : '') + '</div>' +
      '<p class="note" style="margin-top:14px">Bu ilova xabarni o\'zi yubormaydi. Matn tayyorlanadi, yuborishni telefoningizdagi ilova bajaradi. Telegram bot ulangach xabar avtomatik ketadi.</p>';
  }
  function logMsg(d, ch, text) {
    Q.db.addMessage({ debtId: d.id, person: d.person, channel: ch, status: 'draft', text: text });
    Q.app.render();
  }

  /* ---------- hodisalar ---------- */
  function syncDue(f, from) {
    var date = f.elements.date.value, v = Number(f.elements.termV.value), u = f.elements.termU.value;
    if (from === 'due') {
      if (date && f.elements.due.value) { var n = U.diff(f.elements.due.value, date); f.elements.termV.value = n > 0 ? n : ''; f.elements.termU.value = 'kun'; }
      return;
    }
    if (!date || !(v > 0)) return;
    if (u === 'oy') { var d = U.parse(date); d.setMonth(d.getMonth() + v); f.elements.due.value = U.iso(d); }
    else f.elements.due.value = U.addDays(date, u === 'hafta' ? v * 7 : v);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act, id = el.dataset.id, S = Q.db.state(), d = id ? Q.db.debt(id) : null, f;
    if (a === 'add') ui.sheet(formHTML(el.dataset.type), true);
    else if (a === 'edit' && d) ui.sheet(formHTML(d.type, d), true);
    else if (a === 'remind' && d) ui.sheet(remindSheet(d));
    else if (a === 'msg' && d) ui.sheet(msgSheet(d));
    else if (a === 'msgch' && d == null) {
      var ta = $('#m-text'), dd = Q.db.debt(ta.dataset.id);
      if (dd) ui.sheet(msgSheet(dd, el.dataset.ch, C.messageText(S, dd, dd.tpl || 'soft')));
    }
    else if (a === 'msgcopy' && d) {
      var t = $('#m-text');
      ui.copy(t.value, t).then(function (ok) { logMsg(d, el.dataset.ch, t.value); ui.toast(ok ? 'Matn nusxalandi' : 'Matnni belgilab nusxalang'); });
    }
    else if (a === 'msgopen' && d) {
      var t2 = $('#m-text');
      if (el.dataset.ch === 'telegram') ui.copy(t2.value, null);
      logMsg(d, el.dataset.ch, t2.value);
      ui.toast(el.dataset.ch === 'telegram' ? 'Matn nusxalandi, Telegramda joylashtiring' : 'SMS ilovasi ochilmasa, matnni nusxalang');
    }
    else if (a === 'filter') { V.f[el.dataset.type] = el.dataset.v; Q.app.render(); }
    else if (a === 'quick') {
      f = el.closest('form'); var p = el.dataset.v.split(':');
      f.elements.termV.value = p[0]; f.elements.termU.value = p[1]; syncDue(f, 'term');
    }
    else if (a === 'step') {
      f = el.closest('form'); var h = f.elements.perDay, n = Math.max(1, Math.min(5, (Number(h.value) || 1) + Number(el.dataset.d)));
      h.value = n; f.querySelector('.perout').textContent = n; f.querySelector('.timesout').textContent = 'Vaqtlar: ' + C.reminderTimes(n).join(', ');
    }
    else if (a === 'askdel' && d) {
      $('#f-btns').innerHTML = '<p class="err" style="width:100%;margin:0">Bu yozuv va uning to\'lovlari o\'chadi. Davom etasizmi?</p><button type="button" class="btn danger-solid" data-act="deldebt" data-id="' + d.id + '">Ha, o\'chirish</button><button type="button" class="btn" data-act="edit" data-id="' + d.id + '">Yo\'q</button>';
    }
    else if (a === 'deldebt' && d) { Q.db.removeDebt(d.id); ui.close(); Q.app.render(); ui.toast("O'chirildi"); }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-form]'); if (!f) return;
    var k = f.dataset.form;
    if (k === 'remind') {
      e.preventDefault();
      Q.db.updateDebt(f.dataset.id, { remind: readRemind(f) });
      ui.close(); Q.app.render(); ui.toast('Eslatma saqlandi');
    } else if (k === 'debt') {
      e.preventDefault();
      var v = f.elements, type = f.dataset.type, owed = type === 'owed', err = $('#f-err'), ex = f.dataset.id ? Q.db.debt(f.dataset.id) : null;
      var amt = Number(String(v.amount.value).replace(/\s| /g, '').replace(',', '.')), person = v.person.value.trim(), tg = v.tg.value.trim();
      var msg = !person ? (owed ? 'Haqdor ismini kiriting.' : 'Nomini kiriting.') :
        !(amt > 0) ? 'Summani raqam bilan kiriting.' :
        !v.date.value ? 'Sanani tanlang.' :
        (v.due.value && v.due.value < v.date.value) ? "Qaytarish sanasi boshlanish sanasidan oldin bo'lmasligi kerak." :
        !U.phoneOk(v.phone.value) ? "Telefon raqami noto'g'ri. Kamida 9 ta raqam kiriting." :
        (tg && U.tgInfo(tg).kind === 'bad') ? "Telegram username 5-32 belgidan iborat bo'lishi kerak (harf, raqam, pastki chiziq) yoki telefon raqami kiriting." :
        (ex && amt < C.paid(ex) - 0.005) ? 'Summa to\'langan ' + U.money(C.paid(ex), ex.cur) + ' dan kam bo\'lmasligi kerak.' : '';
      if (msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
      var tv = Number(v.termV.value);
      var data = {
        type: type, kind: owed ? 'shaxs' : (f.querySelector('input[name="kind"]:checked') || {}).value || 'shaxs', person: person, amount: amt, cur: f.querySelector('input[name="cur"]:checked').value,
        date: v.date.value, due: v.due.value || '', termV: tv > 0 ? tv : '', termU: v.termU.value, phone: v.phone.value.trim(), tg: tg, note: v.note.value.trim(), remind: readRemind(f)
      };
      if (owed) {
        data.channel = f.querySelector('input[name="channel"]:checked').value; data.tpl = f.querySelector('input[name="tpl"]:checked').value;
        data.method = f.querySelector('input[name="method"]:checked').value; data.autoSend = false;
      }
      if (ex) { Q.db.updateDebt(ex.id, data); Q.db.syncDebtEntry(ex); }
      else { var nd = Q.db.addDebt(data); if (v.cash && v.cash.checked) Q.db.logDebt(nd); }
      ui.close(); Q.app.render(); ui.toast(ex ? 'Saqlandi' : (owed ? "Haq qo'shildi" : "Qarz qo'shildi"));
    }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'dsearch') { V.q[t.dataset.type] = t.value; $('#dlist').innerHTML = cards(Q.db.state(), t.dataset.type); }
    else if (t.id === 'f-termV') syncDue(t.form, 'term');
    else if (t.id === 'm-text') { var a = $('#m-open'), d = Q.db.debt(t.dataset.id); if (a && d && t.dataset.ch === 'sms' && U.digits(d.phone)) a.href = 'sms:+' + U.digits(d.phone) + '?&body=' + encodeURIComponent(t.value); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'f-termU' || t.id === 'f-date') syncDue(t.form, 'term');
    else if (t.id === 'f-due') syncDue(t.form, 'due');
    else if (t.name === 'kind') { var l = $('#f-nameLbl'); if (l) l.textContent = NAME_LABEL[t.value] || 'Nomi'; }
    else if (t.name === 'remOn') t.closest('.rem-block').classList.toggle('off', !t.checked);
  });
})(window.QD = window.QD || {});

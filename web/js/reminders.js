/* reminders.js: Eslatmalar bo'limi.
   Besh karta: muddati o'tgan qarzdorlik, muddati o'tgan haqdorlik, shaxsiy eslatmalar,
   tug'ilgan kunlar va boshqa eslatmalar. Kartani bossangiz, ichida batafsil ro'yxat ochiladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }
  Q.views = Q.views || {};
  var V = { sec: null };

  var SECS = [
    { id: 'owe', t: "Muddati o'tgan qarzdorlik", s: "Men qaytarishim kerak bo'lgan, muddati o'tgan qarzlar", tone: 'owe', i: 'owe' },
    { id: 'owed', t: "Muddati o'tgan haqdorlik", s: "Menga qaytarilishi kerak, muddati o'tgan pullar", tone: 'owed', i: 'owed' },
    { id: 'personal', t: 'Shaxsiy eslatmalar', s: "O'zingiz uchun yozgan eslatmalar", tone: 'blue', i: 'note', add: true },
    { id: 'birthday', t: "Tug'ilgan kun eslatmalari", s: "Yaqinlaringizning tug'ilgan kunlari", tone: 'pink', i: 'gift', add: true },
    { id: 'other', t: 'Boshqa eslatmalar', s: "To'lovlar, sug'urta va boshqa takrorlanuvchi ishlar", tone: 'violet', i: 'bell', add: true }
  ];
  function sec(id) { return SECS.filter(function (x) { return x.id === id; })[0]; }

  function countdown(n) {
    return n < 0 ? "<span class=\"chip bad\">" + (-n) + " kun o'tgan</span>" : n === 0 ? '<span class="chip warn">Bugun</span>' : n === 1 ? '<span class="chip warn">Ertaga</span>' :
      '<span class="chip' + (n <= Q.db.state().profile.lead ? ' warn' : '') + '">' + n + ' kun qoldi</span>';
  }
  function state(n) { return n < 0 ? 'bad' : n === 0 ? 'today' : n <= Q.db.state().profile.lead ? 'soon' : ''; }

  /* karta uchun: soni, shoshilinchlari va 2 ta ko'rinish */
  function info(S, id) {
    var list, pre, urgent, note;
    if (id === 'owe' || id === 'owed') {
      list = C.overdueDebts(S, id); urgent = list.length;
      pre = list.slice(0, 2).map(function (d) { return [d.person, (-C.daysTo(d.due)) + ' kun']; });
      note = list.length ? 'Jami ' + U.money(list.reduce(function (a, d) { return a + Q.fx.convert(C.rem(d), d.cur, S.profile.cur); }, 0), S.profile.cur) : '';
    } else {
      list = C.remItems(S, id);
      urgent = id === 'birthday' ? list.filter(function (x) { return x.n <= 7; }).length : list.filter(function (x) { return x.n < 0; }).length;
      pre = list.slice(0, 2).map(function (x) { return [x.r.text, x.n < 0 ? (-x.n) + ' kun' : x.n === 0 ? 'bugun' : x.n + ' kun']; });
      note = urgent ? (id === 'birthday' ? '7 kun ichida ' + urgent + ' ta' : urgent + " tasi muddati o'tgan") : '';
    }
    return { count: list.length, urgent: urgent, pre: pre, note: note };
  }

  /* ---------- umumiy ko'rinish ---------- */
  function overview(S) {
    var lead = S.profile.lead, up = C.upcoming(S, lead).length, today = C.upcoming(S, 0).filter(function (x) { return x.n === 0; }).length, week = C.upcoming(S, 7).filter(function (x) { return x.n >= 0; }).length;
    var cards = SECS.map(function (x, k) {
      var d = info(S, x.id), over = (x.id === 'owe' || x.id === 'owed');
      var pre = d.pre.length ? d.pre.map(function (p) {
        return '<li><span>' + esc(p[0]) + '</span><em>' + (over ? p[1] + " o'tdi" : p[1]) + '</em></li>';
      }).join('') : '<li class="ok">' + ic('check', 15) + '<span>' + (over ? "Muddati o'tgan yo'q" : "Hozircha yo'q") + '</span></li>';
      return '<article class="rc ' + x.tone + (d.urgent ? ' hot' : '') + '"><span class="rc-tab">' + U.pad(k + 1) + '</span>' +
        '<div class="rc-top"><span class="rc-ic">' + ic(x.i, 22) + '</span><b class="rc-n">' + d.count + '</b></div>' +
        '<h3>' + x.t + '</h3><p class="rc-s">' + (d.note || x.s) + '</p><ul class="rc-pre">' + pre + '</ul>' +
        '<button type="button" class="rc-open" data-act="rm-open" data-v="' + x.id + '"><span>Ochish</span>' + ic('arrow', 16) + '</button></article>';
    }).join('');
    return '<div class="page-head"><div><h1>Eslatmalar</h1><p>Muddatlar, shaxsiy ishlar va tug\'ilgan kunlar bir joyda.</p></div>' +
      '<button type="button" class="btn primary" data-act="rm-add" data-kind="">' + ic('plus', 18) + "Eslatma qo'shish</button></div>" +
      '<div class="tiles rm-tiles"><div class="tile big"><span>Diqqat talab qiladi (' + lead + ' kun ichida)</span><b class="' + (up ? 'bad' : 'g') + '">' + up + ' ta</b></div>' +
      '<div class="tile"><span>Bugun</span><b>' + today + '</b></div><div class="tile"><span>7 kun ichida</span><b>' + week + '</b></div><div class="tile"><span>Bajarilgan</span><b>' + (C.remDone(S, 'personal').length + C.remDone(S, 'other').length) + '</b></div></div>' +
      '<div class="rc-grid">' + cards + '</div>';
  }

  /* ---------- ichki sahifalar ---------- */
  function debtTicket(d, type) {
    var n = -C.daysTo(d.due), owed = type === 'owed', over = n > 0;
    return '<article class="rt ' + (over ? 'bad' : 'soon') + '"><div class="rt-date"><b>' + Math.abs(C.daysTo(d.due)) + '</b><small>' + (over ? "kun o'tdi" : 'kun qoldi') + '</small></div>' +
      '<div class="rt-body"><div class="rt-title"><h3>' + esc(d.person) + '</h3></div>' +
      '<p class="rt-sub"><b>' + U.money(C.rem(d), d.cur) + '</b> · muddat ' + U.short(d.due) + (d.note ? ' · ' + esc(d.note) : '') + '</p>' +
      '<div class="rt-act">' + (owed ? '<button type="button" class="btn sm" data-act="msg" data-id="' + d.id + '">' + ic('tg', 15) + 'Xabar</button>' : '') +
      '<button type="button" class="btn sm ok" data-act="cf-pay" data-id="' + d.id + '">' + ic('swap', 15) + (owed ? 'Qaytdi' : "To'lov") + '</button>' +
      '<button type="button" class="btn sm" data-act="remind" data-id="' + d.id + '">' + ic('bell', 15) + 'Eslatma</button></div></div></article>';
  }
  function remTicket(it, done) {
    var r = it.r || it, date = it.date || r.date, n = it.n, birth = r.kind === 'birthday', dd = U.parse(date);
    var sub = [];
    if (birth) { var age = C.age(r); sub.push(age ? age + " yoshga to'ladi" : "Tug'ilgan kun"); }
    if (r.time) sub.push(ic('clock', 13) + ' ' + r.time);
    if (r.repeat && r.repeat !== 'none' && !birth) sub.push(ic('repeat', 13) + ' ' + C.repeatLabel(r.repeat).toLowerCase());
    var subHtml = sub.map(function (x) { return '<span>' + x + '</span>'; }).join('');
    var act = done ? '<button type="button" class="btn sm" data-act="rm-reopen" data-id="' + r.id + '">Qaytarish</button>' :
      (birth ? '<button type="button" class="btn sm" data-act="rm-wish" data-id="' + r.id + '">' + ic('gift', 15) + 'Tabrik</button>' : '') +
      '<button type="button" class="btn sm ok" data-act="rm-done" data-id="' + r.id + '">' + ic('check', 15) + (birth ? 'Tabrikladim' : 'Bajarildi') + '</button>';
    return '<article class="rt ' + (done ? 'done' : state(n)) + (birth ? ' birth' : '') + '"><div class="rt-date"><b>' + dd.getDate() + '</b><small>' + U.MS[dd.getMonth()] + '</small></div>' +
      '<div class="rt-body"><div class="rt-title"><h3>' + esc(r.text) + '</h3>' + (done ? '<span class="chip done">Bajarildi</span>' : countdown(n)) + '</div>' +
      (subHtml ? '<p class="rt-sub">' + subHtml + '</p>' : '') + (r.note ? '<p class="rt-note">' + esc(r.note) + '</p>' : '') +
      '<div class="rt-act">' + act + '<button type="button" class="btn sm" data-act="rm-edit" data-id="' + r.id + '">' + ic('edit', 15) + 'Tahrirlash</button></div></div></article>';
  }
  function group(title, html, cls) { return html ? '<section class="rt-group ' + (cls || '') + '"><h2>' + title + '</h2><div class="rt-list">' + html + '</div></section>' : ''; }
  function emptyBox(text, kind) {
    return '<div class="empty"><img src="assets/images/empty.svg" alt="" width="180" height="112"><p>' + text + '</p>' + (kind ? '<button type="button" class="btn primary" data-act="rm-add" data-kind="' + kind + '">' + ic('plus', 18) + "Qo'shish</button>" : '') + '</div>';
  }

  function detail(S, id) {
    var x = sec(id), body = '', lead = S.profile.lead;
    if (id === 'owe' || id === 'owed') {
      var over = C.overdueDebts(S, id), soon = C.soonDebts(S, id, 7);
      body = group("Muddati o'tgan", over.map(function (d) { return debtTicket(d, id); }).join(''), 'bad') + group('Tez orada (7 kun ichida)', soon.map(function (d) { return debtTicket(d, id); }).join(''), 'soon') +
        (over.length || soon.length ? '' : emptyBox(id === 'owe' ? "Muddati o'tgan qarzingiz yo'q. Ajoyib!" : "Muddati o'tgan haq yo'q."));
      body += '<a class="more" href="#' + (id === 'owe' ? 'qarzlarim' : 'haqlarim') + '">' + (id === 'owe' ? 'Barcha qarzlarim' : 'Barcha haqlarim') + ' ' + ic('arrow', 16) + '</a>';
    } else {
      var items = C.remItems(S, id), od = items.filter(function (i) { return i.n < 0; }), up = items.filter(function (i) { return i.n >= 0; }), done = C.remDone(S, id).slice(0, 8);
      body = group(id === 'birthday' ? 'Yaqinlashayotganlar' : "Muddati o'tgan", (id === 'birthday' ? '' : od.map(function (i) { return remTicket(i); }).join('')), 'bad') +
        group(id === 'birthday' ? "Barcha tug'ilgan kunlar" : 'Kutilmoqda', (id === 'birthday' ? items : up).map(function (i) { return remTicket(i); }).join(''), '') +
        group('Bajarilgan', done.map(function (r) { return remTicket(r, true); }).join(''), 'done');
      if (!items.length && !done.length) body = emptyBox(id === 'birthday' ? "Tug'ilgan kunlar hali qo'shilmagan." : 'Hozircha eslatma yo\'q.', id);
    }
    return '<div class="page-head"><div><button type="button" class="btn sm back" data-act="rm-back">' + ic('back', 15) + 'Eslatmalar</button><h1 class="rm-h">' + x.t + '</h1><p>' + x.s + '</p></div>' +
      (x.add ? '<button type="button" class="btn primary" data-act="rm-add" data-kind="' + id + '">' + ic('plus', 18) + "Qo'shish</button>" : '') + '</div>' + body;
  }

  Q.views.rem = function (S) { return V.sec ? detail(S, V.sec) : overview(S); };
  Q.rem = { isDetail: function () { return !!V.sec; }, reset: function () { V.sec = null; } };

  /* ---------- forma ---------- */
  function formHTML(kind, r) {
    var edit = !!r, fixed = !!kind || edit;
    kind = edit ? r.kind : (kind || 'personal');
    r = r || { text: '', date: U.today(), time: '', repeat: 'none', note: '', phone: '', tg: '' };
    var kinds = fixed ? '<input type="hidden" name="k" value="' + kind + '">' : '<div class="field"><span class="lbl">Qaysi turdagi eslatma?</span><div class="choices">' +
      Object.keys(C.REM_KINDS).map(function (k) { return '<label class="choice"><input type="radio" name="k" value="' + k + '"' + (k === kind ? ' checked' : '') + '><span>' + C.REM_KINDS[k] + '</span></label>'; }).join('') + '</div></div>';
    return '<div class="sh"><div><p class="eyebrow">' + (edit ? 'Tahrirlash' : 'Yangi eslatma') + '</p><h2 id="rm-title">' + (edit ? 'Eslatmani tahrirlash' : "Eslatma qo'shish") + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<form data-form="rem" data-id="' + (edit ? r.id : '') + '" novalidate>' + kinds +
      '<div class="field"><label for="rm-text" id="rm-textLbl">Nima haqida eslatilsin?</label><input id="rm-text" name="text" autocomplete="off" value="' + esc(r.text) + '" placeholder="Masalan: shifokorga borish"></div>' +
      '<div class="grid2"><div class="field"><label for="rm-date" id="rm-dateLbl">Sana</label><input id="rm-date" name="date" type="date" value="' + esc(r.date) + '"></div>' +
      '<div class="field" data-for="personal other"><label for="rm-time">Vaqt (ixtiyoriy)</label><input id="rm-time" name="time" type="time" value="' + esc(r.time || '') + '"></div></div>' +
      '<div class="field" data-for="personal other"><span class="lbl">Takrorlansinmi?</span><div class="choices">' + C.REPEATS.map(function (x) { return '<label class="choice"><input type="radio" name="repeat" value="' + x[0] + '"' + ((r.repeat || 'none') === x[0] ? ' checked' : '') + '><span>' + x[1] + '</span></label>'; }).join('') + '</div></div>' +
      '<div class="grid2" data-for="birthday"><div class="field"><label for="rm-phone">Telefon raqami</label><input id="rm-phone" name="phone" type="tel" autocomplete="off" placeholder="+998 90 123 45 67" value="' + esc(r.phone || '') + '"></div>' +
      '<div class="field"><label for="rm-tg">Telegram (raqam yoki @username)</label><input id="rm-tg" name="tg" autocomplete="off" placeholder="@username" value="' + esc(r.tg || '') + '"></div></div>' +
      '<div class="field"><label for="rm-note">Izoh</label><textarea id="rm-note" name="note" placeholder="Qo\'shimcha ma\'lumot">' + esc(r.note || '') + '</textarea></div>' +
      '<p class="err" id="rm-err" role="alert" hidden></p>' +
      '<div class="btns" id="rm-btns"><button type="submit" class="btn primary">Saqlash</button>' + (edit ? '<button type="button" class="btn danger" data-act="rm-askdel" data-id="' + r.id + '">' + "O'chirish</button>" : '<button type="button" class="btn" data-sheet-close>Bekor qilish</button>') + '</div></form>';
  }
  function applyKind(f) {
    if (!f) return;
    var k = f.elements.k.length ? (f.querySelector('input[name="k"]:checked') || {}).value : f.elements.k.value;
    [].slice.call(f.querySelectorAll('[data-for]')).forEach(function (el) { el.hidden = el.dataset['for'].split(' ').indexOf(k) < 0; });
    var b = k === 'birthday';
    $('#rm-textLbl').textContent = b ? "Kimning tug'ilgan kuni?" : 'Nima haqida eslatilsin?';
    $('#rm-dateLbl').textContent = b ? "Tug'ilgan sana" : 'Sana';
    f.elements.text.placeholder = b ? 'Masalan: Aziz Karimov' : 'Masalan: shifokorga borish';
  }
  function openForm(kind, r) { ui.sheet(formHTML(kind, r), true); applyKind($('form[data-form="rem"]')); }

  function wishSheet(r) {
    var name = r.text.trim().split(/\s+/)[0], text = "Tug'ilgan kuningiz bilan, " + name + "! Sizga sog'lik, baxt va omad tilayman. Yangi yoshingiz muborak bo'lsin!";
    var phone = U.digits(r.phone) ? '+' + U.digits(r.phone) : '', tg = U.tgInfo(r.tg);
    var sms = phone ? 'sms:' + phone + '?&body=' + encodeURIComponent(text) : '', tgu = tg.url || '';
    return '<div class="sh"><div><p class="eyebrow">Tabrik</p><h2>' + esc(r.text) + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<div class="field"><label for="rm-wishText">Tabrik matni</label><textarea id="rm-wishText">' + esc(text) + '</textarea></div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="rm-copy">Nusxalash</button>' + (sms ? '<a class="btn" href="' + esc(sms) + '">SMS ilovasida ochish</a>' : '') +
      (tgu ? '<a class="btn" href="' + esc(tgu) + '" target="_blank" rel="noopener">Telegramda ochish</a>' : '') + '</div>' +
      (sms || tgu ? '' : '<p class="note" style="margin-top:12px">Telefon yoki Telegram kiritilmagan. Matnni nusxalab o\'zingiz yuborishingiz mumkin.</p>');
  }

  /* ---------- hodisalar ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act; if (a.indexOf('rm-') !== 0) return;
    var id = el.dataset.id, r = id ? Q.db.reminder(id) : null;
    if (a === 'rm-open') { V.sec = el.dataset.v; Q.app.render(); window.scrollTo(0, 0); }
    else if (a === 'rm-back') { V.sec = null; Q.app.render(); window.scrollTo(0, 0); }
    else if (a === 'rm-add') openForm(el.dataset.kind || (V.sec && sec(V.sec).add ? V.sec : ''));
    else if (a === 'rm-edit' && r) openForm('', r);
    else if (a === 'rm-done' && r) {
      var was = r.kind === 'birthday', rep = r.repeat && r.repeat !== 'none';
      Q.db.completeReminder(id); Q.app.render();
      ui.toast(was ? 'Tabriklandi deb belgilandi' : rep ? 'Bajarildi. Keyingisi: ' + U.long(Q.db.reminder(id).date) : 'Bajarildi');
    }
    else if (a === 'rm-reopen' && r) { Q.db.reopenReminder(id); Q.app.render(); ui.toast('Qaytarildi'); }
    else if (a === 'rm-askdel' && r) {
      $('#rm-btns').innerHTML = '<p class="err" style="width:100%;margin:0">Bu eslatma o\'chadi. Davom etasizmi?</p><button type="button" class="btn danger-solid" data-act="rm-del" data-id="' + r.id + '">Ha, o\'chirish</button><button type="button" class="btn" data-act="rm-edit" data-id="' + r.id + '">Yo\'q</button>';
    }
    else if (a === 'rm-del' && r) { Q.db.removeReminder(id); ui.close(); Q.app.render(); ui.toast("O'chirildi"); }
    else if (a === 'rm-wish' && r) ui.sheet(wishSheet(r));
    else if (a === 'rm-copy') { var t = $('#rm-wishText'); ui.copy(t.value, t).then(function (ok) { ui.toast(ok ? 'Matn nusxalandi' : 'Matnni belgilab nusxalang'); }); }
  });
  document.addEventListener('change', function (ev) { if (ev.target.name === 'k' && ev.target.form && ev.target.form.dataset.form === 'rem') applyKind(ev.target.form); });
  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('form[data-form="rem"]'); if (!f) return;
    ev.preventDefault();
    var v = f.elements, kind = f.querySelector('input[name="k"]:checked') ? f.querySelector('input[name="k"]:checked').value : v.k.value, err = $('#rm-err'), birth = kind === 'birthday';
    var text = v.text.value.trim(), tg = birth ? v.tg.value.trim() : '', phone = birth ? v.phone.value.trim() : '';
    var msg = !text ? (birth ? "Kimning tug'ilgan kuni ekanini yozing." : 'Nima haqida eslatilishini yozing.') : !v.date.value ? 'Sanani tanlang.' :
      !U.phoneOk(phone) ? "Telefon raqami noto'g'ri. Kamida 9 ta raqam kiriting." : (tg && U.tgInfo(tg).kind === 'bad') ? "Telegram username 5-32 belgidan iborat bo'lishi kerak yoki telefon raqami kiriting." : '';
    if (msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
    var data = { kind: kind, text: text, date: v.date.value, note: v.note.value.trim(), time: birth ? '' : v.time.value, repeat: birth ? 'yearly' : (f.querySelector('input[name="repeat"]:checked') || {}).value || 'none', phone: phone, tg: tg };
    if (f.dataset.id) { var old = Q.db.reminder(f.dataset.id); if (old && old.date !== data.date) data.done = false; Q.db.updateReminder(f.dataset.id, data); }
    else Q.db.addReminder(data);
    V.sec = kind === 'personal' || kind === 'birthday' || kind === 'other' ? (V.sec || null) : V.sec;
    ui.close(); Q.app.render(); ui.toast(f.dataset.id ? 'Saqlandi' : "Eslatma qo'shildi");
  });
})(window.QD = window.QD || {});

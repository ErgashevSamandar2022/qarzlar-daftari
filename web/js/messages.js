/* messages.js: Xabarlar bo'limi.
   Xabar yuborilgan har bir odam uchun bitta karta: kim, qaysi kanal (Telegram yoki SMS) va xabar yuborildimi.
   Kartani bossangiz, shu odamga yuborilgan barcha xabarlar va qarz ma'lumotlari ochiladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }
  Q.views = Q.views || {};
  var V = { f: 'all', q: '' };

  function ts(m) { return m.sentAt || m.at; }
  function when(m) {
    var d = new Date(ts(m)), n = U.diff(U.today(), U.iso(d));
    return (n <= 0 ? 'Bugun' : n === 1 ? 'Kecha' : n + ' kun oldin') + ' · ' + U.short(U.iso(d)) + ', ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  }
  /* "telegramdan xabar yuborildi" ko'rinishidagi qisqa jumla */
  function line(m) {
    var sent = m.status === 'sent';
    return m.channel === 'telegram' ? (sent ? 'telegramdan xabar yuborildi' : 'telegram uchun xabar tayyorlandi, hali yuborilmagan') : (sent ? 'SMS orqali xabar yuborildi' : 'SMS uchun xabar tayyorlandi, hali yuborilmagan');
  }
  function chIc(ch, n) { return ic(ch === 'telegram' ? 'tg' : 'phone', n || 15); }
  function chip(cls, t) { return '<span class="chip ' + cls + '">' + t + '</span>'; }

  function groups(S) {
    var map = {}, list = [];
    S.messages.forEach(function (m) {
      var k = m.debtId || m.person;
      if (!map[k]) { map[k] = { key: k, person: m.person, debtId: m.debtId, msgs: [] }; list.push(map[k]); }
      map[k].msgs.push(m);
    });
    list.forEach(function (g) {
      g.msgs.sort(function (a, b) { return ts(a) < ts(b) ? 1 : -1; });
      g.last = g.msgs[0];
      g.sent = g.msgs.filter(function (m) { return m.status === 'sent'; }).length;
      g.draft = g.msgs.length - g.sent;
      g.tg = g.msgs.filter(function (m) { return m.channel === 'telegram'; }).length;
      g.sms = g.msgs.length - g.tg;
    });
    return list.sort(function (a, b) { return ts(a.last) < ts(b.last) ? 1 : -1; });
  }
  function visible(S) {
    var q = V.q.trim().toLowerCase();
    return groups(S).filter(function (g) {
      if (V.f === 'telegram' && !g.tg) return false;
      if (V.f === 'sms' && !g.sms) return false;
      if (V.f === 'draft' && !g.draft) return false;
      return !q || (g.person + ' ' + g.msgs.map(function (m) { return m.text; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
  }

  function cardHTML(g) {
    var m = g.last, sent = m.status === 'sent';
    var quote = m.text.length > 96 ? m.text.slice(0, 96).replace(/\s+\S*$/, '') + '…' : m.text;
    return '<article class="mc ' + m.channel + (sent ? '' : ' draft') + '">' +
      '<div class="mc-top"><span class="ava">' + esc(U.ini(g.person)) + '</span><div class="mid"><h3 class="nm">' + esc(g.person) + '</h3>' +
      '<p class="mc-line"><span class="mc-ch">' + chIc(m.channel) + '</span><span>' + line(m) + '</span></p></div></div>' +
      '<div class="mc-meta">' + chip(sent ? 'done' : 'warn', sent ? 'Yuborildi' : 'Tayyor') + '<span class="sub">' + when(m) + '</span></div>' +
      '<blockquote class="mc-quote">' + esc(quote) + '</blockquote>' +
      '<div class="mc-foot"><span><b>' + g.msgs.length + '</b> ta xabar</span>' + (g.tg ? '<span>' + chIc('telegram', 13) + g.tg + '</span>' : '') + (g.sms ? '<span>' + chIc('sms', 13) + g.sms + '</span>' : '') + '</div>' +
      '<button type="button" class="rc-open" data-act="ms-open" data-k="' + esc(g.key) + '"><span>Batafsil</span>' + ic('arrow', 16) + '</button></article>';
  }
  function listHTML(S) {
    var l = visible(S);
    if (l.length) return l.map(cardHTML).join('');
    return '<div class="empty" style="grid-column:1/-1"><img src="assets/images/empty.svg" alt="" width="180" height="112"><p>' + (S.messages.length ? 'Hech narsa topilmadi.' : "Hali xabar yuborilmagan. Haqlarim bo'limidagi qarz kartasidan «Xabar» tugmasini bosing.") + '</p></div>';
  }

  Q.views.msg = function (S) {
    var st = C.messageStats(S), tg = S.messages.filter(function (m) { return m.channel === 'telegram'; }).length;
    var tabs = [['all', 'Hammasi'], ['telegram', 'Telegram'], ['sms', 'SMS'], ['draft', 'Yuborilmagan']];
    return '<div class="page-head"><div><h1>Xabarlar</h1><p>Qarzdorlarga yuborilgan va tayyorlangan xabarlar.</p></div></div>' +
      '<div class="tiles ms-tiles"><div class="tile big"><span>Shu oy yuborilgan</span><b class="g">' + st.sentThisMonth + ' ta</b></div>' +
      '<div class="tile"><span>Yuborilmagan</span><b class="' + (st.drafts ? 'warn' : '') + '">' + st.drafts + '</b></div>' +
      '<div class="tile"><span>Telegram</span><b>' + tg + '</b></div><div class="tile"><span>SMS</span><b>' + (S.messages.length - tg) + '</b></div></div>' +
      '<div class="tabs" role="group" aria-label="Filtr">' + tabs.map(function (t) { return '<button type="button" data-act="ms-filter" data-v="' + t[0] + '" aria-pressed="' + (V.f === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="search"><input id="mssearch" type="search" placeholder="Ism yoki xabar matni bo\'yicha qidirish" value="' + esc(V.q) + '" aria-label="Qidirish" autocomplete="off"></div>' +
      '<div class="ms-grid" id="mslist">' + listHTML(S) + '</div>';
  };

  /* ---------- kengaytirilgan ma'lumot ---------- */
  function detail(key) {
    var S = Q.db.state(), g = groups(S).filter(function (x) { return String(x.key) === String(key); })[0];
    if (!g) return null;
    var d = g.debtId ? Q.db.debt(g.debtId) : null, tgi = d ? U.tgInfo(d.tg) : {}, info = '';
    if (d) {
      var owed = d.type === 'owed';
      info = '<div class="cf-linkbox ' + d.type + '"><b>' + (owed ? 'Haqlarim' : 'Qarzlarim') + ' bilan bog\'langan</b>' +
        '<p>Qoldiq ' + U.money(C.rem(d), d.cur) + ' (jami ' + U.money(d.amount, d.cur) + ')' + (d.due ? ' · muddat ' + U.short(d.due) : '') + (C.isClosed(d) ? ' · yopilgan' : '') + '</p>' +
        (d.phone ? '<p>' + ic('phone', 14) + ' ' + esc(d.phone) + '</p>' : '') + (tgi.text && tgi.kind !== 'bad' ? '<p>' + ic('tg', 14) + ' ' + esc(tgi.text) + '</p>' : '') +
        '<a class="btn sm" href="#' + (owed ? 'haqlarim' : 'qarzlarim') + '" data-sheet-close>' + (owed ? 'Haqlarimda ko\'rish' : 'Qarzlarimda ko\'rish') + '</a></div>';
    }
    var tl = g.msgs.map(function (m) {
      var sent = m.status === 'sent';
      return '<li class="tl ' + (sent ? 'sent' : 'draft') + ' ' + m.channel + '"><span class="tl-dot">' + chIc(m.channel, 16) + '</span><div class="tl-body">' +
        '<div class="tl-h"><b>' + (m.channel === 'telegram' ? 'Telegram' : 'SMS') + '</b>' + chip(sent ? 'done' : 'warn', sent ? 'Yuborildi' : 'Tayyor') + '</div>' +
        '<p class="sub">' + line(m) + ' · ' + when(m) + '</p><p class="tl-text">' + esc(m.text) + '</p>' +
        '<div class="rt-act"><button type="button" class="btn sm" data-act="ms-copy" data-id="' + m.id + '">Nusxalash</button>' +
        (sent ? '' : '<button type="button" class="btn sm ok" data-act="ms-sent" data-id="' + m.id + '" data-k="' + esc(key) + '">' + ic('check', 15) + 'Yuborildi deb belgilash</button>') +
        '<button type="button" class="btn sm" data-act="ms-askdel" data-id="' + m.id + '">' + ic('trash', 15) + "O'chirish</button></div></div></li>";
    }).join('');
    return '<div class="sh"><div><p class="eyebrow">Xabarlar tarixi</p><h2>' + esc(g.person) + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<div class="mini-stats"><div><b>' + g.msgs.length + '</b><span>Jami xabar</span></div><div><b>' + g.sent + '</b><span>Yuborilgan</span></div><div><b>' + g.draft + '</b><span>Tayyor</span></div></div>' +
      info + '<h3 class="tl-title">Yuborilgan xabarlar</h3><ol class="tls">' + tl + '</ol>' +
      (d && d.type === 'owed' && !C.isClosed(d) ? '<div class="btns"><button type="button" class="btn primary" data-act="msg" data-id="' + d.id + '">' + ic('tg', 16) + 'Yangi xabar tayyorlash</button></div>' : '');
  }
  function reopen(key) { Q.app.render(); var h = detail(key); if (h) ui.sheet(h, true); else ui.close(); }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act; if (a.indexOf('ms-') !== 0) return;
    if (a === 'ms-open') { var h = detail(el.dataset.k); if (h) ui.sheet(h, true); }
    else if (a === 'ms-filter') { V.f = el.dataset.v; Q.app.render(); }
    else if (a === 'ms-copy') {
      var m = Q.db.state().messages.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (m) ui.copy(m.text, el).then(function (ok) { ui.toast(ok ? 'Matn nusxalandi' : 'Matnni belgilab nusxalang'); });
    }
    else if (a === 'ms-sent') { Q.db.updateMessage(el.dataset.id, { status: 'sent', sentAt: new Date().toISOString() }); ui.toast('Yuborildi deb belgilandi'); reopen(el.dataset.k); }
    else if (a === 'ms-askdel') { el.dataset.act = 'ms-del'; el.textContent = "Ha, o'chirilsin"; el.classList.add('danger'); }
    else if (a === 'ms-del') {
      var k = (Q.db.state().messages.filter(function (x) { return x.id === el.dataset.id; })[0] || {}).debtId;
      var mm = Q.db.state().messages.filter(function (x) { return x.id === el.dataset.id; })[0];
      Q.db.removeMessage(el.dataset.id); ui.toast("O'chirildi"); reopen(mm ? (mm.debtId || mm.person) : k);
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'mssearch') { V.q = ev.target.value; $('#mslist').innerHTML = listHTML(Q.db.state()); }
  });
})(window.QD = window.QD || {});

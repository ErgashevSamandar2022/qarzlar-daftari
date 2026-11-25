/* home.js: Bosh sahifa. Faqat ko'rsatadi, ma'lumot kiritilmaydi.
   Bo'limlar: sof holat, oyma-oy natija, qarzlarim, haqlarim, eslatmalar, xabarlar.
   Hamma summalar yuqori menyudagi tanlangan valyutada (so'm, dollar yoki yevro) ko'rsatiladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ic = U.ic, esc = U.esc;

  function chip(cls, text) { return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + text + '</span>'; }
  function dueChip(n) {
    return n < 0 ? chip('bad', (-n) + " kun o'tgan") : n === 0 ? chip('warn', 'Bugun') : chip(n <= 3 ? 'warn' : '', n + ' kun qoldi');
  }
  /* tanlangan valyutada jami; boshqa valyutadagi qarz bo'lsa, "≈" belgisi qo'yiladi */
  function tot(S, type) {
    var cur = S.profile.cur;
    return (C.mixed(S, type, cur) ? '≈ ' : '') + U.money(C.totalIn(S, type, cur), cur);
  }
  function breakdown(S, type) {
    var o = C.totals(S, type);
    var p = U.CURS.filter(function (k) { return o[k] > 0.005; }).map(function (k) { return U.money(o[k], k); });
    return p.length > 1 ? p.join(' + ') : '';
  }

  /* 1. Sof holat + shu oy muhri */
  function hero(S) {
    var cur = S.profile.cur, a = C.totalIn(S, 'owed', cur), b = C.totalIn(S, 'owe', cur);
    var net = a - b, approx = C.mixed(S, 'owed', cur) || C.mixed(S, 'owe', cur);
    var row = C.monthlyReport(S, 6, cur).slice(-1)[0], ok = row.net >= 0, now = new Date();
    var cls = net > 0.005 ? 'pos' : net < -0.005 ? 'neg' : '';
    var monthName = U.MONTHS[row.m];
    return '<section class="hero" aria-label="Umumiy holat">' +
      '<div class="hero-top"><div class="hero-main">' +
      '<p class="eyebrow">Sof holat · ' + now.getDate() + '-' + U.MONTHS[now.getMonth()] + '</p>' +
      '<p class="hero-num ' + cls + '">' + (approx ? '≈ ' : '') + U.smoney(net, cur) + '</p>' +
      '<p class="hero-sub">Haqlarim − Qarzlarim</p></div>' +
      '<div class="stamp ' + (ok ? 'ok' : 'bad') + '" role="img" aria-label="' + monthName + ' oyi natijasi: ' + (ok ? 'foyda' : 'zarar') + ' ' + U.snum(row.net) + '"><span>' + (ok ? 'FOYDA' : 'ZARAR') + '</span><small>' + monthName + ' · ' + U.snum(row.net) + '</small></div></div>' +
      '<dl class="facts">' +
      '<div><dt>Haqlarim</dt><dd class="g">' + tot(S, 'owed') + '</dd></div>' +
      '<div><dt>Qarzlarim</dt><dd class="r">' + tot(S, 'owe') + '</dd></div>' +
      '<div><dt>Shu oy daromad</dt><dd>' + U.money(row.inc, cur) + '</dd></div>' +
      '<div><dt>Shu oy xarajat</dt><dd>' + U.money(row.out, cur) + '</dd></div>' +
      '</dl></section>';
  }

  /* 2. Oyma-oy natija: ustunli grafik va jadval */
  function chartSVG(rows) {
    var W = 360, H = 212, top = 28, bot = 166, n = rows.length, slot = W / n, bw = 32;
    var mx = 0, mn = 0;
    rows.forEach(function (r) { mx = Math.max(mx, r.net); mn = Math.min(mn, r.net); });
    if (mx === 0 && mn === 0) mx = 1;
    var k = (bot - top) / (mx - mn), zy = top + mx * k, bg = '', bars = '';
    rows.forEach(function (r, i) {
      var cx = slot * i + slot / 2, pos = r.net >= 0, h = r.net === 0 ? 0 : Math.max(Math.abs(r.net) * k, 2);
      var y = pos ? zy - h : zy;
      if (i === n - 1) bg += '<rect class="now" x="' + (slot * i + 3) + '" y="6" width="' + (slot - 6) + '" height="' + (H - 14) + '" rx="10"/>';
      bars += '<rect class="bar ' + (pos ? 'pos' : 'neg') + '" x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + h.toFixed(1) + '" rx="5"/>' +
        '<text class="val" x="' + cx.toFixed(1) + '" y="' + (pos ? y - 6 : y + h + 15).toFixed(1) + '" text-anchor="middle">' + U.compact(r.net) + '</text>' +
        '<text class="mon" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + r.label + '</text>';
    });
    var label = rows.map(function (r) { return r.label + ': ' + (r.net >= 0 ? 'foyda ' : 'zarar ') + U.num(r.net); }).join('; ');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Oyma-oy natija. ' + esc(label) + '">' + bg +
      '<line class="zero" x1="6" x2="' + (W - 6) + '" y1="' + zy.toFixed(1) + '" y2="' + zy.toFixed(1) + '"/>' + bars + '</svg>';
  }
  function resultCard(S) {
    var cur = S.profile.cur, rows = C.monthlyReport(S, 6, cur), inc = 0, out = 0;
    rows.forEach(function (r) { inc += r.inc; out += r.out; });
    var body = rows.slice().reverse().map(function (r, i) {
      var ok = r.net >= 0;
      return '<tr' + (i === 0 ? ' class="now"' : '') + '><td>' + U.MONTHS[r.m] + '</td><td>' + U.num(r.inc) + '</td><td>' + U.num(r.out) + '</td>' +
        '<td class="' + (ok ? 'g' : 'r') + '"><b>' + U.snum(r.net) + '</b></td><td class="st">' + chip(ok ? 'done' : 'bad', ok ? 'Foyda' : 'Zarar') + '</td></tr>';
    }).join('');
    return '<section class="card result" aria-labelledby="h-res"><header class="ph2"><div><h2 id="h-res">Oyma-oy natija</h2>' +
      '<p class="muted">Daromad − xarajat, ' + U.curWord(cur) + '. Olingan va berilgan qarzlar daromad hisoblanmaydi.</p></div><a class="more yr-link" href="#kirim-chiqim" data-act="rp-open">Yillik hisobot ' + ic('arrow', 16) + '</a></header>' +
      '<div class="result-body"><div class="chartbox">' + chartSVG(rows) +
      '<p class="legend"><span><i class="k pos"></i>Foyda</span><span><i class="k neg"></i>Zarar</span><span>Eng oxirgi ustun: joriy oy</span></p></div>' +
      '<div class="tablewrap"><table><thead><tr><th>Oy</th><th>Daromad</th><th>Xarajat</th><th>Natija</th><th class="st">Holat</th></tr></thead><tbody>' + body + '</tbody>' +
      '<tfoot><tr><td>6 oy</td><td>' + U.num(inc) + '</td><td>' + U.num(out) + '</td><td class="' + (inc - out >= 0 ? 'g' : 'r') + '"><b>' + U.snum(inc - out) + '</b></td><td class="st"></td></tr></tfoot></table></div></div></section>';
  }

  /* 3. Qarzlarim va haqlarim */
  function debtPanel(S, type) {
    var isOwe = type === 'owe', cur = S.profile.cur, over = C.overdueCount(S, type);
    var rp = C.repaid(S, type, cur), top = C.topOpen(S, type, 3), bd = breakdown(S, type);
    var people = top.map(function (d) {
      var c = d.due ? dueChip(C.daysTo(d.due)) : chip('', 'Muddatsiz');
      return '<li><span class="ava">' + esc(U.ini(d.person)) + '</span><span class="mid"><span class="nm">' + esc(d.person) + '</span><span class="sub">' + (d.note ? esc(d.note) : U.short(d.date)) + '</span></span>' +
        '<span class="end"><span class="amt">' + U.money(C.rem(d), d.cur) + '</span>' + c + '</span></li>';
    }).join('');
    return '<section class="card panel ' + type + '" aria-labelledby="h-' + type + '">' +
      '<header class="ph2"><span class="pic">' + ic(isOwe ? 'owe' : 'owed', 20) + '</span><div><h2 id="h-' + type + '">' + (isOwe ? 'Qarzlarim' : 'Haqlarim') + '</h2>' +
      '<p class="muted">' + (isOwe ? 'Men qaytarishim kerak' : 'Menga qaytarilishi kerak') + '</p></div></header>' +
      '<p class="big">' + tot(S, type) + '</p>' +
      '<p class="meta">' + C.people(S, type) + ' kishi' + (over ? ' · <b class="bad">' + over + " ta muddati o'tgan</b>" : '') + (bd ? '<br>' + bd : '') + '</p>' +
      (rp.total ? '<div class="progress"><div class="pbar" role="img" aria-label="' + rp.pct + ' foiz qaytarilgan"><i style="width:' + rp.pct + '%"></i></div><p class="muted">' +
        (isOwe ? 'Men qaytarganim: ' : 'Menga qaytarilgani: ') + rp.pct + '% (' + U.num(rp.paid) + ' / ' + U.num(rp.total) + ')</p></div>' : '') +
      (people ? '<ul class="people">' + people + '</ul>' : '<p class="muted none">Ochiq yozuv yo\'q.</p>') +
      '<a class="more" href="#' + (isOwe ? 'qarzlarim' : 'haqlarim') + '">Hammasi ' + ic('arrow', 16) + '</a></section>';
  }

  /* 4. Eslatmalar */
  function remPanel(S) {
    var items = C.upcoming(S, 14).slice(0, 6);
    var list = items.map(function (it) {
      var tone = it.n < 0 ? 'bad' : it.n <= S.profile.lead ? 'warn' : '', title, sub;
      if (it.kind === 'debt') {
        title = esc(it.d.person);
        sub = (it.d.type === 'owed' ? 'Sizga qaytarishi kerak' : 'Siz qaytarishingiz kerak') + ' · ' + U.money(C.rem(it.d), it.d.cur) + (it.d.remind && it.d.remind.on ? ' · kuniga ' + it.d.remind.perDay + ' marta' : '');
      } else {
        title = esc(it.r.text); sub = ({ personal: 'Shaxsiy eslatma', birthday: "Tug'ilgan kun", other: 'Boshqa eslatma' }[it.r.kind] || 'Eslatma') + ' · ' + U.short(it.date) + (it.r.time ? ' · ' + it.r.time : '');
      }
      return '<li class="rm ' + tone + '"><span class="rd"></span><span class="mid"><span class="nm">' + title + '</span><span class="sub">' + sub + '</span></span>' + dueChip(it.n) + '</li>';
    }).join('');
    return '<section class="card panel" aria-labelledby="h-rem"><header class="ph2"><span class="pic">' + ic('bell', 20) + '</span><div><h2 id="h-rem">Eslatmalar</h2><p class="muted">Yaqin 14 kun</p></div></header>' +
      (list ? '<ul class="rems">' + list + '</ul>' : '<p class="muted none">Yaqin kunlarda eslatma yo\'q.</p>') +
      '<a class="more" href="#eslatmalar">Hammasi ' + ic('arrow', 16) + '</a></section>';
  }

  /* 5. Yuborilgan xabarlar */
  function msgPanel(S) {
    var st = C.messageStats(S), last = S.messages.slice(0, 4);
    var list = last.map(function (m) {
      var sent = m.status === 'sent';
      return '<li><span class="mid"><span class="nm">' + esc(m.person) + '</span><span class="sub">' + esc(m.text) + '</span></span>' +
        '<span class="end">' + chip(sent ? 'done' : 'warn', sent ? 'Yuborildi' : 'Tayyor') + '<span class="sub">' + (m.channel === 'telegram' ? 'Telegram' : 'SMS') + ' · ' + U.short(U.iso(new Date(m.at))) + '</span></span></li>';
    }).join('');
    return '<section class="card panel" aria-labelledby="h-msg"><header class="ph2"><span class="pic">' + ic('chat', 20) + '</span><div><h2 id="h-msg">Xabarlar</h2><p class="muted">Qarzdorlarga eslatmalar</p></div></header>' +
      '<div class="mini-stats"><div><b>' + st.sentThisMonth + '</b><span>Shu oy yuborilgan</span></div><div><b>' + st.drafts + '</b><span>Tayyor, yuborilmagan</span></div><div><b>' + st.total + '</b><span>Jami</span></div></div>' +
      (list ? '<ul class="msgs">' + list + '</ul>' : '<p class="muted none">Hali xabar yo\'q.</p>') +
      '<a class="more" href="#xabarlar">Hammasi ' + ic('arrow', 16) + '</a></section>';
  }

  Q.views = Q.views || {};
  Q.views.home = function (S) {
    return '<div class="page-head"><div><h1>Bosh sahifa</h1><p>Hamma ko\'rsatkichlar bir joyda. Bu sahifada ma\'lumot kiritilmaydi.</p></div>' +
      (S.sample ? '<span class="tag">Namuna ma\'lumotlar</span>' : '') + '</div>' +
      hero(S) + resultCard(S) +
      '<div class="two">' + debtPanel(S, 'owe') + debtPanel(S, 'owed') + '</div>' +
      '<div class="two">' + remPanel(S) + msgPanel(S) + '</div>';
  };
})(window.QD = window.QD || {});

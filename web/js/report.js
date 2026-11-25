/* report.js: Kirim-chiqim ichidagi "Yillik hisobot": grafik, jadval, turlar bo'yicha taqsimot va Excel/PDF'ga chiqarish.
   Qarz olish/berish va ularni qaytarish foydaga kirmaydi (alohida ko'rsatiladi). */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ic = U.ic, esc = U.esc, ui = Q.ui;
  var R = { year: new Date().getFullYear() };

  function yearOf(S) { var ys = C.years(S); if (ys.indexOf(R.year) < 0) R.year = ys[ys.length - 1]; return R.year; }
  function colorOf(type, key) {
    var list = type === 'in' ? C.SRC : C.CAT, i;
    for (i = 0; i < list.length; i++) if (list[i][0] === key) return 'var(--k' + (i % 8 + 1) + ')';
    return 'var(--k8)';
  }
  function keys(by) { return Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }); }
  function yearNav(S) {
    var ys = C.years(S), i = ys.indexOf(R.year);
    return '<div class="monthnav" role="group" aria-label="Yil"><button type="button" class="icon-btn" data-act="rp-year" data-d="-1" aria-label="Oldingi yil"' + (i <= 0 ? ' disabled' : '') + '><span class="flip">' + ic('arrow', 18) + '</span></button><b>' + R.year + '</b>' +
      '<button type="button" class="icon-btn" data-act="rp-year" data-d="1" aria-label="Keyingi yil"' + (i >= ys.length - 1 ? ' disabled' : '') + '>' + ic('arrow', 18) + '</button></div>';
  }

  /* ---------- grafik: ikki o'lchamda chiziladi, CSS keraklisini ko'rsatadi ---------- */
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function chart(rep, w, h, cls) {
    var padL = w < 500 ? 34 : 44, padB = 22, padT = 10, iw = w - padL - 6, ih = h - padB - padT, gw = iw / 12, bw = Math.max(5, gw * (w < 500 ? .3 : .27));
    var mx = 0, mn = 0; rep.months.forEach(function (m) { mx = Math.max(mx, m.inc, m.out, m.net); mn = Math.min(mn, m.net); });
    var top = niceMax(mx), floor = mn < 0 ? -niceMax(-mn) : 0, span = top - floor, y = function (v) { return padT + (top - v) / span * ih; };
    var s = '<svg class="yc ' + cls + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + R.year + ' yil: oylar bo\'yicha kirim, chiqim va foyda">', i, t;
    for (i = 0; i <= 4; i++) {
      t = floor + span * i / 4; var yy = y(t);
      s += '<line class="yc-g' + (Math.abs(t) < 1e-9 ? ' z' : '') + '" x1="' + padL + '" x2="' + (w - 4) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/><text class="yc-y" x="' + (padL - 5) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end">' + (t === 0 ? '0' : U.compact(t).replace('+', '')) + '</text>';
    }
    var pts = [];
    rep.months.forEach(function (m, k) {
      var cx = padL + gw * k + gw / 2, z = y(0), cur = k === new Date().getMonth() && R.year === new Date().getFullYear();
      if (m.inc > 0) s += '<rect class="yc-in" x="' + (cx - bw - 1).toFixed(1) + '" y="' + y(m.inc).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, z - y(m.inc)).toFixed(1) + '" rx="2"/>';
      if (m.out > 0) s += '<rect class="yc-out" x="' + (cx + 1).toFixed(1) + '" y="' + y(m.out).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, z - y(m.out)).toFixed(1) + '" rx="2"/>';
      if (m.n) pts.push([cx, y(m.net)]);
      s += '<text class="yc-x' + (cur ? ' now' : '') + '" x="' + cx.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + (w < 500 ? m.label.charAt(0) : m.label) + '</text>';
    });
    if (pts.length > 1) s += '<polyline class="yc-net" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    pts.forEach(function (p) { s += '<circle class="yc-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6"/>'; });
    return s + '</svg>';
  }

  function catList(by, type, total, disp, ap) {
    var ks = keys(by);
    if (!ks.length) return '<p class="cf-none">Bu yilda yozuv yo\'q.</p>';
    return '<ul class="yr-cats">' + ks.map(function (k) {
      var pct = total ? by[k] / total * 100 : 0;
      return '<li><div class="yr-c1"><i style="background:' + colorOf(type, k) + '"></i><span>' + esc(C.labelOf(type, k)) + '</span><small>' + Math.round(pct) + '%</small><b>' + ap + U.money(by[k], disp) + '</b></div><div class="yr-bar"><i style="width:' + pct.toFixed(1) + '%;background:' + colorOf(type, k) + '"></i></div></li>';
    }).join('') + '</ul>';
  }

  function view(S) {
    var year = yearOf(S), disp = S.profile.cur, rep = C.yearReport(S, year, disp), ap = rep.mixed ? '≈ ' : '';
    var tot = rep.months.reduce(function (a, m) { a.inc += m.inc; a.out += m.out; return a; }, { inc: 0, out: 0 });
    var empty = !rep.n;
    var head = '<div class="page-head"><div><button type="button" class="btn sm back" data-act="cf-back">' + ic('back', 15) + 'Kirim-chiqim</button><h1 class="rm-h">Yillik hisobot</h1><p>' + year + '-yil: oyma-oy kirim, chiqim va turlar bo\'yicha taqsimot</p></div>' +
      '<div class="ph-end">' + yearNav(S) + '</div></div>';
    if (empty) return head + '<section class="card"><p class="cf-none">' + year + '-yilda hali kirim-chiqim yozuvi yo\'q.</p></section>';
    var tiles = '<div class="tiles cf-tiles"><div class="tile big"><span>Yillik foyda (qarzsiz)</span><b class="' + (rep.profit < 0 ? 'bad' : 'g') + '">' + ap + U.smoney(rep.profit, disp) + '</b></div>' +
      '<div class="tile"><span>Kirim</span><b>' + ap + U.compact(rep.inc).replace('+', '') + '</b></div><div class="tile"><span>Chiqim</span><b>' + ap + U.compact(rep.out).replace('+', '') + '</b></div>' +
      '<div class="tile"><span>Oyiga o\'rtacha foyda</span><b class="' + (rep.avg < 0 ? 'bad' : '') + '">' + ap + U.compact(rep.avg) + '</b></div></div>';
    var chartCard = '<section class="card yr-chart"><div class="ph2"><h2>Oyma-oy</h2><span class="yr-key"><i class="in"></i>Kirim<i class="out"></i>Chiqim<i class="net"></i>Foyda</span></div>' + chart(rep, 720, 250, 'wide') + chart(rep, 360, 220, 'narrow') + '</section>';
    var notes = '<div class="yr-notes">' +
      '<div class="yr-note g"><span>Eng yaxshi oy</span><b>' + (rep.best ? U.MONTHS[rep.best.m] : '—') + '</b><small>' + (rep.best ? ap + U.smoney(rep.best.net, disp) : '') + '</small></div>' +
      '<div class="yr-note r"><span>Eng og\'ir oy</span><b>' + (rep.worst ? U.MONTHS[rep.worst.m] : '—') + '</b><small>' + (rep.worst ? ap + U.smoney(rep.worst.net, disp) : '') + '</small></div>' +
      '<div class="yr-note"><span>Olingan / to\'langan qarz</span><b>' + ap + U.compact(rep.borrowed).replace('+', '') + ' / ' + U.compact(rep.repaid).replace('+', '') + '</b><small>foydaga kirmaydi</small></div>' +
      '<div class="yr-note"><span>Berilgan / qaytgan haq</span><b>' + ap + U.compact(rep.lent).replace('+', '') + ' / ' + U.compact(rep.gotBack).replace('+', '') + '</b><small>foydaga kirmaydi</small></div></div>';
    var cats = '<div class="two yr-two"><section class="card"><div class="ph2"><h2>Chiqim turlari</h2><b class="r" style="margin-left:auto">' + ap + U.money(rep.out, disp) + '</b></div>' + catList(rep.byOut, 'out', rep.out, disp, ap) + '</section>' +
      '<section class="card"><div class="ph2"><h2>Kirim turlari</h2><b class="g" style="margin-left:auto">' + ap + U.money(rep.inc, disp) + '</b></div>' + catList(rep.byIn, 'in', rep.inc, disp, ap) + '</section></div>';
    var rows = rep.months.map(function (m) {
      return '<tr' + (m.n ? '' : ' class="zero"') + '><td>' + U.MONTHS[m.m] + '</td><td>' + (m.n ? U.num(m.inc) : '—') + '</td><td>' + (m.n ? U.num(m.out) : '—') + '</td><td class="' + (m.net < 0 ? 'r' : 'g') + '">' + (m.n ? '<b>' + U.snum(m.net) + '</b>' : '—') + '</td></tr>';
    }).join('');
    var table = '<section class="card"><div class="ph2"><h2>Jadval</h2><span class="muted" style="margin-left:auto">' + (disp === 'UZS' ? "so'm" : U.CUR_NAME[disp]) + '</span></div><div class="yr-tw"><table class="yr-table"><thead><tr><th>Oy</th><th>Kirim</th><th>Chiqim</th><th>Foyda</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td>Jami</td><td>' + U.num(tot.inc) + '</td><td>' + U.num(tot.out) + '</td><td class="' + (rep.profit < 0 ? 'r' : 'g') + '"><b>' + U.snum(rep.profit) + '</b></td></tr></tfoot></table></div></section>';
    var exp = '<section class="card yr-exp"><div><h2>Hisobotni saqlash</h2><p class="muted">Excel faylda oylar, turlar va barcha yozuvlar alohida varaqlarda. PDF qisqa hisobot: grafik va jadvallar.</p></div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="rp-xlsx">' + ic('save', 16) + 'Excel (.xlsx)</button><button type="button" class="btn" data-act="rp-pdf">' + ic('save', 16) + 'PDF</button></div></section>';
    return head + tiles + chartCard + notes + cats + table + exp;
  }

  /* ---------- eksport ---------- */
  function plainMoney(n, c) { return U.num(n) + ' ' + (c === 'UZS' ? "so'm" : c === 'USD' ? 'USD' : 'EUR'); }
  function exportXlsx(S) {
    var year = yearOf(S), disp = S.profile.cur, rep = C.yearReport(S, year, disp), H = function (t) { return { v: t, s: 'h' }; }, B = function (t) { return { v: t, s: 'b' }; };
    var tot = rep.months.reduce(function (a, m) { a.inc += m.inc; a.out += m.out; return a; }, { inc: 0, out: 0 });
    var m1 = [[B('Yillik hisobot ' + year), '', '', ''], ['Valyuta: ' + (disp === 'UZS' ? "so'm" : disp) + (rep.mixed ? ' (boshqa valyutalar kurs bo\'yicha o\'tkazilgan)' : '')], [], [H('Oy'), H('Kirim'), H('Chiqim'), H('Foyda')]];
    rep.months.forEach(function (m) { m1.push([U.MONTHS[m.m], m.inc, m.out, m.net]); });
    m1.push([B('Jami'), { v: tot.inc, s: 'bn' }, { v: tot.out, s: 'bn' }, { v: rep.profit, s: 'bn' }], [], [B('Qarz harakatlari (foydaga kirmaydi)')], ['Olingan qarz', rep.borrowed], ["Qarz to'langan", rep.repaid], ['Berilgan qarz', rep.lent], ['Berilgan qarz qaytgan', rep.gotBack]);
    var t2 = [[H('Kirim turi'), H('Summa'), H('Ulushi %')]];
    keys(rep.byIn).forEach(function (k) { t2.push([C.labelOf('in', k), rep.byIn[k], rep.inc ? Math.round(rep.byIn[k] / rep.inc * 1000) / 10 : 0]); });
    t2.push([], [H('Chiqim turi'), H('Summa'), H('Ulushi %')]);
    keys(rep.byOut).forEach(function (k) { t2.push([C.labelOf('out', k), rep.byOut[k], rep.out ? Math.round(rep.byOut[k] / rep.out * 1000) / 10 : 0]); });
    var t3 = [[H('Sana'), H('Turi'), H('Nima'), H('Kimdan / kimga'), H('Qayerga'), H('Summa'), H('Valyuta'), H('Hisobda (' + disp + ')'), H('Izoh'), H('Hisoblanishi')]];
    S.entries.filter(function (e) { return e.date.slice(0, 4) === String(year); }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).forEach(function (e) {
      t3.push([e.date, e.type === 'in' ? 'Kirim' : 'Chiqim', C.label(e), e.who || '', e.place || '', e.amount, e.cur, Q.fx.convert(e.amount, e.cur, disp), e.note || '', C.isDebtFlow(e) ? 'Qarz harakati' : 'Foydaga kiradi']);
    });
    var blob = Q.exp.xlsx([{ name: 'Oylar', widths: [18, 18, 18, 18], rows: m1, freeze: 4 }, { name: 'Turlar', widths: [26, 18, 12], rows: t2 }, { name: 'Yozuvlar', widths: [12, 9, 22, 22, 22, 16, 9, 18, 30, 16], rows: t3, freeze: 1 }]);
    return Q.exp.download(blob, 'hisobot-' + year + '.xlsx');
  }
  function exportPdf(S) {
    var year = yearOf(S), disp = S.profile.cur, rep = C.yearReport(S, year, disp), ap = rep.mixed ? '~' : '';
    var tot = rep.months.reduce(function (a, m) { a.inc += m.inc; a.out += m.out; return a; }, { inc: 0, out: 0 });
    var blob = Q.exp.pdf(function (d) {
      d.title('Yillik hisobot ' + year, 'Qarzlar daftari' + (S.profile.name ? ' · ' + S.profile.name : '') + ' · valyuta: ' + (disp === 'UZS' ? "so'm" : disp) + ' · ' + U.today());
      d.kv([['Yillik foyda', ap + plainMoney(rep.profit, disp), rep.profit < 0 ? '#c0362b' : '#0b7a4c'], ['Kirim', ap + plainMoney(rep.inc, disp)], ['Chiqim', ap + plainMoney(rep.out, disp)]]);
      d.h('Oyma-oy kirim va chiqim');
      d.bars(rep.months, function (m) { return m.label; });
      d.table([{ t: 'Oy', w: 2 }, { t: 'Kirim', w: 3, r: true }, { t: 'Chiqim', w: 3, r: true }, { t: 'Foyda', w: 3, r: true }],
        rep.months.map(function (m) { return [U.MONTHS[m.m], m.n ? U.num(m.inc) : '-', m.n ? U.num(m.out) : '-', m.n ? { v: U.snum(m.net), c: m.net < 0 ? '#c0362b' : '#0b7a4c' } : '-']; })
          .concat([['Jami', U.num(tot.inc), U.num(tot.out), { v: U.snum(rep.profit), c: rep.profit < 0 ? '#c0362b' : '#0b7a4c' }]]), { lastBold: true });
      d.h('Chiqim turlari');
      d.table([{ t: 'Tur', w: 4 }, { t: 'Ulushi', w: 1.5, r: true }, { t: 'Summa', w: 3, r: true }], keys(rep.byOut).map(function (k) { return [C.labelOf('out', k), (rep.out ? Math.round(rep.byOut[k] / rep.out * 100) : 0) + '%', U.num(rep.byOut[k])]; }));
      d.h('Kirim turlari');
      d.table([{ t: 'Tur', w: 4 }, { t: 'Ulushi', w: 1.5, r: true }, { t: 'Summa', w: 3, r: true }], keys(rep.byIn).map(function (k) { return [C.labelOf('in', k), (rep.inc ? Math.round(rep.byIn[k] / rep.inc * 100) : 0) + '%', U.num(rep.byIn[k])]; }));
      d.h('Qarz harakatlari (foydaga kirmaydi)');
      d.table([{ t: 'Harakat', w: 4 }, { t: 'Summa', w: 3, r: true }], [['Olingan qarz', U.num(rep.borrowed)], ["Qarz to'langan", U.num(rep.repaid)], ['Berilgan qarz', U.num(rep.lent)], ['Berilgan qarz qaytgan', U.num(rep.gotBack)]]);
      if (rep.mixed) d.p('Boshqa valyutadagi yozuvlar Markaziy bank kursi bo\'yicha hisoblangan.');
    }, 'Yillik hisobot ' + year);
    return Q.exp.download(blob, 'hisobot-' + year + '.pdf');
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act; if (a.indexOf('rp-') !== 0) return;
    var S = Q.db.state();
    if (a === 'rp-year') { var ys = C.years(S), i = ys.indexOf(R.year) + Number(el.dataset.d); if (ys[i]) { R.year = ys[i]; Q.app.render(); } }
    else if (a === 'rp-xlsx') ui.toast(exportXlsx(S) ? 'Excel fayl tayyorlandi' : 'Fayl yuklab olinmadi');
    else if (a === 'rp-pdf') ui.toast(exportPdf(S) ? 'PDF tayyorlandi' : 'Fayl yuklab olinmadi');
    else if (a === 'rp-open') { ev.preventDefault(); Q.cash.openYear(); }
  });

  Q.report = { view: view, xlsx: exportXlsx, pdf: exportPdf };
})(window.QD = window.QD || {});

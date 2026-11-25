/* cashflow.js: Kirim-chiqim bo'limi.
   Ikki karta (kirim va chiqim), oy bo'yicha tarix, formalar va qarzlar bilan bog'lanish:
   - kirim "Qarz olish"      -> Qarzlarimga yangi qarz qo'shiladi
   - chiqim "Qarz berish"    -> Haqlarimga yangi haq qo'shiladi
   - kirim "Qarz qaytdi"     -> tanlangan haqdan to'lov ayriladi
   - chiqim "Qarzni to'lash" -> tanlangan qarzdan to'lov ayriladi */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, F = Q.fx, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }
  Q.views = Q.views || {};

  var V = { ym: C.ym(0), view: null, cat: '', q: '', keep: false };

  /* "Kimdan / kimga" maydonining yorlig'i turga qarab o'zgaradi */
  var WHO = {
    'in:': 'Kimdan keldi (ixtiyoriy)', 'in:oylik': 'Ish joyi (ixtiyoriy)', 'in:biznes': 'Mijoz yoki manba (ixtiyoriy)',
    'in:qarz_olish': 'Kimdan yoki qaysi bankdan olindi?', 'in:qarz_qaytdi': 'Kim qaytardi (ixtiyoriy)',
    'out:': 'Ismi (ixtiyoriy)', 'out:qarz_berish': 'Kimga qarz berildi?', 'out:qarz_tolash': "Kimga to'landi (ixtiyoriy)"
  };
  var INFO = {
    qarz_olish: "Bu pul Kirimga yoziladi va Qarzlarimga yangi qarz bo'lib qo'shiladi. Foydaga hisoblanmaydi.",
    qarz_berish: "Bu pul Chiqimga yoziladi va Haqlarimga qo'shiladi, chunki qaytishi mumkin. Foydadan ayrilmaydi.",
    qarz_qaytdi: "Tanlangan haqning qoldig'i kamayadi. Foydaga hisoblanmaydi.",
    qarz_tolash: "Tanlangan qarzning qoldig'i kamayadi. Xarajat hisoblanmaydi."
  };

  function monthLabel(ym) { var p = ym.split('-'); return U.MONTHS[Number(p[1]) - 1] + ' ' + p[0]; }
  function shiftYm(ym, d) { var p = ym.split('-'), x = new Date(Number(p[0]), Number(p[1]) - 1 + d, 1); return x.getFullYear() + '-' + U.pad(x.getMonth() + 1); }
  function isNow(ym) { return ym >= C.ym(0); }

  /* ---------- sahifa qismlari ---------- */
  function amountHTML(e, disp) {
    var eq = e.cur !== disp ? '<small>≈ ' + U.money(F.convert(e.amount, e.cur, disp), disp) + '</small>' : '';
    return '<span class="cf-amt ' + (e.type === 'in' ? 'g' : 'r') + '"><b>' + (e.type === 'in' ? '+' : '−') + ' ' + U.money(e.amount, e.cur) + '</b>' + eq + '</span>';
  }
  function linkChip(e) {
    var rc = e.rec ? '<span class="lk rec">' + ic('repeat', 13) + "<span>Doimiy to'lov</span></span>" : '';
    if (!e.link) return rc;
    var d = Q.db.debt(e.link.debtId); if (!d) return '';
    var owe = d.type === 'owe';
    var txt = e.link.made ? (owe ? 'Qarzlarimga yozildi' : 'Haqlarimga yozildi') : (owe ? 'Qarzlarimdan ayrildi' : 'Haqlarimdan ayrildi');
    return '<a class="lk ' + d.type + '" href="#' + (owe ? 'qarzlarim' : 'haqlarim') + '">' + ic('swap', 13) + '<span>' + txt + ' · ' + esc(d.person) + '</span></a>' + rc;
  }
  /* kategoriya rangi: calc.js dagi tartib bo'yicha --k1 ... --k8 */
  function kc(type, key) {
    var list = type === 'in' ? C.SRC : C.CAT, i;
    for (i = 0; i < list.length; i++) if (list[i][0] === key) return 'var(--k' + (i % 8 + 1) + ')';
    return 'var(--k8)';
  }
  function sortedKeys(by) { return Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }); }
  /* aylana diagramma: har bir tur o'z rangida */
  function donut(by, type, total) {
    var keys = sortedKeys(by), acc = 0;
    var segs = total > 0 ? keys.map(function (k) {
      var pct = by[k] / total * 100, gap = keys.length > 1 ? Math.min(.8, pct / 3) : 0;
      var c = '<circle class="dn-s" cx="21" cy="21" r="15.9155" stroke="' + kc(type, k) + '" stroke-dasharray="' + (pct - gap).toFixed(3) + ' ' + (100 - pct + gap).toFixed(3) + '" stroke-dashoffset="' + (25 - acc).toFixed(3) + '"/>';
      acc += pct; return c;
    }).join('') : '';
    return '<svg class="dn" viewBox="0 0 42 42" role="img" aria-label="Turlar bo\'yicha ulush"><circle class="dn-bg" cx="21" cy="21" r="15.9155"/>' + segs +
      '<text x="21" y="20" class="dn-l">Jami</text><text x="21" y="25.6" class="dn-v">' + (total > 0 ? U.compact(total).replace('+', '') : '0') + '</text></svg>';
  }
  function legend(by, type, total, disp, pick) {
    return '<ul class="lg">' + sortedKeys(by).map(function (k) {
      var pct = total ? Math.round(by[k] / total * 100) : 0, dbt = k.indexOf('qarz_') === 0;
      var inner = '<i style="background:' + kc(type, k) + '"></i><span class="lg-l">' + esc(C.labelOf(type, k)) + (dbt ? '<em>qarz</em>' : '') + '</span><small>' + pct + '%</small><b>' + U.money(by[k], disp) + '</b>';
      return pick ? '<li><button type="button" class="lg-b' + (V.cat === k ? ' on' : '') + '" data-act="cf-cat" data-k="' + k + '" aria-pressed="' + (V.cat === k) + '">' + inner + '</button></li>' : '<li class="lg-i">' + inner + '</li>';
    }).join('') + '</ul>';
  }

  function ledgerRow(e, disp) {
    var d = U.parse(e.date), sub = [e.who, e.place, e.note].filter(Boolean).join(' · ');
    return '<li class="cf-row"><button type="button" class="cf-main" data-act="cf-open" data-id="' + e.id + '">' +
      '<span class="dtab" style="--kc:' + kc(e.type, C.key(e)) + '"><b>' + d.getDate() + '</b><small>' + U.MS[d.getMonth()] + '</small></span>' +
      '<span class="cf-mid"><b>' + esc(C.label(e)) + '</b>' + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</span>' + amountHTML(e, disp) + '</button>' + linkChip(e) + '</li>';
  }

  /* umumiy ko'rinishdagi karta: aylana diagramma + eng katta uchta tur */
  function summaryCard(S, type, sum, disp, mixed) {
    var inn = type === 'in', all = C.monthEntries(S, V.ym).filter(function (e) { return e.type === type; });
    var total = inn ? sum.inc : sum.out, by = inn ? sum.byIn : sum.byOut, ap = mixed ? '≈\u00a0' : '', keys = sortedKeys(by).slice(0, 3), top = {};
    keys.forEach(function (k) { top[k] = by[k]; });
    var last = all[0];
    return '<article class="cfc ' + type + '"><header class="cfc-h"><span class="pic">' + ic(inn ? 'owe' : 'owed', 20) + '</span><div><p class="eyebrow ' + (inn ? 'owed' : 'owe') + '">' + (inn ? 'Kirim' : 'Chiqim') + '</p><p class="muted">' + all.length + ' ta yozuv · ' + monthLabel(V.ym) + '</p></div></header>' +
      '<b class="big cfc-total ' + (inn ? 'g' : 'r') + '">' + ap + U.money(total, disp) + '</b>' +
      (all.length ? '<div class="cfc-body"><div class="dn-wrap">' + donut(by, type, total) + '</div>' + legend(top, type, total, disp, false) + '</div>' +
        '<p class="cfc-last">Oxirgisi: <b>' + esc(C.label(last)) + '</b> · ' + U.short(last.date) + '</p>' :
        '<p class="cf-none">' + (inn ? "Bu oyda hali kirim yo'q." : "Bu oyda hali chiqim yo'q.") + '</p>') +
      '<div class="btns cfc-btns"><button type="button" class="btn ' + (inn ? 'primary' : 'danger-solid') + '" data-act="cf-view" data-v="' + type + '"><span>Ichiga kirish</span>' + ic('arrow', 16) + '</button>' +
      '<button type="button" class="btn icon" data-act="cf-add" data-type="' + type + '" aria-label="' + (inn ? "Kirim qo'shish" : 'Chiqim qilish') + '">' + ic('plus', 18) + '</button></div></article>';
  }

  function monthNav() {
    return '<div class="monthnav" role="group" aria-label="Oy"><button type="button" class="icon-btn" data-act="cf-month" data-d="-1" aria-label="Oldingi oy"><span class="flip">' + ic('arrow', 18) + '</span></button>' +
      '<b>' + monthLabel(V.ym) + '</b><button type="button" class="icon-btn" data-act="cf-month" data-d="1" aria-label="Keyingi oy"' + (isNow(V.ym) ? ' disabled' : '') + '>' + ic('arrow', 18) + '</button></div>';
  }

  function filtered(S) {
    var q = V.q.trim().toLowerCase();
    return C.monthEntries(S, V.ym).filter(function (e) {
      if (e.type !== V.view) return false;
      if (V.cat && C.key(e) !== V.cat) return false;
      return !q || [C.label(e), e.who, e.place, e.note].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function historyList(S) {
    var l = filtered(S), disp = S.profile.cur;
    return l.length ? l.map(function (e) { return ledgerRow(e, disp); }).join('') : '<li class="cf-none">Hech narsa topilmadi.</li>';
  }

  function overview(S) {
    var disp = S.profile.cur, sum = C.cashSummary(S, V.ym, disp), mixed = C.mixedEntries(S, V.ym, disp), ap = mixed ? '≈\u00a0' : '';
    return '<div class="page-head"><div><h1>Kirim-chiqim</h1><p>Pul qayerdan kelib, qayerga ketgani. Qarzlar bilan bog\'langan.</p></div><div class="ph-end">' + monthNav() + '<button type="button" class="btn" data-act="cf-view" data-v="year">' + ic('swap', 16) + 'Yillik hisobot</button></div></div>' +
      '<div class="tiles cf-tiles"><div class="tile big"><span>Oy qoldig\'i (kirim − chiqim)</span><b class="' + (sum.net < 0 ? 'bad' : 'g') + '">' + ap + U.smoney(sum.net, disp) + '</b></div>' +
      '<div class="tile"><span>Foyda (qarzsiz)</span><b class="' + (sum.profit < 0 ? 'bad' : 'g') + '">' + ap + U.smoney(sum.profit, disp) + '</b></div>' +
      '<div class="tile"><span>Olingan qarz</span><b>' + ap + U.money(sum.borrowed, disp) + '</b></div>' +
      '<div class="tile"><span>Berilgan qarz</span><b>' + ap + U.money(sum.lent, disp) + '</b></div></div>' +
      '<p class="cf-hint">' + ic('swap', 15) + '<span>Qarz olish yoki berish foydaga kirmaydi: olingan qarz daromad emas, berilgani esa qaytib kelishi mumkin.</span></p>' +
      '<div class="cfc-grid">' + summaryCard(S, 'in', sum, disp, mixed) + summaryCard(S, 'out', sum, disp, mixed) + '</div>' + Q.rec.card(S);
  }

  function detailView(S) {
    var type = V.view, inn = type === 'in', disp = S.profile.cur, sum = C.cashSummary(S, V.ym, disp), mixed = C.mixedEntries(S, V.ym, disp), ap = mixed ? '≈\u00a0' : '';
    var all = C.monthEntries(S, V.ym).filter(function (e) { return e.type === type; }), total = inn ? sum.inc : sum.out, by = inn ? sum.byIn : sum.byOut;
    var big = all.reduce(function (m, e) { return !m || F.convert(e.amount, e.cur, disp) > F.convert(m.amount, m.cur, disp) ? e : m; }, null);
    return '<div class="page-head"><div><button type="button" class="btn sm back" data-act="cf-back">' + ic('back', 15) + 'Kirim-chiqim</button><h1 class="rm-h">' + (inn ? 'Kirim' : 'Chiqim') + '</h1><p>' + (inn ? 'Sizga kelgan pullar' : 'Sarflangan pullar') + ' · ' + monthLabel(V.ym) + '</p></div>' +
      '<div class="ph-end">' + monthNav() + '<button type="button" class="btn ' + (inn ? 'primary' : 'danger-solid') + '" data-act="cf-add" data-type="' + type + '">' + ic('plus', 18) + (inn ? "Kirim qo'shish" : 'Chiqim qilish') + '</button></div></div>' +
      '<div class="tiles cf-tiles ' + (inn ? 'in' : 'out') + '"><div class="tile big"><span>Jami ' + (inn ? 'kirim' : 'chiqim') + '</span><b class="' + (inn ? 'g' : 'bad') + '">' + ap + U.money(total, disp) + '</b></div>' +
      '<div class="tile"><span>Yozuvlar</span><b>' + all.length + '</b></div>' +
      '<div class="tile"><span>Eng kattasi</span><b>' + (big ? U.compact(F.convert(big.amount, big.cur, disp)).replace('+', '') : '—') + '</b></div>' +
      '<div class="tile"><span>' + (inn ? 'Daromad (qarzsiz)' : 'Xarajat (qarzsiz)') + '</span><b>' + ap + U.compact(inn ? sum.incOp : sum.outOp).replace('+', '') + '</b></div></div>' +
      (all.length ? '<section class="card cf-break"><div class="ph2"><h2>Nimalardan' + (inn ? '' : ' va nimaga') + '</h2><span class="muted" style="margin-left:auto">Turni bosib filtrlang</span></div><div class="cfc-body big-dn"><div class="dn-wrap">' + donut(by, type, total) + '</div>' + legend(by, type, total, disp, true) + '</div></section>' : '') +
      '<section class="card" id="cf-history"><div class="ph2"><h2>' + (V.cat ? esc(C.labelOf(type, V.cat)) : 'Barcha yozuvlar') + '</h2>' + (V.cat ? '<button type="button" class="btn sm" style="margin-left:auto" data-act="cf-cat" data-k="">Filtrni olib tashlash</button>' : '') + '</div>' +
      '<div class="search"><input id="cfsearch" type="search" placeholder="Ism, joy yoki izoh bo\'yicha qidirish" value="' + esc(V.q) + '" aria-label="Qidirish" autocomplete="off"></div>' +
      '<ul class="cf-list" id="cflist">' + historyList(S) + '</ul></section>';
  }

  Q.views.cash = function (S) { return V.view === 'year' ? Q.report.view(S) : V.view ? detailView(S) : overview(S); };
  Q.cash = { isDetail: function () { return !!V.view; }, openYear: function () { V.view = 'year'; if (location.hash !== '#kirim-chiqim') { V.keep = true; location.hash = '#kirim-chiqim'; } else { Q.app.render(); window.scrollTo(0, 0); } }, reset: function () { if (V.keep) { V.keep = false; return; } V.view = null; V.cat = ''; V.q = ''; } };

  /* ---------- batafsil oyna ---------- */
  function line(k, v) { return v ? '<div class="dl"><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
  function detailSheet(e) {
    var S = Q.db.state(), disp = S.profile.cur, d = e.link ? Q.db.debt(e.link.debtId) : null, tg = U.tgInfo(e.tg);
    var dbox = '';
    if (d) {
      var owe = d.type === 'owe';
      dbox = '<div class="cf-linkbox ' + d.type + '"><b>' + (owe ? 'Qarzlarim' : 'Haqlarim') + ' bilan bog\'langan</b><p>' + esc(d.person) + ': jami ' + U.money(d.amount, d.cur) + ', qoldiq ' + U.money(C.rem(d), d.cur) + (C.isClosed(d) ? ' (yopilgan)' : '') + '</p>' +
        '<a class="btn sm" href="#' + (owe ? 'qarzlarim' : 'haqlarim') + '" data-sheet-close>' + (owe ? 'Qarzlarimda ko\'rish' : 'Haqlarimda ko\'rish') + '</a></div>';
    }
    return '<div class="sh"><div><p class="eyebrow ' + (e.type === 'in' ? 'owed' : 'owe') + '">' + (e.type === 'in' ? 'Kirim' : 'Chiqim') + '</p><h2>' + esc(C.label(e)) + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<p class="cf-big ' + (e.type === 'in' ? 'g' : 'r') + '">' + (e.type === 'in' ? '+ ' : '− ') + U.money(e.amount, e.cur) + (e.cur !== disp ? '<small>≈ ' + U.money(F.convert(e.amount, e.cur, disp), disp) + '</small>' : '') + '</p>' +
      '<dl class="dls">' + line('Sana', U.long(e.date) + ' ' + e.date.slice(0, 4)) + line(e.type === 'in' ? 'Kimdan' : 'Kimga', esc(e.who)) + line('Qayerga', esc(e.place)) +
      line('Telefon', esc(e.phone)) + line('Telegram', tg.kind && tg.kind !== 'bad' ? esc(tg.text) : esc(e.tg)) + line('Izoh', esc(e.note)) + '</dl>' + dbox +
      '<div class="btns" id="cf-dbtns"><button type="button" class="btn" data-act="cf-edit" data-id="' + e.id + '">' + ic('edit', 15) + 'Tahrirlash</button><button type="button" class="btn danger" data-act="cf-askdel" data-id="' + e.id + '">O\'chirish</button></div>';
  }
  function delText(e) {
    var d = e.link ? Q.db.debt(e.link.debtId) : null;
    if (!d) return "Bu yozuv o'chadi.";
    if (e.link.made) return "Bu yozuv bilan birga «" + d.person + "» qarzi ham " + (d.type === 'owe' ? 'Qarzlarimdan' : 'Haqlarimdan') + " o'chadi.";
    var p = d.payments.filter(function (x) { return x.id === e.link.paymentId; })[0];
    return "Bu yozuv o'chadi va «" + d.person + "» qarzining qoldig'i " + (p ? U.money(p.amount, d.cur) : '') + " ga oshadi.";
  }

  /* ---------- forma ---------- */
  function formHTML(type, key, debtId) {
    var S = Q.db.state(), inn = type === 'in', list = inn ? C.SRC : C.CAT, debt = debtId ? Q.db.debt(debtId) : null;
    key = key || list[0][0];
    var cur = debt ? debt.cur : S.profile.cur, amount = debt ? C.rem(debt) : '', payKey = inn ? 'qarz_qaytdi' : 'qarz_tolash';
    var open = C.openDebts(S, inn ? 'owed' : 'owe');
    var chips = '<div class="choices cf-keys">' + list.map(function (x) {
      return '<label class="choice' + (x[0].indexOf('qarz_') === 0 ? ' dbt' : '') + '"><input type="radio" name="k" value="' + x[0] + '"' + (x[0] === key ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
    }).join('') + '</div>';
    var sel = '<div class="field" data-for="' + payKey + '"><label for="cf-debt">' + (inn ? 'Qaysi haq qaytdi?' : "Qaysi qarz to'landi?") + '</label>' +
      (open.length ? '<select id="cf-debt" name="debt"><option value="">Tanlang</option>' + open.map(function (d) {
        return '<option value="' + d.id + '"' + (debt && debt.id === d.id ? ' selected' : '') + '>' + esc(d.person) + ' · qoldiq ' + U.money(C.rem(d), d.cur) + '</option>';
      }).join('') + '</select>' : '<p class="note">' + (inn ? "Haqlarimda ochiq qarz yo'q." : "Qarzlarimda ochiq qarz yo'q.") + '</p><input type="hidden" name="debt" value="">') + '</div>';
    var kinds = inn ? '<div class="field" data-for="qarz_olish"><span class="lbl">Qayerdan olindi?</span><div class="choices">' + Q.debtMeta.KINDS.map(function (x, i) {
      return '<label class="choice"><input type="radio" name="kind" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
    }).join('') + '</div></div>' : '';
    var infos = Object.keys(INFO).filter(function (k) { return list.some(function (x) { return x[0] === k; }); }).map(function (k) {
      return '<p class="cf-info ' + (k === 'qarz_olish' || k === 'qarz_tolash' ? 'owe' : 'owed') + '" data-for="' + k + '">' + ic('swap', 15) + '<span>' + INFO[k] + '</span></p>';
    }).join('');
    return '<div class="sh"><div><p class="eyebrow ' + (inn ? 'owed' : 'owe') + '">' + (inn ? 'Kirim' : 'Chiqim') + '</p><h2>' + (inn ? "Kirim qo'shish" : 'Chiqim qilish') + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<form data-form="cash" data-type="' + type + '" novalidate>' +
      '<div class="grid2"><div class="field"><label for="cf-amount">Summa</label><input id="cf-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="500 000" value="' + esc(amount) + '"></div>' +
      '<div class="field"><span class="lbl">Valyuta</span><div class="choices seg3">' + U.CURS.map(function (c) { return '<label class="choice"><input type="radio" name="cur" value="' + c + '"' + (cur === c ? ' checked' : '') + '><span>' + (c === 'UZS' ? "So'm" : U.CUR_SIGN[c]) + '</span></label>'; }).join('') + '</div></div></div>' +
      '<div class="field"><span class="lbl">' + (inn ? 'Bu pul nima?' : 'Nimaga sarflandi?') + '</span>' + chips + '</div>' +
      '<div class="field" data-for="boshqa"><label for="cf-other">Nima ekanini yozing</label><input id="cf-other" name="other" autocomplete="off" placeholder="' + (inn ? 'Masalan: mukofot' : 'Masalan: sovg\'a') + '"></div>' +
      infos + sel + kinds +
      (inn ? '' : '<div class="field" data-not="qarz_berish qarz_tolash"><label for="cf-place">Qayerga sarflandi</label><input id="cf-place" name="place" autocomplete="off" placeholder="Masalan: Chorsu bozori"></div>') +
      '<div class="field"><label for="cf-who" id="cf-whoLbl">' + (WHO[(inn ? 'in:' : 'out:')]) + '</label><input id="cf-who" name="who" autocomplete="off" value="' + (debt ? esc(debt.person) : '') + '"></div>' +
      '<div class="grid2"><div class="field"><label for="cf-phone">Telefon raqami</label><input id="cf-phone" name="phone" type="tel" autocomplete="off" placeholder="+998 90 123 45 67" value="' + (debt ? esc(debt.phone || '') : '') + '"></div>' +
      '<div class="field"><label for="cf-tg">Telegram (raqam yoki @username)</label><input id="cf-tg" name="tg" autocomplete="off" placeholder="@username" value="' + (debt ? esc(debt.tg || '') : '') + '"></div></div>' +
      '<div class="field"><label for="cf-date">Sana</label><input id="cf-date" name="date" type="date" value="' + U.today() + '"></div>' +
      '<div class="field" data-for="qarz_olish qarz_berish"><label for="cf-due">Qaytarish sanasi</label><input id="cf-due" name="due" type="date"><div class="quick"><button type="button" class="btn sm" data-act="cf-quick" data-v="7:kun">1 hafta</button><button type="button" class="btn sm" data-act="cf-quick" data-v="14:kun">2 hafta</button><button type="button" class="btn sm" data-act="cf-quick" data-v="1:oy">1 oy</button><button type="button" class="btn sm" data-act="cf-quick" data-v="3:oy">3 oy</button></div></div>' +
      '<div class="field"><label for="cf-note">Izoh</label><textarea id="cf-note" name="note" placeholder="Qo\'shimcha ma\'lumot"></textarea></div>' +
      '<p class="err" id="cf-err" role="alert" hidden></p>' +
      '<div class="btns"><button type="submit" class="btn primary">Saqlash</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div></form>';
  }
  function openForm(type, key, debtId) {
    ui.sheet(formHTML(type, key, debtId), true);
    applyKey($('form[data-form="cash"]'));
  }
  /* tahrirlash: forma bo'sh ochilib, yozuv qiymatlari bilan to'ldiriladi; qarz bilan bog'langan yozuvda tur o'zgarmaydi */
  function openEdit(e) {
    ui.sheet(formHTML(e.type, C.key(e)), true);
    var f = $('form[data-form="cash"]'), d = e.link ? Q.db.debt(e.link.debtId) : null, v = f.elements;
    f.dataset.edit = e.id;
    f.closest('.panel').querySelector('.sh h2').textContent = e.type === 'in' ? 'Kirimni tahrirlash' : 'Chiqimni tahrirlash';
    v.amount.value = e.amount; v.date.value = e.date; v.who.value = e.who || ''; v.phone.value = e.phone || ''; v.tg.value = e.tg || ''; v.note.value = e.note || '';
    if (v.other) v.other.value = e.other || ''; if (v.place) v.place.value = e.place || '';
    var r = f.querySelector('input[name="cur"][value="' + e.cur + '"]'); if (r) r.checked = true;
    applyKey(f);
    if (d) {
      [].forEach.call(f.querySelectorAll('input[name="k"]'), function (x) { x.disabled = true; });
      [].forEach.call(f.querySelectorAll('[data-for="qarz_qaytdi"],[data-for="qarz_tolash"],[data-for="qarz_olish"]'), function (x) { x.hidden = true; });
      if (e.link.made) { v.due.value = d.due || ''; if (d.payments.length) [].forEach.call(f.querySelectorAll('input[name="cur"]'), function (x) { x.disabled = true; }); }
      var info = document.createElement('p'); info.className = 'cf-info ' + d.type; info.innerHTML = ic('swap', 15) + '<span>' + (e.link.made ? 'Bu yozuv ' + (d.type === 'owe' ? 'Qarzlarim' : 'Haqlarim') + 'dagi «' + esc(d.person) + '» bilan bog\'langan: summa va sana ikkalasida ham yangilanadi.' : 'Bu yozuv «' + esc(d.person) + '» qarzining to\'lovi: summa o\'zgarsa, qoldiq ham o\'zgaradi.') + '</span>';
      f.insertBefore(info, f.firstChild);
    }
  }
  /* tanlangan turga qarab maydonlar ko'rsatiladi yoki yashiriladi */
  function applyKey(f) {
    if (!f) return;
    var k = (f.querySelector('input[name="k"]:checked') || {}).value, type = f.dataset.type;
    [].slice.call(f.querySelectorAll('[data-for],[data-not]')).forEach(function (el) {
      var on = !el.dataset['for'] || el.dataset['for'].split(' ').indexOf(k) >= 0;
      var off = el.dataset.not && el.dataset.not.split(' ').indexOf(k) >= 0;
      el.hidden = !on || !!off;
    });
    var l = $('#cf-whoLbl'); if (l) l.textContent = WHO[type + ':' + k] || WHO[type + ':'];
  }

  function num(s) { return Number(String(s).replace(/\s| /g, '').replace(',', '.')); }
  function submitCash(f) {
    var v = f.elements, type = f.dataset.type, inn = type === 'in', err = $('#cf-err'), S = Q.db.state();
    var ex = f.dataset.edit ? Q.db.entry(f.dataset.edit) : null, exd = ex && ex.link ? Q.db.debt(ex.link.debtId) : null;
    var k = f.querySelector('input[name="k"]:checked').value, cur = f.querySelector('input[name="cur"]:checked').value;
    var amt = num(v.amount.value), who = v.who.value.trim(), phone = v.phone.value.trim(), tg = v.tg.value.trim(), other = v.other.value.trim();
    var isNew = !ex && (k === 'qarz_olish' || k === 'qarz_berish'), isPay = !ex && (k === 'qarz_qaytdi' || k === 'qarz_tolash');
    var madeEx = !!(exd && ex.link.made), payEx = !!(exd && ex.link.paymentId), oldPay = payEx ? (exd.payments.filter(function (p) { return p.id === ex.link.paymentId; })[0] || { amount: 0 }).amount : 0;
    var d = isPay && v.debt.value ? Q.db.debt(v.debt.value) : payEx ? exd : null, due = (isNew || madeEx) ? v.due.value : '';
    var pay = d ? Math.round(F.convert(amt, cur, d.cur) * 100) / 100 : 0;
    var msg = !(amt > 0) ? 'Summani raqam bilan kiriting.' :
      !v.date.value ? 'Sanani tanlang.' :
      (k === 'boshqa' && !other) ? 'Nima ekanini yozing.' :
      ((isNew || madeEx) && !who) ? (inn ? 'Qarz kimdan olinganini yozing.' : 'Qarz kimga berilganini yozing.') :
      (isPay && !d) ? (inn ? 'Qaysi haq qaytganini tanlang.' : "Qaysi qarz to'langanini tanlang.") :
      (due && due < v.date.value) ? "Qaytarish sanasi sanadan oldin bo'lmasligi kerak." :
      !U.phoneOk(phone) ? "Telefon raqami noto'g'ri. Kamida 9 ta raqam kiriting." :
      (tg && U.tgInfo(tg).kind === 'bad') ? "Telegram username 5-32 belgidan iborat bo'lishi kerak yoki telefon raqami kiriting." :
      (d && pay > (C.rem(d) + oldPay) * 1.005 + 0.005) ? "Qoldiq " + U.money(C.rem(d) + oldPay, d.cur) + ", undan ko'p kiritib bo'lmaydi." :
      (madeEx && amt < C.paid(exd) - 0.005) ? "Summa to'langan " + U.money(C.paid(exd), exd.cur) + " dan kam bo'lmasligi kerak." : '';
    if (msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
    if (d) pay = Math.min(pay, C.rem(d) + oldPay);
    var e = { type: type, amount: amt, cur: cur, date: v.date.value, who: who || (d ? d.person : ''), phone: phone || (d ? d.phone || '' : ''), tg: tg || (d ? d.tg || '' : ''), place: inn ? '' : (!isNew && !isPay && v.place ? v.place.value.trim() : ''), other: k === 'boshqa' ? other : '', note: v.note.value.trim() };
    e[inn ? 'src' : 'cat'] = k;
    if (ex) {
      var patch = { amount: amt, cur: cur, date: v.date.value, who: e.who, phone: e.phone, tg: e.tg, place: e.place, other: e.other, note: e.note };
      if (!exd) patch[inn ? 'src' : 'cat'] = k;
      Q.db.updateEntry(ex.id, patch, { due: madeEx ? due : undefined, payAmount: pay });
      V.ym = v.date.value.slice(0, 7); V.view = ex.type; V.cat = ''; V.q = '';
      ui.close(); Q.app.render(); ui.toast('Saqlandi'); return;
    }
    var opts = {}, tv = due ? U.diff(due, v.date.value) : 0;
    if (isNew) {
      opts.newDebt = { type: inn ? 'owe' : 'owed', kind: inn ? (f.querySelector('input[name="kind"]:checked') || {}).value || 'shaxs' : 'shaxs', person: who, phone: phone, tg: tg, amount: amt, cur: cur, date: v.date.value,
        termV: tv > 0 ? tv : '', termU: 'kun', due: due || '', note: e.note, remind: C.defaultRemind() };
      if (!inn) { opts.newDebt.channel = phone && tg ? 'both' : tg ? 'telegram' : 'sms'; opts.newDebt.tpl = 'soft'; opts.newDebt.method = 'naqd'; opts.newDebt.autoSend = false; }
    } else if (isPay) { opts.payDebtId = d.id; opts.payAmount = pay; }
    Q.db.addCash(e, opts);
    V.ym = e.date.slice(0, 7); V.view = e.type; V.cat = ''; V.q = '';
    ui.close();
    if (location.hash !== '#kirim-chiqim') { V.keep = true; location.hash = '#kirim-chiqim'; } else Q.app.render();
    ui.toast(k === 'qarz_olish' ? "Kirim yozildi va Qarzlarimga qo'shildi" : k === 'qarz_berish' ? "Chiqim yozildi va Haqlarimga qo'shildi" :
      k === 'qarz_qaytdi' ? 'Kirim yozildi, haq qoldig\'i kamaydi' : k === 'qarz_tolash' ? 'Chiqim yozildi, qarz qoldig\'i kamaydi' : (inn ? 'Kirim yozildi' : 'Chiqim yozildi'));
  }

  /* ---------- hodisalar ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act; if (a.indexOf('cf-') !== 0) return;
    var S = Q.db.state(), e = el.dataset.id ? Q.db.entry(el.dataset.id) : null, f;
    if (a === 'cf-month') { V.ym = shiftYm(V.ym, Number(el.dataset.d)); if (V.ym > C.ym(0)) V.ym = C.ym(0); V.cat = ''; Q.app.render(); }
    else if (a === 'cf-add') openForm(el.dataset.type, el.dataset.key);
    else if (a === 'cf-pay') {
      var d = Q.db.debt(el.dataset.id);
      if (d) openForm(d.type === 'owe' ? 'out' : 'in', d.type === 'owe' ? 'qarz_tolash' : 'qarz_qaytdi', d.id);
    }
    else if (a === 'cf-view') { V.view = el.dataset.v; V.cat = ''; V.q = ''; Q.app.render(); window.scrollTo(0, 0); }
    else if (a === 'cf-back') { V.view = null; V.cat = ''; V.q = ''; Q.app.render(); window.scrollTo(0, 0); }
    else if (a === 'cf-cat') { V.cat = V.cat === el.dataset.k ? '' : el.dataset.k; Q.app.render(); var h = $('#cf-history'); if (h && V.cat) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'cf-open' && e) ui.sheet(detailSheet(e));
    else if (a === 'cf-edit' && e) openEdit(e);
    else if (a === 'cf-askdel' && e) {
      $('#cf-dbtns').innerHTML = '<p class="err" style="width:100%;margin:0">' + esc(delText(e)) + ' Davom etasizmi?</p><button type="button" class="btn danger-solid" data-act="cf-del" data-id="' + e.id + '">Ha, o\'chirish</button><button type="button" class="btn" data-act="cf-open" data-id="' + e.id + '">Yo\'q</button>';
    }
    else if (a === 'cf-del' && e) { Q.db.removeEntry(e.id); ui.close(); Q.app.render(); ui.toast("O'chirildi"); }
    else if (a === 'cf-quick') {
      f = el.closest('form'); var p = el.dataset.v.split(':'), n = Number(p[0]), date = f.elements.date.value || U.today();
      if (p[1] === 'oy') { var x = U.parse(date); x.setMonth(x.getMonth() + n); f.elements.due.value = U.iso(x); } else f.elements.due.value = U.addDays(date, n);
    }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('form[data-form="cash"]'); if (!f) return;
    ev.preventDefault(); submitCash(f);
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'cfsearch') { V.q = ev.target.value; $('#cflist').innerHTML = historyList(Q.db.state()); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target, f = t.form;
    if (!f || f.dataset.form !== 'cash') return;
    if (t.name === 'k') applyKey(f);
    else if (t.id === 'cf-debt') {
      var d = Q.db.debt(t.value); if (!d) return;
      f.elements.amount.value = C.rem(d); f.elements.who.value = d.person; f.elements.phone.value = d.phone || ''; f.elements.tg.value = d.tg || '';
      var r = f.querySelector('input[name="cur"][value="' + d.cur + '"]'); if (r) r.checked = true;
    }
  });
})(window.QD = window.QD || {});

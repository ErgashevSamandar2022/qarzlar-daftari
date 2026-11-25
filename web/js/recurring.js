/* recurring.js: Doimiy to'lovlar (Kirim-chiqim ichida).
   Har oy bir kunda takrorlanadigan kirim yoki chiqim: oylik maosh, ijara, kredit to'lovi.
   Muddati kelganda yozuv o'zi yaratiladi (db.runRecurring). Kredit to'lovi tanlangan qarzdan ayriladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, F = Q.fx, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }

  var IN_KEYS = ['oylik', 'biznes', 'qoshimcha', 'sovga', 'boshqa'];
  var OUT_KEYS = ['bozorlik', 'kommunal', 'transport', 'kiyim', 'talim', 'texnika', 'xomashyo', 'qarz_tolash', 'boshqa'];
  var PRESETS = {
    maosh: { type: 'in', key: 'oylik', day: 5, who: 'Ish joyi', t: 'Oylik maosh' },
    kredit: { type: 'out', key: 'qarz_tolash', day: 10, t: "Kredit to'lovi" },
    ijara: { type: 'out', key: 'boshqa', other: 'Ijara', day: 1, t: 'Ijara' },
    kommunal: { type: 'out', key: 'kommunal', day: 15, t: "Kommunal to'lov" }
  };

  function title(r) { return r.key === 'boshqa' && r.other ? r.other : C.labelOf(r.type, r.key); }

  /* ---------- Kirim-chiqim sahifasidagi karta ---------- */
  function row(S, r) {
    var disp = S.profile.cur, inn = r.type === 'in', d = r.debtId ? Q.db.debt(r.debtId) : null;
    var sub = 'Har oy ' + r.day + '-kuni' + (r.active ? ' · keyingisi ' + U.short(r.next) : '') + (r.end ? ' · ' + U.short(r.end) + 'gacha' : '');
    var chip = r.active ? '' : '<span class="chip warn">' + (r.paused === 'debt' ? 'Qarz yopilgan' : 'To\'xtatilgan') + '</span>';
    return '<li class="rc-row' + (r.active ? '' : ' off') + '"><span class="rc-dot ' + (inn ? 'in' : 'out') + '" aria-hidden="true">' + ic('repeat', 16) + '</span>' +
      '<div class="rc-mid"><b>' + esc(title(r)) + (r.who ? ' · ' + esc(r.who) : (d ? ' · ' + esc(d.person) : '')) + '</b><span class="sub">' + esc(sub) + '</span></div>' +
      '<span class="rc-amt ' + (inn ? 'g' : 'r') + '"><b>' + (inn ? '+ ' : '− ') + U.money(r.amount, r.cur) + '</b>' + (r.cur !== disp ? '<small>≈ ' + U.money(F.convert(r.amount, r.cur, disp), disp) + '</small>' : '') + '</span>' +
      '<div class="rc-act">' + chip + '<button type="button" class="btn sm" data-act="rc-toggle" data-id="' + r.id + '">' + (r.active ? 'To\'xtatish' : 'Davom ettirish') + '</button>' +
      '<button type="button" class="btn sm" data-act="rc-edit" data-id="' + r.id + '">' + ic('edit', 14) + 'Tahrirlash</button></div></li>';
  }
  function card(S) {
    var list = S.recurring || [], disp = S.profile.cur, m = C.recMonthly(S, disp), ap = m.mixed ? '≈ ' : '';
    var body = list.length ? '<ul class="rc-list">' + list.slice().sort(function (a, b) { return (b.active - a.active) || (a.next < b.next ? -1 : 1); }).map(function (r) { return row(S, r); }).join('') + '</ul>' :
      '<div class="rc-empty"><p>Har oy takrorlanadigan to\'lovlarni bir marta kiriting, yozuv o\'z vaqtida o\'zi paydo bo\'ladi.</p><div class="quick">' +
      Object.keys(PRESETS).map(function (k) { return '<button type="button" class="btn sm" data-act="rc-add" data-p="' + k + '">' + ic('plus', 14) + PRESETS[k].t + '</button>'; }).join('') + '</div></div>';
    return '<section class="card rc-card" aria-labelledby="h-rec"><div class="ph2"><span class="pic">' + ic('repeat', 20) + '</span><div><h2 id="h-rec">Doimiy to\'lovlar</h2>' +
      '<p class="muted">' + (m.n ? 'Har oy: ' + ap + '+' + U.compact(m.inc).replace('+', '') + ' kirim, −' + U.compact(m.out).replace('+', '') + ' chiqim' : 'Oylik, ijara, kredit va boshqa takrorlanuvchilar') + '</p></div>' +
      '<button type="button" class="btn sm primary rc-new" data-act="rc-add">' + ic('plus', 16) + "Qo'shish</button></div>" + body + '</section>';
  }

  /* ---------- forma ---------- */
  function keyChips(type, key) {
    var keys = type === 'in' ? IN_KEYS : OUT_KEYS;
    if (keys.indexOf(key) < 0) key = keys[0];
    return keys.map(function (k) { return '<label class="choice' + (k === 'qarz_tolash' ? ' dbt' : '') + '"><input type="radio" name="k" value="' + k + '"' + (k === key ? ' checked' : '') + '><span>' + C.labelOf(type, k) + '</span></label>'; }).join('');
  }
  function formHTML(r) {
    var S = Q.db.state(), edit = !!(r && r.id), p = r || {}, type = p.type || 'out', open = C.openDebts(S, 'owe');
    var o = { type: type, key: p.key || (type === 'in' ? 'oylik' : 'kommunal'), other: p.other || '', amount: p.amount || '', cur: p.cur || S.profile.cur, who: p.who || '', day: p.day || new Date().getDate(), start: p.start || U.today(), end: p.end || '', note: p.note || '', debtId: p.debtId || '' };
    return '<div class="sh"><div><p class="eyebrow ' + (type === 'in' ? 'owed' : 'owe') + '" id="rc-eye">Doimiy to\'lov</p><h2>' + (edit ? 'To\'lovni tahrirlash' : "Doimiy to'lov qo'shish") + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<form data-form="rec" data-id="' + (edit ? r.id : '') + '" novalidate>' +
      '<div class="field"><span class="lbl">Turi</span><div class="choices seg3 seg2"><label class="choice"><input type="radio" name="t" value="in"' + (type === 'in' ? ' checked' : '') + '><span>Kirim</span></label><label class="choice"><input type="radio" name="t" value="out"' + (type === 'out' ? ' checked' : '') + '><span>Chiqim</span></label></div></div>' +
      '<div class="field"><span class="lbl">Nima uchun?</span><div class="choices cf-keys" id="rc-keys">' + keyChips(type, o.key) + '</div></div>' +
      '<div class="field" id="rc-otherF"><label for="rc-other">Nima ekanini yozing</label><input id="rc-other" name="other" autocomplete="off" placeholder="Masalan: Ijara" value="' + esc(o.other) + '"></div>' +
      '<div class="field" id="rc-debtF"><label for="rc-debt">Qaysi qarz to\'lanadi?</label>' + (open.length ? '<select id="rc-debt" name="debt"><option value="">Tanlang</option>' + open.map(function (d) { return '<option value="' + d.id + '"' + (o.debtId === d.id ? ' selected' : '') + '>' + esc(d.person) + ' · qoldiq ' + U.money(C.rem(d), d.cur) + '</option>'; }).join('') + '</select>' : '<p class="note">Qarzlarimda ochiq qarz yo\'q.</p><input type="hidden" name="debt" value="">') + '</div>' +
      '<div class="grid2"><div class="field"><label for="rc-amount">Summa</label><input id="rc-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="500 000" value="' + esc(o.amount) + '"></div>' +
      '<div class="field"><span class="lbl">Valyuta</span><div class="choices seg3">' + U.CURS.map(function (c) { return '<label class="choice"><input type="radio" name="cur" value="' + c + '"' + (o.cur === c ? ' checked' : '') + '><span>' + (c === 'UZS' ? "So'm" : U.CUR_SIGN[c]) + '</span></label>'; }).join('') + '</div></div></div>' +
      '<div class="field"><label for="rc-who" id="rc-whoL">' + (type === 'in' ? 'Kimdan (ixtiyoriy)' : 'Kimga (ixtiyoriy)') + '</label><input id="rc-who" name="who" autocomplete="off" value="' + esc(o.who) + '"></div>' +
      '<div class="grid2"><div class="field"><label for="rc-day">Oyning nechanchi kuni</label><input id="rc-day" name="day" type="number" min="1" max="31" inputmode="numeric" value="' + o.day + '"></div>' +
      '<div class="field"><label for="rc-start">Boshlanish sanasi</label><input id="rc-start" name="start" type="date" value="' + o.start + '"></div></div>' +
      '<p class="note" style="margin:-6px 0 12px">29-31 kunlar qisqa oylarda oyning oxirgi kuniga tushadi.</p>' +
      '<div class="field"><label for="rc-end">Tugash sanasi (ixtiyoriy)</label><input id="rc-end" name="end" type="date" value="' + o.end + '"></div>' +
      '<div class="field"><label for="rc-note">Izoh</label><textarea id="rc-note" name="note" placeholder="Qo\'shimcha ma\'lumot">' + esc(o.note) + '</textarea></div>' +
      '<p class="err" id="rc-err" role="alert" hidden></p>' +
      '<div class="btns" id="rc-btns"><button type="submit" class="btn primary">Saqlash</button>' + (edit ? '<button type="button" class="btn danger" data-act="rc-askdel" data-id="' + r.id + '">O\'chirish</button>' : '<button type="button" class="btn" data-sheet-close>Bekor qilish</button>') + '</div></form>';
  }
  function sync(f) {
    var k = (f.querySelector('input[name="k"]:checked') || {}).value, t = f.querySelector('input[name="t"]:checked').value;
    $('#rc-otherF').hidden = k !== 'boshqa'; $('#rc-debtF').hidden = k !== 'qarz_tolash';
    $('#rc-whoL').textContent = t === 'in' ? 'Kimdan (ixtiyoriy)' : 'Kimga (ixtiyoriy)';
    var eye = $('#rc-eye'); eye.className = 'eyebrow ' + (t === 'in' ? 'owed' : 'owe');
  }
  function open(r) { ui.sheet(formHTML(r), true); sync($('form[data-form="rec"]')); }
  function num(s) { return Number(String(s).replace(/\s| /g, '').replace(',', '.')); }

  function submit(f) {
    var v = f.elements, err = $('#rc-err'), t = f.querySelector('input[name="t"]:checked').value, k = f.querySelector('input[name="k"]:checked').value, cur = f.querySelector('input[name="cur"]:checked').value;
    var amt = num(v.amount.value), day = Math.round(Number(v.day.value)), start = v.start.value, end = v.end.value, other = v.other.value.trim(), debtId = k === 'qarz_tolash' ? v.debt.value : '';
    var msg = !(amt > 0) ? 'Summani raqam bilan kiriting.' : !(day >= 1 && day <= 31) ? "Kun 1 dan 31 gacha bo'lishi kerak." : !start ? 'Boshlanish sanasini tanlang.' :
      (end && end < start) ? "Tugash sanasi boshlanishdan oldin bo'lmasligi kerak." : (k === 'boshqa' && !other) ? 'Nima ekanini yozing.' : (k === 'qarz_tolash' && !debtId) ? "Qaysi qarz to'lanishini tanlang." : '';
    if (msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
    var ex = f.dataset.id ? Q.db.rec(f.dataset.id) : null;
    var data = { type: t, key: k, other: k === 'boshqa' ? other : '', amount: amt, cur: cur, who: v.who.value.trim(), day: day, start: start, end: end, note: v.note.value.trim(), debtId: debtId };
    var from = ex && ex.last ? U.addDays(ex.last, 1) : start; if (from < start) from = start;
    data.next = C.recFirst(from, day);
    var made;
    if (ex) { data.active = true; data.paused = ''; Q.db.updateRec(ex.id, data); } else { data.active = true; data.last = ''; Q.db.addRec(data); }
    made = Q.db.runRecurring();
    ui.close(); Q.app.render();
    ui.toast(made ? 'Saqlandi, ' + made + ' ta yozuv yaratildi' : 'Doimiy to\'lov saqlandi');
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act; if (a.indexOf('rc-') !== 0) return;
    var r = el.dataset.id ? Q.db.rec(el.dataset.id) : null;
    if (a === 'rc-add') { var p = PRESETS[el.dataset.p]; open(p ? { type: p.type, key: p.key, other: p.other, day: p.day, who: p.who } : null); }
    else if (a === 'rc-edit' && r) open(r);
    else if (a === 'rc-toggle' && r) {
      if (r.active) Q.db.updateRec(r.id, { active: false, paused: 'user' });
      else { var d = r.debtId ? Q.db.debt(r.debtId) : null; if (r.key === 'qarz_tolash' && (!d || C.isClosed(d))) { ui.toast("Bu qarz yopilgan. Tahrirlab, boshqa qarz tanlang"); return; }
        Q.db.updateRec(r.id, { active: true, paused: '', next: C.recFirst(U.today(), r.day) }); }
      Q.app.render();
    }
    else if (a === 'rc-askdel' && r) { $('#rc-btns').innerHTML = '<p class="err" style="width:100%;margin:0">To\'lov o\'chadi, avval yaratilgan yozuvlar qoladi. Davom etasizmi?</p><button type="button" class="btn danger-solid" data-act="rc-del" data-id="' + r.id + '">Ha, o\'chirish</button><button type="button" class="btn" data-act="rc-edit" data-id="' + r.id + '">Yo\'q</button>'; }
    else if (a === 'rc-del' && r) { Q.db.removeRec(r.id); ui.close(); Q.app.render(); ui.toast("O'chirildi"); }
  });
  document.addEventListener('submit', function (ev) { var f = ev.target.closest('form[data-form="rec"]'); if (!f) return; ev.preventDefault(); submit(f); });
  document.addEventListener('change', function (ev) {
    var t = ev.target, f = t.form; if (!f || f.dataset.form !== 'rec') return;
    if (t.name === 't') { var cur = (f.querySelector('input[name="k"]:checked') || {}).value; $('#rc-keys').innerHTML = keyChips(t.value, cur); sync(f); }
    else if (t.name === 'k') sync(f);
    else if (t.id === 'rc-debt') {
      var d = Q.db.debt(t.value); if (!d) return;
      if (!f.elements.amount.value) f.elements.amount.value = C.rem(d);
      var r = f.querySelector('input[name="cur"][value="' + d.cur + '"]'); if (r) r.checked = true;
      if (!f.elements.who.value) f.elements.who.value = d.person;
    }
  });

  Q.rec = { card: card };
})(window.QD = window.QD || {});

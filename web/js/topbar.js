/* topbar.js: yuqori menyu. Valyuta tanlash (so'm, dollar, yevro), Markaziy bank kursi,
   yangilash tugmasi va kursni qo'lda o'zgartirish. */
(function (Q) {
  'use strict';
  var U = Q.utils, F = Q.fx, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }

  function html() {
    var S = Q.db.state(), cur = S.profile.cur, st = F.status();
    var seg = U.CURS.map(function (c) {
      return '<button type="button" data-cur="' + c + '" aria-pressed="' + (cur === c) + '" title="' + U.CUR_NAME[c] + '">' + (c === 'UZS' ? "So'm" : U.CUR_SIGN[c]) + '</button>';
    }).join('');
    var rates = ['USD', 'EUR'].map(function (c) {
      return '<span class="rate"><b>1 ' + U.CUR_SIGN[c] + '</b> = ' + U.num(F.rate(c)) + " so'm</span>";
    }).join('');
    return '<div class="cur-seg" role="group" aria-label="Ko\'rsatiladigan valyuta">' + seg + '</div>' +
      '<div class="rates">' + rates + '</div>' +
      '<div class="rate-status ' + st.tone + '" role="status"><i class="dot"></i><span>' + esc(st.text) + '</span></div>' +
      '<div class="tb-end"><button type="button" class="icon-btn" data-act="fx-refresh" aria-label="Kursni yangilash" title="Kursni yangilash">' + ic('refresh', 18) + '</button>' +
      '<button type="button" class="btn sm" data-act="fx-manual">' + ic('edit', 16) + "Qo'lda</button></div>";
  }
  function render() { var el = $('#topbar'); if (el) el.innerHTML = html(); }

  function manualSheet() {
    var f = Q.db.state().fx, m = f.manual || {};
    return '<div class="sh"><div><p class="eyebrow">Valyuta kursi</p><h2>Kursni qo\'lda o\'zgartirish</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>' +
      '<p class="note" style="margin-bottom:14px">Markaziy bank kursi: 1 $ = ' + U.num(F.cbuRate('USD')) + " so'm, 1 € = " + U.num(F.cbuRate('EUR')) + " so'm" + (f.date ? ' (' + U.long(f.date) + ')' : '') + '. Qo\'lda kiritgan kurs hamma hisobda ishlatiladi.</p>' +
      '<form data-form="fxman"><div class="grid2"><div class="field"><label for="fx-usd">1 dollar necha so\'m</label><input id="fx-usd" name="usd" inputmode="decimal" value="' + (F.rate('USD') || '') + '" autocomplete="off"></div>' +
      '<div class="field"><label for="fx-eur">1 yevro necha so\'m</label><input id="fx-eur" name="eur" inputmode="decimal" value="' + (F.rate('EUR') || '') + '" autocomplete="off"></div></div>' +
      '<p class="err" id="fx-err" hidden></p>' +
      '<div class="btns"><button class="btn primary" type="submit">Saqlash</button>' + (F.isManual() ? '<button type="button" class="btn" data-act="fx-reset">Markaziy bank kursiga qaytarish</button>' : '') + '</div></form>';
  }
  function num(v) { var n = Number(String(v).replace(/\s| /g, '').replace(',', '.')); return isFinite(n) ? n : NaN; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cur]');
    if (b && b.closest('#topbar')) { Q.db.state().profile.cur = b.dataset.cur; Q.db.save(); Q.app.render(); return; }
    var el = e.target.closest('[data-act]'); if (!el) return;
    if (el.dataset.act === 'fx-refresh') {
      render();
      F.refresh().then(function (ok) {
        ui.toast(ok ? 'Kurs yangilandi' : "Yangilab bo'lmadi. Oxirgi saqlangan kurs ishlatiladi");
        Q.app.render();
      });
      render();
    } else if (el.dataset.act === 'fx-manual') {
      ui.sheet(manualSheet());
    } else if (el.dataset.act === 'fx-reset') {
      F.clearManual(); ui.close(); Q.app.render(); ui.toast('Markaziy bank kursiga qaytarildi');
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-form="fxman"]'); if (!f) return;
    e.preventDefault();
    var usd = num(f.elements.usd.value), eur = num(f.elements.eur.value), err = $('#fx-err');
    if (!(usd > 0) || !(eur > 0)) { err.textContent = 'Ikkala kursni ham raqam bilan kiriting.'; err.hidden = false; return; }
    /* Markaziy bank kursiga teng bo'lsa, qo'lda deb belgilanmaydi */
    F.setManual(Math.abs(usd - F.cbuRate('USD')) < 0.005 ? 0 : usd, Math.abs(eur - F.cbuRate('EUR')) < 0.005 ? 0 : eur);
    ui.close(); Q.app.render(); ui.toast('Kurs saqlandi');
  });

  Q.topbar = { render: render };
})(window.QD = window.QD || {});

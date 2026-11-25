/* welcome.js: birinchi ochilish oynasi. Ism, valyuta va boshlash usuli (bo'sh yoki namuna bilan). */
(function (Q) {
  'use strict';
  var U = Q.utils, ui = Q.ui, esc = U.esc;
  function el() { return document.getElementById('welcome'); }
  function html() {
    var P = Q.db.state().profile, nat = Q.native.isNative;
    return '<div class="lock-in wl-in"><img src="assets/images/logo.svg" alt="" width="60" height="60"><h1>Xush kelibsiz</h1>' +
      '<p>Qarzlar, haqlar, kirim-chiqim va eslatmalarni bir joyda yuriting. ' + (nat ? 'Ma\'lumotlar faqat shu telefondagi ilova bazasida saqlanadi.' : 'Ma\'lumotlar shu brauzerda saqlanadi.') + '</p>' +
      '<div class="field wl-f"><label for="wl-name">Ismingiz (ixtiyoriy)</label><input id="wl-name" maxlength="40" autocomplete="off" placeholder="Masalan: Bobur" value="' + esc(P.name) + '"></div>' +
      '<div class="field wl-f"><span class="lbl">Asosiy valyuta</span><div class="choices seg3">' + U.CURS.map(function (c) {
        return '<label class="choice"><input type="radio" name="wlcur" value="' + c + '"' + (P.cur === c ? ' checked' : '') + '><span>' + (c === 'UZS' ? "So'm" : U.CUR_SIGN[c]) + '</span></label>';
      }).join('') + '</div></div>' +
      (nat ? '<p class="wl-note">Qarz muddatlari budilnik kabi bildirishnoma bilan eslatiladi. «Boshlash» bosilganda telefon ruxsat so\'raydi, «Ruxsat berish»ni tanlang.</p>' : '') +
      '<button type="button" class="btn primary full" data-act="wl-start">Boshlash</button>' +
      '<button type="button" class="lk-link" data-act="wl-sample">Namuna ma\'lumot bilan ko\'rib chiqish</button></div>';
  }
  function show() { var e = el(); e.innerHTML = html(); e.hidden = false; document.body.style.overflow = 'hidden'; Q.welcoming = true; }
  function hide() { el().hidden = true; document.body.style.overflow = ''; Q.welcoming = false; }
  function finish(sample) {
    var name = document.getElementById('wl-name').value.trim(), c = document.querySelector('input[name="wlcur"]:checked');
    Q.db.setProfile({ name: name, cur: c ? c.value : 'UZS', welcomed: true });
    if (sample) Q.db.startSample();
    hide(); Q.settings.boot(); Q.app.render(); Q.notify.firstRun(); Q.notify.sync();
    ui.toast(sample ? "Namuna ma'lumotlar yuklandi. Sozlamalardan tozalash mumkin" : 'Tayyor. Birinchi qarzni qo\'shing');
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'wl-start') finish(false); else if (b.dataset.act === 'wl-sample') finish(true);
  });
  Q.welcome = { show: show };
})(window.QD = window.QD || {});

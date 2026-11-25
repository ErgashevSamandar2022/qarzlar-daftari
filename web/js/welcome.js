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
  /* 1-qadam: PIN-kod o'rnatish */
  function pinHtml() {
    function f(id, label) { return '<div class="field wl-f"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="••••"></div>'; }
    return '<div class="lock-in wl-in"><img src="assets/images/logo.svg" alt="" width="60" height="60"><h1>PIN-kod o\'rnating</h1>' +
      '<p>Ilovani ochganda 4 xonali kod so\'raladi. Qarz ma\'lumotlaringizni boshqalar ko\'rib qolmaydi.</p>' +
      f('wl-pin', 'PIN (4 ta raqam)') + f('wl-pin2', 'PINni takrorlang') + '<p class="wl-err" id="wl-perr" role="alert" style="color:var(--danger,#c0392b);min-height:18px;font-size:13px"></p>' +
      '<button type="button" class="btn primary full" data-act="wl-pin">PIN o\'rnatish</button>' +
      '<button type="button" class="lk-link" data-act="wl-pin-skip">Hozircha kerak emas</button></div>';
  }
  var only = false;
  function flag() { try { localStorage.setItem('qd-pin-asked', '1'); } catch (e) { /* yopiq */ } }
  function step2() { flag(); if (only) { only = false; hide(); Q.app.render(); Q.ui.toast(Q.db.state().profile.pin ? "PIN o'rnatildi" : "PIN keyinroq: Sozlamalar → PIN-kod"); return; } el().innerHTML = html(); }
  function show() { var e = el(); e.innerHTML = Q.db.state().profile.pin ? html() : pinHtml(); e.hidden = false; document.body.style.overflow = 'hidden'; Q.welcoming = true; }
  function hide() { el().hidden = true; document.body.style.overflow = ''; Q.welcoming = false; }
  function finish(sample) {
    var name = document.getElementById('wl-name').value.trim(), c = document.querySelector('input[name="wlcur"]:checked');
    Q.db.setProfile({ name: name, cur: c ? c.value : 'UZS', welcomed: true });
    if (sample) Q.db.startSample();
    hide(); Q.settings.apply(); Q.app.render(); Q.notify.firstRun(); Q.notify.sync();
    ui.toast(sample ? "Namuna ma'lumotlar yuklandi. Sozlamalardan tozalash mumkin" : 'Tayyor. Birinchi qarzni qo\'shing');
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'wl-pin') {
      var a = document.getElementById('wl-pin').value, c = document.getElementById('wl-pin2').value, er = document.getElementById('wl-perr');
      if (!/^\d{4}$/.test(a)) { er.textContent = 'PIN 4 ta raqamdan iborat bo\'lishi kerak.'; return; }
      if (a !== c) { er.textContent = 'PIN kodlar bir xil emas.'; return; }
      Q.settings.setPin(a).then(step2);
    } else if (b.dataset.act === 'wl-pin-skip') step2();
    else if (b.dataset.act === 'wl-start') finish(false); else if (b.dataset.act === 'wl-sample') finish(true);
  });
  /* ilova allaqachon ishlatilgan, lekin PIN hali so'ralmagan bo'lsa: bir marta so'raladi */
  function askPin() {
    var asked = null; try { asked = localStorage.getItem('qd-pin-asked'); } catch (e) { /* yopiq */ }
    if (asked || Q.db.state().profile.pin) return false;
    only = true; var e = el(); e.innerHTML = pinHtml(); e.hidden = false; document.body.style.overflow = 'hidden'; Q.welcoming = true; return true;
  }
  Q.welcome = { show: show, askPin: askPin };
})(window.QD = window.QD || {});

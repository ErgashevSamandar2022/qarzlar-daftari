/* ui.js: umumiy oyna (sheet) va xabar (toast). Boshqa modullar shuni ishlatadi. */
(function (Q) {
  'use strict';
  var ui = {}, last = null, timer = null;
  function $(s) { return document.querySelector(s); }

  ui.sheet = function (html, wide) {
    var s = $('#sheet'), p = $('#sheetPanel');
    if (s.hidden) last = document.activeElement;
    p.className = 'panel' + (wide ? ' wide' : '');
    p.innerHTML = html;
    s.hidden = false;
    document.body.style.overflow = 'hidden';
    p.scrollTop = 0;
    p.focus({ preventScroll: true });
  };
  ui.close = function () {
    $('#sheet').hidden = true;
    document.body.style.overflow = '';
    if (last && last.focus) { try { last.focus({ preventScroll: true }); } catch (e) { /* element yo'q bo'lishi mumkin */ } }
  };
  ui.isOpen = function () { return !$('#sheet').hidden; };
  ui.toast = function (m) {
    var t = $('#toast');
    t.textContent = m; t.hidden = false;
    clearTimeout(timer); timer = setTimeout(function () { t.hidden = true; }, 2600);
  };
  /* nusxalash: brauzer ruxsat bermasa, matn belgilanadi */
  ui.copy = function (text, fallbackEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { if (fallbackEl) { fallbackEl.focus(); if (fallbackEl.select) fallbackEl.select(); } return false; });
    }
    if (fallbackEl) { fallbackEl.focus(); if (fallbackEl.select) fallbackEl.select(); }
    return Promise.resolve(false);
  };

  document.addEventListener('click', function (e) {
    if (e.target.id === 'sheet' || e.target.closest('[data-sheet-close]')) ui.close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.isOpen()) ui.close(); });

  Q.ui = ui;
})(window.QD = window.QD || {});

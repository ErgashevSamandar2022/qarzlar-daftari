/* contacts.js: odamni tanlash.
   1) Telefon kontaktlaridan (Contact Picker API: Android Chrome). Qo'llab-quvvatlanmasa, tugma chiqmaydi.
   2) Hamma brauzerda: oldin kiritilgan odamlar ro'yxati (datalist), tanlansa telefon va Telegram o'zi to'ladi. */
(function (Q) {
  'use strict';
  var U = Q.utils, ic = U.ic, ui = Q.ui;
  var WEB = !!(navigator.contacts && navigator.contacts.select && window.ContactsManager), CAN = WEB || Q.native.isNative;

  function people() {
    var S = Q.db.state(), m = {};
    function add(n, p, t) { n = (n || '').trim(); if (!n) return; var k = n.toLowerCase(), o = m[k] || (m[k] = { n: n, p: '', t: '' }); if (!o.p && p) o.p = p; if (!o.t && t) o.t = t; }
    S.debts.forEach(function (d) { add(d.person, d.phone, d.tg); });
    S.entries.forEach(function (e) { add(e.who, e.phone, e.tg); });
    S.reminders.forEach(function (r) { if (r.kind === 'birthday') add(r.text, r.phone, r.tg); });
    return m;
  }
  function list() {
    var dl = document.getElementById('qd-people');
    if (!dl) { dl = document.createElement('datalist'); dl.id = 'qd-people'; document.body.appendChild(dl); }
    var m = people();
    dl.innerHTML = Object.keys(m).sort().map(function (k) { return '<option value="' + U.esc(m[k].n) + '">' + U.esc(m[k].p) + '</option>'; }).join('');
    return m;
  }
  function nameInput(f) { return f.elements.person || f.elements.who || f.elements.text || null; }

  function enhance(panel) {
    [].forEach.call(panel.querySelectorAll('form'), function (f) {
      var n = nameInput(f), ph = f.elements.phone; if (!n || f.dataset.ct) return;
      f.dataset.ct = '1';
      if (n.name !== 'text') n.setAttribute('list', 'qd-people');
      if (CAN && ph) {
        var host = n.name === 'text' ? ph.closest('.field') : n.closest('.field');
        if (host) host.insertAdjacentHTML('beforeend', '<button type="button" class="btn sm pick" data-act="pick-contact">' + ic('phone', 14) + 'Kontaktlardan tanlash</button>');
      }
    });
    list();
  }
  new MutationObserver(function () { var p = document.getElementById('sheetPanel'); if (p && p.firstChild) enhance(p); }).observe(document.getElementById('sheetPanel'), { childList: true });

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act="pick-contact"]'); if (!el) return;
    var f = el.closest('form'), n = nameInput(f);
    var pick = WEB ? navigator.contacts.select(['name', 'tel'], { multiple: false }).then(function (r) { var c = r && r[0]; return c ? { name: c.name && c.name[0], tel: c.tel && c.tel[0] } : null; })
      : Q.native.hold(Q.native.plugin('Contacts').pickContact({ projection: { name: true, phones: true } })).then(function (r) {
        var c = r && r.contact; if (!c) return null;
        return { name: c.name && (c.name.display || [c.name.given, c.name.family].filter(Boolean).join(' ')), tel: c.phones && c.phones[0] && c.phones[0].number };
      });
    pick.then(function (c) {
      if (!c) return;
      if (c.name && n) n.value = c.name;
      if (c.tel && f.elements.phone) f.elements.phone.value = c.tel;
      if (n) n.dispatchEvent(new Event('input', { bubbles: true }));
      ui.toast('Kontakt tanlandi');
    }).catch(function (e) { if (!/cancel/i.test(String(e && e.message || e))) ui.toast("Kontaktlarga ruxsat berilmadi yoki ochilmadi"); });
  });
  /* ro'yxatdan ism tanlansa, telefon va Telegram to'ladi */
  document.addEventListener('change', function (ev) {
    var t = ev.target, f = t.form; if (!f || t !== nameInput(f) || t.name === 'text') return;
    var o = people()[t.value.trim().toLowerCase()]; if (!o) return;
    if (f.elements.phone && !f.elements.phone.value && o.p) f.elements.phone.value = o.p;
    if (f.elements.tg && !f.elements.tg.value && o.t) f.elements.tg.value = o.t;
  });

  Q.contacts = { supported: CAN };
})(window.QD = window.QD || {});

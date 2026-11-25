/* app.js: menyu, sahifalarni almashtirish va ishga tushirish. */
(function (Q) {
  'use strict';
  var U = Q.utils, ic = U.ic;
  function $(s) { return document.querySelector(s); }

  var NAV = [
    ['bosh', 'Bosh sahifa', 'home'], ['qarzlarim', 'Qarzlarim', 'owe'], ['haqlarim', 'Haqlarim', 'owed'],
    ['eslatmalar', 'Eslatmalar', 'bell'], ['kirim-chiqim', 'Kirim-chiqim', 'swap'], ['xabarlar', 'Xabarlar', 'chat'], ['sozlamalar', 'Sozlamalar', 'sliders']
  ];
  var ROUTES = NAV.map(function (n) { return n[0]; });

  /* hali to'ldirilmagan bo'limlar: keyingi qadamlarda shu yerdan chiqib ketadi */
  var PLAN = {
    qarzlarim: { t: 'Qarzlarim', l: "Men qaytarishim kerak bo'lgan qarzlar", i: ["Qarz olish va to'lovlarni yozish", "Muddat, izoh va telefon raqami", "Qidiruv va holat bo'yicha filtr", "Qisman va to'liq to'lash"] },
    haqlarim: { t: 'Haqlarim', l: 'Menga qaytarilishi kerak bo\'lgan pullar', i: ["Qarz berish va qabul qilingan to'lovlar", "Har bir qarzdor bo'yicha tarix", "Muddati o'tganlarni ajratib ko'rsatish", "Qarzdorga eslatma tayyorlash"] },
    eslatmalar: { t: 'Eslatmalar', l: 'Muddat va shaxsiy eslatmalar', i: ["Qarz muddatlari bo'yicha eslatmalar", "Shaxsiy eslatmalar", "Takrorlanuvchi eslatmalar", "Qaysi eslatma turlari kerakligini birga belgilaymiz"] },
    'kirim-chiqim': { t: 'Kirim-chiqim', l: 'Daromad va xarajatlar', i: ["Daromad va xarajatni kiritish", "Kategoriyalar (oziq-ovqat, transport, kommunal)", "Oylik va yillik hisobot", "Grafiklar"] },
    xabarlar: { t: 'Xabarlar', l: 'Qarzdorlarga yuboriladigan xabarlar', i: ["Xabar shablonlari", "SMS va Telegram uchun matn tayyorlash", "Yuborilganlar tarixi", "Javob kutilayotganlar"] },
    sozlamalar: { t: 'Sozlamalar', l: 'Profil va ma\'lumotlar', i: ["Ism, valyuta, ogohlantirish kunlari", "Zaxira nusxa va tiklash", "Parol yoki barmoq izi", "Namuna ma'lumotlarni tozalash"] }
  };

  function route() { var h = location.hash.replace('#', ''); return ROUTES.indexOf(h) >= 0 ? h : 'bosh'; }

  function planView(r) {
    var p = PLAN[r];
    return '<div class="page-head"><div><h1>' + p.t + '</h1><p>' + p.l + '</p></div></div>' +
      '<section class="card plan"><img src="assets/images/empty.svg" alt="" width="240" height="150">' +
      '<div><p class="eyebrow">Keyingi qadam</p><h2>Bu bo\'lim shu yerda bo\'ladi</h2><ul>' + p.i.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></section>';
  }

  function renderNav(S, r) {
    var n = Q.calc.upcoming(S, S.profile.lead).length;
    var badge = n ? '<span class="badge" aria-label="' + n + ' ta diqqat talab qiladi">' + n + '</span>' : '';
    $('#nav').innerHTML = NAV.map(function (x) {
      return '<a href="#' + x[0] + '"' + (r === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[2]) + '<span>' + x[1] + '</span>' + (x[0] === 'eslatmalar' ? badge : '') + '</a>';
    }).join('');
    var bar = [NAV[0], NAV[1], NAV[2], NAV[4]], moreOn = ['eslatmalar', 'xabarlar', 'sozlamalar'].indexOf(r) >= 0;
    $('#tabbar').innerHTML = bar.map(function (x) {
      return '<a href="#' + x[0] + '"' + (r === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[2], 22) + '<span>' + x[1].replace('Bosh sahifa', 'Bosh') + '</span></a>';
    }).join('') + '<button type="button" data-more' + (moreOn ? ' aria-current="page"' : '') + '>' + ic('more', 22) + '<span>Yana</span>' + (n ? '<span class="badge">' + n + '</span>' : '') + '</button>';
    $('#moreList').innerHTML = [NAV[3], NAV[5], NAV[6]].map(function (x) {
      return '<a href="#' + x[0] + '">' + ic(x[2]) + '<span>' + x[1] + '</span></a>';
    }).join('');
  }

  function render() {
    var S = Q.db.state(), r = route(), html;
    if (r === 'bosh') html = Q.views.home(S);
    else if (r === 'qarzlarim') html = Q.views.debts(S, 'owe');
    else if (r === 'haqlarim') html = Q.views.debts(S, 'owed');
    else if (r === 'kirim-chiqim') html = Q.views.cash(S);
    else if (r === 'eslatmalar') html = Q.views.rem(S);
    else if (r === 'xabarlar') html = Q.views.msg(S);
    else if (r === 'sozlamalar') html = Q.views.settings(S);
    else html = planView(r);
    $('#view').innerHTML = html;
    Q.topbar.render();
    renderNav(S, r);
    if (r === 'sozlamalar' && Q.settings.after) Q.settings.after();
    document.title = (r === 'bosh' ? '' : PLAN[r].t + ' · ') + 'Qarzlar daftari';
  }
  Q.app = { render: render };

  function setMore(open) { $('#more').hidden = !open; document.body.style.overflow = open ? 'hidden' : ''; }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-more]')) { setMore(true); return; }
    if (e.target.id === 'more' || e.target.closest('[data-close]') || e.target.closest('#moreList a')) setMore(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMore(false); });
  /* bo'lim ichida turgan bo'lsa, menyudan qayta bosganda umumiy ko'rinishga qaytadi */
  function resetViews() { if (Q.rem) Q.rem.reset(); if (Q.cash) Q.cash.reset(); }
  window.addEventListener('hashchange', function () { resetViews(); render(); window.scrollTo(0, 0); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('#nav a, #tabbar a, #moreList a');
    if (a && a.getAttribute('href') === '#' + route()) { if (Q.rem) Q.rem.reset(); if (Q.cash) { Q.cash.reset(); } render(); window.scrollTo(0, 0); }
  });

  /* kursni Markaziy bankdan yangilash: ochilganda, internet qaytganda va har 30 daqiqada */
  function refreshFx() {
    Q.topbar.render();
    Q.fx.refresh().then(function (ok) { if (ok || Q.fx.failed) render(); });
  }
  window.addEventListener('online', refreshFx);
  setInterval(refreshFx, 30 * 60 * 1000);

  /* Android "orqaga" tugmasi: avval ochiq oynani yopadi, so'ng bosh sahifaga qaytadi, oxirida ilovani yig'adi */
  function back() {
    if (Q.welcoming || Q.locked) return false;
    if (Q.ui.isOpen()) { Q.ui.close(); return true; }
    if (!$('#more').hidden) { setMore(false); return true; }
    var inner = (Q.cash && Q.cash.isDetail && Q.cash.isDetail()) || (Q.rem && Q.rem.isDetail && Q.rem.isDetail());
    if (inner) { resetViews(); render(); window.scrollTo(0, 0); return true; }
    if (route() !== 'bosh') { location.hash = '#bosh'; return true; }
    return false;
  }
  Q.app.back = back;

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (Q.db.runRecurring()) render();
    Q.notify.sync();
  });

  /* baza (SQLite) ochilgach ishga tushadi */
  function fail(e) {
    var d = document.getElementById('view') || document.body;
    d.innerHTML = '<div style="padding:24px;font:15px sans-serif;color:#b00020"><b>Ilova xatosi</b><br>' + String(e && e.message || e).replace(/</g, '&lt;') + '<br><small>' + String(e && e.stack || '').slice(0, 400).replace(/</g, '&lt;') + '</small></div>';
  }
  window.addEventListener('error', function (ev) { if (!document.querySelector('#view > *')) fail(ev.error || ev.message); });
  Q.store.init().catch(function () {}).then(function () {
    Q.db.init();
    Q.db.runRecurring();
    var first = !Q.db.state().profile.welcomed;
    Q.settings.boot();
    render();
    refreshFx();
    Q.native.onBack(back);
    if (first) Q.welcome.show(); else { Q.notify.firstRun(); Q.notify.sync(); }
  }).catch(fail);
})(window.QD = window.QD || {});

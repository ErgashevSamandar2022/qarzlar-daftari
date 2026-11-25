/* notify.js: budilnik kabi bildirishnomalar (telefon ilovasida).
   Ma'lumot o'zgargan, ilova ochilgan yoki qayta ochilgan zahoti yaqin 30 kunlik reja (calc.notifyPlan)
   tizimning mahalliy bildirishnomalariga topshiriladi. Telefon yopiq turganda ham o'z vaqtida chiqadi. */
(function (Q) {
  'use strict';
  var N = Q.native, CH = 'eslatma', TEST_ID = 900001, timer = 0, running = false, again = false, chReady = false, lastCount = 0, lastError = '';
  function lp() { return N.plugin('LocalNotifications'); }
  function flag(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* yopiq */ } return null; }

  function channel() {
    if (chReady) return Promise.resolve();
    return lp().createChannel({ id: CH, name: 'Eslatmalar', description: 'Qarz muddatlari va shaxsiy eslatmalar', importance: 5, visibility: 1, vibration: true, lights: true })
      .catch(function () { /* eski Androidda kanal yo'q */ }).then(function () { chReady = true; });
  }
  function granted() { return lp().checkPermissions().then(function (p) { return p.display === 'granted'; }).catch(function () { return false; }); }

  function run() {
    if (running) { again = true; return Promise.resolve(); }
    running = true;
    return granted().then(function (ok) {
      if (!ok) return;
      return channel().then(function () { return lp().getPending(); }).then(function (pend) {
        var old = ((pend && pend.notifications) || []).filter(function (n) { return n.id < TEST_ID; }).map(function (n) { return { id: n.id }; });
        return old.length ? lp().cancel({ notifications: old }) : null;
      }).then(function () {
        var plan = Q.calc.notifyPlan(Q.db.state(), new Date(), 30, 300);
        lastCount = plan.length; lastError = '';
        if (!plan.length) return;
        return lp().schedule({ notifications: plan.map(function (p, i) {
          return { id: i + 1, title: p.title, body: p.body, largeBody: p.body, summaryText: 'Qarzlar daftari', channelId: CH, schedule: { at: p.at, allowWhileIdle: true } };
        }) });
      });
    }).catch(function (e) { lastError = String(e && e.message || e); })
      .then(function () { running = false; if (again) { again = false; return run(); } });
  }

  var notify = {
    supported: N.isNative,
    /* ma'lumot tez-tez o'zgarishi mumkin: bir necha marta emas, bir marta ishlaydi */
    sync: function () { if (!N.isNative) return; clearTimeout(timer); timer = setTimeout(run, 900); },
    status: function () {
      if (!N.isNative) return Promise.resolve({ state: 'web' });
      return lp().checkPermissions().then(function (p) {
        var res = { state: p.display, count: lastCount, error: lastError };
        return lp().checkExactNotificationSetting().then(function (x) { res.exact = x.exact_alarm; return res; }).catch(function () { return res; });
      }).catch(function (e) { return { state: 'error', error: String(e && e.message || e) }; });
    },
    request: function () {
      if (!N.isNative) return Promise.resolve('web');
      return lp().requestPermissions().then(function (p) { if (p.display === 'granted') notify.sync(); return p.display; }).catch(function () { return 'error'; });
    },
    openExact: function () { return lp().changeExactNotificationSetting().catch(function () { /* yo'q */ }); },
    /* sinov: 5 soniyadan keyin bildirishnoma chiqadi */
    test: function (title, body, sec) {
      return channel().then(function () {
        return lp().schedule({ notifications: [{ id: TEST_ID, title: title || 'Sinov bildirishnomasi', body: body || 'Eslatmalar shunday keladi.', channelId: CH, schedule: { at: new Date(Date.now() + (sec || 5) * 1000), allowWhileIdle: true } }] });
      });
    },
    /* birinchi ochilishda: ruxsat so'raladi va tasdiq bildirishnomasi yuboriladi */
    firstRun: function () {
      if (!N.isNative || flag('qd-notif-asked')) return Promise.resolve();
      flag('qd-notif-asked', '1');
      return notify.request().then(function (st) {
        if (st === 'granted') return notify.test('Eslatmalar yoqildi', 'Qarz muddatlari va eslatmalar endi shu yerga keladi.', 3);
      }).catch(function () { /* ruxsat berilmasa, Sozlamalarda qayta so'raladi */ });
    },
    count: function () { return lastCount; }
  };
  Q.notify = notify;
})(window.QD = window.QD || {});

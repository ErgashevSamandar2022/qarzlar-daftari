/* settings.js: Sozlamalar bo'limi va PIN-kod qulfi.
   Profil, ogohlantirish kuni, zaxira nusxa, ma'lumotlarni tozalash, PIN, xabar shablonlari, ko'rinish, eslatma vaqtlari. */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ui = Q.ui, ic = U.ic, esc = U.esc;
  function $(s) { return document.querySelector(s); }
  Q.views = Q.views || {};
  var DAY = 86400000;

  /* ---------- sozlamalarni qo'llash ---------- */
  function apply() {
    var P = Q.db.state().profile, h = document.documentElement;
    C.userTimes = P.times;
    if (P.theme === 'light' || P.theme === 'dark') h.setAttribute('data-theme', P.theme); else h.removeAttribute('data-theme');
    Q.native.bars();
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[‘’ʻʼ`´]/g, "'").trim(); }
  function ago(iso) {
    if (!iso) return '';
    var n = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
    return n <= 0 ? 'bugun' : n === 1 ? 'kecha' : n + ' kun oldin';
  }
  function choices(name, list, value) {
    return '<div class="choices">' + list.map(function (x) {
      return '<label class="choice"><input type="radio" name="' + name + '" value="' + x[0] + '"' + (String(value) === String(x[0]) ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
    }).join('') + '</div>';
  }

  /* ---------- sahifa ---------- */
  function card(n, tone, icon, title, desc, body, foot) {
    return '<section class="sc ' + tone + '" aria-label="' + title + '"><span class="rc-tab">' + U.pad(n) + '</span>' +
      '<header class="sc-h"><span class="rc-ic">' + ic(icon, 22) + '</span><div><h2>' + title + '</h2><p class="muted">' + desc + '</p></div></header>' +
      '<div class="sc-b">' + body + '</div>' + (foot ? '<div class="sc-f">' + foot + '</div>' : '') + '</section>';
  }
  function timesHTML(P) {
    var t = (P.times || []).slice().sort();
    return '<div class="st-times" id="st-times">' + t.map(function (x, i) {
      return '<div class="st-trow"><input type="time" class="st-time" value="' + x + '" aria-label="Vaqt ' + (i + 1) + '"><button type="button" class="icon-btn" data-act="st-rmtime" data-i="' + i + '" aria-label="O\'chirish"' + (t.length < 2 ? ' disabled' : '') + '>' + ic('trash', 16) + '</button></div>';
    }).join('') + '</div>' + (t.length < 5 ? '<button type="button" class="btn sm" data-act="st-addtime">' + ic('plus', 15) + "Vaqt qo'shish</button>" : '');
  }

  Q.views.settings = function (S) {
    var P = S.profile, size = 0, up = C.upcoming(S, P.lead).length;
    try { size = new Blob([JSON.stringify(S)]).size; } catch (e) { size = 0; }
    var bk = P.lastBackup, old = !bk || (Date.now() - new Date(bk).getTime()) > 30 * DAY;
    var tpl = ['soft', 'exact', 'firm'].map(function (k) {
      var txt = (P.tpl && P.tpl[k]) || C.TPL[k];
      return '<li><b>' + C.TPL_NAMES[k] + (P.tpl && P.tpl[k] ? ' <em>o\'zgartirilgan</em>' : '') + '</b><span>' + esc(txt) + '</span></li>';
    }).join('');
    var cards = [
      card(1, 'blue', 'user', 'Profil', "Ismingiz xabar oxirida imzo bo'ladi",
        '<div class="field"><label for="st-name">Ismingiz</label><input id="st-name" maxlength="40" autocomplete="off" placeholder="Masalan: Bobur" value="' + esc(P.name) + '"></div>' +
        '<span class="lbl">Asosiy valyuta</span>' + choices('stcur', U.CURS.map(function (c) { return [c, c === 'UZS' ? "So'm" : U.CUR_SIGN[c] + ' ' + U.CUR_NAME[c]]; }), P.cur)),
      card(2, 'warn', 'bell', 'Ogohlantirish kuni', 'Muddatga necha kun qolganda diqqat talab qilinadi',
        choices('lead', [[1, '1 kun'], [2, '2 kun'], [3, '3 kun'], [5, '5 kun'], [7, '7 kun'], [14, '14 kun']], P.lead) +
        '<p class="sc-note">Hozir ' + P.lead + ' kun ichida <b>' + up + ' ta</b> narsa diqqat talab qiladi.</p>'),
      card(3, 'owed', 'save', 'Zaxira nusxa', Q.native.isNative ? "Telefonni almashtirsangiz yoki ilovani o'chirsangiz, ma'lumot yo'qoladi. Nusxasini olib qo'ying" : "Ma'lumotlar faqat shu brauzerda turadi, nusxasini olib qo'ying",
        '<p class="sc-stat"><span class="chip ' + (old ? 'warn' : 'done') + '">' + (bk ? 'Oxirgi zaxira: ' + ago(bk) : 'Zaxira olinmagan') + '</span></p>' +
        '<p class="sc-note">' + S.debts.length + ' qarz, ' + S.entries.length + ' kirim-chiqim, ' + S.reminders.length + ' eslatma, ' + S.messages.length + ' xabar.</p>',
        '<button type="button" class="btn primary" data-act="st-backup">' + ic('save', 16) + 'Zaxira olish</button><button type="button" class="btn" data-act="st-restore">Tiklash</button>'),
      card(4, 'owe', 'trash', "Ma'lumotlarni tozalash", "Namuna ma'lumotlarni yoki hammasini o'chirish",
        '<p class="sc-note">' + (S.sample ? "Hozir ilovada <b>namuna ma'lumotlar</b> turibdi. Haqiqiy ma'lumot kiritishdan oldin tozalang." : "Namuna ma'lumotlar yo'q, faqat sizning ma'lumotlaringiz bor.") + '</p><p class="sc-note">Hajmi: ' + (size / 1024).toFixed(1).replace('.', ',') + ' KB</p>',
        '<button type="button" class="btn" data-act="st-clearsample"' + (S.sample ? '' : ' disabled') + '>Namunani tozalash</button><button type="button" class="btn danger" data-act="st-wipe">Hammasini o\'chirish</button>'),
      card(5, 'violet', 'lock', 'PIN-kod', "Ilovani ochishda 4 xonali kod so'raladi",
        '<p class="sc-stat"><span class="chip ' + (P.pin ? 'done' : '') + '">' + (P.pin ? 'Yoqilgan' : "O'chirilgan") + '</span></p>' +
        (P.pin ? '<span class="lbl">Avtomatik qulflash</span>' + choices('autolock', [[1, '1 daqiqa'], [5, '5 daqiqa'], [15, '15 daqiqa'], [0, "Faqat qo'lda"]], P.autoLock) : '') +
        '<p class="sc-note">PIN ilovani boshqalar ko\'rib qolishidan saqlaydi. Ma\'lumot shifrlanmaydi.</p>',
        P.pin ? '<button type="button" class="btn" data-act="st-pin" data-m="change">O\'zgartirish</button><button type="button" class="btn" data-act="st-lock">' + ic('lock', 15) + 'Qulflash</button><button type="button" class="btn danger" data-act="st-pin" data-m="off">O\'chirish</button>' : '<button type="button" class="btn primary" data-act="st-pin" data-m="set">' + ic('lock', 16) + "PIN o'rnatish</button>"),
      card(6, 'pink', 'chat', 'Xabar shablonlari', 'Qarzdorlarga ketadigan xabar matnlari', '<ul class="sc-tpl">' + tpl + '</ul>',
        '<button type="button" class="btn primary" data-act="st-tpl">' + ic('edit', 15) + 'Matnlarni tahrirlash</button>'),
      card(7, 'blue', 'sun', "Ko'rinish", 'Yorug\' yoki qorong\'i rejim', choices('theme', [['system', 'Tizim'], ['light', "Yorug'"], ['dark', "Qorong'i"]], P.theme) +
        '<p class="sc-note">«Tizim» tanlansa, telefon yoki kompyuter sozlamasiga qarab o\'zgaradi.</p>'),
      card(8, 'warn', 'clock', 'Eslatma vaqtlari', 'Eslatma soat nechada kelishi', timesHTML(P) +
        '<p class="sc-note">Qarzda «kuniga 3 marta» tanlansa, shu ro\'yxatdagi dastlabki 3 vaqt ishlatiladi. Ko\'pi bilan 5 ta.</p>'),
      card(9, 'violet', 'bell', 'Bildirishnomalar', 'Budilnik kabi, aniq vaqtda eslatadi',
        '<p class="sc-stat"><span class="chip" id="nt-chip">Tekshirilmoqda</span></p><p class="sc-note" id="nt-note"></p>' +
        '<p class="sc-note">Vaqtni 8-kartadan o\'zgartirasiz. Ovozni o\'zgartirish: telefon sozlamalari, Ilovalar, Qarzlar daftari, Bildirishnomalar, «Eslatmalar».</p>' +
        '<p class="sc-note">Telefon batareyani tejab bildirishnomani kechiktirsa, ilova uchun batareya rejimini «Cheklovsiz» qiling.</p>',
        '<button type="button" class="btn primary" data-act="st-notif-ask"' + (Q.native.isNative ? '' : ' disabled') + '>Ruxsat berish</button><button type="button" class="btn" data-act="st-notif-test"' + (Q.native.isNative ? '' : ' disabled') + '>Sinab ko\'rish</button><button type="button" class="btn" id="nt-exact" data-act="st-notif-exact" hidden>Aniq vaqt ruxsati</button>'),
      card(10, 'blue', 'save', 'Ilova bazasi', "Ma'lumot qayerda saqlanadi",
        '<p class="sc-stat"><span class="chip ' + (Q.store.info().engine === 'sqlite' ? 'done' : 'warn') + '">' + (Q.store.info().engine === 'sqlite' ? 'SQLite (ilova ichida)' : 'Brauzer xotirasi') + '</span></p>' +
        '<p class="sc-note">' + (Q.store.info().engine === 'sqlite' ? "Ma'lumot ilovaning o'z bazasida, internetsiz saqlanadi. Qo'shimcha nusxa ilova xotirasida ham turadi." : (Q.native.isNative ? 'Baza ochilmadi, ma\'lumot ilova xotirasida saqlanyapti. ' + esc(Q.store.info().error) : "Brauzer ma'lumotni tozalasa, hammasi o'chadi. Zaxira nusxa oling.")) + '</p>',
        '<button type="button" class="btn" data-act="st-dbtest"' + (Q.store.info().engine === 'sqlite' ? '' : ' disabled') + '>Bazani tekshirish</button>')
    ].join('');
    return '<div class="page-head"><div><h1>Sozlamalar</h1><p>Profil, xavfsizlik va ma\'lumotlar. Hammasi shu qurilmada saqlanadi.</p></div></div>' +
      '<div class="tiles set-tiles"><div class="tile big"><span>Ma\'lumotlar</span><b>' + (S.debts.length + S.entries.length + S.reminders.length + S.messages.length) + ' ta yozuv</b></div>' +
      '<div class="tile"><span>Oxirgi zaxira</span><b class="' + (old ? 'warn' : '') + '">' + (bk ? ago(bk) : 'yo\'q') + '</b></div>' +
      '<div class="tile"><span>PIN-kod</span><b>' + (P.pin ? 'Yoqilgan' : "O'chiq") + '</b></div>' +
      '<div class="tile"><span>Hajmi</span><b>' + (size / 1024).toFixed(1).replace('.', ',') + ' KB</b></div></div>' +
      '<div class="set-grid">' + cards + '</div><p class="set-foot">Qarzlar daftari · ma\'lumotlar versiyasi 6</p>';
  };

  /* ---------- oynalar ---------- */
  function head(eyebrow, title) { return '<div class="sh"><div><p class="eyebrow">' + eyebrow + '</p><h2>' + title + '</h2></div><button type="button" class="x" data-sheet-close aria-label="Yopish">&times;</button></div>'; }
  function backupText() { return JSON.stringify(Q.db.exportData()); }
  function markBackup() { Q.db.setProfile({ lastBackup: new Date().toISOString() }); }
  function download(name, text) { return Q.native.saveFile(name, text, 'application/json'); }
  var snapCache = {};
  /* ilova bazasidagi kunlik avtomatik nusxalar ro'yxati */
  function loadSnaps() {
    var box = $('#st-snaps'); if (!box) return;
    Q.store.snapshots().then(function (list) {
      var b = $('#st-snaps'); if (!b) return; snapCache = {};
      var rows = list.map(function (x) { snapCache[x.day] = x.raw; return '<li><span>' + U.long(x.day) + '</span><button type="button" class="btn sm" data-act="st-snap" data-day="' + x.day + '">Qaytarish</button></li>'; }).join('');
      b.innerHTML = rows ? '<p class="lbl" style="margin-top:14px">Avtomatik nusxalar (har kuni, 7 kun)</p><ul class="st-snaps">' + rows + '</ul><p class="note">Nusxa shu kuni ilova birinchi ochilgandagi holatni saqlaydi.</p>' : '';
    });
  }
  function fillNotif() {
    var chip = $('#nt-chip'), note = $('#nt-note'); if (!chip) return;
    Q.notify.status().then(function (st) {
      var c = $('#nt-chip'), n = $('#nt-note'); if (!c) return;
      var txt = '', cls = '', msg = '';
      if (st.state === 'web') { txt = 'Faqat telefon ilovasida'; msg = 'Brauzerda bildirishnoma yuborilmaydi. APK ilovada budilnik kabi ishlaydi.'; }
      else if (st.state === 'granted') { txt = 'Yoqilgan'; cls = 'done'; msg = 'Yaqin 30 kun uchun ' + Q.notify.count() + ' ta bildirishnoma rejalashtirilgan. Ilova ochilganda reja yangilanadi.'; }
      else if (st.state === 'denied') { txt = "Ruxsat yo'q"; cls = 'bad'; msg = "Telefon sozlamalari, Ilovalar, Qarzlar daftari, Bildirishnomalar bo'limidan ruxsat bering."; }
      else if (st.state === 'error') { txt = 'Xato'; cls = 'bad'; msg = st.error || ''; }
      else { txt = "Ruxsat so'ralmagan"; cls = 'warn'; msg = "«Ruxsat berish» tugmasini bosing."; }
      if (st.exact === 'denied') msg += ' Aniq vaqt ruxsati o\'chiq, bildirishnoma kechikishi mumkin.';
      if (st.error && st.state === 'granted') msg += ' Oxirgi xato: ' + st.error;
      c.className = 'chip ' + cls; c.textContent = txt; n.textContent = msg;
      var ex = $('#nt-exact'); if (ex) ex.hidden = st.exact !== 'denied';
    });
  }
  function backupSheet() {
    return head('Zaxira nusxa', 'Zaxira olish') +
      '<p class="muted" style="margin-bottom:12px">Barcha qarz, kirim-chiqim, eslatma va xabarlar bitta matnga yig\'iladi. PIN-kod nusxaga yozilmaydi.</p>' +
      '<div class="btns" style="margin-top:0"><button type="button" class="btn primary" data-act="st-dl">' + ic('save', 16) + 'Faylga saqlash</button><button type="button" class="btn" data-act="st-copyjson">Matnni nusxalash</button></div>' +
      '<div class="field" style="margin-top:14px"><label for="st-json">Zaxira matni</label><textarea id="st-json" readonly rows="6" style="font-family:monospace;font-size:12px">' + esc(backupText()) + '</textarea></div>' +
      '<div id="st-snaps"></div>' +
      '<p class="note">Ba\'zi brauzerlarda fayl yuklab olinmaydi. Unda matnni nusxalab, o\'zingizga yuboring yoki hujjatga saqlang. Tiklash shu matn yoki fayldan bo\'ladi.</p>';
  }
  function restoreSheet() {
    return head('Zaxira nusxa', 'Tiklash') +
      '<p class="muted" style="margin-bottom:12px">Fayl tanlang yoki zaxira matnini pastga qo\'ying. Hozirgi ma\'lumotlar zaxiradagi bilan almashtiriladi.</p>' +
      '<div class="field"><label for="st-file">Zaxira fayli (.json)</label><input id="st-file" type="file" accept=".json,application/json"></div>' +
      '<div class="field"><label for="st-in">Yoki matnni qo\'ying</label><textarea id="st-in" rows="5" style="font-family:monospace;font-size:12px" placeholder="{&quot;app&quot;:&quot;qarzlar-daftari&quot;, ...}"></textarea></div>' +
      '<div id="st-sum"></div><p class="err" id="st-err" role="alert" hidden></p>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="st-check">Tekshirish</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div>';
  }
  function confirmSheet(eyebrow, title, text, act, label, cls) {
    return head(eyebrow, title) + '<p style="margin-bottom:6px">' + text + '</p><div class="btns"><button type="button" class="btn ' + (cls || 'danger-solid') + '" data-act="' + act + '">' + label + '</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div>';
  }
  function wipeSheet(S) {
    return head("Ma'lumotlarni tozalash", "Hammasini o'chirish") +
      '<p style="margin-bottom:10px">' + S.debts.length + ' qarz, ' + S.entries.length + ' kirim-chiqim, ' + S.reminders.length + ' eslatma va ' + S.messages.length + ' xabar <b>qaytarib bo\'lmaydigan</b> tarzda o\'chadi. Profil va PIN sozlamalari saqlanadi.</p>' +
      '<div class="btns" style="margin:0 0 14px"><button type="button" class="btn" data-act="st-backup">' + ic('save', 16) + 'Avval zaxira olish</button></div>' +
      '<form data-form="wipe" novalidate><div class="field"><label for="st-word">Tasdiqlash uchun <b>o\'chirish</b> deb yozing</label><input id="st-word" autocomplete="off"></div>' +
      '<p class="err" id="st-err" role="alert" hidden></p><div class="btns"><button type="submit" class="btn danger-solid">Hammasini o\'chirish</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div></form>';
  }
  function tplPreview(t) {
    return t.replace(/\{ism\}/g, 'Aziz').replace(/\{summa\}/g, U.money(500000, 'UZS')).replace(/\{muddat\}/g, U.dateTo(U.addDays(U.today(), 7)));
  }
  function tplSheet() {
    var P = Q.db.state().profile;
    return head('Xabar shablonlari', 'Matnlarni tahrirlash') +
      '<p class="muted" style="margin-bottom:12px">Matn ichida shu so\'zlar o\'z joyiga qo\'yiladi: <b>{ism}</b> qarzdor ismi, <b>{summa}</b> qolgan qarz, <b>{muddat}</b> qaytarish sanasi.</p>' +
      '<form data-form="tpl" novalidate>' + ['soft', 'exact', 'firm'].map(function (k) {
        var t = (P.tpl && P.tpl[k]) || C.TPL[k];
        return '<div class="field"><label for="tp-' + k + '">' + C.TPL_NAMES[k] + '</label><textarea id="tp-' + k + '" name="' + k + '" rows="3" data-k="' + k + '">' + esc(t) + '</textarea>' +
          '<div class="tp-row"><button type="button" class="btn sm" data-act="st-ins" data-k="' + k + '" data-p="{ism}">{ism}</button><button type="button" class="btn sm" data-act="st-ins" data-k="' + k + '" data-p="{summa}">{summa}</button><button type="button" class="btn sm" data-act="st-ins" data-k="' + k + '" data-p="{muddat}">{muddat}</button><button type="button" class="btn sm" data-act="st-tplreset" data-k="' + k + '">Asl holatga</button></div>' +
          '<p class="tp-prev" id="tpv-' + k + '">' + esc(tplPreview(t)) + '</p></div>';
      }).join('') + '<p class="err" id="st-err" role="alert" hidden></p><div class="btns"><button type="submit" class="btn primary">Saqlash</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div></form>';
  }
  function pinSheet(mode) {
    var title = mode === 'set' ? "PIN o'rnatish" : mode === 'change' ? "PIN-kodni o'zgartirish" : "PIN-kodni o'chirish";
    function pin(id, name, label) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + name + '" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="••••"></div>'; }
    return head('PIN-kod', title) + '<form data-form="pin" data-m="' + mode + '" novalidate>' +
      (mode !== 'set' ? pin('pn-cur', 'cur', 'Hozirgi PIN') : '') + (mode !== 'off' ? pin('pn-new', 'nw', 'Yangi PIN (4 ta raqam)') + pin('pn-new2', 'nw2', 'Yangi PINni takrorlang') : '') +
      '<p class="err" id="st-err" role="alert" hidden></p><div class="btns"><button type="submit" class="btn ' + (mode === 'off' ? 'danger-solid' : 'primary') + '">' + (mode === 'off' ? "O'chirish" : 'Saqlash') + '</button><button type="button" class="btn" data-sheet-close>Bekor qilish</button></div></form>';
  }
  function showErr(t) { var e = $('#st-err'); if (e) { e.textContent = t; e.hidden = false; e.scrollIntoView({ block: 'center' }); } }

  /* ---------- PIN va qulf ---------- */
  function cyrb53(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, ch;
    for (i = 0; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  function hashPin(pin, salt, alg) {
    var s = 'qd:' + salt + ':' + pin, subtle = window.crypto && window.crypto.subtle && window.TextEncoder;
    if ((alg || 's256') === 's256' && subtle) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
        return { alg: 's256', hash: [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('') };
      });
    }
    return Promise.resolve({ alg: 'c53', hash: cyrb53(s) });
  }
  function checkPin(pin) {
    var p = Q.db.state().profile.pin;
    if (!p) return Promise.resolve(true);
    if (p.alg === 's256' && !(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.resolve(false);
    return hashPin(pin, p.salt, p.alg).then(function (r) { return r.hash === p.hash; });
  }

  var lock = { buf: '', fails: 0, until: 0, forgot: false, last: Date.now(), hiddenAt: 0 };
  function lockEl() { return $('#lock'); }
  function lockHTML() {
    var dots = '', i;
    for (i = 0; i < 4; i++) dots += '<span' + (i < lock.buf.length ? ' class="on"' : '') + '></span>';
    if (lock.forgot) {
      return '<div class="lock-in"><img src="assets/images/logo.svg" alt="" width="52" height="52"><h1>PIN unutilgan</h1>' +
        '<p>PINni tiklab bo\'lmaydi. Davom etsangiz, ilovadagi <b>barcha ma\'lumotlar o\'chadi</b> va PIN olib tashlanadi. Zaxira nusxangiz bo\'lsa, keyin tiklashingiz mumkin.</p>' +
        '<div class="field" style="width:100%"><label for="lk-word"><b>o\'chirish</b> deb yozing</label><input id="lk-word" autocomplete="off"></div><p class="err" id="lk-err" hidden></p>' +
        '<button type="button" class="btn danger-solid full" data-act="lk-wipe">Hammasini o\'chirib, PINni olib tashlash</button><button type="button" class="btn full" data-act="lk-back">Orqaga</button></div>';
    }
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-act="lk-key" data-k="' + n + '">' + n + '</button>'; }).join('') +
      '<span></span><button type="button" data-act="lk-key" data-k="0">0</button><button type="button" data-act="lk-key" data-k="del" aria-label="O\'chirish">' + ic('back', 20) + '</button>';
    return '<div class="lock-in"><img src="assets/images/logo.svg" alt="" width="52" height="52"><h1>Qarzlar daftari</h1><p id="lk-msg">PIN-kodni kiriting</p>' +
      '<div class="lk-dots" id="lk-dots" aria-label="Kiritilgan raqamlar">' + dots + '</div><div class="lk-pad">' + keys + '</div>' +
      '<button type="button" class="lk-link" data-act="lk-forgot">PINni unutdim</button></div>';
  }
  function lockRender() { lockEl().innerHTML = lockHTML(); }
  function lockShow() {
    var P = Q.db.state().profile; if (!P.pin) return;
    lock.buf = ''; lock.forgot = false; lockRender(); lockEl().hidden = false; document.body.style.overflow = 'hidden'; Q.locked = true;
    if (Q.ui.isOpen()) Q.ui.close();
  }
  function lockHide() { lockEl().hidden = true; document.body.style.overflow = ''; Q.locked = false; lock.fails = 0; lock.last = Date.now(); }
  function lkMsg(t, bad) { var m = $('#lk-msg'); if (m) { m.textContent = t; m.className = bad ? 'bad' : ''; } }
  function lockKey(k) {
    if (Date.now() < lock.until) { lkMsg(Math.ceil((lock.until - Date.now()) / 1000) + ' soniyadan keyin urinib ko\'ring', true); return; }
    if (k === 'del') lock.buf = lock.buf.slice(0, -1); else if (lock.buf.length < 4) lock.buf += k;
    var d = $('#lk-dots'); if (d) [].forEach.call(d.children, function (s, i) { s.className = i < lock.buf.length ? 'on' : ''; });
    if (lock.buf.length === 4) {
      var pin = lock.buf;
      checkPin(pin).then(function (ok) {
        if (ok) { lockHide(); return; }
        lock.buf = ''; lock.fails++;
        var dd = $('#lk-dots'); if (dd) { dd.className = 'lk-dots shake'; setTimeout(function () { dd.className = 'lk-dots'; [].forEach.call(dd.children, function (s) { s.className = ''; }); }, 400); }
        if (lock.fails >= 5) { lock.until = Date.now() + 30000; lock.fails = 0; lkMsg("Ko'p xato kiritildi. 30 soniya kuting", true); }
        else lkMsg("PIN noto'g'ri. " + (5 - lock.fails) + ' ta urinish qoldi', true);
      });
    }
  }
  function autoLockCheck(why) {
    var P = Q.db.state().profile; if (!P.pin || Q.locked || !P.autoLock) return;
    var idleMs = Date.now() - (why === 'visible' ? lock.hiddenAt : lock.last);
    if (idleMs > P.autoLock * 60000) lockShow();
  }
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, function () { if (!Q.locked) lock.last = Date.now(); }, { passive: true, capture: true }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) lock.hiddenAt = Date.now(); else autoLockCheck('visible'); });
  setInterval(function () { autoLockCheck('idle'); }, 10000);
  document.addEventListener('keydown', function (e) {
    if (!Q.locked || lock.forgot) return;
    if (/^[0-9]$/.test(e.key)) lockKey(e.key); else if (e.key === 'Backspace') lockKey('del');
  });

  /* ---------- hodisalar ---------- */
  function saveTimes() {
    var vals = [].slice.call(document.querySelectorAll('.st-time')).map(function (i) { return i.value; }).filter(Boolean);
    vals = vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort();
    if (!vals.length) vals = ['09:00'];
    Q.db.setProfile({ times: vals }); apply(); Q.app.render();
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act, S = Q.db.state(), P = S.profile;
    if (a.indexOf('st-') !== 0 && a.indexOf('lk-') !== 0) return;
    if (a === 'lk-key') lockKey(el.dataset.k);
    else if (a === 'lk-forgot') { lock.forgot = true; lockRender(); }
    else if (a === 'lk-back') { lock.forgot = false; lock.buf = ''; lockRender(); }
    else if (a === 'lk-wipe') {
      if (norm($('#lk-word').value) !== "o'chirish") { var e = $('#lk-err'); e.textContent = "«o'chirish» so'zini yozing."; e.hidden = false; return; }
      Q.db.resetAll(); Q.db.setProfile({ pin: null }); lockHide(); apply(); Q.app.render(); ui.toast("Ma'lumotlar o'chirildi, PIN olib tashlandi");
    }
    else if (a === 'st-backup') { ui.sheet(backupSheet(), true); loadSnaps(); }
    else if (a === 'st-dl') { download('qarzlar-daftari-' + U.today() + '.json', backupText()); markBackup(); Q.app.render(); ui.toast('Zaxira tayyor. Yuklanmasa, matnni nusxalang'); }
    else if (a === 'st-copyjson') { var t = $('#st-json'); ui.copy(t.value, t).then(function (ok) { if (ok) { markBackup(); Q.app.render(); } ui.toast(ok ? 'Zaxira matni nusxalandi' : 'Matnni belgilab nusxalang'); }); }
    else if (a === 'st-notif-ask') { Q.notify.request().then(function (st) { ui.toast(st === 'granted' ? 'Bildirishnoma yoqildi' : "Ruxsat berilmadi. Telefon sozlamalaridan yoqing"); fillNotif(); }); }
    else if (a === 'st-notif-test') { Q.notify.request().then(function (st) { if (st !== 'granted') { ui.toast('Avval ruxsat bering'); fillNotif(); return; } return Q.notify.test().then(function () { ui.toast("5 soniyadan keyin bildirishnoma chiqadi"); }); }).catch(function (e) { ui.toast('Xato: ' + (e && e.message || e)); }); }
    else if (a === 'st-notif-exact') Q.notify.openExact();
    else if (a === 'st-dbtest') { Q.store.test().then(function (r) { ui.toast(r.ok ? 'Baza ishlayapti: yozish va o\'qish muvaffaqiyatli' : 'Baza xatosi: ' + r.msg); }); }
    else if (a === 'st-snap') { var dd = el.dataset.day; ui.sheet(confirmSheet('Avtomatik nusxa', U.long(dd) + " holatiga qaytarish", "Hozirgi ma'lumotlar shu kundagi nusxa bilan almashtiriladi. PIN o'zgarmaydi. Avval hozirgi holatning zaxirasini olib qo'ying.", 'st-snap-go', 'Ha, qaytarilsin').replace('data-act="st-snap-go"', 'data-act="st-snap-go" data-day="' + dd + '"')); }
    else if (a === 'st-snap-go') { var raw = snapCache[el.dataset.day]; if (raw && Q.db.restoreRaw(raw)) { apply(); ui.close(); Q.app.render(); ui.toast('Ma\'lumotlar qaytarildi'); } else ui.toast('Nusxa topilmadi'); }
    else if (a === 'st-restore') ui.sheet(restoreSheet(), true);
    else if (a === 'st-check') {
      var txt = $('#st-in').value.trim(), o = null, sum = $('#st-sum'); $('#st-err').hidden = true;
      try { o = JSON.parse(txt); } catch (x) { o = null; }
      var info = o ? Q.db.checkBackup(o) : null;
      if (!info) { showErr("Bu zaxira matni emas yoki buzilgan. Fayl yoki matnni qaytadan tekshiring."); sum.innerHTML = ''; return; }
      sum.innerHTML = '<div class="cf-linkbox owed"><b>Zaxira topildi' + (info.at ? ' · ' + U.short(info.at.slice(0, 10)) : '') + '</b><p>' + info.debts + ' qarz, ' + info.entries + ' kirim-chiqim, ' + info.reminders + ' eslatma, ' + info.messages + ' xabar.</p><p>Hozirgi ma\'lumotlar shu zaxira bilan almashtiriladi.</p>' +
        '<button type="button" class="btn danger-solid" data-act="st-restore-go">Ha, tiklansin</button></div>';
    }
    else if (a === 'st-restore-go') {
      var o2 = null; try { o2 = JSON.parse($('#st-in').value.trim()); } catch (x2) { o2 = null; }
      if (!o2 || !Q.db.checkBackup(o2)) { showErr('Zaxira matni buzilgan.'); return; }
      Q.db.importData(o2); apply(); ui.close(); Q.app.render(); ui.toast('Ma\'lumotlar tiklandi');
    }
    else if (a === 'st-clearsample') ui.sheet(confirmSheet("Ma'lumotlarni tozalash", "Namuna ma'lumotlarni tozalash", "Namunadagi qarzlar, kirim-chiqim, eslatma va xabarlar o'chadi. Siz kiritgan ma'lumot qolmaydi, chunki hozir hammasi namuna. Davom etamizmi?", 'st-clearsample-go', 'Ha, tozalansin'));
    else if (a === 'st-clearsample-go') { Q.db.clearSample(); ui.close(); Q.app.render(); ui.toast("Namuna ma'lumotlar tozalandi"); }
    else if (a === 'st-wipe') ui.sheet(wipeSheet(S));
    else if (a === 'st-pin') ui.sheet(pinSheet(el.dataset.m));
    else if (a === 'st-lock') lockShow();
    else if (a === 'st-tpl') ui.sheet(tplSheet(), true);
    else if (a === 'st-ins') {
      var ta = $('#tp-' + el.dataset.k), s = ta.selectionStart || 0, e2 = ta.selectionEnd || 0;
      ta.value = ta.value.slice(0, s) + el.dataset.p + ta.value.slice(e2); ta.focus(); ta.setSelectionRange(s + el.dataset.p.length, s + el.dataset.p.length);
      $('#tpv-' + el.dataset.k).textContent = tplPreview(ta.value);
    }
    else if (a === 'st-tplreset') { var t2 = $('#tp-' + el.dataset.k); t2.value = C.TPL[el.dataset.k]; $('#tpv-' + el.dataset.k).textContent = tplPreview(t2.value); }
    else if (a === 'st-addtime') {
      var cur = (P.times || []).slice().sort(), last = cur[cur.length - 1] || '08:00', h = (Number(last.slice(0, 2)) + 2) % 24, nt = U.pad(h) + ':00';
      while (cur.indexOf(nt) >= 0) { h = (h + 1) % 24; nt = U.pad(h) + ':00'; }
      Q.db.setProfile({ times: cur.concat(nt).sort() }); apply(); Q.app.render();
    }
    else if (a === 'st-rmtime') { var c2 = (P.times || []).slice().sort(); c2.splice(Number(el.dataset.i), 1); Q.db.setProfile({ times: c2 }); apply(); Q.app.render(); }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target, P = Q.db.state().profile;
    if (t.id === 'st-name') { Q.db.setProfile({ name: t.value.trim().slice(0, 40) }); ui.toast('Saqlandi'); }
    else if (t.name === 'stcur') { Q.db.setProfile({ cur: t.value }); Q.app.render(); ui.toast('Asosiy valyuta o\'zgardi'); }
    else if (t.name === 'lead') { Q.db.setProfile({ lead: Number(t.value) }); Q.app.render(); ui.toast('Saqlandi'); }
    else if (t.name === 'theme') { Q.db.setProfile({ theme: t.value }); apply(); Q.app.render(); }
    else if (t.name === 'autolock') { Q.db.setProfile({ autoLock: Number(t.value) }); ui.toast('Saqlandi'); }
    else if (t.classList && t.classList.contains('st-time')) saveTimes();
    else if (t.id === 'st-file' && t.files && t.files[0]) {
      var r = new FileReader(); r.onload = function () { $('#st-in').value = String(r.result || ''); ui.toast('Fayl o\'qildi. «Tekshirish» ni bosing'); }; r.readAsText(t.files[0]);
    }
    void P;
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (t.dataset && t.dataset.k && t.name === t.dataset.k && t.id.indexOf('tp-') === 0) $('#tpv-' + t.dataset.k).textContent = tplPreview(t.value);
  });

  document.addEventListener('submit', function (ev) {
    var f = ev.target.closest('form[data-form]'); if (!f) return;
    var kind = f.dataset.form; if (['wipe', 'tpl', 'pin'].indexOf(kind) < 0) return;
    ev.preventDefault();
    if (kind === 'wipe') {
      if (norm($('#st-word').value) !== "o'chirish") { showErr("«o'chirish» so'zini yozing."); return; }
      Q.db.resetAll(); ui.close(); Q.app.render(); ui.toast("Hamma ma'lumot o'chirildi");
    } else if (kind === 'tpl') {
      var tpl = {}, bad = false;
      ['soft', 'exact', 'firm'].forEach(function (k) { var v = f.elements[k].value.trim(); if (!v) bad = true; else if (v !== C.TPL[k]) tpl[k] = v; });
      if (bad) { showErr("Matn bo'sh bo'lmasligi kerak."); return; }
      Q.db.setProfile({ tpl: tpl }); ui.close(); Q.app.render(); ui.toast('Shablonlar saqlandi');
    } else {
      var m = f.dataset.m, v = f.elements, P = Q.db.state().profile;
      var run = function () {
        if (m === 'off') { Q.db.setProfile({ pin: null }); ui.close(); Q.app.render(); ui.toast("PIN o'chirildi"); return; }
        if (!/^\d{4}$/.test(v.nw.value)) { showErr('PIN 4 ta raqamdan iborat bo\'lishi kerak.'); return; }
        if (v.nw.value !== v.nw2.value) { showErr('PIN kodlar bir xil emas.'); return; }
        var salt = U.uid();
        hashPin(v.nw.value, salt).then(function (r) {
          Q.db.setProfile({ pin: { salt: salt, alg: r.alg, hash: r.hash }, autoLock: P.autoLock || 5 });
          ui.close(); Q.app.render(); ui.toast(m === 'set' ? 'PIN o\'rnatildi' : 'PIN o\'zgartirildi');
        });
      };
      if (m === 'set') run();
      else checkPin(v.cur.value).then(function (ok) { if (ok) run(); else showErr("Hozirgi PIN noto'g'ri."); });
    }
  });

  Q.settings = {
    apply: apply,
    after: fillNotif,
    boot: function () { apply(); lock.last = Date.now(); if (Q.db.state().profile.pin) lockShow(); }
  };
})(window.QD = window.QD || {});

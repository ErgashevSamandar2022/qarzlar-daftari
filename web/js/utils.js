/* utils.js: sana, pul va matn yordamchilari. DOM'ga bog'liq emas (faqat ic() SVG matn qaytaradi). */
(function (Q) {
  'use strict';
  var U = {};
  U.MS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  U.MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  U.WD = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.uid = function () { return Math.random().toString(36).slice(2, 9); };

  /* sanalar: "YYYY-MM-DD" ko'rinishida saqlanadi */
  U.pad = function (n) { return String(n).padStart(2, '0'); };
  U.iso = function (d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); };
  U.today = function () { return U.iso(new Date()); };
  U.parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  U.addDays = function (s, n) { var d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.diff = function (a, b) { return Math.round((U.parse(a) - U.parse(b)) / 86400000); };
  U.short = function (s) { var d = U.parse(s); return d.getDate() + '-' + U.MS[d.getMonth()]; };
  U.long = function (s) { var d = U.parse(s); return d.getDate() + '-' + U.MONTHS[d.getMonth()]; };

  /* pul */
  U.num = function (n) {
    var v = Math.abs(n);
    var s = Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2);
    var a = s.split('.');
    return a[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (a[1] ? ',' + a[1] : '');
  };
  U.CURS = ['UZS', 'USD', 'EUR'];
  U.CUR_NAME = { UZS: "So'm", USD: 'Dollar', EUR: 'Yevro' };
  U.CUR_SIGN = { UZS: "so'm", USD: '$', EUR: '€' };
  U.money = function (n, c) { return c === 'USD' ? U.num(n) + ' $' : c === 'EUR' ? U.num(n) + ' €' : U.num(n) + " so'm"; };
  U.curWord = function (c) { return c === 'USD' ? 'dollarda' : c === 'EUR' ? 'yevroda' : "so'mda"; };
  U.dateTo = function (s) { var d = U.parse(s); return d.getDate() + '-' + U.MONTHS[d.getMonth()] + 'gacha'; };
  U.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  U.phoneOk = function (s) { var n = U.digits(s).length; return !s || (n >= 9 && n <= 15); };
  /* Telegram: raqam yoki @username */
  U.tgInfo = function (s) {
    s = String(s || '').trim();
    if (!s) return { kind: '', text: '', url: '' };
    var d = s.replace(/[\s()-]/g, '');
    if (/^\+?\d{9,15}$/.test(d)) { var p = d.charAt(0) === '+' ? d : '+' + d; return { kind: 'phone', text: p, url: 'https://t.me/' + p }; }
    var u = s.replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '');
    if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(u)) return { kind: 'user', text: '@' + u, url: 'https://t.me/' + u };
    return { kind: 'bad', text: s, url: '' };
  };
  U.sign = function (n) { return n > 0.005 ? '+' : n < -0.005 ? '−' : ''; };
  U.smoney = function (n, c) { var g = U.sign(n); return (g ? g + ' ' : '') + U.money(n, c); };
  U.snum = function (n) { var g = U.sign(n); return (g ? g + ' ' : '') + U.num(n); };
  U.compact = function (n) {
    var v = Math.abs(n), s;
    if (v >= 1e6) s = (v / 1e6).toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' mln';
    else if (v >= 1e3) s = Math.round(v / 1e3) + ' ming';
    else s = String(Math.round(v));
    return (n < -0.005 ? '−' : n > 0.005 ? '+' : '') + s;
  };
  U.ini = function (n) {
    return String(n).trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
  };

  /* ikonkalar (24x24, chiziqli) */
  Q.icons = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    owe: '<path d="M17 7L7 17M7 9v8h8"/>',
    owed: '<path d="M7 17L17 7M9 7h8v8"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1.1-4.2A8 8 0 1 1 21 12z"/>',
    sliders: '<path d="M4 6h8M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="15" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    tg: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    save: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    repeat: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
    gift: '<path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 7h18v4H3zM12 7v14M12 7S10 3 8 3.5 7.5 7 12 7zm0 0s2-4 4-3.5S16.5 7 12 7z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    note: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>'
  };
  U.ic = function (n, s) {
    s = s || 20;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + Q.icons[n] + '</svg>';
  };

  Q.utils = U;
})(window.QD = window.QD || {});

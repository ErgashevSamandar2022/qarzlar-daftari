/* trust.js: Qaytarish ehtimoli (Haqlarim ichida).
   Har bir qarzdor bo'yicha: muddatida qaytargan, kechiktirgan va hozir kechikib turgan qarzlar (hisob: calc.js, C.trustAll). */
(function (Q) {
  'use strict';
  var U = Q.utils, C = Q.calc, ic = U.ic, esc = U.esc;

  function stat(o) {
    if (!o.n) return o.closed ? o.closed + ' ta qarz qaytargan, muddati belgilanmagan' : "Muddatli qarz tarixi yo'q";
    var s = o.n + ' ta muddatli qarzdan ' + o.onTime + ' tasi vaqtida';
    if (o.late) s += ' · ' + o.late + ' ta kechikkan' + (o.avgLate ? ", o'rtacha " + o.avgLate + ' kun' : '');
    if (o.overdue) s += ' · hozir ' + o.overdue + ' tasi muddati o\'tib turibdi';
    return s;
  }
  function chip(o) { var t = C.TRUST[o.level]; return '<span class="chip ' + t[1] + '">' + t[0] + (o.score == null ? '' : ' · ' + o.score + '%') + '</span>'; }

  /* qarz kartasidagi belgi */
  Q.trust = {
    chip: function (S, d) { var o = C.trustOf(S, d.person); return o && o.score != null ? chip(o) : ''; },
    hint: function (name) {
      var o = name && name.trim() ? C.trustOf(Q.db.state(), name) : null;
      if (!o) return '';
      return '<span class="tr-hint ' + o.level + '"><b>' + esc(o.person) + ':</b> ' + (o.score == null ? '' : C.TRUST[o.level][0] + ' (' + o.score + '%). ') + esc(stat(o)) + '.</span>';
    },
    panel: function (S) {
      var all = C.trustAll(S);
      if (!all.length) return '';
      var cards = all.map(function (o) {
        var lv = o.level;
        return '<article class="tr ' + lv + '"><div class="tr-top"><span class="ava">' + esc(U.ini(o.person)) + '</span><div class="tr-nm"><h3>' + esc(o.person) + '</h3>' + chip(o) + '</div></div>' +
          '<div class="tr-meter" role="img" aria-label="' + (o.score == null ? 'tarix yo\'q' : o.score + ' foiz') + '"><i style="width:' + (o.score == null ? 0 : o.score) + '%"></i></div>' +
          '<p class="tr-stat">' + esc(stat(o)) + '</p></article>';
      }).join('');
      return '<section class="card tr-card" aria-labelledby="h-tr"><div class="ph2"><span class="pic">' + ic('check', 20) + '</span><div><h2 id="h-tr">Qaytarish ehtimoli</h2><p class="muted">Kim vaqtida qaytaradi, kim kechiktiradi. Faqat muddati bor qarzlar hisoblanadi.</p></div></div><div class="tr-grid">' + cards + '</div></section>';
    }
  };

  /* qarz formasida ism yozilganda tarixi ko'rsatiladi */
  document.addEventListener('input', function (e) {
    var t = e.target; if (t.id !== 'f-person') return;
    var f = t.form, box = document.getElementById('f-trust'); if (!f || !box) return;
    box.innerHTML = f.dataset.type === 'owed' ? Q.trust.hint(t.value) : '';
  });
})(window.QD = window.QD || {});

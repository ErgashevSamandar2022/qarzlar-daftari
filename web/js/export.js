/* export.js: Excel (.xlsx) va PDF fayllarni kutubxonasiz yaratadi, so'ng yuklab oladi.
   .xlsx: zip ichidagi oddiy XML (siqilmagan). PDF: ichki Helvetica shrifti (lotin harflari). */
(function (Q) {
  'use strict';
  var X = {};

  /* ---------- umumiy ---------- */
  var CRC = (function () { var t = [], n, c, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF, i; for (i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function xml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }

  /* brauzerda: yuklab olish; telefon ilovasida: saqlash/ulashish oynasi (asinxron, shuning uchun true qaytaradi) */
  X.download = function (blob, name) { Q.native.saveFile(name, blob); return true; };

  /* ---------- zip (siqilmagan) ---------- */
  function zip(files) {
    var parts = [], central = [], off = 0;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = utf8(f.name), data = utf8(f.data), crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push({ name: name, crc: crc, size: data.length, off: off });
      off += head.length + name.length + data.length;
    });
    var cstart = off, csize = 0;
    central.forEach(function (c) {
      var h = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(c.crc), u32(c.size), u32(c.size), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.off));
      parts.push(new Uint8Array(h), c.name); csize += h.length + c.name.length;
    });
    parts.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(cstart), u16(0))));
    return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------- xlsx ----------
     sheets: [{ name, widths: [..], rows: [[cell, ...]] }], cell: matn | son | { v, s } (s: 'b' qalin, 'n' son, 'h' sarlavha) */
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  var STYLE = { b: 1, n: 2, h: 3, bn: 4 };
  X.xlsx = function (sheets) {
    var files = [], i;
    files.push({ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, n) { return '<Override PartName="/xl/worksheets/sheet' + (n + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' });
    files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
    files.push({ name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map(function (s, n) { return '<sheet name="' + xml(s.name.slice(0, 31)) + '" sheetId="' + (n + 1) + '" r:id="rId' + (n + 1) + '"/>'; }).join('') + '</sheets></workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, n) { return '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (n + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    files.push({ name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E6FB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs></styleSheet>' });
    sheets.forEach(function (s, n) {
      var rows = s.rows.map(function (r, ri) {
        return '<row r="' + (ri + 1) + '">' + r.map(function (c, ci) {
          if (c == null || c === '') return '';
          var o = typeof c === 'object' ? c : { v: c }, ref = colName(ci) + (ri + 1), st = o.s ? ' s="' + STYLE[o.s] + '"' : (typeof o.v === 'number' ? ' s="2"' : '');
          if (typeof o.v === 'number' && isFinite(o.v)) return '<c r="' + ref + '"' + st + '><v>' + (Math.round(o.v * 100) / 100) + '</v></c>';
          return '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xml(o.v) + '</t></is></c>';
        }).join('') + '</row>';
      }).join('');
      var cols = s.widths ? '<cols>' + s.widths.map(function (w, k) { return '<col min="' + (k + 1) + '" max="' + (k + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' : '';
      files.push({ name: 'xl/worksheets/sheet' + (n + 1) + '.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"' + (n === 0 ? ' tabSelected="1"' : '') + '><pane ySplit="' + (s.freeze || 0) + '" topLeftCell="A' + ((s.freeze || 0) + 1) + '" state="frozen"/></sheetView></sheetViews>' + cols + '<sheetData>' + rows + '</sheetData></worksheet>' });
    });
    if (sheets.every(function (s) { return !s.freeze; })) files.forEach(function (f) { f.data = f.data.replace(/<pane [^>]*\/>/, ''); });
    void i;
    return zip(files);
  };

  /* ---------- pdf ----------
     Doc: A4, chekka 40. Yordamchilar: title, h, p, kv, table, bars; sahifa to'lsa o'zi yangisini ochadi. */
  function latin(s) {
    return String(s == null ? '' : s).replace(/[‘’ʻʼ`´]/g, "'").replace(/[“”]/g, '"').replace(/[−–—]/g, '-').replace(/≈/g, '~').replace(/ | /g, ' ')
      .replace(/[^ -ÿ]/g, '?');
  }
  function pdfStr(s) { return '(' + latin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }
  /* Helvetica kengligi taxminan: oddiy hisob uchun o'rtacha belgi kengligi */
  var W = { narrow: 'ijlI.,:;!|\'()[] ', wide: 'mwMW@%' };
  function tw(s, size, bold) {
    var w = 0, i, c;
    s = latin(s);
    for (i = 0; i < s.length; i++) { c = s[i]; w += W.narrow.indexOf(c) >= 0 ? .28 : W.wide.indexOf(c) >= 0 ? .83 : /[A-Z0-9]/.test(c) ? .64 : .54; }
    return w * size * (bold ? 1.06 : 1);
  }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return f2((n >> 16 & 255) / 255) + ' ' + f2((n >> 8 & 255) / 255) + ' ' + f2((n & 255) / 255); }

  X.pdf = function (build, title) {
    var PW = 595, PH = 842, M = 40, pages = [[]], y = PH - M, cur = pages[0];
    var d = {
      W: PW - 2 * M, M: M,
      page: function () { cur = []; pages.push(cur); y = PH - M; },
      need: function (h) { if (y - h < M + 20) d.page(); },
      text: function (s, x, yy, size, bold, color, align) {
        var w = align ? tw(s, size, bold) : 0;
        if (align === 'r') x -= w; else if (align === 'c') x -= w / 2;
        cur.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + rgb(color || '#10143a') + ' rg ' + f2(x) + ' ' + f2(yy) + ' Td ' + pdfStr(s) + ' Tj ET');
      },
      rect: function (x, yy, w, h, color) { cur.push(rgb(color) + ' rg ' + f2(x) + ' ' + f2(yy) + ' ' + f2(w) + ' ' + f2(h) + ' re f'); },
      line: function (x1, y1, x2, y2, color) { cur.push(rgb(color || '#d9dcea') + ' RG 0.6 w ' + f2(x1) + ' ' + f2(y1) + ' m ' + f2(x2) + ' ' + f2(y2) + ' l S'); },
      y: function () { return y; }, skip: function (n) { y -= n; },
      title: function (t, sub) {
        d.rect(0, PH - 86, PW, 86, '#151d5c');
        d.text(t, M, PH - 46, 22, true, '#ffffff'); if (sub) d.text(sub, M, PH - 66, 11, false, '#aab3e8');
        y = PH - 86 - 28;
      },
      h: function (t) { d.need(40); y -= 6; d.text(t, M, y, 13, true, '#2a3fb5'); y -= 8; d.line(M, y, PW - M, y); y -= 16; },
      p: function (t, color) { d.need(18); d.text(t, M, y, 10, false, color || '#565d80'); y -= 15; },
      /* ko'rsatkichlar qatori: [[nomi, qiymati, rang]] */
      kv: function (items) {
        d.need(54); var n = items.length, w = d.W / n, i;
        items.forEach(function (it, k) {
          d.rect(M + k * w + 2, y - 40, w - 4, 44, '#f3f4fb');
          d.text(it[0], M + k * w + 10, y - 10, 8.5, false, '#565d80'); d.text(it[1], M + k * w + 10, y - 30, 12, true, it[2] || '#10143a');
        }); void i; y -= 58;
      },
      /* cols: [{ t, w (ulush), r (o'ngga tekis) }] */
      table: function (cols, rows, opt) {
        opt = opt || {}; var tot = cols.reduce(function (a, c) { return a + c.w; }, 0), rh = 17;
        function head() {
          d.rect(M, y - 13, d.W, 17, '#e2e6fb'); var x = M;
          cols.forEach(function (c) { var cw = c.w / tot * d.W; d.text(c.t, c.r ? x + cw - 6 : x + 6, y - 8, 9, true, '#10143a', c.r ? 'r' : null); x += cw; }); y -= rh + 2;
        }
        d.need(rh * 3); head();
        rows.forEach(function (r, ri) {
          if (y - rh < M + 20) { d.page(); head(); }
          var x = M, bold = opt.lastBold && ri === rows.length - 1;
          if (ri % 2) d.rect(M, y - 12, d.W, rh, '#f8f9fd');
          cols.forEach(function (c, ci) {
            var cw = c.w / tot * d.W, v = r[ci], col = null; if (v && typeof v === 'object') { col = v.c; v = v.v; }
            d.text(v, c.r ? x + cw - 6 : x + 6, y - 7, 9, bold, col || '#10143a', c.r ? 'r' : null); x += cw;
          }); y -= rh;
        });
        y -= 10;
      },
      /* oylar bo'yicha juft ustunlar: kirim (yashil) va chiqim (qizil) */
      bars: function (rows, labelOf) {
        var h = 120, bw = d.W / rows.length, mx = 0, base;
        rows.forEach(function (r) { mx = Math.max(mx, r.inc, r.out); });
        d.need(h + 40); base = y - h; mx = mx || 1;
        d.line(M, base, PW - M, base, '#c8cce0');
        rows.forEach(function (r, i) {
          var x = M + i * bw, a = r.inc / mx * (h - 14), b = r.out / mx * (h - 14);
          if (a > 0) d.rect(x + bw * .14, base, bw * .34, a, '#0b7a4c'); if (b > 0) d.rect(x + bw * .52, base, bw * .34, b, '#c0362b');
          d.text(labelOf(r), x + bw / 2, base - 11, 8, false, '#565d80', 'c');
        });
        d.rect(PW - M - 130, y - 4, 8, 8, '#0b7a4c'); d.text('Kirim', PW - M - 118, y - 3, 8, false, '#565d80');
        d.rect(PW - M - 70, y - 4, 8, 8, '#c0362b'); d.text('Chiqim', PW - M - 58, y - 3, 8, false, '#565d80');
        y = base - 28;
      }
    };
    build(d);
    /* sahifa raqamlari */
    pages.forEach(function (pg, i) { cur = pg; d.text('Qarzlar daftari · ' + (i + 1) + '/' + pages.length, PW - M, 24, 8, false, '#8a90b4', 'r'); });
    var out = '%PDF-1.4\n', offs = [], n, objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    var kids = pages.map(function (p, i) { return (5 + i * 2) + ' 0 R'; }).join(' ');
    objs[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    pages.forEach(function (p, i) {
      var stream = p.join('\n');
      objs[5 + i * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + (6 + i * 2) + ' 0 R >>';
      objs[6 + i * 2] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
    });
    objs[5 + pages.length * 2] = '<< /Title ' + pdfStr(title || 'Hisobot') + ' /Producer (Qarzlar daftari) >>';
    var total = objs.length;
    for (n = 1; n < total; n++) { offs[n] = out.length; out += n + ' 0 obj\n' + objs[n] + '\nendobj\n'; }
    var xr = out.length;
    out += 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (n = 1; n < total; n++) out += ('0000000000' + offs[n]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + total + ' /Root 1 0 R /Info ' + (total - 1) + ' 0 R >>\nstartxref\n' + xr + '\n%%EOF';
    var bytes = new Uint8Array(out.length), i;
    for (i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  };

  Q.exp = X;
})(window.QD = window.QD || {});

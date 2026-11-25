/* web/ papkasini www/ ga ko'chiradi va shriftlarni ilova ichiga joylaydi (internetsiz ishlashi uchun). */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'web');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });

let css = '';
for (const [pkg, dir] of [['@fontsource-variable/onest', 'onest'], ['@fontsource-variable/unbounded', 'unbounded']]) {
  try {
    const p = path.join(root, 'node_modules', pkg);
    const dest = path.join(out, 'fonts', dir, 'files');
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(path.join(p, 'files'))) {
      if (/-wght-normal\.woff2$/.test(f)) fs.copyFileSync(path.join(p, 'files', f), path.join(dest, f));
    }
    fs.copyFileSync(path.join(p, 'index.css'), path.join(out, 'fonts', dir, 'index.css'));
    css += `@import url('${dir}/index.css');\n`;
  } catch (e) {
    console.warn('Shrift topilmadi (tizim shrifti ishlatiladi):', pkg, e.message);
  }
}
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(out, 'fonts', 'fonts.css'), css);

const htmlPath = path.join(out, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
fs.writeFileSync(htmlPath, html);
console.log('www tayyor');

/* `npx cap add android` dan keyin: ruxsatlar va bildirishnoma ikonkasini qo'shadi. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
let m = fs.readFileSync(manifestPath, 'utf8');

const perms = [
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.VIBRATE" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
  '<uses-permission android:name="android.permission.READ_CONTACTS" />'
];
for (const p of perms) {
  const name = p.match(/android:name="([^"]+)"/)[1];
  if (!m.includes(name)) m = m.replace('</manifest>', `    ${p}\n</manifest>`);
}
fs.writeFileSync(manifestPath, m);

const drawable = path.join(root, 'android/app/src/main/res/drawable');
fs.mkdirSync(drawable, { recursive: true });
fs.copyFileSync(path.join(root, 'assets/ic_stat_notify.png'), path.join(drawable, 'ic_stat_notify.png'));
console.log('Android sozlandi');

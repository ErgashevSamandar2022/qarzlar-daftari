# Qarzlar daftari: Android ilova (APK)

Shaxsiy qarz va kirim-chiqim hisobi. Do'kon (Play Market) kerak emas: APK faylni to'g'ridan-to'g'ri telefonga o'rnatasiz va xohlagan kishiga yuborasiz.

- Ma'lumotlar telefonning o'zidagi SQLite bazada saqlanadi (internet shart emas).
- Eslatmalar budilnik kabi, belgilangan vaqtda bildirishnoma bo'lib chiqadi.
- Birinchi ochilganda bildirishnoma ruxsati so'raladi.

## APK ni olish (kompyuterda Android Studio kerak emas)

1. https://github.com saytida bepul akkaunt oching va **New repository** bosing (nomi: `qarzlar-daftari`, Private bo'lsa ham bo'ladi).
2. Shu papkadagi **hamma fayllarni** (`.github` papkasi ham, u yashirin bo'lishi mumkin) repozitoriyga yuklang: **Add file → Upload files**.
3. **Actions** bo'limiga kiring → **APK yig'ish** → **Run workflow**.
4. 5-10 daqiqadan keyin tugagach, ish ichidagi **Artifacts** bo'limidan `qarzlar-daftari-apk` ni yuklab oling (zip ichida `qarzlar-daftari.apk`).

## Telefonga o'rnatish

1. APK ni telefonga yuboring (Telegram, kabel, Drive).
2. Ochganda "Noma'lum manbalardan o'rnatish" ruxsatini bering.
3. Ilovani oching, **Bildirishnomalar**ga "Ruxsat berish" ni bosing.

## Boshqa kishiga berish

APK ni yuboring, shu bilan tamom. Har kimning ma'lumoti o'z telefonida qoladi, bir-biriga aralashmaydi.

## Yangilash

Kodni o'zgartirib, workflow ni qayta yurgizing va yangi APK ni **eski ilova ustiga** o'rnating. `signing/debug.keystore` doimiy bo'lgani uchun ma'lumot o'chmaydi. Bu faylni o'chirmang va o'zgartirmang.

## Eslatma budilnik kabi ishlashi uchun

- Sozlamalar → Bildirishnomalar: ruxsat yoqilgan bo'lsin, "Aniq vaqt" ruxsatini bering.
- Telefon sozlamalarida ilova uchun batareya tejashni "Cheklovsiz" qiling (Xiaomi, Samsung, Huawei'da muhim).
- Telefon qayta yoqilganda ilovani bir marta oching, eslatmalar qayta tiklanadi.

## Ma'lumotni saqlash

Sozlamalar → Zaxira orqali tez-tez nusxa oling. Ilova o'chirilsa, baza ham o'chadi. Har kuni bazaning 7 kunlik ichki nusxalari saqlanadi.

## Mahalliy yig'ish (ixtiyoriy)

Node 20, Java 17 va Android SDK bilan:
```
npm install
node scripts/build-www.mjs
npx cap add android
node scripts/patch-android.mjs
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Eslatma

Bu loyiha shu sandbox'da yig'ilmadi (Android SDK va npm tarmog'i yo'q), shuning uchun birinchi yig'ishda kichik xato chiqsa, Actions jurnalini yuboring, tuzatamiz.

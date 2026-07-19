# نشر تطبيق عـلاّكة (Neon + Render + بناء APK/iOS)

## 1) قاعدة البيانات — Neon
- القاعدة جاهزة على Neon، والمخطط (الجداول) تم رفعه إليها.
- `DATABASE_URL` مالتك (تنحط بمتغيرات Render):
  ```
  postgresql://neondb_owner:...@ep-...eu-central-1.aws.neon.tech/neondb?sslmode=require
  ```

## 2) الصور — تخزين خارجي (السيرفر ما يلمس الصور)
التطبيق يرفع الصور **مباشرة** إلى bucket متوافق مع S3، والسيرفر (Render) يخزن رابط الصورة فقط (نص/كيلوبايتات). أنصح بـ **Cloudflare R2** (مجاني ١٠ جيجا، بدون رسوم تحميل):
1. أنشئ bucket في R2 وخلِّه **Public** (فعّل r2.dev public URL أو اربطه بدومين).
2. أنشئ API Token (Access Key + Secret).
3. فعّل CORS على الـ bucket للسماح بـ PUT من التطبيق:
   ```json
   [{ "AllowedOrigins": ["*"], "AllowedMethods": ["PUT","GET"], "AllowedHeaders": ["*"] }]
   ```
4. احفظ هذي القيم لمتغيرات Render:
   - `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
   - `S3_PUBLIC_URL` = رابط القراءة العام (مثال `https://pub-xxxx.r2.dev`)
   - `S3_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`
   - `S3_REGION` = `auto`

(تنفع نفس الطريقة مع Supabase Storage أو Backblaze B2 أو AWS S3 — بس بدّل الـ endpoint والقيم.)

## 3) السيرفر — Render
1. ارفع المشروع على GitHub (القسم ٥).
2. Render → New → **Blueprint** → اختر المستودع (يقرأ `render.yaml`).
3. عبّي المتغيرات السرية (marked sync:false):
   `DATABASE_URL`, `ADMIN_PASSWORD`, `WASENDER_API_TOKEN`, و`S3_*`.
   (`SESSION_SECRET` يتولّد تلقائياً، و`PORT` يوفّره Render.)
4. بعد النشر يصير عندك رابط مثل `https://alaka-api.onrender.com`.
   - تأكد `https://alaka-api.onrender.com/api/healthz` يرجّع `{"status":"ok"}`.

## 4) بناء التطبيق — APK + iOS (EAS)
1. عدّل `artifacts/khudra-mobile/eas.json`: بدّل `REPLACE_WITH_RENDER_DOMAIN`
   بدومين Render **بدون** https، مثال: `alaka-api.onrender.com`.
2. من مجلد `artifacts/khudra-mobile`:
   ```bash
   npm i -g eas-cli
   eas login
   eas build -p android --profile preview   # يطلع APK للتجربة
   eas build -p android --profile production # AAB للنشر بجوجل بلاي
   eas build -p ios --profile production     # يحتاج حساب Apple Developer
   ```
3. حمّل الـ APK من رابط EAS ونصّبه على الهاتف للتجربة.

## 5) رفع المشروع على GitHub
```bash
git remote add origin https://github.com/<user>/<repo>.git
git add -A
git commit -m "Deploy setup: per-store wallet, referrals, S3 storage, Render/EAS config"
git push -u origin master
```
> ملاحظة: ملف `.env` صار مستثنى من Git (يحتوي أسرار). استخدم `.env.example` كمرجع.

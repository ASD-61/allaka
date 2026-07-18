# تشغيل عـلاّكـة محلياً على اللابتوب

هذا الدليل يشرح شلون تنزّل المشروع وتشغّله على جهازك، وشلون تجهّز قاعدة
البيانات مع بياناتك الحالية.

## 1. المتطلبات

- **Node.js 20+** و **pnpm 10+** (`npm i -g pnpm`)
- **PostgreSQL 16** منصّب ويشتغل على الجهاز
- تطبيق **Expo Go** على الموبايل (للتطبيق) أو محاكي

## 2. تنزيل الملفات

نزّل المشروع كامل من Replit (زر التنزيل / أو `git clone` إذا مربوط بـ GitHub)،
وافتح مجلد المشروع بالطرفية.

```bash
pnpm install
```

## 3. تجهيز متغيّرات البيئة

انسخ `.env.example` إلى `.env` واملأ القيم:

```bash
cp .env.example .env
```

أهم القيم: `DATABASE_URL`، `ADMIN_PASSWORD`، `SESSION_SECRET`.

## 4. إنشاء قاعدة البيانات + الجداول

أنشئ قاعدة فارغة ثم ادفع المخطط (schema) عبر Drizzle:

```bash
createdb allaka                       # أو من psql: CREATE DATABASE allaka;
pnpm --filter @workspace/db run push  # ينشئ كل الجداول من الكود
```

## 5. تحميل بياناتك الحالية (المنتجات، الفئات، الطلبات...)

صدّرنا بياناتك من Replit إلى `local-setup/seed.sql`. حمّلها بعد خطوة الـ push:

```bash
psql "$DATABASE_URL" -f local-setup/seed.sql
```

> لتحديث النسخة لاحقاً من Replit شغّل:
> `pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --no-privileges --exclude-table='*drizzle*' > local-setup/seed.sql`

## 6. التشغيل

```bash
# خادم الـ API
pnpm --filter @workspace/api-server run dev

# تطبيق الموبايل (بنافذة طرفية ثانية)
pnpm --filter @workspace/khudra-mobile run dev
```

---

## تنبيهان مهمّان (خدمات تعتمد على Replit)

### أ. صور المنتجات والتعويضات (Object Storage)
الصور مخزّنة حالياً على تخزين Replit السحابي. محلياً **ما راح تنعرض ولا يمكن
رفع صور جديدة** إلا بأحد خيارين:
1. تبقى الصور على Replit (تشغّل الـ API على Replit فقط)، أو
2. نعدّل طبقة التخزين لتستخدم نظام ملفات محلي — أخبرني إذا تريد هذا التعديل.

### ب. رمز الدخول عبر واتساب (OTP)
يشتغل عبر موصّل Twilio داخل Replit. محلياً يحتاج مفاتيح Twilio مباشرة في `.env`
(`TWILIO_ACCOUNT_SID` و`TWILIO_AUTH_TOKEN` و`TWILIO_WHATSAPP_FROM`). وحتى مع
المفاتيح، إرسال واتساب للأرقام الحقيقية موقوف على ترقية Twilio وموافقة Meta.

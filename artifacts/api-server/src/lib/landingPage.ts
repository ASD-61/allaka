// A small, self-contained marketing/landing page for عـلاّكـة served at the API
// server root ("/"). It explains the app and offers a direct APK download so a
// referral/share link points at something real instead of a placeholder domain.
//
// The download button points at APK_DOWNLOAD_URL (set it on Render to the public
// link of the latest APK — e.g. the app's R2 public URL like
// https://pub-xxxx.r2.dev/allaka.apk). Until it's set, the button shows a
// short "coming soon" note instead of a dead link.
const LOGO_URL =
  "https://raw.githubusercontent.com/ASD-61/allaka/main/artifacts/khudra-mobile/assets/images/icon.png";

// The public source of the latest APK build (an expo.dev artifact URL). We
// don't link to it directly because expo serves it with a long hashed filename;
// instead the landing page points at our own /app/allaka.apk route which
// streams this file with a clean "allaka.apk" download name.
export const APK_SOURCE_URL =
  process.env["APK_SOURCE_URL"] ||
  "https://expo.dev/artifacts/eas/3ntrgxeFSPKOBN13c3-vVF3oVSS5QVpccEsg26XKfFk.apk";

export function landingPage(): string {
  const downloadBtn = APK_SOURCE_URL
    ? `<a class="btn" href="/app/allaka.apk">⬇️ تحميل التطبيق (Android)</a>`
    : `<span class="btn btn-disabled">التطبيق قيد النشر — تابعنا قريباً</span>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>عـلاّكـة — كل متاجرك بمكان واحد</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Tahoma, sans-serif;
    background: linear-gradient(160deg, #0f3d2e 0%, #14532d 45%, #166534 100%);
    color: #fff; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px;
  }
  .card {
    max-width: 440px; width: 100%; text-align: center;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 28px; padding: 36px 26px; backdrop-filter: blur(8px);
  }
  .logo {
    width: 140px; height: 140px; border-radius: 34px; object-fit: cover;
    background: #fff; box-shadow: 0 12px 40px rgba(0,0,0,0.35); margin-bottom: 20px;
  }
  h1 { font-size: 30px; margin-bottom: 6px; }
  .tag { color: #d1fae5; font-size: 15px; margin-bottom: 26px; }
  .features { text-align: right; margin: 0 auto 28px; max-width: 340px; }
  .feature {
    display: flex; align-items: center; gap: 10px; padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 15px;
  }
  .feature:last-child { border-bottom: 0; }
  .dot { color: #fb923c; font-size: 18px; }
  .btn {
    display: inline-block; background: #fb923c; color: #14532d; font-weight: 700;
    font-size: 17px; text-decoration: none; padding: 15px 30px; border-radius: 16px;
    box-shadow: 0 8px 24px rgba(251,146,60,0.4); transition: transform .1s;
  }
  .btn:active { transform: scale(0.97); }
  .btn-disabled { background: rgba(255,255,255,0.15); color: #d1fae5; box-shadow: none; }
  .foot { margin-top: 22px; font-size: 12px; color: #a7f3d0; }
</style>
</head>
<body>
  <div class="card">
    <img class="logo" src="${LOGO_URL}" alt="عـلاّكـة" />
    <h1>عـلاّكـة</h1>
    <div class="tag">كل متاجرك بمكان واحد 🥬</div>
    <div class="features">
      <div class="feature"><span class="dot">●</span> تسوّق من أقرب المتاجر إلك على الخريطة</div>
      <div class="feature"><span class="dot">●</span> توصيل سريع لباب البيت</div>
      <div class="feature"><span class="dot">●</span> عروض وتخفيضات يومية</div>
      <div class="feature"><span class="dot">●</span> محفظة ونقاط ومكافآت دعوة الأصدقاء</div>
      <div class="feature"><span class="dot">●</span> ادفع عند الاستلام</div>
    </div>
    ${downloadBtn}
    <div class="foot">تطوير المهندس فؤاد سالم</div>
  </div>
</body>
</html>`;
}

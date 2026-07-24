// Bridge page for shared product links. WhatsApp only makes http/https links
// tappable (not custom app schemes), so a shared product points at this https
// page, which immediately forwards into the app's deep link
// (khudra-mobile://product/:id) so the friend lands on the exact product.
// If the app isn't installed / redirect is blocked, we offer the APK download.
const APP_SCHEME = "khudra-mobile";

export function productBridgePage(productId: string): string {
  const safeId = encodeURIComponent(productId);
  const deepLink = `${APP_SCHEME}://product/${safeId}`;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>عـلاّكـة — منتج</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Tahoma, Arial, sans-serif;
    background: #F5F7F5;
    color: #17241C;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .card {
    background: #fff; border-radius: 20px; padding: 28px 22px;
    max-width: 380px; width: 100%; text-align: center;
    box-shadow: 0 10px 30px rgba(15,26,20,0.10);
  }
  .logo { font-size: 40px; margin-bottom: 8px; }
  h1 { font-size: 19px; margin: 0 0 6px; }
  p { font-size: 13px; color: #6B7A70; margin: 0 0 20px; line-height: 1.7; }
  .btn {
    display: block; width: 100%; border: none; border-radius: 14px;
    padding: 15px; font-size: 16px; font-weight: 700; color: #fff;
    background: #1FA65E; text-decoration: none; margin-bottom: 12px;
  }
  .btn.secondary { background: #E8EEE9; color: #17241C; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">🛒</div>
    <h1>شاهد المنتج في تطبيق عـلاّكـة</h1>
    <p>راح ننقلك للتطبيق مباشرة على نفس المنتج. إذا ما انفتح تلقائياً اضغط الزر:</p>
    <a class="btn" href="${deepLink}">افتح في التطبيق</a>
    <a class="btn secondary" href="/app/allaka.apk">تحميل التطبيق</a>
  </div>
<script>
  // Best-effort auto-open the app on the shared product.
  setTimeout(function () { window.location.href = ${JSON.stringify(deepLink)}; }, 400);
</script>
</body>
</html>`;
}

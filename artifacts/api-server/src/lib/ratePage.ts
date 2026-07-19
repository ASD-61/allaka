// Tiny bridge page for the "قيّم المتجر" WhatsApp link. WhatsApp only makes
// http/https links tappable (not custom app schemes), so the message links to
// this https page, which immediately forwards into the app's deep link
// (khudra-mobile://rate/:orderId) where the customer taps their star rating.
// A manual button is shown too in case the auto-redirect is blocked.
const APP_SCHEME = "khudra-mobile";

export function ratePage(orderId: string): string {
  const safeId = encodeURIComponent(orderId);
  const deepLink = `${APP_SCHEME}://rate/${safeId}`;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>تقييم المتجر</title>
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
  .stars { font-size: 34px; letter-spacing: 4px; margin: 8px 0 18px; }
  h1 { font-size: 19px; margin: 0 0 6px; }
  p { font-size: 13px; color: #6B7A70; margin: 0 0 20px; line-height: 1.7; }
  .btn {
    display: inline-block; width: 100%; border: none; border-radius: 14px;
    padding: 15px; font-size: 16px; font-weight: 700; color: #fff;
    background: #1FA65E; text-decoration: none;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="stars">⭐⭐⭐⭐⭐</div>
    <h1>قيّم تجربتك مع المتجر</h1>
    <p>راح ننقلك للتطبيق حتى تختار عدد النجوم. إذا ما انفتح تلقائياً اضغط الزر:</p>
    <a class="btn" href="${deepLink}">افتح التطبيق وقيّم الآن</a>
  </div>
<script>
  // Best-effort auto-open the app.
  setTimeout(function () { window.location.href = ${JSON.stringify(deepLink)}; }, 400);
</script>
</body>
</html>`;
}

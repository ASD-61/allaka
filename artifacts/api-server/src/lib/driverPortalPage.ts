// Self-contained, login-free HTML page for a delivery driver's personal
// "portal" link (sent to them once via WhatsApp when the merchant adds
// them). Deliberately plain server-rendered HTML + vanilla JS — no
// React/Expo bundle needed — since a driver is not expected to have the
// customer/merchant app installed; they just tap the link in WhatsApp.
export function driverPortalPage(token: string): string {
  const safeToken = encodeURIComponent(token);
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>صفحة المندوب</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Tahoma, Arial, sans-serif;
    background: #F5F7F5;
    color: #17241C;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }
  .card {
    background: #fff;
    border-radius: 20px;
    padding: 28px 22px;
    max-width: 380px;
    width: 100%;
    box-shadow: 0 10px 30px rgba(15,26,20,0.10);
    text-align: center;
  }
  .name { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .meta { font-size: 13px; color: #6B7A70; margin: 0 0 20px; }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 22px;
  }
  .toggle-btn {
    width: 100%;
    border: none;
    border-radius: 14px;
    padding: 16px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    color: #fff;
    transition: opacity .15s;
  }
  .toggle-btn:disabled { opacity: .6; cursor: default; }
  .hint { font-size: 12px; color: #93A398; margin-top: 14px; line-height: 1.6; }
  .error { color: #C0392B; font-size: 14px; margin-top: 16px; }
  .busy-note {
    font-size: 12.5px;
    color: #B36B00;
    background: #FFF6E5;
    border-radius: 10px;
    padding: 10px;
    margin-top: 14px;
  }
</style>
</head>
<body>
  <div class="card" id="card">
    <p class="meta">جارِ التحميل...</p>
  </div>

<script>
(function () {
  var token = ${JSON.stringify(safeToken)};
  var apiBase = window.location.origin + "/api/driver-portal/" + token;
  var card = document.getElementById("card");

  function render(data) {
    var available = data.available;
    var busy = data.activeOrderId != null;
    var suspended = data.status === "موقوف";
    var pillColor = suspended ? "#6B7A70" : (available ? "#1FA65E" : "#C0392B");
    var pillBg = suspended ? "#F0F2F0" : (available ? "#E7F7EE" : "#FDECEA");
    var pillText = suspended ? "موقوف من الإدارة" : (available ? "متاح لاستلام الطلبات" : "غير متاح حالياً");
    var btnColor = available ? "#C0392B" : "#1FA65E";
    var btnText = available ? "أوقف استلام الطلبات" : "فعّل استلام الطلبات";

    card.innerHTML =
      '<p class="name">' + escapeHtml(data.name) + '</p>' +
      '<p class="meta">' + escapeHtml(data.storeName) + (data.vehicleType ? ' · ' + escapeHtml(data.vehicleType) : '') + '</p>' +
      '<div class="status-pill" style="color:' + pillColor + ';background:' + pillBg + '">' + pillText + '</div>' +
      (suspended
        ? '<p class="hint">تم إيقافك من قبل الإدارة مؤقتاً، تواصل مع صاحب المتجر لمزيد من التفاصيل</p>'
        : '<button class="toggle-btn" id="toggleBtn" style="background:' + btnColor + '">' + btnText + '</button>' +
          (busy ? '<div class="busy-note">لديك طلب حالياً قيد التوصيل — يمكنك إيقاف الاستلام بعده</div>' : '') +
          '<p class="hint">هذا التبديل يخصك أنت فقط، ويحدد هل يقدر التاجر يرسلك طلبات توصيل جديدة الآن أو لا</p>'
      );

    var btn = document.getElementById("toggleBtn");
    if (btn) {
      btn.addEventListener("click", function () { toggle(!available); });
    }
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function showError(message) {
    card.innerHTML = '<p class="error">' + escapeHtml(message) + '</p>';
  }

  function load() {
    fetch(apiBase)
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(render)
      .catch(function () { showError("الرابط غير صالح أو انتهت صلاحيته"); });
  }

  function toggle(next) {
    var btn = document.getElementById("toggleBtn");
    if (btn) btn.disabled = true;
    fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    })
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(load)
      .catch(function () { showError("تعذر تحديث حالتك، حاول مرة أخرى"); });
  }

  load();
})();
</script>
</body>
</html>`;
}

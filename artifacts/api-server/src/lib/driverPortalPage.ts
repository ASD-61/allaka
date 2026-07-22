// Self-contained, login-free HTML dashboard for a delivery driver's personal
// "portal" link (sent to them once via WhatsApp when a merchant adds them).
// One link per driver phone works across every store they deliver for. Plain
// server-rendered HTML + vanilla JS — no React/Expo bundle needed.
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
    padding: 16px;
    max-width: 520px;
    margin: 0 auto;
  }
  .card { background: #fff; border-radius: 18px; padding: 18px; box-shadow: 0 6px 20px rgba(15,26,20,0.06); margin-bottom: 14px; }
  .name { font-size: 20px; font-weight: 800; margin: 0 0 2px; }
  .meta { font-size: 13px; color: #6B7A70; margin: 0; }
  .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; margin: 12px 0; }
  .toggle-btn { width: 100%; border: none; border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 800; cursor: pointer; color: #fff; transition: opacity .15s; }
  .toggle-btn:disabled { opacity: .6; cursor: default; }
  .stats { display: flex; gap: 12px; }
  .stat { flex: 1; background: #F0F7F2; border-radius: 14px; padding: 14px; text-align: center; }
  .stat .num { font-size: 22px; font-weight: 800; color: #1FA65E; }
  .stat .lbl { font-size: 12px; color: #6B7A70; margin-top: 2px; }
  .section-title { font-size: 15px; font-weight: 800; margin: 4px 0 10px; }
  .order { border: 1px solid #E6ECE7; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
  .order-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .order-id { font-weight: 800; font-size: 15px; }
  .order-store { font-size: 12px; color: #6B7A70; }
  .order-line { font-size: 13px; margin: 3px 0; color: #33413A; }
  .order-total { font-weight: 800; color: #1FA65E; }
  .btn-row { display: flex; gap: 8px; margin-top: 10px; }
  .btn { flex: 1; border: none; border-radius: 12px; padding: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; }
  .btn-ghost { background: #F0F2F0; color: #17241C; }
  .btn-primary { background: #1FA65E; color: #fff; }
  .btn-map { display: block; text-align: center; text-decoration: none; background: #EAF1FB; color: #1B6FCB; border-radius: 12px; padding: 11px; font-weight: 700; font-size: 13px; margin-top: 8px; }
  .store-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #F0F2F0; }
  .store-row:last-child { border-bottom: none; }
  .store-name { font-weight: 700; font-size: 14px; }
  .store-addr { font-size: 12px; color: #6B7A70; }
  .store-actions { display: flex; gap: 8px; }
  .icon-link { text-decoration: none; background: #F0F7F2; color: #1FA65E; border-radius: 10px; padding: 8px 10px; font-size: 13px; font-weight: 700; }
  .empty { text-align: center; color: #93A398; font-size: 13.5px; padding: 16px 0; }
  .error { color: #C0392B; font-size: 14px; text-align: center; }
  .hint { font-size: 12px; color: #93A398; margin-top: 10px; line-height: 1.6; text-align: center; }
  .kyc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 0; border-bottom: 1px solid #F0F2F0; }
  .kyc-row:last-child { border-bottom: none; }
  .kyc-label { font-weight: 700; font-size: 13.5px; }
  .kyc-sub { font-size: 11.5px; color: #93A398; margin-top: 2px; }
  .kyc-actions { display: flex; align-items: center; gap: 8px; }
  .kyc-thumb { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid #E6ECE7; }
  .upload-btn { display: inline-block; background: #1FA65E; color: #fff; border-radius: 10px; padding: 9px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .upload-btn.pending { opacity: .6; }
  .view-link { text-decoration: none; background: #EAF1FB; color: #1B6FCB; border-radius: 10px; padding: 8px 10px; font-size: 12.5px; font-weight: 700; }
  .kyc-badge { display:inline-block; background:#E7F7EE; color:#1FA65E; border-radius:999px; padding:3px 9px; font-size:11px; font-weight:700; }
</style>
</head>
<body>
  <div id="root"><div class="card"><p class="meta">جارِ التحميل...</p></div></div>

<script>
(function () {
  var token = ${JSON.stringify(safeToken)};
  var apiBase = window.location.origin + "/api/driver-portal/" + token;
  var root = document.getElementById("root");

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n) { try { return Number(n || 0).toLocaleString("ar-IQ"); } catch (e) { return String(n || 0); } }
  function mapsUrl(lat, lng) { return "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng; }

  function kycRow(label, kind, url) {
    var h = '<div class="kyc-row">';
    h += '<div><div class="kyc-label">' + escapeHtml(label) + '</div>';
    h += '<div class="kyc-sub">' + (url ? '<span class="kyc-badge">تم الرفع ✓</span>' : 'لم يتم الرفع بعد') + '</div></div>';
    h += '<div class="kyc-actions">';
    if (url) h += '<a class="view-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">عرض</a>';
    h += '<label class="upload-btn" data-btn="' + kind + '">' + (url ? 'تغيير' : 'رفع') + '<input type="file" accept="image/*" data-kind="' + kind + '" style="display:none" /></label>';
    h += '</div></div>';
    return h;
  }

  function render(d) {
    var suspended = d.status === "موقوف";
    var available = d.available;
    var pillColor = suspended ? "#6B7A70" : (available ? "#1FA65E" : "#C0392B");
    var pillBg = suspended ? "#F0F2F0" : (available ? "#E7F7EE" : "#FDECEA");
    var pillText = suspended ? "موقوف من الإدارة" : (available ? "متاح لاستلام الطلبات" : "غير متاح حالياً");
    var btnColor = available ? "#C0392B" : "#1FA65E";
    var btnText = available ? "أوقف استلام الطلبات اليوم" : "فعّل استلام الطلبات";

    var html = "";
    // Header + availability
    html += '<div class="card">';
    html += '<p class="name">' + escapeHtml(d.name) + '</p>';
    html += '<p class="meta">' + escapeHtml(d.vehicleType || "مندوب توصيل") + '</p>';
    html += '<div class="status-pill" style="color:' + pillColor + ';background:' + pillBg + '">' + pillText + '</div>';
    if (!suspended) {
      html += '<button class="toggle-btn" id="toggleBtn" style="background:' + btnColor + '">' + btnText + '</button>';
    } else {
      html += '<p class="hint">تم إيقافك من الإدارة مؤقتاً، تواصل مع صاحب المتجر.</p>';
    }
    html += '</div>';

    // Today stats
    html += '<div class="card"><div class="stats">';
    html += '<div class="stat"><div class="num">' + fmt(d.todayDeliveredCount) + '</div><div class="lbl">طلبات اليوم</div></div>';
    html += '<div class="stat"><div class="num">' + fmt(d.todayEarnings) + '</div><div class="lbl">أرباح اليوم (د.ع)</div></div>';
    html += '</div></div>';

    // Active orders
    html += '<div class="card"><div class="section-title">الطلبات الحالية</div>';
    if (!d.activeOrders || d.activeOrders.length === 0) {
      html += '<div class="empty">لا توجد طلبات حالياً</div>';
    } else {
      d.activeOrders.forEach(function (o) {
        html += '<div class="order">';
        html += '<div class="order-top"><span class="order-id">#' + o.id + '</span><span class="order-store">' + escapeHtml(o.storeName) + '</span></div>';
        (o.items || []).forEach(function (it) {
          html += '<div class="order-line">• ' + escapeHtml(it.name) + ' × ' + it.qty + '</div>';
        });
        html += '<div class="order-line">📞 ' + escapeHtml(o.customerPhone) + '</div>';
        if (o.note) html += '<div class="order-line">📝 ' + escapeHtml(o.note) + '</div>';
        html += '<div class="order-line order-total">الإجمالي: ' + fmt(o.total) + ' د.ع</div>';
        if (o.latitude != null && o.longitude != null) {
          html += '<a class="btn-map" href="' + mapsUrl(o.latitude, o.longitude) + '" target="_blank" rel="noopener">📍 فتح موقع الزبون</a>';
        }
        html += '<div class="btn-row">';
        if (o.status !== "في الطريق") {
          html += '<button class="btn btn-ghost" data-order="' + o.id + '" data-status="في الطريق">في الطريق</button>';
        }
        html += '<button class="btn btn-primary" data-order="' + o.id + '" data-status="تم التسليم">تم التسليم</button>';
        html += '</div>';
        html += '</div>';
      });
    }
    html += '</div>';

    // KYC documents (unified ID card + residence card) for the merchant to
    // verify the driver's identity.
    html += '<div class="card"><div class="section-title">توثيق الهوية (للأمان)</div>';
    html += '<p class="kyc-sub" style="margin-bottom:8px">ارفع صورة بطاقتك الموحّدة وبطاقة السكن ليطّلع عليها صاحب المتجر ويوثّق حسابك.</p>';
    html += kycRow("البطاقة الموحّدة", "idCard", d.idCardUrl);
    html += kycRow("بطاقة السكن", "residenceCard", d.residenceCardUrl);
    html += '</div>';

    // Stores the driver works with
    html += '<div class="card"><div class="section-title">المتاجر التي تعمل معها</div>';
    (d.stores || []).forEach(function (s) {
      var phoneDigits = String(s.phone || "").replace(/\\D/g, "");
      html += '<div class="store-row">';
      html += '<div><div class="store-name">' + escapeHtml(s.name) + '</div><div class="store-addr">' + escapeHtml(s.address || "") + '</div></div>';
      html += '<div class="store-actions">';
      if (phoneDigits) html += '<a class="icon-link" href="tel:' + phoneDigits + '">اتصال</a>';
      if (s.latitude != null && s.longitude != null) html += '<a class="icon-link" href="' + mapsUrl(s.latitude, s.longitude) + '" target="_blank" rel="noopener">الموقع</a>';
      html += '</div></div>';
    });
    html += '</div>';

    root.innerHTML = html;

    var toggle = document.getElementById("toggleBtn");
    if (toggle) toggle.addEventListener("click", function () { setAvailable(!available); });

    var btns = root.querySelectorAll("button[data-order]");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        setOrderStatus(b.getAttribute("data-order"), b.getAttribute("data-status"), b);
      });
    });

    var fileInputs = root.querySelectorAll("input[data-kind]");
    fileInputs.forEach(function (inp) {
      inp.addEventListener("change", function () {
        var file = inp.files && inp.files[0];
        if (file) uploadKyc(file, inp.getAttribute("data-kind"), inp);
      });
    });
  }

  // Uploads an image to object storage (request presigned URL → PUT bytes),
  // then saves the resulting public URL against the driver's KYC field.
  function uploadKyc(file, kind, inp) {
    var label = inp.closest(".upload-btn");
    if (label) { label.classList.add("pending"); label.firstChild.textContent = "جارٍ الرفع..."; }
    var origin = window.location.origin;
    fetch(origin + "/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name || "id.jpg", size: file.size, contentType: file.type || "image/jpeg" }),
    })
      .then(function (r) { if (!r.ok) throw new Error("upload"); return r.json(); })
      .then(function (data) {
        return fetch(data.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        }).then(function (up) {
          if (!up.ok) throw new Error("put");
          var objectPath = data.objectPath;
          var publicUrl = objectPath && objectPath.indexOf("http") === 0 ? objectPath : origin + objectPath;
          var body = {};
          body[kind === "idCard" ? "idCardUrl" : "residenceCardUrl"] = publicUrl;
          return fetch(apiBase + "/kyc", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        });
      })
      .then(function (r) { if (!r.ok) throw new Error("save"); return r.json(); })
      .then(function () { load(); })
      .catch(function () {
        if (label) { label.classList.remove("pending"); label.firstChild.textContent = "رفع"; }
        alert("تعذر رفع الصورة، حاول مرة أخرى");
      });
  }

  function showError(msg) { root.innerHTML = '<div class="card"><p class="error">' + escapeHtml(msg) + '</p></div>'; }

  function load() {
    fetch(apiBase)
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(render)
      .catch(function () { showError("الرابط غير صالح أو انتهت صلاحيته"); });
  }

  function setAvailable(next) {
    var btn = document.getElementById("toggleBtn");
    if (btn) btn.disabled = true;
    fetch(apiBase, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: next }) })
      .then(function (r) { if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(load)
      .catch(function () { if (btn) btn.disabled = false; alert("تعذر تحديث حالتك، حاول مرة أخرى"); });
  }

  function setOrderStatus(orderId, status, btn) {
    if (status === "تم التسليم" && !confirm("تأكيد تسليم الطلب #" + orderId + "؟")) return;
    if (btn) btn.disabled = true;
    fetch(apiBase + "/orders/" + orderId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status }) })
      .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || "bad"); }); return r.json(); })
      .then(load)
      .catch(function (e) { if (btn) btn.disabled = false; alert(e.message || "تعذر تحديث الطلب"); });
  }

  load();
})();
</script>
</body>
</html>`;
}

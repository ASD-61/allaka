// WhatsApp sending is powered by WasenderAPI (wasenderapi.com) — a "linked
// device" style API (the merchant scans a QR code once from their WhatsApp
// account, same as WhatsApp Web), NOT Meta's official Cloud API. This means:
//   - No 24-hour customer-initiated-conversation window restriction, and no
//     approved message templates needed for OTPs — any message can be sent
//     to any number at any time, exactly like texting from the app.
//   - A single bearer token (from the connected session's dashboard) is all
//     that's needed: WASENDER_API_TOKEN.
const WASENDER_SEND_URL = "https://www.wasenderapi.com/api/send-message";

// WasenderAPI expects the full international number, digits only (no "+",
// no leading 0) — e.g. "212612345678". Customers/merchants register with a
// local Iraqi number like "07811772240" (11 digits, leading 0, no country
// code), so normalize to "964XXXXXXXXXX" before every send.
function normalizeIraqiPhone(raw: string): string {
  // Convert Arabic-Indic digits (٠-٩) to Latin first, in case a number was
  // stored/entered with Arabic numerals — otherwise \D would strip them all.
  const latin = raw.replace(/[\u0660-\u0669]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660),
  );
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("964")) return digits;
  if (digits.startsWith("0")) return `964${digits.slice(1)}`;
  // Bare local number without the leading 0 (e.g. "7811772240").
  if (digits.length === 10 && digits.startsWith("7")) return `964${digits}`;
  return digits;
}

// Sends a plain-text WhatsApp message via WasenderAPI.
// Credentials come from the server environment (never the client bundle):
//   WASENDER_API_TOKEN — the connected WhatsApp session's API access token
async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const token = process.env.WASENDER_API_TOKEN;

  if (!token) {
    console.warn("WasenderAPI not configured (WASENDER_API_TOKEN)");
    throw new Error("WHATSAPP_UNAVAILABLE");
  }

  const toDigits = normalizeIraqiPhone(to);

  const response = await fetch(WASENDER_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: toDigits, text: body }),
  });

  const raw = await response.text();
  let parsed: { success?: boolean; message?: string; error?: string } | null = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON response — fall through to the raw text below
  }

  if (!response.ok || parsed?.success === false) {
    // Log the recipient + full response so undelivered numbers can be
    // diagnosed (e.g. session disconnected, number not on WhatsApp, or rate
    // limiting) instead of failing silently.
    console.warn(
      "WasenderAPI send failed:",
      response.status,
      "to=",
      toDigits,
      parsed?.message ?? parsed?.error ?? raw,
    );
    throw new Error(`WHATSAPP_SEND_FAILED: ${response.status}`);
  }
}

// A usable WhatsApp recipient is a phone in international/local digit form;
// placeholder owners like "admin" are not real numbers.
function isValidPhone(v: string | null | undefined): v is string {
  return !!v && /^\+?\d{8,15}$/.test(v.trim());
}

// Builds a "📍 <label>:\n<short link>" block for a lat/lng pair — used for
// both the customer's location (sent to the merchant) and the store's
// location (sent to the customer).
async function buildLocationLine(
  label: string,
  latitude: number,
  longitude: number,
): Promise<string> {
  // Universal, cross-platform Google Maps URL that reliably opens the maps app
  // (or web) on both Android and iOS. The older "maps.google.com/?q=" form can
  // fail to open for some users, and a shortened link occasionally lands on an
  // interstitial that never redirects — so we send this canonical URL directly.
  const longUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return `\n📍 ${label}:\n${longUrl}`;
}

export async function sendWhatsAppOrderNotification(opts: {
  orderId: number;
  customerPhone: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  deliveryType: string;
  latitude: number | null;
  longitude: number | null;
  note?: string | null;
  pickupTime?: string | null;
  headline?: string;
  // The store owner's phone this order belongs to — order notifications go
  // here. Falls back to the ADMIN_NOTIFY_PHONE env var when the store has no
  // real owner phone (e.g. the built-in "admin"-owned default store).
  toPhone?: string | null;
}): Promise<void> {
  const {
    orderId,
    customerPhone,
    items,
    total,
    deliveryType,
    latitude,
    longitude,
    note,
    pickupTime,
    headline,
    toPhone,
  } = opts;

  const target = isValidPhone(toPhone)
    ? toPhone
    : process.env.ADMIN_NOTIFY_PHONE;
  if (!isValidPhone(target)) {
    console.warn(
      "No valid recipient for order notification (store owner + ADMIN_NOTIFY_PHONE both unset); skipping",
      orderId,
    );
    return;
  }

  const itemLines = items.map((i) => `• ${i.name} × ${i.qty}`).join("\n");

  const mapsLink =
    latitude != null && longitude != null
      ? await buildLocationLine("فتح موقع الزبون", latitude, longitude)
      : "";

  const deliveryLabel =
    deliveryType === "express" ? "مستعجل (نص ساعة)" : "عادي (ساعة)";

  const body =
    `🛒 *${headline ?? `طلب جديد #${orderId}`}*\n` +
    `📞 الزبون: ${customerPhone}\n` +
    `📦 التوصيل: ${deliveryLabel}\n` +
    (pickupTime ? `⏰ وقت الاستلام: ${pickupTime}\n` : "") +
    `\n${itemLines}\n` +
    `\n💰 الإجمالي: ${total.toLocaleString("ar-IQ")} د.ع` +
    (note ? `\n📝 ملاحظة: ${note}` : "") +
    mapsLink;

  try {
    await sendWhatsAppMessage(target, body);
    console.info("WhatsApp notification sent for order", orderId);
  } catch (err) {
    console.warn("Error sending WhatsApp order notification:", err);
  }
}

// Sends the customer their own order confirmation on WhatsApp — the store's
// name/"letterhead" (كليشة المحل), the purchased items, and the total — so they
// keep a receipt of what they ordered and from whom. Best-effort: any failure
// is swallowed so it never blocks placing the order.
export async function sendWhatsAppOrderConfirmationToCustomer(opts: {
  orderId: number;
  customerPhone: string;
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  deliveryType: string;
  pickupTime?: string | null;
  headline?: string;
}): Promise<void> {
  const {
    orderId,
    customerPhone,
    storeName,
    storeAddress,
    storePhone,
    storeLatitude,
    storeLongitude,
    items,
    total,
    deliveryType,
    pickupTime,
    headline,
  } = opts;

  if (!isValidPhone(customerPhone)) {
    console.warn("Order confirmation skipped: invalid customer phone", orderId);
    return;
  }

  const itemLines = items
    .map((i) => `• ${i.name} × ${i.qty} — ${(i.price * i.qty).toLocaleString("ar-IQ")} د.ع`)
    .join("\n");

  const deliveryLabel =
    deliveryType === "express" ? "مستعجل (نص ساعة)" : "عادي (ساعة)";

  const storeMapsLink =
    storeLatitude != null && storeLongitude != null
      ? await buildLocationLine("فتح موقع المتجر", storeLatitude, storeLongitude)
      : "";

  const storeBlock =
    `🏪 *${storeName?.trim() || "المتجر"}*` +
    (storeAddress?.trim() ? `\n📍 ${storeAddress.trim()}` : "") +
    (isValidPhone(storePhone) ? `\n☎️ ${storePhone!.trim()}` : "") +
    storeMapsLink;

  const body =
    `✅ *${headline ?? `تم استلام طلبك #${orderId}`}*\n` +
    `شكراً لطلبك من عـلاّكـة 🥬\n\n` +
    `${storeBlock}\n\n` +
    `🧾 *مشترياتك:*\n${itemLines}\n` +
    `\n💰 الإجمالي: ${total.toLocaleString("ar-IQ")} د.ع\n` +
    `📦 التوصيل: ${deliveryLabel}` +
    (pickupTime ? `\n⏰ وقت الاستلام: ${pickupTime}` : "");

  try {
    await sendWhatsAppMessage(customerPhone, body);
    console.info("WhatsApp order confirmation sent to customer for order", orderId);
  } catch (err) {
    console.warn("Error sending WhatsApp order confirmation to customer:", err);
  }
}

// Sends the customer a "rate the store" prompt on WhatsApp once their order is
// delivered. The link opens the app on the rating screen for this order (the
// server's /rate/:orderId page redirects into the app's deep link). Best-effort.
export async function sendWhatsAppRatingRequest(opts: {
  customerPhone: string;
  storeName?: string | null;
  orderId: number;
  storeOrderNumber?: number | null;
  rateUrl: string;
}): Promise<void> {
  const { customerPhone, storeName, orderId, storeOrderNumber, rateUrl } = opts;
  if (!isValidPhone(customerPhone)) return;

  const displayNumber = storeOrderNumber ?? orderId;
  // Send the real rating URL directly — URL shorteners (tinyurl) intermittently
  // return dead/interstitial links that look "fake" and don't open, so we never
  // shorten links in WhatsApp messages anymore.
  const body =
    `✅ *تم استلام طلبك #${displayNumber}*\n` +
    `شكراً لتسوقك من ${storeName?.trim() || "المتجر"} عبر عـلاّكـة 🥬\n\n` +
    `⭐ يهمنا رأيك! قيّم المتجر من هنا:\n${rateUrl}`;

  try {
    await sendWhatsAppMessage(customerPhone, body);
    console.info("WhatsApp rating request sent for order", orderId);
  } catch (err) {
    console.warn("Error sending WhatsApp rating request:", err);
  }
}

// Sends a login/signup verification code to the customer's own WhatsApp
// number. Throws on failure so the caller can surface a clear error to the
// UI (e.g. when the connected WhatsApp session got logged out/disconnected).
export async function sendWhatsAppOtp(
  customerPhone: string,
  code: string,
): Promise<void> {
  const body = `🥬 *عـلاّكـة*\nرمز التحقق الخاص بك هو: *${code}*\nصالح لمدة 5 دقائق. لا تشارك هذا الرمز مع أحد.`;
  await sendWhatsAppMessage(customerPhone, body);
}

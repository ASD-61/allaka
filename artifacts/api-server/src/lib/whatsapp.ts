// Meta WhatsApp Cloud API (Graph API) version used for the messages endpoint.
const GRAPH_VERSION = "v21.0";

// Meta requires the full international number (country code + subscriber
// number, digits only, no leading 0). Customers/merchants often register
// with a local Iraqi number like "07811772240" (11 digits, leading 0, no
// country code) — sent as-is to Meta this used to fail with a silent
// "(#100) Invalid parameter" error, which is why merchant order alerts
// (including the note) sometimes never arrived. Normalize to +964XXXXXXXXXX
// before every send.
function normalizeIraqiPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("964")) return digits;
  if (digits.startsWith("0")) return `964${digits.slice(1)}`;
  // Bare local number without the leading 0 (e.g. "7811772240").
  if (digits.length === 10 && digits.startsWith("7")) return `964${digits}`;
  return digits;
}

// Sends a plain-text WhatsApp message via Meta's WhatsApp Cloud API.
// Credentials come from the server environment (never the client bundle):
//   WHATSAPP_PHONE_ID — the WhatsApp Business phone number ID
//   WHATSAPP_TOKEN    — a permanent/temporary access token with whatsapp perms
// NOTE: free-form text only reaches a recipient who messaged the business in
// the last 24h; outside that window Meta requires an approved message template.
async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneId || !token) {
    console.warn(
      "WhatsApp Cloud API not configured (WHATSAPP_PHONE_ID / WHATSAPP_TOKEN)",
    );
    throw new Error("WHATSAPP_UNAVAILABLE");
  }

  const toDigits = normalizeIraqiPhone(to);

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toDigits,
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.warn("WhatsApp Cloud API send failed:", response.status, text);
    throw new Error(`WHATSAPP_SEND_FAILED: ${response.status}`);
  }
}

// Sends an approved Authentication-category template. Unlike free-form text,
// a template reaches ANY recipient without requiring them to message the
// business first (no 24h-window restriction) — this is Meta's official path
// for delivering login/OTP codes.
//   WHATSAPP_OTP_TEMPLATE — the approved template name (e.g. "otp_code")
//   WHATSAPP_OTP_LANG     — its language code (e.g. "ar" or "en_US")
// Authentication templates carry the code in both the body and the built-in
// "copy code" button, so the code is passed to both components.
async function sendWhatsAppAuthTemplate(
  to: string,
  code: string,
): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE;
  const lang = process.env.WHATSAPP_OTP_LANG || "ar";
  if (!phoneId || !token || !templateName) {
    throw new Error("WHATSAPP_TEMPLATE_UNAVAILABLE");
  }

  const toDigits = normalizeIraqiPhone(to);

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toDigits,
        type: "template",
        template: {
          name: templateName,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    console.warn(
      "WhatsApp Cloud API template send failed:",
      response.status,
      text,
    );
    throw new Error(`WHATSAPP_TEMPLATE_SEND_FAILED: ${response.status}`);
  }
}

// A usable WhatsApp recipient is a phone in international/local digit form;
// placeholder owners like "admin" are not real numbers.
function isValidPhone(v: string | null | undefined): v is string {
  return !!v && /^\+?\d{8,15}$/.test(v.trim());
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
      ? `\n📍 موقع الزبون: https://maps.google.com/?q=${latitude},${longitude}`
      : "";

  const deliveryLabel =
    deliveryType === "express" ? "مستعجل (أقل من 30 دقيقة)" : "عادي (أقل من ساعة)";

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
// NOTE: like all free-form messages, this only reaches a customer who messaged
// the business number within the last 24h (Meta's rule); outside that window
// Meta requires an approved template.
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
    deliveryType === "express" ? "مستعجل (أقل من 30 دقيقة)" : "عادي (أقل من ساعة)";

  const storeMapsLink =
    storeLatitude != null && storeLongitude != null
      ? `\n📍 موقع المتجر: https://maps.google.com/?q=${storeLatitude},${storeLongitude}`
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

// Sends a login/signup verification code to the customer's own WhatsApp
// number. Throws on failure so the caller can surface a clear error to the
// UI (e.g. when the connected Twilio account lacks send permission).
export async function sendWhatsAppOtp(
  customerPhone: string,
  code: string,
): Promise<void> {
  // Prefer an approved Authentication template so the code reaches new users
  // without them messaging the business first. Only fall back to free-form
  // text (24h-window limited) when no template is configured.
  if (process.env.WHATSAPP_OTP_TEMPLATE) {
    await sendWhatsAppAuthTemplate(customerPhone, code);
    return;
  }
  const body = `🥬 *عـلاّكـة*\nرمز التحقق الخاص بك هو: *${code}*\nصالح لمدة 5 دقائق. لا تشارك هذا الرمز مع أحد.`;
  await sendWhatsAppMessage(customerPhone, body);
}

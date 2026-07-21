// Normalizes an Iraqi phone number the user typed in any common local form
// (e.g. "07811772240", "٠٧٨١...", "+9647811772240", "9647811772240") into the
// digits-only international form WhatsApp deep links (wa.me/<digits>) require:
// "9647811772240". Lets merchants type a plain "077..." number without having
// to remember the 964 country code.
export function toWhatsAppDigits(raw: string): string {
  // Convert Arabic-Indic digits to Latin, then strip everything non-numeric.
  const latin = raw.replace(/[\u0660-\u0669]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660),
  );
  let digits = latin.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('7')) return `964${digits}`;
  return digits;
}

// Builds a wa.me link (optionally with a prefilled message) from a raw local
// number.
export function waMeLink(rawPhone: string, message?: string): string {
  const digits = toWhatsAppDigits(rawPhone);
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}

// Formats a phone for display: strips the "+964"/"964" country code and shows
// the local "07..." form (e.g. "07811772240"). The stored value is never
// changed — this is display-only so numbers don't look cluttered with +964.
export function displayPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const latin = String(raw).replace(/[\u0660-\u0669]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660),
  );
  let digits = latin.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('964')) digits = digits.slice(3);
  if (!digits.startsWith('0')) digits = `0${digits}`;
  return digits;
}

// Builds a tel: dial link from a raw local number (keeps the +964 so the dialer
// always works regardless of the phone's default region).
export function telLink(rawPhone: string): string {
  return `tel:+${toWhatsAppDigits(rawPhone)}`;
}

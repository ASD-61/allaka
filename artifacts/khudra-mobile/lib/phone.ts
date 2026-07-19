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

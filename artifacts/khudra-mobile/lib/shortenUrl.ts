// Shrinks a Google Maps link via TinyURL's key-less API so a WhatsApp message
// shows a short, clean line instead of a long raw URL. Best-effort: falls
// back to the original link if the request is slow/unreachable, so sending
// the driver/customer their location never breaks because of it.
export async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!response.ok) return longUrl;
    const short = (await response.text()).trim();
    return short.startsWith('http') ? short : longUrl;
  } catch {
    return longUrl;
  }
}

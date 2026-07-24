import { Share } from 'react-native';
import { resolveApiDomain, schemeForDomain } from '@/lib/api-scheme';

/**
 * Builds a public https link that opens the app straight to a product. The
 * link points at the API server's `/p/:id` bridge page, which WhatsApp (and
 * every browser) reliably turns into a tappable link. That page then deep-links
 * into the app (khudra-mobile://product/:id) or offers the download.
 */
export function productShareUrl(productId: number): string {
  const domain = resolveApiDomain();
  return `${schemeForDomain(domain)}://${domain}/p/${productId}`;
}

/** Opens the native share sheet so a customer can send a product to a friend. */
export async function shareProduct(product: {
  id: number;
  name: string;
}): Promise<void> {
  const url = productShareUrl(product.id);
  const message = `شاهد "${product.name}" على تطبيق عـلاّكـة 🛒\n${url}`;
  try {
    await Share.share({ message, url });
  } catch {
    // user cancelled or share unavailable — ignore
  }
}

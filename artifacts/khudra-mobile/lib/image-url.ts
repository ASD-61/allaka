// Product/category images are stored as relative paths like
// "/api/storage/objects/uploads/xyz". Expo needs an absolute URL.
import { schemeForDomain, resolveApiDomain } from '@/lib/api-scheme';

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const domain = resolveApiDomain();
  return `${schemeForDomain(domain)}://${domain}${path}`;
}

// Product/category images are stored as relative paths like
// "/api/storage/objects/uploads/xyz". Expo needs an absolute URL.
import { schemeForDomain } from '@/lib/api-scheme';

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? '';

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${schemeForDomain(domain)}://${domain}${path}`;
}

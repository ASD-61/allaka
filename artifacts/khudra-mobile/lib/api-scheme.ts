// Locally the api-server runs over plain http (no TLS); the Replit dev domain
// (and any real deployment) is always https. Shared by the API client base
// URL and by resolveImageUrl so both agree on the same host's scheme.
export function schemeForDomain(domain: string): 'http' | 'https' {
  return /^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/.test(domain)
    ? 'http'
    : 'https';
}

import Constants from 'expo-constants';

// Locally the api-server runs over plain http (no TLS); the Replit dev domain
// (and any real deployment) is always https. Shared by the API client base
// URL and by resolveImageUrl so both agree on the same host's scheme.
export function schemeForDomain(domain: string): 'http' | 'https' {
  return /^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/.test(domain)
    ? 'http'
    : 'https';
}

// The api-server's local dev port (artifacts/api-server's PORT). Not
// configurable via EXPO_PUBLIC_* on purpose — it only matters for the
// same-machine dev-time auto-detect fallback below.
const LOCAL_API_PORT = '3001';

// Where the mobile app should reach the API server. Resolution order:
//   1. EXPO_PUBLIC_DOMAIN — explicit override (used for real deployments and
//      for `expo start --web`, where "localhost:3001" is correct).
//   2. Auto-detected from the Expo dev server's own LAN address — when a
//      phone opens the app via Expo Go over `--lan`/`--tunnel`, Metro already
//      knows the exact host the phone used to reach it (e.g. "192.168.1.5:8081");
//      reusing that host (with the api-server's port) means a physical device
//      can reach the API without anyone hand-typing a LAN IP into an .env file.
//   3. "localhost:3001" — last-resort fallback (simulator/emulator on the
//      same machine as the API server).
export function resolveApiDomain(): string {
  const explicit = process.env.EXPO_PUBLIC_DOMAIN;
  if (explicit) return explicit;

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any)?.expoGoConfig?.debuggerHost;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) return `${host}:${LOCAL_API_PORT}`;
  }

  return `localhost:${LOCAL_API_PORT}`;
}

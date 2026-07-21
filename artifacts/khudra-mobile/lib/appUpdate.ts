import Constants from 'expo-constants';
import { resolveApiDomain, schemeForDomain } from './api-scheme';

export interface UpdateInfo {
  latestVersion: string;
  currentVersion: string;
  apkUrl: string;
  message: string;
}

// Current installed version, from app.json's `version` (baked into the build).
export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

// Compares two "x.y.z" version strings: returns true when `a` is strictly newer
// than `b`. Missing parts are treated as 0, non-numeric parts as 0.
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

// Asks the server for the latest published version. Returns update info only
// when a newer version than the installed one is available; otherwise null.
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const domain = resolveApiDomain();
    const base = `${schemeForDomain(domain)}://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${base}/api/app-version`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const latestVersion = String(data?.latestVersion ?? '');
    if (!latestVersion) return null;
    const currentVersion = currentAppVersion();
    if (!isNewer(latestVersion, currentVersion)) return null;
    const apkPath = String(data?.apkUrl ?? '/app/allaka.apk');
    const apkUrl = apkPath.startsWith('http') ? apkPath : `${base}${apkPath}`;
    return {
      latestVersion,
      currentVersion,
      apkUrl,
      message: String(data?.message ?? 'صدر تحديث جديد للتطبيق.'),
    };
  } catch {
    return null;
  }
}

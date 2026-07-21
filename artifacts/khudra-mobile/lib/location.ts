import * as Location from 'expo-location';

// `Location.getCurrentPositionAsync` (and even the permission prompt itself
// on some Android devices/OEM ROMs) can hang indefinitely — with no error and
// no resolution — when GPS can't get a fix (indoors, location services
// toggled off at the OS level, an emulator with no fake location configured,
// etc). Without a hard ceiling around the WHOLE flow (not just the position
// fetch), any "استخدم موقعي الحالي" button that awaits it directly gets stuck
// in its loading state forever with no feedback to the customer. This wraps
// every step with a timeout and falls back to the last known (cached)
// position, which is near-instant.
const FIX_TIMEOUT_MS = 8000;
// Ceiling for the ENTIRE flow (permission prompt + services check + fix +
// fallback) — guarantees the caller's loading spinner always resolves, even
// if some native call below never settles on a flaky device.
const OVERALL_TIMEOUT_MS = 12000;

export interface Coords {
  latitude: number;
  longitude: number;
}

// Great-circle distance in kilometers between two lat/lng points (Haversine).
// Used to show the store↔customer distance on the store page (where the API
// doesn't precompute it) so it's consistent across all devices.
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

export type LocationFailureReason = 'permission' | 'services' | 'unavailable';
export type LocationResult =
  | { ok: true; coords: Coords }
  | { ok: false; reason: LocationFailureReason };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), ms),
    ),
  ]);
}

function toCoords(pos: Location.LocationObject): Coords {
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

// Verbose variant — used by the "استخدم موقعي الحالي" button so it can show
// the customer a message that actually matches what went wrong (permission
// denied vs. GPS/location services turned off vs. no fix available) instead
// of one generic "تعذر تحديد موقعك" for every case.
export async function getCurrentPositionVerbose(): Promise<LocationResult> {
  try {
    return await withTimeout(fetchPosition(), OVERALL_TIMEOUT_MS);
  } catch {
    // The overall ceiling tripped — treat exactly like "couldn't get a fix"
    // so the button always recovers instead of spinning forever.
    return { ok: false, reason: 'unavailable' };
  }
}

async function fetchPosition(): Promise<LocationResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };

  // Cheap, near-instant check for the device-level GPS/location toggle —
  // when it's off, getCurrentPositionAsync can hang far longer than a normal
  // "no fix yet" case on some Android builds, so short-circuit here first.
  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!servicesEnabled) return { ok: false, reason: 'services' };

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FIX_TIMEOUT_MS,
    );
    return { ok: true, coords: toCoords(position) };
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last) return { ok: true, coords: toCoords(last) };
    } catch {
      // ignore — falls through to "unavailable" below
    }
    return { ok: false, reason: 'unavailable' };
  }
}

// Silent/background variant — used where we just want a best-effort fix
// (e.g. capturing location right after login) without bothering the
// customer with an error message when it doesn't work out.
export async function getCurrentPositionSafe(): Promise<Coords | null> {
  const result = await getCurrentPositionVerbose();
  return result.ok ? result.coords : null;
}

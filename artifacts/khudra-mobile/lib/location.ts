import * as Location from 'expo-location';

// `Location.getCurrentPositionAsync` can hang indefinitely — with no error
// and no resolution — when GPS can't get a fix (indoors, location services
// off, an emulator with no fake location configured, etc). Without a
// timeout, any "استخدم موقعي الحالي" button that awaits it directly gets
// stuck in its loading state forever. This wraps the call with a timeout and
// falls back to the last known (cached) position, which is near-instant.
const FIX_TIMEOUT_MS = 8000;

export interface Coords {
  latitude: number;
  longitude: number;
}

export async function getCurrentPositionSafe(): Promise<Coords | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), FIX_TIMEOUT_MS),
      ),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        return { latitude: last.coords.latitude, longitude: last.coords.longitude };
      }
    } catch {
      // ignore — caller treats this the same as "no location available"
    }
    return null;
  }
}

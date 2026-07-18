// Straight-line distance between two coordinates, in kilometers (haversine
// formula) — good enough for "nearest store" sorting without needing PostGIS
// or any external geocoding service.
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parses lat/lng query params shared by /stores and /products/search — returns
// null if either is missing/invalid so callers can skip distance sorting.
export function parseLatLng(
  latRaw: unknown,
  lngRaw: unknown,
): { latitude: number; longitude: number } | null {
  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  if (
    latRaw == null ||
    lngRaw == null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }
  return { latitude, longitude };
}

// Road Routing & Real Distance Measurement Utility (Open Source Routing Machine & Google Maps)
export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][] array along real roads
  distanceKm: number; // in kilometers along the real road
  durationMinutes: number; // in minutes based on real driving speeds
  isRealRoad: boolean; // true if successfully fetched from road routing engine
}

// In-memory cache for fast repeated lookups
const routeCache = new Map<string, RouteResult>();

// Straight-line haversine distance in kilometers
export function calculateCrowDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Fetch real driving road route between two GPS coordinates using OSRM.
 * Falls back gracefully to curved road approximation with mountain terrain factor if offline/unreachable.
 */
export async function fetchRoadDrivingRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<RouteResult> {
  const key = `${lat1.toFixed(5)},${lng1.toFixed(5)}_${lat2.toFixed(5)},${lng2.toFixed(5)}`;
  if (routeCache.has(key)) {
    return routeCache.get(key)!;
  }

  // Fallback calculation in case of network issue
  const crowKm = calculateCrowDistanceKm(lat1, lng1, lat2, lng2);
  // Mountainous winding road factor in Northern Laos (typically 1.35x - 1.45x straight line)
  const fallbackRoadKm = Math.round(crowKm * 1.38 * 10) / 10;
  const fallbackDurationMin = Math.max(2, Math.round((fallbackRoadKm / 38) * 60));

  // Generate slightly curved arc points as fallback polyline
  const fallbackCoords: [number, number][] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // quadratic curve bulge
    const arc = Math.sin(t * Math.PI) * 0.008;
    const lat = lat1 + (lat2 - lat1) * t + arc;
    const lng = lng1 + (lng2 - lng1) * t - arc;
    fallbackCoords.push([lat, lng]);
  }

  const fallbackResult: RouteResult = {
    coordinates: fallbackCoords,
    distanceKm: fallbackRoadKm,
    durationMinutes: fallbackDurationMin,
    isRealRoad: false,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceMeters = route.distance || 0;
        const durationSeconds = route.duration || 0;
        const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

        // Convert [lng, lat] from GeoJSON to [lat, lng] for Leaflet
        const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        if (coordinates.length > 0) {
          const result: RouteResult = {
            coordinates,
            distanceKm: distanceKm > 0 ? distanceKm : fallbackRoadKm,
            durationMinutes,
            isRealRoad: true,
          };
          routeCache.set(key, result);
          return result;
        }
      }
    }
  } catch {
    // Network offline or timeout - fallback to estimate
  }

  return fallbackResult;
}

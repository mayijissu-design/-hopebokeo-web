// High-precision GIS and Google Maps coordinate parser for Hope Bokeo
import { Village } from '../types';

export interface ParsedCoordinates {
  lat: number;
  lng: number;
  sourceType?: 'exact_pin' | 'viewport' | 'query' | 'embed' | 'raw_coordinates' | 'dms' | 'regex_fallback';
}

/**
 * Validates and normalizes latitude and longitude coordinates.
 * Specifically checks for standard ranges (-90 to 90 for lat, -180 to 180 for lng),
 * and handles inverted Laos/SE Asia coordinates (e.g. if user entered lng, lat by mistake).
 */
export function normalizeCoordinates(lat: number, lng: number): { lat: number; lng: number } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Handle accidental inversion (In Laos & SE Asia: Lat is ~14 to ~24, Lng is ~98 to ~109)
  if (lat >= 95 && lat <= 110 && lng >= 14 && lng <= 25) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    lat: Math.round(lat * 1000000) / 1000000,
    lng: Math.round(lng * 1000000) / 1000000,
  };
}

/**
 * Converts Degree Minute Second (DMS) string to decimal degrees
 */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    dd = dd * -1;
  }
  return dd;
}

/**
 * Robustly parses latitude and longitude from any Google Maps URL, embed tag, query string, or raw coordinates.
 */
export function parseCoordinatesFromUrl(input: string): ParsedCoordinates | null {
  if (!input || typeof input !== 'string') return null;
  let text = input.trim();

  // If user pasted an iframe embed code (e.g., <iframe src="https://..."></iframe>)
  const iframeSrcMatch = text.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (iframeSrcMatch) {
    text = iframeSrcMatch[1];
  }

  // Unescape & decode URI up to 3 times to unwrap continue=, url=, and encoded characters
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }

  // 1. Google Maps Place Pin Coordinates (!3d<lat>!4d<lng>) - Most accurate pinpoint from Google Maps
  const placeDataMatch = text.match(/!3d([-+]?\d+(?:\.\d+)?)[^!]*!4d([-+]?\d+(?:\.\d+)?)/i);
  if (placeDataMatch) {
    const lat = parseFloat(placeDataMatch[1]);
    const lng = parseFloat(placeDataMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'exact_pin' };
  }

  // 2. Google Maps Embed PB parameters (!2d<lng>!3d<lat> or !3d<lat>!2d<lng>)
  const embedMatch1 = text.match(/!2d([-+]?\d+(?:\.\d+)?)[^!]*!3d([-+]?\d+(?:\.\d+)?)/i);
  if (embedMatch1) {
    const lng = parseFloat(embedMatch1[1]);
    const lat = parseFloat(embedMatch1[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'embed' };
  }

  const embedMatch2 = text.match(/!3d([-+]?\d+(?:\.\d+)?)[^!]*!2d([-+]?\d+(?:\.\d+)?)/i);
  if (embedMatch2) {
    const lat = parseFloat(embedMatch2[1]);
    const lng = parseFloat(embedMatch2[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'embed' };
  }

  // 3. Path coordinates in Google Maps (e.g. search/20.078897,+100.836816 or place/20.078897,100.836816 or dir//20.078897,100.836816)
  const pathMatch = text.match(
    /(?:place|dir|search|maps)\/[^@?#]*?([-+]?\d{1,2}(?:\.\d+)?)(?:%2C|,|\+|\s)+[-+]?(\d{1,3}(?:\.\d+)?)/i
  );
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1]);
    const lng = parseFloat(pathMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'exact_pin' };
  }

  // 4. Query string coordinates: ?q=lat,lng or &query=lat,lng or &ll=lat,lng or &daddr=lat,lng or &center=lat,lng or &destination=lat,lng
  const queryMatch = text.match(
    /(?:[?&]|&amp;)(?:q|query|ll|loc|center|markers|daddr|saddr|destination)=(?:loc:)?([-+]?\d{1,2}(?:\.\d+)?)(?:%2C|,|\+|\s)+[-+]?(\d{1,3}(?:\.\d+)?)/i
  );
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'query' };
  }

  // 5. Viewport center (@lat,lng,zoom) in Google Maps URLs
  const atMatch = text.match(/@([-+]?\d{1,2}(?:\.\d+)?),[-+]?(\d{1,3}(?:\.\d+)?)/i);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'viewport' };
  }

  // 6. DMS (Degrees, Minutes, Seconds) representation: e.g. 20°16'25.0"N 100°24'47.3"E
  const dmsMatch = text.match(
    /(\d{1,2})[°\s]+(\d{1,2})['\s]+([0-9.]+)["]?\s*([NSns])[,;\s]+(\d{1,3})[°\s]+(\d{1,2})['\s]+([0-9.]+)["]?\s*([EWew])/
  );
  if (dmsMatch) {
    const lat = dmsToDecimal(parseFloat(dmsMatch[1]), parseFloat(dmsMatch[2]), parseFloat(dmsMatch[3]), dmsMatch[4].toUpperCase());
    const lng = dmsToDecimal(parseFloat(dmsMatch[5]), parseFloat(dmsMatch[6]), parseFloat(dmsMatch[7]), dmsMatch[8].toUpperCase());
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'dms' };
  }

  // 7. Direct coordinate text: "20.078897, 100.836816" or "20.078897,+100.836816"
  const rawCoordMatch = text.match(/^[-+]?(\d{1,2}(?:\.\d+)?)[,\s+]+[-+]?(\d{1,3}(?:\.\d+)?)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'raw_coordinates' };
  }

  // 8. General coordinate pattern match anywhere in text (e.g. inside JSON or query parameters)
  const generalMatch = text.match(/([-+]?\d{1,2}\.\d{4,})[,\s+]+[-+]?(\d{1,3}\.\d{4,})/);
  if (generalMatch) {
    const lat = parseFloat(generalMatch[1]);
    const lng = parseFloat(generalMatch[2]);
    const normalized = normalizeCoordinates(lat, lng);
    if (normalized) return { ...normalized, sourceType: 'regex_fallback' };
  }

  return null;
}

/**
 * Checks if a URL is a shortened link that needs server-side resolution
 */
export function isShortenedMapsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('maps.app.goo.gl') ||
    lower.includes('goo.gl/maps') ||
    lower.includes('bit.ly') ||
    lower.includes('t.co') ||
    lower.includes('tinyurl.com') ||
    lower.includes('page.link')
  );
}

// In-memory client cache for resolved short URLs
const resolvedUrlCache = new Map<string, { lat: number; lng: number }>();

/**
 * Resolves a shortened Google Maps URL by calling backend API
 */
export async function resolveMapsUrlViaApi(url: string): Promise<{
  success: boolean;
  lat?: number;
  lng?: number;
  finalUrl?: string;
  sourceType?: string;
}> {
  if (!url || typeof url !== 'string') return { success: false };
  const clean = url.trim();

  // 1. Direct local parse first
  const direct = parseCoordinatesFromUrl(clean);
  if (direct) {
    resolvedUrlCache.set(clean, { lat: direct.lat, lng: direct.lng });
    return {
      success: true,
      lat: direct.lat,
      lng: direct.lng,
      finalUrl: clean,
      sourceType: direct.sourceType,
    };
  }

  // 2. Check local memory cache
  if (resolvedUrlCache.has(clean)) {
    const cached = resolvedUrlCache.get(clean)!;
    return {
      success: true,
      lat: cached.lat,
      lng: cached.lng,
      finalUrl: clean,
    };
  }

  try {
    const res = await fetch('/api/resolve-maps-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: clean }),
    });
    if (!res.ok) {
      return { success: false };
    }
    const data = await res.json();
    if (data.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
      resolvedUrlCache.set(clean, { lat: data.lat, lng: data.lng });
    }
    return data;
  } catch (err) {
    console.error('Error resolving maps url:', err);
    return { success: false };
  }
}

/**
 * Generates an accurate Google Maps Embed URL for a given GPS coordinate or Village
 */
export function getGoogleMapsEmbedUrl(lat: number, lng: number, zoom = 16, mapType: 'satellite' | 'roadmap' = 'satellite'): string {
  const typeParam = mapType === 'satellite' ? 'k' : 'm';
  return `https://maps.google.com/maps?q=${lat},${lng}&t=${typeParam}&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Generates a direct Google Maps external navigation URL
 */
export function getGoogleMapsDirectUrl(lat: number, lng: number, label?: string): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}+(${encodeURIComponent(label)})`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}


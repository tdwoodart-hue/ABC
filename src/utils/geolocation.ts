/**
 * High-Accuracy Geolocation and Reverse Geocoding Utility
 * Behaves like iPhone Photo EXIF / Location Metadata:
 * - Device GPS (latitude & longitude) is the sole source of truth
 * - Uses enableHighAccuracy: true, maximumAge: 0
 * - Reverse geocoding only converts coordinates to human-readable addresses
 */

export interface GPSCoordinateData {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: string; // ISO string
}

export interface GeocodedAddressResult {
  placeName: string;
  formattedAddress: string;
  city?: string;
  district?: string;
  province?: string;
  placeId?: string;
}

/**
 * Gets high-accuracy GPS coordinates directly from the device's hardware
 */
export const getDeviceHighAccuracyGPS = (): Promise<GPSCoordinateData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy * 10) / 10,
          timestamp: new Date(position.timestamp || Date.now()).toISOString()
        });
      },
      (error) => {
        let msg = 'Không thể lấy tọa độ GPS từ thiết bị.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Quyền truy cập vị trí GPS bị từ chối. Vui lòng cho phép quyền vị trí trong cài đặt trình duyệt.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Tín hiệu GPS không khả dụng. Vui lòng bật định vị GPS trên thiết bị.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Hết thời gian chờ định vị GPS có độ chính xác cao.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  });
};

/**
 * Reverse-geocodes exact latitude and longitude into readable address information
 */
export const reverseGeocodeGPS = async (
  latitude: number,
  longitude: number
): Promise<GeocodedAddressResult> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=vi`
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      
      const city = addr.city || addr.town || addr.state || addr.province || '';
      const district = addr.suburb || addr.city_district || addr.district || addr.county || '';
      
      // Determine best place name from amenity, road, leisure, tourism or display name
      const primaryName = 
        addr.amenity ||
        addr.tourism ||
        addr.leisure ||
        addr.shop ||
        addr.building ||
        data.name ||
        (data.display_name ? data.display_name.split(',')[0].trim() : '');

      const formattedAddress = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      const placeName = primaryName || (district ? `${district}, ${city}` : city) || formattedAddress.split(',')[0].trim();

      return {
        placeName: placeName || 'Vị trí đã chọn',
        formattedAddress,
        city,
        district,
        province: addr.province || addr.state,
        placeId: data.osm_id ? `osm_${data.osm_id}` : undefined
      };
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  // Fallback if network fails
  const coordsStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  return {
    placeName: coordsStr,
    formattedAddress: `Tọa độ GPS: ${coordsStr}`
  };
};

/**
 * Formats coordinates for display (e.g. 21.028514° N, 105.854212° E)
 */
export const formatCoordinates = (lat: number, lng: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
};

/**
 * Parses user input strings from Google Maps, decimal coordinates, or DMS format:
 * - Google Maps URL (e.g., https://www.google.com/maps/place/.../@21.028511,105.854444,17z/...)
 * - Google Maps query (?q=21.028511,105.854444)
 * - Decimal pair (e.g., "21.028511, 105.854444", "21.028511 105.854444", "21.028511; 105.854444")
 * - Degrees Minutes Seconds (e.g., 21°01'42.6"N 105°51'16.0"E)
 */
export function parseGpsInput(raw: string): { lat: number; lng: number } | null {
  if (!raw || !raw.trim()) return null;
  const str = raw.trim();

  // 1. Google Maps URL pattern: @lat,lng
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Google Maps query param: ?q=lat,lng or ll=lat,lng or destination=lat,lng
  const queryMatch = str.match(/[?&](?:q|ll|daddr|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 3. DMS format: 21°01'42.6"N 105°51'16.0"E
  const dmsMatch = str.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NSns])[,\s]+(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EWew])/);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latDir = dmsMatch[4].toUpperCase();
    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;

    const lngDeg = parseFloat(dmsMatch[5]);
    const lngMin = parseFloat(dmsMatch[6]);
    const lngSec = parseFloat(dmsMatch[7]);
    const lngDir = dmsMatch[8].toUpperCase();
    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (lngDir === 'W') lng = -lng;

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 4. Standard Decimal Coordinate Pair: "21.028511, 105.854444" or "21.028511 105.854444" or "21.028511; 105.854444"
  const cleanStr = str.replace(/[()\[\]]/g, '').trim();
  const pairMatch = cleanStr.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s;]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 5. Embedded decimal pair in text (e.g. copied text containing lat, lng)
  const embedMatch = str.match(/(-?\d{1,2}\.\d{4,})[,\s;]+(-?\d{1,3}\.\d{4,})/);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lng = parseFloat(embedMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}


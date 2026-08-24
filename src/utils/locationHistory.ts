import { JournalEntry, SavedPlace, VisitedPlace } from '../types';

export interface LocationHistoryItem {
  id: string;
  name: string; // Tên địa điểm hoặc tên riêng
  customNickname?: string; // Tên riêng do cặp đôi đặt
  address?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  placeId?: string;
  emoji?: string;
  isSaved?: boolean;
  savedPlaceId?: string;
  photoCount: number; // Tổng số ảnh chụp tại đây
  entryCount: number; // Số bài viết kỷ niệm tại đây
  lastVisited?: string;
  firstVisited?: string;
  sampleImages: string[];
  category?: string;
  notes?: string;
}

/**
 * Standardize text for grouping similar location strings
 */
const normalizeLocationString = (str?: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[,\-–._/\\#]/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Calculate distance in meters between two lat/lng points
 */
const getLatLngDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Extract, aggregate and merge all historical places from journals & saved places
 */
export const extractLocationHistory = (
  journals: JournalEntry[] = [],
  savedPlaces: SavedPlace[] = [],
  customVisitedPlaces: VisitedPlace[] = []
): LocationHistoryItem[] => {
  const map = new Map<string, LocationHistoryItem>();

  // 1. First add all Saved Places (User explicitly nicknamed/saved)
  savedPlaces.forEach((sp) => {
    const key = `saved_${sp.id}`;
    map.set(key, {
      id: sp.id,
      name: sp.name,
      customNickname: sp.name,
      address: sp.address || '',
      lat: sp.lat,
      lng: sp.lng,
      accuracy: sp.accuracy,
      placeId: sp.placeId,
      emoji: sp.emoji || '⭐',
      isSaved: true,
      savedPlaceId: sp.id,
      photoCount: 0,
      entryCount: 0,
      sampleImages: [],
      category: sp.category || 'other',
      notes: sp.notes
    });
  });

  // 2. Aggregate from journals
  journals.forEach((j) => {
    const locName = (j.location || '').trim();
    const locAddress = (j.locationAddress || '').trim();

    if (!locName && !locAddress && (!j.lat || !j.lng)) return;

    const jPhotos = (j.images || []).length || (j.imageUrl ? 1 : 0);
    const jDate = j.date || j.createdAt;
    const jImages = j.images && j.images.length > 0 ? j.images : j.imageUrl ? [j.imageUrl] : [];

    // Check if this matches an existing saved place by name or proximity (< 150m)
    let matchedSavedKey: string | null = null;
    for (const [key, item] of map.entries()) {
      if (item.isSaved) {
        const normSaved = normalizeLocationString(item.name);
        const normLoc = normalizeLocationString(locName);
        const normAddr = normalizeLocationString(locAddress);

        const nameMatch = normSaved && (normLoc.includes(normSaved) || normSaved.includes(normLoc));
        let proximityMatch = false;

        if (j.lat && j.lng && item.lat && item.lng) {
          const dist = getLatLngDistanceMeters(j.lat, j.lng, item.lat, item.lng);
          if (dist <= 200) {
            proximityMatch = true;
          }
        }

        if (nameMatch || proximityMatch) {
          matchedSavedKey = key;
          break;
        }
      }
    }

    if (matchedSavedKey) {
      const existing = map.get(matchedSavedKey)!;
      existing.photoCount += jPhotos;
      existing.entryCount += 1;
      if (!existing.lat && j.lat) existing.lat = j.lat;
      if (!existing.lng && j.lng) existing.lng = j.lng;
      if (!existing.address && locAddress) existing.address = locAddress;
      if (!existing.lastVisited || jDate > existing.lastVisited) {
        existing.lastVisited = jDate;
      }
      if (!existing.firstVisited || jDate < existing.firstVisited) {
        existing.firstVisited = jDate;
      }
      jImages.forEach((img) => {
        if (img && !existing.sampleImages.includes(img) && existing.sampleImages.length < 4) {
          existing.sampleImages.push(img);
        }
      });
      return;
    }

    // Otherwise, group by location name or approximate coordinates
    let groupKey = '';
    if (locName) {
      groupKey = `name_${normalizeLocationString(locName)}`;
    } else if (j.lat && j.lng) {
      groupKey = `geo_${j.lat.toFixed(3)}_${j.lng.toFixed(3)}`;
    } else if (locAddress) {
      groupKey = `addr_${normalizeLocationString(locAddress.slice(0, 30))}`;
    }

    if (!groupKey) return;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        id: groupKey,
        name: locName || locAddress || 'Địa điểm kỷ niệm',
        address: locAddress || locName,
        lat: j.lat,
        lng: j.lng,
        accuracy: j.accuracy,
        placeId: j.placeId,
        emoji: '📍',
        isSaved: false,
        photoCount: jPhotos,
        entryCount: 1,
        lastVisited: jDate,
        firstVisited: jDate,
        sampleImages: jImages.slice(0, 4)
      });
    } else {
      const item = map.get(groupKey)!;
      item.photoCount += jPhotos;
      item.entryCount += 1;
      if (!item.lat && j.lat) item.lat = j.lat;
      if (!item.lng && j.lng) item.lng = j.lng;
      if (!item.address && locAddress) item.address = locAddress;
      if (!item.lastVisited || jDate > item.lastVisited) {
        item.lastVisited = jDate;
      }
      if (!item.firstVisited || jDate < item.firstVisited) {
        item.firstVisited = jDate;
      }
      jImages.forEach((img) => {
        if (img && !item.sampleImages.includes(img) && item.sampleImages.length < 4) {
          item.sampleImages.push(img);
        }
      });
    }
  });

  // 3. Integrate custom visited places if any
  customVisitedPlaces.forEach((vp) => {
    const normVp = normalizeLocationString(vp.name);
    let matchedKey: string | null = null;

    for (const [key, item] of map.entries()) {
      const normItem = normalizeLocationString(item.name);
      if (normItem === normVp) {
        matchedKey = key;
        break;
      }
      if (vp.lat && vp.lng && item.lat && item.lng) {
        if (getLatLngDistanceMeters(vp.lat, vp.lng, item.lat, item.lng) <= 150) {
          matchedKey = key;
          break;
        }
      }
    }

    if (matchedKey) {
      const existing = map.get(matchedKey)!;
      if (vp.imageUrl && !existing.sampleImages.includes(vp.imageUrl) && existing.sampleImages.length < 4) {
        existing.sampleImages.push(vp.imageUrl);
      }
      if (vp.images) {
        vp.images.forEach((img) => {
          if (img && !existing.sampleImages.includes(img) && existing.sampleImages.length < 4) {
            existing.sampleImages.push(img);
          }
        });
      }
    } else {
      const key = `vp_${vp.id}`;
      const vpImages = vp.images && vp.images.length > 0 ? vp.images : vp.imageUrl ? [vp.imageUrl] : [];
      map.set(key, {
        id: vp.id,
        name: vp.name,
        address: vp.address || `${vp.name}, ${vp.province}`,
        lat: vp.lat,
        lng: vp.lng,
        accuracy: vp.accuracy,
        placeId: vp.placeId,
        emoji: '📌',
        isSaved: false,
        photoCount: vpImages.length,
        entryCount: 1,
        lastVisited: vp.dateVisited || vp.createdAt,
        sampleImages: vpImages.slice(0, 4),
        category: vp.category
      });
    }
  });

  const list = Array.from(map.values());

  // Default sort: Saved places first, then high photo count, then most recent
  return list.sort((a, b) => {
    if (a.isSaved && !b.isSaved) return -1;
    if (!a.isSaved && b.isSaved) return 1;
    if (b.photoCount !== a.photoCount) return b.photoCount - a.photoCount;
    return (b.lastVisited || '').localeCompare(a.lastVisited || '');
  });
};

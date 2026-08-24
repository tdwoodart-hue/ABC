import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Check, 
  X, 
  Loader2, 
  Layers, 
  Sparkles, 
  Crosshair, 
  Clock, 
  Compass, 
  CheckCircle2, 
  Copy, 
  ClipboardPaste, 
  ArrowRight, 
  ArrowLeft, 
  Star, 
  Plus,
  ChevronDown,
  ChevronUp,
  Camera,
  History,
  BookOpen,
  Heart,
  SlidersHorizontal
} from 'lucide-react';
import L from 'leaflet';
import { 
  getDeviceHighAccuracyGPS, 
  reverseGeocodeGPS, 
  formatCoordinates, 
  parseGpsInput,
  GPSCoordinateData 
} from '../utils/geolocation';
import { FAMOUS_DATE_SPOTS } from '../utils/vietnamCoordinates';
import { JournalEntry, SavedPlace, UserProfile, VisitedPlace } from '../types';
import { SavedLocationSelectorModal, SelectedLocationData } from './SavedLocationSelectorModal';
import { extractLocationHistory, LocationHistoryItem } from '../utils/locationHistory';
import { db, collection, onSnapshot, query, orderBy } from '../lib/firebase';

export interface SelectedLocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  locationTimestamp?: string;
  placeId?: string;
  locationName: string;
  address: string;
  city?: string;
}

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: SelectedLocationResult) => void;
  initialCoords?: { lat?: number; lng?: number; accuracy?: number; locationTimestamp?: string; placeId?: string };
  initialLocationName?: string;
  initialAddress?: string;
  title?: string;
  subtitle?: string;
  savedPlaces?: SavedPlace[];
  journals?: JournalEntry[];
  coupleId?: string;
  userProfile?: UserProfile;
}

interface PlaceSuggestion {
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
  city?: string;
  placeId?: string;
  isHistory?: boolean;
  photoCount?: number;
  emoji?: string;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords,
  initialLocationName = '',
  initialAddress = '',
  title = 'Ghim Vị Trí & Tọa Độ GPS',
  subtitle = 'Tọa độ GPS thiết bị là nguồn dữ liệu chuẩn xác duy nhất.',
  savedPlaces = [],
  journals = [],
  coupleId = '',
  userProfile,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const historyMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // High-accuracy GPS state
  const [currentLat, setCurrentLat] = useState<number>(() => initialCoords?.lat ?? 21.028514);
  const [currentLng, setCurrentLng] = useState<number>(() => initialCoords?.lng ?? 105.854212);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | undefined>(initialCoords?.accuracy);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>(
    initialCoords?.locationTimestamp || new Date().toISOString()
  );
  const [currentPlaceId, setCurrentPlaceId] = useState<string | undefined>(initialCoords?.placeId);

  // Manual raw inputs for Lat / Lng strings
  const [rawLatInput, setRawLatInput] = useState<string>(() => (initialCoords?.lat ?? 21.028514).toString());
  const [rawLngInput, setRawLngInput] = useState<string>(() => (initialCoords?.lng ?? 105.854212).toString());
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Smart Search / Paste / History state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'saved' | 'top_photos' | 'recent'>('all');
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Location display info
  const [locationName, setLocationName] = useState<string>(initialLocationName || '');
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress || '');
  const [selectedCity, setSelectedCity] = useState<string>('');

  const [loadingMap, setLoadingMap] = useState(true);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);

  // Real-time Firestore sync as fallback & live updates
  const activeCoupleId = coupleId || userProfile?.coupleId || '';
  const [internalSavedPlaces, setInternalSavedPlaces] = useState<SavedPlace[]>([]);
  const [internalJournals, setInternalJournals] = useState<JournalEntry[]>([]);
  const [internalVisitedPlaces, setInternalVisitedPlaces] = useState<VisitedPlace[]>([]);

  useEffect(() => {
    if (!isOpen || !activeCoupleId) return;

    // 1. Saved Places
    const savedPlacesRef = collection(db, 'couples', activeCoupleId, 'saved_places');
    const qSaved = query(savedPlacesRef, orderBy('createdAt', 'desc'));
    const unsubSaved = onSnapshot(
      qSaved,
      (snapshot) => {
        const items: SavedPlace[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as SavedPlace);
        });
        setInternalSavedPlaces(items);
      },
      (err) => {
        console.warn('Error listening to saved_places in MapLocationPickerModal:', err);
      }
    );

    // 2. Journals (for past locations)
    const journalsRef = collection(db, 'couples', activeCoupleId, 'journals');
    const qJournals = query(journalsRef, orderBy('date', 'desc'));
    const unsubJournals = onSnapshot(
      qJournals,
      (snapshot) => {
        const items: JournalEntry[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as JournalEntry);
        });
        setInternalJournals(items);
      },
      (err) => {
        console.warn('Error listening to journals in MapLocationPickerModal:', err);
      }
    );

    // 3. Custom Visited Places
    const visitedPlacesRef = collection(db, 'couples', activeCoupleId, 'visited_places');
    const qVisited = query(visitedPlacesRef, orderBy('createdAt', 'desc'));
    const unsubVisited = onSnapshot(
      qVisited,
      (snapshot) => {
        const items: VisitedPlace[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as VisitedPlace);
        });
        setInternalVisitedPlaces(items);
      },
      (err) => {
        console.warn('Error listening to visited_places in MapLocationPickerModal:', err);
      }
    );

    return () => {
      unsubSaved();
      unsubJournals();
      unsubVisited();
    };
  }, [isOpen, activeCoupleId]);

  // Combine props with real-time internal data
  const combinedSavedPlaces = useMemo(() => {
    const map = new Map<string, SavedPlace>();
    savedPlaces.forEach((sp) => map.set(sp.id, sp));
    internalSavedPlaces.forEach((sp) => map.set(sp.id, sp));
    return Array.from(map.values());
  }, [savedPlaces, internalSavedPlaces]);

  const combinedJournals = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    journals.forEach((j) => map.set(j.id, j));
    internalJournals.forEach((j) => map.set(j.id, j));
    return Array.from(map.values());
  }, [journals, internalJournals]);

  // Extract all historical and saved locations from journals, savedPlaces & visitedPlaces
  const locationHistory = useMemo(() => {
    return extractLocationHistory(combinedJournals, combinedSavedPlaces, internalVisitedPlaces);
  }, [combinedJournals, combinedSavedPlaces, internalVisitedPlaces]);

  // Filtered list of history places for quick carousel and drawer
  const filteredHistoryPlaces = useMemo(() => {
    let list = locationHistory;
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.customNickname && item.customNickname.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q))
      );
    }

    if (historyFilter === 'saved') {
      return list.filter((item) => item.isSaved);
    }
    if (historyFilter === 'top_photos') {
      return [...list].sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0));
    }
    if (historyFilter === 'recent') {
      return [...list].sort((a, b) => {
        const dateA = a.lastVisited || (a as any).createdAt || '';
        const dateB = b.lastVisited || (b as any).createdAt || '';
        return dateB.localeCompare(dateA);
      });
    }
    return list;
  }, [locationHistory, historyFilter, historySearchTerm]);

  // Top quick chips (saved places + top photographed spots + recent)
  const quickHistoryChips = useMemo(() => {
    return locationHistory.slice(0, 10);
  }, [locationHistory]);

  // Keep manual raw inputs synced when coords change
  const syncCoordInputs = (lat: number, lng: number) => {
    setRawLatInput(lat.toFixed(6));
    setRawLngInput(lng.toFixed(6));
  };

  // Main active Heart Pin Icon
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 44px; height: 52px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 14px rgba(244, 63, 94, 0.45)); cursor: grab;">
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #ffffff;
          ">
            <svg style="transform: rotate(45deg); width: 22px; height: 22px; fill: white; color: white;" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style="
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 12px;
            height: 5px;
            background: rgba(0,0,0,0.35);
            border-radius: 50%;
            filter: blur(1.5px);
          "></div>
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 50],
      popupAnchor: [0, -46]
    });
  };

  // Secondary Past Location Dot Marker on Leaflet
  const createHistoryPinIcon = (item: LocationHistoryItem) => {
    const isSaved = item.isSaved;
    const bgGradient = isSaved
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)';
    const symbol = item.emoji || (isSaved ? '⭐' : item.photoCount > 0 ? '📸' : '📍');

    return L.divIcon({
      className: 'custom-history-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18)); cursor: pointer;">
          <div style="
            width: 28px;
            height: 28px;
            background: ${bgGradient};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            font-size: 13px;
          ">
            ${symbol}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  // Perform reverse geocoding on current coords
  const performReverseGeocode = useCallback(async (lat: number, lng: number, overrideName?: string) => {
    setIsReverseGeocoding(true);
    try {
      const geo = await reverseGeocodeGPS(lat, lng);
      if (!overrideName) {
        setLocationName(geo.placeName);
      }
      setFormattedAddress(geo.formattedAddress);
      if (geo.city) setSelectedCity(geo.city);
      if (geo.placeId && !currentPlaceId) {
        setCurrentPlaceId(geo.placeId);
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [currentPlaceId]);

  // Update marker & optional accuracy circle position on map
  const updateMapPosition = (lat: number, lng: number, accuracy?: number, shouldCenter: boolean = false) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    syncCoordInputs(lat, lng);
    if (accuracy !== undefined) {
      setCurrentAccuracy(accuracy);
    }

    if (mapInstanceRef.current && markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);

      if (accuracy && accuracy > 0) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([lat, lng]);
          accuracyCircleRef.current.setRadius(accuracy);
        } else {
          accuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 6'
          }).addTo(mapInstanceRef.current);
        }
      } else if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }

      if (shouldCenter) {
        mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 0.8 });
      }
    }
  };

  // Render past location markers on the Leaflet map
  const renderHistoryMarkersOnMap = useCallback(() => {
    if (!mapInstanceRef.current) return;

    if (historyMarkersGroupRef.current) {
      historyMarkersGroupRef.current.clearLayers();
    } else {
      historyMarkersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    locationHistory.forEach((item) => {
      if (item.lat && item.lng) {
        const hMarker = L.marker([item.lat, item.lng], {
          icon: createHistoryPinIcon(item)
        });

        hMarker.bindTooltip(
          `<b>${item.customNickname || item.name}</b><br/><span style="font-size: 10px; color: #64748b;">${item.address || ''}</span>${item.photoCount > 0 ? `<br/><span style="font-size: 9px; color: #f43f5e;">📸 ${item.photoCount} ảnh</span>` : ''}`,
          { direction: 'top', offset: [0, -14], className: 'custom-leaflet-tooltip' }
        );

        hMarker.on('click', () => {
          handleSelectHistoryLocation(item);
        });

        if (historyMarkersGroupRef.current) {
          historyMarkersGroupRef.current.addLayer(hMarker);
        }
      }
    });
  }, [locationHistory]);

  // 1. Select a past location directly (From Chips, Map, Drawer, or Modal)
  const handleSelectHistoryLocation = (item: LocationHistoryItem | SelectedLocationData) => {
    let locName = '';
    if ('customNickname' in item && item.customNickname) {
      locName = item.customNickname;
    } else if ('locationName' in item && item.locationName) {
      locName = item.locationName;
    } else if ('name' in item && (item as any).name) {
      locName = (item as any).name;
    }
    const locAddr = item.address || locName;

    if (item.lat !== undefined && item.lng !== undefined && !isNaN(item.lat) && !isNaN(item.lng)) {
      setCurrentLat(item.lat);
      setCurrentLng(item.lng);
      syncCoordInputs(item.lat, item.lng);
      setCurrentAccuracy(item.accuracy);
      setCurrentTimestamp(
        'lastVisited' in item && item.lastVisited ? item.lastVisited : new Date().toISOString()
      );
      if (item.placeId) setCurrentPlaceId(item.placeId);

      updateMapPosition(item.lat, item.lng, item.accuracy, true);
    } else if (locAddr || locName) {
      handleSearch(locAddr || locName);
    }

    setLocationName(locName);
    setFormattedAddress(locAddr);
    setShowHistoryDrawer(false);
    setShowDropdown(false);
    setSearchQuery('');

    setStatusFeedback(`Đã ghim vị trí cũ: ${locName}`);
    setTimeout(() => setStatusFeedback(null), 3500);
  };

  // 2. High-Accuracy Device GPS Trigger
  const handleCaptureDeviceGPS = async () => {
    setIsLocatingGPS(true);
    setStatusFeedback('Đang kết nối chip GPS vệ tinh...');
    try {
      const gps: GPSCoordinateData = await getDeviceHighAccuracyGPS();
      const nowIso = new Date().toISOString();
      setCurrentLat(gps.latitude);
      setCurrentLng(gps.longitude);
      syncCoordInputs(gps.latitude, gps.longitude);
      setCurrentAccuracy(gps.accuracy);
      setCurrentTimestamp(gps.timestamp || nowIso);
      setCurrentPlaceId(undefined);

      updateMapPosition(gps.latitude, gps.longitude, gps.accuracy, true);
      setStatusFeedback(`Đã lấy GPS thiết bị (Sai số: ±${gps.accuracy}m)`);
      setTimeout(() => setStatusFeedback(null), 4000);

      // Convert exact coordinates to human-readable address
      await performReverseGeocode(gps.latitude, gps.longitude);
    } catch (err: any) {
      alert(err?.message || 'Không thể định vị GPS độ chính xác cao từ thiết bị.');
      setStatusFeedback(null);
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // 3. Direct GPS / Google Maps Paste Handler
  const handleApplyPastedGps = (textToParse: string) => {
    const raw = textToParse;
    if (!raw.trim()) return;

    const parsed = parseGpsInput(raw);
    if (parsed) {
      const { lat, lng } = parsed;
      setCurrentLat(lat);
      setCurrentLng(lng);
      syncCoordInputs(lat, lng);
      setCurrentAccuracy(undefined);
      setCurrentTimestamp(new Date().toISOString());
      setCurrentPlaceId(undefined);

      updateMapPosition(lat, lng, undefined, true);
      setStatusFeedback(`Đã nhận diện tọa độ Google Maps: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setTimeout(() => setStatusFeedback(null), 4000);

      performReverseGeocode(lat, lng);
      setSearchQuery('');
      setShowDropdown(false);
    } else {
      alert('Không nhận diện được tọa độ từ nội dung đã nhập.\n\nĐịnh dạng hỗ trợ:\n- 21.028511, 105.854444\n- Dán link Google Maps (VD: https://maps.app.goo.gl/...)\n- Tọa độ độ-phút-giây (DMS)');
    }
  };

  // 4. Manual Numeric Input Apply
  const handleManualCoordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lat = parseFloat(rawLatInput.trim());
    const lng = parseFloat(rawLngInput.trim());

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Vĩ độ (Latitude) không hợp lệ (phải từ -90 đến 90).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Kinh độ (Longitude) không hợp lệ (phải từ -180 đến 180).');
      return;
    }

    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentAccuracy(undefined);
    setCurrentTimestamp(new Date().toISOString());

    updateMapPosition(lat, lng, undefined, true);
    setStatusFeedback(`Đã cập nhật tọa độ thủ công: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setTimeout(() => setStatusFeedback(null), 3000);

    performReverseGeocode(lat, lng);
  };

  // 5. Copy GPS Coordinates to Clipboard
  const handleCopyCoordinates = () => {
    const text = `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // 6. Search places (Integrated with Past Locations + Vietnam landmarks + Nominatim)
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check if query is actually a GPS coordinate or Google Maps link
    const maybeGps = parseGpsInput(query);
    if (maybeGps) {
      handleApplyPastedGps(query);
      return;
    }

    setIsSearching(true);
    const qLower = query.toLowerCase().trim();

    // 1. Search in Past Visited & Saved Locations
    const historyMatches: PlaceSuggestion[] = locationHistory
      .filter(
        (h) =>
          h.name.toLowerCase().includes(qLower) ||
          (h.customNickname && h.customNickname.toLowerCase().includes(qLower)) ||
          (h.address && h.address.toLowerCase().includes(qLower))
      )
      .map((h) => ({
        title: h.customNickname || h.name,
        subtitle: `Địa chỉ cũ của hai đứa • ${h.address || ''}`,
        lat: h.lat || 21.028514,
        lng: h.lng || 105.854212,
        placeId: h.id,
        isHistory: true,
        photoCount: h.photoCount,
        emoji: h.emoji || (h.isSaved ? '⭐' : '📍')
      }));

    // 2. Search Famous Vietnam date spots
    const localMatches: PlaceSuggestion[] = FAMOUS_DATE_SPOTS.filter(
      (s) =>
        s.title.toLowerCase().includes(qLower) ||
        s.aliases.some((a) => a.includes(qLower)) ||
        (s.province && s.province.toLowerCase().includes(qLower))
    ).map((s) => ({
      title: s.title,
      subtitle: s.province ? `Tỉnh/TP: ${s.province}` : 'Việt Nam',
      lat: s.lat,
      lng: s.lng,
      city: s.province,
      placeId: `spot_${s.title}`,
      emoji: '✨'
    }));

    // 3. Query Nominatim search API for Vietnam places
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ' Vietnam'
      )}&limit=6&addressdetails=1&accept-language=vi`
    )
      .then((res) => res.json())
      .then((data: any[]) => {
        const osmResults: PlaceSuggestion[] = (data || []).map((d) => ({
          title: d.name || d.display_name.split(',')[0],
          subtitle: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          city: d.address?.city || d.address?.state || d.address?.province,
          placeId: d.osm_id ? `osm_${d.osm_id}` : undefined,
          emoji: '📍'
        }));

        const combined: PlaceSuggestion[] = [...historyMatches, ...localMatches];
        osmResults.forEach((or) => {
          if (!combined.some((c) => Math.abs(c.lat - or.lat) < 0.0001 && Math.abs(c.lng - or.lng) < 0.0001)) {
            combined.push(or);
          }
        });

        setSearchResults(combined.slice(0, 10));
        setShowDropdown(combined.length > 0);
      })
      .catch(() => {
        const fallback = [...historyMatches, ...localMatches];
        setSearchResults(fallback);
        setShowDropdown(fallback.length > 0);
      })
      .finally(() => {
        setIsSearching(false);
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select place from search suggestions
  const handleSelectSearchResult = (item: PlaceSuggestion) => {
    setCurrentLat(item.lat);
    setCurrentLng(item.lng);
    syncCoordInputs(item.lat, item.lng);
    setCurrentAccuracy(undefined);
    setCurrentPlaceId(item.placeId);
    setCurrentTimestamp(new Date().toISOString());
    setLocationName(item.title);
    if (item.subtitle) setFormattedAddress(item.subtitle);
    if (item.city) setSelectedCity(item.city);

    updateMapPosition(item.lat, item.lng, undefined, true);
    setShowDropdown(false);
    setSearchQuery('');

    // Reverse geocode to confirm full address
    performReverseGeocode(item.lat, item.lng, item.title);
  };

  // Helper to remove all tile layers safely
  const clearMapTileLayers = (map: L.Map) => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    setLoadingMap(true);

    const initialLat = initialCoords?.lat ?? 21.028514;
    const initialLng = initialCoords?.lng ?? 105.854212;

    setCurrentLat(initialLat);
    setCurrentLng(initialLng);
    syncCoordInputs(initialLat, initialLng);
    if (initialCoords?.accuracy) setCurrentAccuracy(initialCoords.accuracy);
    if (initialCoords?.locationTimestamp) setCurrentTimestamp(initialCoords.locationTimestamp);
    if (initialCoords?.placeId) setCurrentPlaceId(initialCoords.placeId);
    if (initialLocationName) setLocationName(initialLocationName);
    if (initialAddress) setFormattedAddress(initialAddress);

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // CartoDB Voyager Light Tiles (crisp, modern light theme)
    clearMapTileLayers(map);
    const streetLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd' }
    );
    streetLayer.addTo(map);
    tileLayerRef.current = streetLayer;

    // Draggable Primary Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createPinIcon(),
      draggable: true,
      zIndexOffset: 1000
    }).addTo(map);
    markerInstanceRef.current = marker;

    // Handle drag end -> User manually adjusts pin
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentLat(pos.lat);
      setCurrentLng(pos.lng);
      syncCoordInputs(pos.lat, pos.lng);
      setCurrentAccuracy(undefined);
      setCurrentTimestamp(new Date().toISOString());
      performReverseGeocode(pos.lat, pos.lng);
    });

    // Handle click on map -> move pin to exact clicked coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentLat(lat);
      setCurrentLng(lng);
      syncCoordInputs(lat, lng);
      setCurrentAccuracy(undefined);
      setCurrentTimestamp(new Date().toISOString());
      performReverseGeocode(lat, lng);
    });

    // Render past location markers on the map
    renderHistoryMarkersOnMap();

    // Invalidate map size multiple times to ensure full container rendering without slice issues
    const timer1 = setTimeout(() => {
      map.invalidateSize();
      setLoadingMap(false);
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 350);

    // If initial address exists but no initial coords, attempt one-time reverse geocode or past match
    if (!initialCoords?.lat && (initialAddress || initialLocationName)) {
      performReverseGeocode(initialLat, initialLng);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update history markers whenever locationHistory changes
  useEffect(() => {
    if (mapInstanceRef.current && !loadingMap) {
      renderHistoryMarkersOnMap();
    }
  }, [locationHistory, loadingMap, renderHistoryMarkersOnMap]);

  // Switch Map Theme (Light Streets vs Satellite)
  const toggleMapTheme = () => {
    if (!mapInstanceRef.current) return;
    const next = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(next);

    clearMapTileLayers(mapInstanceRef.current);

    if (next === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      satLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      );
      streetLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = streetLayer;
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  };

  // Submit and Confirm Location
  const handleConfirmLocation = () => {
    if (!currentLat || !currentLng) {
      alert('Vui lòng chọn hoặc định vị một điểm trên bản đồ.');
      return;
    }

    const finalName = locationName.trim() || `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;
    const finalAddress = formattedAddress.trim() || formatCoordinates(currentLat, currentLng);

    onSelectLocation({
      lat: currentLat,
      lng: currentLng,
      accuracy: currentAccuracy,
      locationTimestamp: currentTimestamp,
      placeId: currentPlaceId,
      locationName: finalName,
      address: finalAddress,
      city: selectedCity
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-50 flex flex-col overflow-hidden animate-fadeIn select-none font-sans">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-15 px-3 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between z-30 shrink-0 shadow-2xs">
        
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition cursor-pointer font-bold text-xs border border-slate-200/70"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[180px] sm:max-w-md">
                  {title}
                </h1>
                <span className="hidden md:inline-flex text-[10px] bg-rose-50 text-rose-600 border border-rose-200/80 px-2 py-0.2 rounded-full font-bold">
                  GPS Chuẩn
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition cursor-pointer hidden sm:block"
          >
            Hủy
          </button>
          
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="px-4 sm:px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Xác nhận vị trí này</span>
          </button>
        </div>
      </header>

      {/* 2. SMART SEARCH & ACTION RIBBON */}
      <div className="px-3 sm:px-6 py-2.5 bg-white border-b border-slate-200/90 z-20 shrink-0 space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-2 items-stretch">
          
          {/* Smart unified search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (parseGpsInput(searchQuery)) {
                    handleApplyPastedGps(searchQuery);
                  } else {
                    handleSearch(searchQuery);
                  }
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (text && parseGpsInput(text)) {
                  setTimeout(() => handleApplyPastedGps(text), 50);
                }
              }}
              placeholder="Tìm địa điểm, quán cafe, địa chỉ cũ hoặc dán link Google Maps / tọa độ GPS..."
              className="w-full pl-10 pr-20 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 transition shadow-2xs"
            />

            {isSearching && (
              <Loader2 className="w-4 h-4 text-rose-500 animate-spin absolute right-12 top-1/2 -translate-y-1/2" />
            )}

            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowDropdown(false);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Paste Button quick action */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setSearchQuery(text);
                    if (parseGpsInput(text)) {
                      handleApplyPastedGps(text);
                    } else {
                      handleSearch(text);
                    }
                  }
                } catch {
                  // Ignore clipboard permission errors
                }
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Dán từ Clipboard"
            >
              <ClipboardPaste className="w-3 h-3 text-rose-500" />
              <span className="hidden sm:inline">Dán</span>
            </button>

            {/* Autocomplete Suggestions Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 bg-slate-50/90 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Gợi ý địa điểm & Tọa độ chính xác</span>
                  <span>{searchResults.length} kết quả</span>
                </div>
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50/70 border-b border-slate-100 last:border-0 transition flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className="text-base shrink-0 mt-0.5">{item.emoji || '📍'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 truncate">{item.title}</span>
                        {item.isHistory && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded-full">
                            Góc quen
                          </span>
                        )}
                        {item.photoCount && item.photoCount > 0 ? (
                          <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-full">
                            📸 {item.photoCount} ảnh
                          </span>
                        ) : null}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.subtitle}</div>
                      )}
                      <div className="text-[10px] text-rose-500/90 font-mono mt-0.5">
                        {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Device GPS + History Drawer + Map Layer Switch */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            
            {/* GPS Device Pinpoint Button */}
            <button
              type="button"
              onClick={handleCaptureDeviceGPS}
              disabled={isLocatingGPS}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs shrink-0"
              title="Lấy tọa độ GPS thiết bị với độ chính xác cao"
            >
              {isLocatingGPS ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  <span className="text-rose-600">Đang dò GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5 text-rose-600" />
                  <span>GPS Thiết bị</span>
                </>
              )}
            </button>

            {/* Toggle History & Saved Places Drawer */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-2xs shrink-0 ${
                showHistoryDrawer
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title="Xem và chọn nhanh từ danh sách các địa chỉ cũ & góc quen đã lưu"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Địa chỉ cũ</span>
              {locationHistory.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  showHistoryDrawer ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {locationHistory.length}
                </span>
              )}
            </button>

            {/* Satellite / Street Map Switch */}
            <button
              type="button"
              onClick={toggleMapTheme}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Chuyển chế độ xem Bản đồ đường phố / Vệ tinh"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>{mapType === 'streets' ? 'Vệ tinh' : 'Bản đồ'}</span>
            </button>

          </div>
        </div>

        {/* 3. QUICK-PIN CHIPS CAROUSEL (Góc quen & Địa điểm cũ) */}
        {quickHistoryChips.length > 0 && (
          <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1 pr-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Góc quen:</span>
            </span>

            {quickHistoryChips.map((place) => {
              const isSelected =
                Math.abs(currentLat - (place.lat || 0)) < 0.0001 &&
                Math.abs(currentLng - (place.lng || 0)) < 0.0001;
              const displayName = place.customNickname || place.name;

              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectHistoryLocation(place)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500 text-white border-rose-600 shadow-2xs scale-102'
                      : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200/90'
                  }`}
                  title={place.address || displayName}
                >
                  <span className="text-xs">{place.emoji || (place.isSaved ? '⭐' : '📍')}</span>
                  <span className="max-w-[130px] truncate">{displayName}</span>
                  {place.photoCount > 0 && (
                    <span className={`text-[10px] px-1 py-0.1 rounded font-normal ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}>
                      {place.photoCount} ảnh
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-2 py-1 shrink-0 flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>Xem tất cả ({locationHistory.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Live Status Toast */}
        {statusFeedback && (
          <div className="max-w-7xl mx-auto text-xs text-rose-700 bg-rose-50 border border-rose-200/90 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="font-semibold">{statusFeedback}</span>
          </div>
        )}
      </div>

      {/* 4. MAIN MAP STAGE WITH OPTIONAL HISTORY DRAWER */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-slate-100 overflow-hidden" style={{ isolation: 'isolate' }}>
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {loadingMap && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-600">Đang tải bản đồ GPS...</span>
          </div>
        )}

        {/* Floating live GPS coordinate badge in top left */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-md flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="font-mono text-xs font-bold text-slate-800">
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </div>
          {currentAccuracy && (
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-1.5 py-0.2 rounded-md">
              ±{currentAccuracy}m
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyCoordinates}
            className="text-[10px] text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer font-semibold"
          >
            {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCoords ? 'Đã chép' : 'Chép'}</span>
          </button>
        </div>

        {/* Floating guidance at bottom center */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200/80 shadow-md text-[11px] text-slate-700 font-semibold flex items-center gap-1.5 max-w-[90vw] truncate pointer-events-none">
          <Compass className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Kéo thả ghim đỏ hoặc nhấp vào bản đồ / chấm kỷ niệm để chọn vị trí</span>
        </div>

        {/* 5. SLIDE-OVER HISTORY PLACES DRAWER */}
        {showHistoryDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white/98 backdrop-blur-md border-l border-slate-200/90 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Địa chỉ cũ & Góc thân quen</h3>
                  <p className="text-[10px] text-slate-400">Chọn 1 chạm để ghim lại vị trí từng ghé</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsSavedPlacesModalOpen(true)}
                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                  title="Quản lý & Lưu địa điểm mới"
                >
                  <Star className="w-3 h-3 fill-rose-500 text-rose-500" />
                  <span>+ Lưu mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search in Drawer */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200/70 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  placeholder="Tìm trong các địa chỉ cũ..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'saved', label: '⭐ Đã lưu' },
                  { id: 'top_photos', label: '📸 Nhiều ảnh' },
                  { id: 'recent', label: '🕒 Gần đây' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                      historyFilter === tab.id
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of History Places */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 divide-y divide-slate-100">
              {filteredHistoryPlaces.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      {historyFilter === 'saved'
                        ? 'Chưa có địa chỉ nào được gắn sao'
                        : historyFilter === 'top_photos'
                          ? 'Chưa có địa điểm nào có ảnh'
                          : historySearchTerm
                            ? `Không tìm thấy "${historySearchTerm}"`
                            : 'Chưa có địa chỉ cũ nào'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {historyFilter === 'saved'
                        ? 'Bạn có thể lưu các địa điểm thân quen để chọn nhanh bất cứ lúc nào.'
                        : 'Mọi địa điểm từ nhật ký và danh sách đã lưu sẽ tự động xuất hiện ở đây.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {historyFilter !== 'all' || historySearchTerm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryFilter('all');
                          setHistorySearchTerm('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Xem tất cả
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsSavedPlacesModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span>+ Lưu góc quen mới</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredHistoryPlaces.map((place) => {
                  const isCurrent =
                    Math.abs(currentLat - (place.lat || 0)) < 0.0001 &&
                    Math.abs(currentLng - (place.lng || 0)) < 0.0001;

                  return (
                    <div
                      key={place.id}
                      className={`pt-2 p-2.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                        isCurrent
                          ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{place.emoji || (place.isSaved ? '⭐' : '📍')}</span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {place.customNickname || place.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{place.address || 'Chưa có địa chỉ'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectHistoryLocation(place)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-700'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{isCurrent ? 'Đang ghim' : 'Ghim'}</span>
                        </button>
                      </div>

                      {/* Meta stats */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold pt-0.5">
                        {place.photoCount > 0 && (
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            📸 {place.photoCount} ảnh
                          </span>
                        )}
                        {place.entryCount > 0 && (
                          <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                            📝 {place.entryCount} bài viết
                          </span>
                        )}
                        {place.lastVisited && (
                          <span className="truncate">
                            🕒 {new Date(place.lastVisited).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* 6. BOTTOM CONTROL & METADATA BAR */}
      <footer className="p-3 sm:p-4 bg-white border-t border-slate-200/90 z-30 shrink-0 shadow-lg space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Location Name & Address Summary Card */}
          <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Nhập hoặc chỉnh sửa tên địa điểm..."
                  className="font-bold text-xs sm:text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-400 focus:outline-none w-full"
                />
              </div>
              <p className="text-[11px] text-slate-500 truncate pl-6" title={formattedAddress}>
                {isReverseGeocoding ? (
                  <span className="text-rose-500 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang cập nhật địa chỉ...
                  </span>
                ) : (
                  formattedAddress || 'Kéo thả ghim đỏ để chọn vị trí chính xác...'
                )}
              </p>
            </div>

            {/* Quick Actions for Selected Pin */}
            <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
              <button
                type="button"
                onClick={() => setIsSavedPlacesModalOpen(true)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Lưu vị trí này vào danh sách Góc quen & Địa điểm đã lưu"
              >
                <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Lưu / Đặt tên riêng</span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualCoords(!showManualCoords)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Chỉnh sửa chi tiết vĩ độ & kinh độ"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Tọa độ số</span>
                {showManualCoords ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Confirm & Save Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận ghim vị trí này</span>
            </button>
          </div>

        </div>

        {/* Collapsible Manual Raw Coordinates Editor */}
        {showManualCoords && (
          <div className="max-w-7xl mx-auto p-3 bg-slate-50/95 border border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-2">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                <span>Chỉnh sửa tọa độ số GPS thủ công:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatCoordinates(currentLat, currentLng)}
              </span>
            </div>

            <form onSubmit={handleManualCoordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Vĩ độ (Latitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={rawLatInput}
                  onChange={(e) => setRawLatInput(e.target.value)}
                  onBlur={handleManualCoordSubmit}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
                  placeholder="21.028511"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kinh độ (Longitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={rawLngInput}
                  onChange={(e) => setRawLngInput(e.target.value)}
                  onBlur={handleManualCoordSubmit}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
                  placeholder="105.854444"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleManualCoordSubmit()}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  Cập nhật tọa độ
                </button>
              </div>
            </form>
          </div>
        )}
      </footer>

      {/* Saved Locations Modal */}
      {isSavedPlacesModalOpen && (
        <SavedLocationSelectorModal
          isOpen={isSavedPlacesModalOpen}
          onClose={() => setIsSavedPlacesModalOpen(false)}
          onSelectLocation={handleSelectHistoryLocation}
          journals={journals}
          savedPlaces={savedPlaces}
          coupleId={coupleId}
          userProfile={userProfile}
          currentDraftLocation={{
            name: locationName,
            address: formattedAddress,
            lat: currentLat,
            lng: currentLng,
            accuracy: currentAccuracy,
            placeId: currentPlaceId
          }}
        />
      )}

    </div>
  );
};


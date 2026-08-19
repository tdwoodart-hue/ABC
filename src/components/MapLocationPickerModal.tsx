import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  Info,
  Copy,
  ClipboardPaste,
  ArrowRight,
  ArrowLeft,
  Share2,
  ExternalLink
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
}

interface PlaceSuggestion {
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
  city?: string;
  placeId?: string;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords,
  initialLocationName = '',
  initialAddress = '',
  title = 'Ghim Vị Trí & Tọa Độ GPS',
  subtitle = 'Tọa độ GPS thiết bị là nguồn dữ liệu chuẩn xác duy nhất.'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // High-accuracy GPS state
  const [currentLat, setCurrentLat] = useState<number>(() => initialCoords?.lat ?? 21.028514);
  const [currentLng, setCurrentLng] = useState<number>(() => initialCoords?.lng ?? 105.854212);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | undefined>(initialCoords?.accuracy);
  const [currentTimestamp, setCurrentTimestamp] = useState<string>(
    initialCoords?.locationTimestamp || new Date().toISOString()
  );
  const [currentPlaceId, setCurrentPlaceId] = useState<string | undefined>(initialCoords?.placeId);

  // Manual inputs for raw Lat / Lng strings
  const [rawLatInput, setRawLatInput] = useState<string>(() => (initialCoords?.lat ?? 21.028514).toString());
  const [rawLngInput, setRawLngInput] = useState<string>(() => (initialCoords?.lng ?? 105.854212).toString());

  // Quick Google Maps / GPS coordinates paste bar input
  const [pastedInput, setPastedInput] = useState<string>('');

  // Address and place name derived strictly from reverse geocoding or user selection
  const [locationName, setLocationName] = useState<string>(initialLocationName || '');
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress || '');
  const [selectedCity, setSelectedCity] = useState<string>('');

  const [loadingMap, setLoadingMap] = useState(true);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Keep manual raw inputs synced when coords change via map/GPS
  const syncCoordInputs = (lat: number, lng: number) => {
    setRawLatInput(lat.toFixed(6));
    setRawLngInput(lng.toFixed(6));
  };

  // Custom heart pin marker
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 44px; height: 52px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 14px rgba(225, 29, 72, 0.45)); cursor: grab;">
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

  // Perform reverse geocoding on current coords (strictly converts lat/lng to readable address)
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

  // 1. Device High-Accuracy GPS Trigger (enableHighAccuracy: true, maximumAge: 0)
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

  // 2. Direct GPS / Google Maps Paste Handler
  const handleApplyPastedGps = (textToParse?: string) => {
    const raw = textToParse || pastedInput;
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
      setPastedInput('');
    } else {
      alert('Không nhận diện được tọa độ từ nội dung đã nhập.\n\nĐịnh dạng hỗ trợ:\n- 21.028511, 105.854444\n- Dán link Google Maps (VD: https://maps.app.goo.gl/...)\n- Tọa độ độ-phút-giây (DMS)');
    }
  };

  // 3. Manual Numeric Input Apply
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

  // 4. Copy GPS Coordinates to Clipboard
  const handleCopyCoordinates = () => {
    const text = `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // Search places & landmarks (with OSM / Google / VN landmarks)
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
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    const qLower = query.toLowerCase().trim();

    // 1. Instant local landmark recommendations
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
      placeId: `spot_${s.title}`
    }));

    // 2. Query Nominatim search API for Vietnam places
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
          placeId: d.osm_id ? `osm_${d.osm_id}` : undefined
        }));

        const combined: PlaceSuggestion[] = [...localMatches];
        osmResults.forEach((or) => {
          if (!combined.some((c) => Math.abs(c.lat - or.lat) < 0.0001 && Math.abs(c.lng - or.lng) < 0.0001)) {
            combined.push(or);
          }
        });

        setSearchResults(combined.slice(0, 8));
        setShowDropdown(combined.length > 0);
      })
      .catch(() => {
        setSearchResults(localMatches);
        setShowDropdown(localMatches.length > 0);
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
    }, 350);
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
    setSearchQuery(item.title);

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

    // Initialize Satellite Layer by default
    clearMapTileLayers(map);
    const initialTileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    initialTileLayer.addTo(map);
    tileLayerRef.current = initialTileLayer;

    // Draggable Marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createPinIcon(),
      draggable: true
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

    // Invalidate map size multiple times to ensure full container rendering without slice issues
    const timer1 = setTimeout(() => {
      map.invalidateSize();
      setLoadingMap(false);
    }, 100);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    // If initial address exists but no initial coords, attempt one-time reverse geocode
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

  // Switch Map Theme (Light Streets vs Satellite)
  const toggleMapTheme = () => {
    if (!mapInstanceRef.current) return;
    const next = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(next);

    // Clear all existing tile layers completely first
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
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-white flex flex-col overflow-hidden animate-fadeIn select-none">
      
      {/* 1. TOP FULL-PAGE HEADER BAR */}
      <header className="h-16 px-3 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between z-30 shrink-0 shadow-2xs">
        
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition cursor-pointer font-bold text-xs sm:text-sm border border-slate-200/60"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Quay lại</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                  {title}
                </h1>
                <span className="hidden md:inline-flex text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  GPS Source of Truth
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs transition cursor-pointer hidden sm:block"
          >
            Hủy bỏ
          </button>
          
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="px-4 sm:px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Xác nhận vị trí này</span>
          </button>
        </div>
      </header>

      {/* 2. CONTROL RIBBON: Google Maps Paste, GPS Device, Search Bar */}
      <div className="p-2.5 sm:p-3 bg-slate-50/95 border-b border-slate-200/90 z-20 shrink-0 space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-2 items-stretch">
          
          {/* Row 1: Direct Google Maps / GPS Coordinate Input */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <ClipboardPaste className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pastedInput}
                onChange={(e) => setPastedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyPastedGps();
                  }
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text) {
                    setTimeout(() => handleApplyPastedGps(text), 50);
                  }
                }}
                placeholder="Dán tọa độ hoặc link Google Maps (VD: 21.028511, 105.854444 hoặc link Maps)..."
                className="w-full pl-9 pr-24 py-2 bg-white border border-rose-200/90 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => handleApplyPastedGps()}
                disabled={!pastedInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>Áp dụng</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Real Device GPS Button */}
            <button
              type="button"
              onClick={handleCaptureDeviceGPS}
              disabled={isLocatingGPS}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isLocatingGPS ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Đang lấy GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4" />
                  <span>Lấy GPS thiết bị</span>
                </>
              )}
            </button>
          </div>

          {/* Row 2: Search by Place Name + Layer toggle */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Tìm theo tên quán cafe, địa điểm, đường phố..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-rose-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete Suggestions Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Gợi ý địa điểm & Tọa độ chính xác
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50/70 border-b border-slate-100 last:border-0 transition flex items-start gap-2.5 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">{item.subtitle}</div>
                        )}
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                          {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Satellite / Street view switch */}
            <button
              type="button"
              onClick={toggleMapTheme}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            >
              <Layers className="w-4 h-4 text-rose-500" />
              <span>{mapType === 'streets' ? 'Vệ tinh' : 'Bản đồ'}</span>
            </button>
          </div>

        </div>

        {statusFeedback && (
          <div className="max-w-7xl mx-auto text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
        )}
      </div>

      {/* 3. MAIN FULL-SCREEN MAP CANVAS */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-slate-100 overflow-hidden" style={{ isolation: 'isolate' }}>
        
        {/* Leaflet container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {loadingMap && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <span className="text-xs font-medium text-slate-600">Đang tải bản đồ GPS...</span>
          </div>
        )}

        {/* Floating live GPS coordinate badge in top left */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-lg flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="font-mono text-xs font-bold text-slate-800">
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </div>
          {currentAccuracy && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-1.5 py-0.2 rounded-md">
              ±{currentAccuracy}m
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyCoordinates}
            className="text-[10px] text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer"
          >
            {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCoords ? 'Đã chép' : 'Chép'}</span>
          </button>
        </div>

        {/* Floating guidance at bottom center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200/80 shadow-lg text-xs text-slate-700 font-semibold flex items-center gap-2 max-w-[90vw] truncate">
          <Compass className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Kéo thả ghim đỏ hoặc nhấp vào bất kỳ đâu trên bản đồ để chọn tọa độ</span>
        </div>
      </div>

      {/* 4. BOTTOM METADATA & MANUAL NUMERIC EDIT DRAWER */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200/90 z-30 shrink-0 shadow-lg">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          
          {/* Box 1: Direct Lat / Lng Manual Input Fields */}
          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-rose-500" />
                <span>Chỉnh sửa tọa độ số GPS:</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatCoordinates(currentLat, currentLng)}
              </span>
            </div>

            <form onSubmit={handleManualCoordSubmit} className="grid grid-cols-2 gap-2">
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
            </form>
          </div>

          {/* Box 2: Place Name & Reverse Geocoded Address */}
          <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Tên địa điểm & Địa chỉ:</span>
              </span>
              {isReverseGeocoding && (
                <span className="text-[10px] text-rose-500 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang dịch địa chỉ...
                </span>
              )}
            </div>

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Nhập tên địa điểm (VD: Hồ Hoàn Kiếm, Cafe Giảng, Bà Nà Hills...)"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
            />
            
            <div className="text-[11px] text-slate-500 line-clamp-1 truncate" title={formattedAddress}>
              {formattedAddress || 'Đang xác định địa chỉ tương ứng với tọa độ GPS...'}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

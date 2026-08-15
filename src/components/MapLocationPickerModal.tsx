import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Loader2, ExternalLink, Layers, Sparkles } from 'lucide-react';
import L from 'leaflet';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: { address: string; city: string; fullPlaceName?: string }) => void;
  initialAddress?: string;
  title?: string;
}

interface PlaceSuggestion {
  title: string;
  subtitle?: string;
  lat: number;
  lng: number;
  city?: string;
}

// Popular Vietnamese landmarks & provinces for instant search recommendation
const POPULAR_VN_LANDMARKS: PlaceSuggestion[] = [
  { title: 'Khu di tích danh thắng Yên Tử', subtitle: 'Thành phố Uông Bí, Quảng Ninh', lat: 21.1578, lng: 106.7196, city: 'Quảng Ninh' },
  { title: 'Hồ Hoàn Kiếm (Hồ Gươm)', subtitle: 'Quận Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542, city: 'Hà Nội' },
  { title: 'Hồ Tây', subtitle: 'Quận Tây Hồ, Hà Nội', lat: 21.0583, lng: 105.8236, city: 'Hà Nội' },
  { title: 'Chợ Bến Thành', subtitle: 'Quận 1, TP. Hồ Chí Minh', lat: 10.7726, lng: 106.6980, city: 'Hồ Chí Minh' },
  { title: 'Tòa nhà Landmark 81', subtitle: 'Quận Bình Thạnh, TP. Hồ Chí Minh', lat: 10.7951, lng: 106.7219, city: 'Hồ Chí Minh' },
  { title: 'Phố cổ Hội An', subtitle: 'Thành phố Hội An, Quảng Nam', lat: 15.8801, lng: 108.3380, city: 'Quảng Nam' },
  { title: 'Đỉnh Fansipan (Nóc nhà Đông Dương)', subtitle: 'Sa Pa, Lào Cai', lat: 22.3033, lng: 103.7753, city: 'Lào Cai' },
  { title: 'Vịnh Hạ Long', subtitle: 'Thành phố Hạ Long, Quảng Ninh', lat: 20.9101, lng: 107.1839, city: 'Quảng Ninh' },
  { title: 'Quần thể danh thắng Tràng An', subtitle: 'Hoa Lư, Ninh Bình', lat: 20.2506, lng: 105.9144, city: 'Ninh Bình' },
  { title: 'Thung Lũng Tình Yêu', subtitle: 'Thành phố Đà Lạt, Lâm Đồng', lat: 11.9796, lng: 108.4507, city: 'Lâm Đồng' },
  { title: 'Hồ Xuân Hương', subtitle: 'Thành phố Đà Lạt, Lâm Đồng', lat: 11.9404, lng: 108.4452, city: 'Lâm Đồng' },
  { title: 'Bà Nà Hills (Cầu Vàng)', subtitle: 'Hòa Vang, Đà Nẵng', lat: 15.9989, lng: 107.9961, city: 'Đà Nẵng' },
  { title: 'Bãi biển Mỹ Khê', subtitle: 'Quận Sơn Trà, Đà Nẵng', lat: 16.0601, lng: 108.2468, city: 'Đà Nẵng' },
  { title: 'Đại Nội Huế (Cố Đô Huế)', subtitle: 'Thành phố Huế, Thừa Thiên Huế', lat: 16.4699, lng: 107.5796, city: 'Thừa Thiên Huế' },
  { title: 'Chùa Hương (Hương Sơn)', subtitle: 'Huyện Mỹ Đức, Hà Nội', lat: 20.6186, lng: 105.8078, city: 'Hà Nội' },
  { title: 'Vườn quốc gia Ba Vì', subtitle: 'Ba Vì, Hà Nội', lat: 21.0827, lng: 105.3619, city: 'Hà Nội' },
  { title: 'Khu du lịch Tam Đảo', subtitle: 'Tam Đảo, Vĩnh Phúc', lat: 21.4589, lng: 105.6469, city: 'Vĩnh Phúc' },
  { title: 'Bán đảo Sơn Trà', subtitle: 'Sơn Trà, Đà Nẵng', lat: 16.1189, lng: 108.2736, city: 'Đà Nẵng' },
  { title: 'Đảo Ngọc Phú Quốc', subtitle: 'Thành phố Phú Quốc, Kiên Giang', lat: 10.2899, lng: 103.9840, city: 'Kiên Giang' },
  { title: 'Đồi cát bay Mũi Né', subtitle: 'Phan Thiết, Bình Thuận', lat: 10.9422, lng: 108.2872, city: 'Bình Thuận' }
];

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  title = 'Chọn địa điểm kỷ niệm'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 21.0285, lng: 105.8542 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Custom heart pin icon
  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 38px; height: 46px; display: flex; align-items: center; justify-content: center;">
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(225, 29, 72, 0.45), 0 2px 4px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid white;
          ">
            <svg style="transform: rotate(45deg); width: 18px; height: 18px; fill: white; color: white;" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div style="
            position: absolute;
            bottom: 0px;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 3px;
            background: rgba(0,0,0,0.25);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [38, 46],
      iconAnchor: [19, 46],
      popupAnchor: [0, -42]
    });
  };

  // Reverse Geocoding with OpenStreetMap Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
    setCurrentCoords({ lat, lng });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi`
      );
      if (response.ok) {
        const data = await response.json();
        const display = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedAddress(display);
        setSearchQuery(display);

        const addr = data.address || {};
        const city = addr.city || addr.town || addr.state || addr.province || '';
        setSelectedCity(city);
      } else {
        const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setSelectedAddress(coords);
        setSearchQuery(coords);
      }
    } catch {
      const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSelectedAddress(coords);
      setSearchQuery(coords);
    }
  };

  // Perform Search
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const qLower = query.toLowerCase().trim();

    // 1. Check local rich VN landmarks catalog
    const localMatches = POPULAR_VN_LANDMARKS.filter(
      (l) =>
        l.title.toLowerCase().includes(qLower) ||
        (l.subtitle && l.subtitle.toLowerCase().includes(qLower)) ||
        (l.city && l.city.toLowerCase().includes(qLower))
    );

    // 2. Fetch online search for Vietnam places
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ' Vietnam'
      )}&limit=6&addressdetails=1&accept-language=vi`
    )
      .then((res) => res.json())
      .then((data: any[]) => {
        const osmResults: PlaceSuggestion[] = (data || []).map((d) => ({
          title: d.display_name.split(',')[0],
          subtitle: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          city: d.address?.city || d.address?.state || d.address?.province
        }));

        const combined = [...localMatches];
        osmResults.forEach((or) => {
          if (!combined.some((c) => c.title.toLowerCase() === or.title.toLowerCase())) {
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
        performSearch(searchQuery);
      } else if (searchQuery.trim().length === 0) {
        setSearchResults(POPULAR_VN_LANDMARKS.slice(0, 6));
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    setLoading(true);
    setSelectedAddress(initialAddress);
    setSearchQuery(initialAddress);

    let defaultLat = 21.0285; // Hanoi
    let defaultLng = 105.8542;

    // Check if initialAddress matches known landmark
    const match = POPULAR_VN_LANDMARKS.find(
      (l) => l.title.toLowerCase().includes(initialAddress.toLowerCase()) || initialAddress.toLowerCase().includes(l.title.toLowerCase())
    );
    if (match) {
      defaultLat = match.lat;
      defaultLng = match.lng;
    }

    setCurrentCoords({ lat: defaultLat, lng: defaultLng });

    // Clean up previous instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Tile Layer: Standard OpenStreetMap / CartoDB
    const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    });

    streetLayer.addTo(map);
    tileLayerRef.current = streetLayer;

    // Draggable Custom Marker
    const marker = L.marker([defaultLat, defaultLng], {
      icon: createCustomIcon(),
      draggable: true
    }).addTo(map);

    markerInstanceRef.current = marker;

    // Click on map to place marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      reverseGeocode(lat, lng);
    });

    // Drag marker
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });

    // Force map to recalculate container size
    setTimeout(() => {
      map.invalidateSize();
      setLoading(false);
    }, 200);

    // If initial address exists, search for it
    if (initialAddress.trim() && !match) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          initialAddress + ' Vietnam'
        )}&limit=1&accept-language=vi`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
            setCurrentCoords({ lat, lng });
          }
        })
        .catch(() => {});
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Switch Map Type (Streets vs Satellite)
  const toggleMapType = () => {
    if (!mapInstanceRef.current) return;
    const next = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(next);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

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
  };

  // Handle selecting search result
  const handleSelectSearchResult = (result: PlaceSuggestion) => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([result.lat, result.lng], 16);
      markerInstanceRef.current.setLatLng([result.lat, result.lng]);
      setCurrentCoords({ lat: result.lat, lng: result.lng });
    }

    const fullAddr = result.subtitle ? `${result.title}, ${result.subtitle}` : result.title;
    setSelectedAddress(fullAddr);
    setSearchQuery(result.title);
    if (result.city) {
      setSelectedCity(result.city);
    }
    setShowDropdown(false);
  };

  // GPS Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
      },
      (err) => {
        setIsLocatingUser(false);
        alert('Không thể lấy tọa độ GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedAddress.trim()) {
      alert('Vui lòng chọn hoặc nhập vị trí trên bản đồ.');
      return;
    }
    onSelectLocation({
      address: selectedAddress,
      city: selectedCity,
      fullPlaceName: selectedAddress
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-2xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                {title}
                <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  Bản đồ trực tuyến
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Tìm kiếm địa danh Việt Nam (Yên Tử, Đà Lạt, Hồ Tây...) hoặc kéo thả ghim
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar with Autocomplete */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0 relative z-30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Nhập tên địa danh (VD: Yên Tử, Hồ Gươm, Đà Lạt, Hội An...)"
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Autocomplete Dropdown List */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Gợi ý địa điểm nổi tiếng Việt Nam</span>
                  </div>
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50/70 border-b border-slate-100 last:border-0 flex items-start gap-2.5 transition cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {item.city && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium shrink-0">
                          {item.city}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Locate Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingUser}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
              title="Lấy vị trí GPS hiện tại"
            >
              {isLocatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <Navigation className="w-4 h-4 text-rose-500" />
              )}
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </div>

          {/* Quick Filter Tag Buttons for popular landmarks */}
          <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pt-1 pb-0.5 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Gợi ý nhanh:</span>
            {POPULAR_VN_LANDMARKS.slice(0, 6).map((lm, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(lm)}
                className="text-[11px] px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 border border-slate-200/80 rounded-full text-slate-600 font-medium whitespace-nowrap transition cursor-pointer shadow-2xs shrink-0"
              >
                {lm.title.replace('Khu di tích danh thắng ', '').replace(' (Hồ Gươm)', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map Area */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[380px] bg-slate-100 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {loading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
              <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
              <p className="text-xs font-semibold text-slate-600">Đang tải bản đồ...</p>
            </div>
          )}

          {/* Map Layer Switcher Floating Button */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleMapType}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-rose-500" />
              <span>{mapType === 'streets' ? 'Xem vệ tinh' : 'Xem bản đồ'}</span>
            </button>
          </div>

          {/* Hint Overlay */}
          <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-xs text-white text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 pointer-events-none">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Chạm bản đồ hoặc kéo ghim để định vị chính xác</span>
          </div>
        </div>

        {/* Selected Location Details & Action Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
          <div className="flex items-start gap-2.5 p-2.5 bg-rose-50/50 rounded-2xl border border-rose-100">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {selectedAddress || 'Chưa chọn vị trí'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Tọa độ: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-600 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  Mở trên Google Maps
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-rose-500/25 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận vị trí này</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

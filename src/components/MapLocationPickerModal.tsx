import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Loader2, ExternalLink, Layers } from 'lucide-react';

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
  title = 'Chọn địa điểm trên Google Maps'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const googleMapRef = useRef<any>(null);
  const googleMarkerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';

  // Reverse geocode lat/lng
  const reverseGeocode = (lat: number, lng: number) => {
    if (geocoderRef.current) {
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const formatted = results[0].formatted_address;
            setSelectedAddress(formatted);
            setSearchQuery(formatted);

            // Extract city / province from address_components
            let city = '';
            for (const component of results[0].address_components || []) {
              if (
                component.types.includes('administrative_area_level_1') ||
                component.types.includes('locality')
              ) {
                city = component.long_name;
                break;
              }
            }
            setSelectedCity(city);
          } else {
            fallbackNominatim(lat, lng);
          }
        }
      );
    } else {
      fallbackNominatim(lat, lng);
    }
  };

  const fallbackNominatim = async (lat: number, lng: number) => {
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
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  // Perform search on query change
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

    // 2. Query Google Places Service or Geocoder if available
    if (placesServiceRef.current && (window as any).google?.maps?.places) {
      placesServiceRef.current.textSearch(
        { query: `${query}, Vietnam` },
        (results: any, status: any) => {
          setIsSearching(false);
          if (status === 'OK' && results && results.length > 0) {
            const googleResults: PlaceSuggestion[] = results.slice(0, 6).map((r: any) => ({
              title: r.name,
              subtitle: r.formatted_address,
              lat: r.geometry.location.lat(),
              lng: r.geometry.location.lng()
            }));

            // Merge local and Google results uniquely
            const combined = [...localMatches];
            googleResults.forEach((gr) => {
              if (!combined.some((c) => c.title.toLowerCase() === gr.title.toLowerCase())) {
                combined.push(gr);
              }
            });
            setSearchResults(combined.slice(0, 8));
            setShowDropdown(combined.length > 0);
          } else {
            setSearchResults(localMatches);
            setShowDropdown(localMatches.length > 0);
          }
        }
      );
      return;
    }

    // 3. Fallback online query with Vietnam preference
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
          city: d.address?.city || d.address?.state
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

  // Load Google Maps API
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSelectedAddress(initialAddress);
    setSearchQuery(initialAddress);

    const defaultLat = 21.0285; // Hanoi
    const defaultLng = 105.8542;

    const initMap = () => {
      if (!mapContainerRef.current || !(window as any).google?.maps) return;

      const google = (window as any).google;
      const mapOptions = {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 13,
        mapTypeId: mapType === 'satellite' ? google.maps.MapTypeId.HYBRID : google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      };

      const map = new google.maps.Map(mapContainerRef.current, mapOptions);
      googleMapRef.current = map;

      const marker = new google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: 'Vị trí đã chọn'
      });
      googleMarkerRef.current = marker;

      geocoderRef.current = new google.maps.Geocoder();
      placesServiceRef.current = new google.maps.places.PlacesService(map);

      // Click on map to place pin
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Drag marker
      marker.addListener('dragend', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        reverseGeocode(lat, lng);
      });

      setLoading(false);

      // If initial address exists, search and move to it
      if (initialAddress.trim()) {
        performSearch(initialAddress);
        geocoderRef.current.geocode(
          { address: `${initialAddress}, Vietnam` },
          (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const loc = results[0].geometry.location;
              map.setCenter(loc);
              map.setZoom(15);
              marker.setPosition(loc);
              setSelectedAddress(results[0].formatted_address);
              setSearchQuery(results[0].formatted_address);
            }
          }
        );
      }
    };

    // Load Google Maps API via script tag
    if ((window as any).google?.maps) {
      initMap();
    } else {
      const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
      if (existingScript) {
        if ((window as any).google?.maps) {
          initMap();
        } else {
          existingScript.addEventListener('load', () => initMap());
        }
      } else {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.onload = () => {
          initMap();
        };
        script.onerror = () => {
          console.warn('Google Maps script load failed, falling back to basic locator');
          setLoading(false);
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      googleMapRef.current = null;
      googleMarkerRef.current = null;
    };
  }, [isOpen]);

  // Toggle map type (Roadmap vs Satellite)
  const toggleMapType = () => {
    const next = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(next);
    if (googleMapRef.current && (window as any).google?.maps) {
      googleMapRef.current.setMapTypeId(
        next === 'satellite'
          ? (window as any).google.maps.MapTypeId.HYBRID
          : (window as any).google.maps.MapTypeId.ROADMAP
      );
    }
  };

  // Handle selecting search result
  const handleSelectSearchResult = (result: PlaceSuggestion) => {
    if (googleMapRef.current && googleMarkerRef.current) {
      const pos = { lat: result.lat, lng: result.lng };
      googleMapRef.current.setCenter(pos);
      googleMapRef.current.setZoom(16);
      googleMarkerRef.current.setPosition(pos);
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

        if (googleMapRef.current && googleMarkerRef.current) {
          const latLng = { lat, lng };
          googleMapRef.current.setCenter(latLng);
          googleMapRef.current.setZoom(16);
          googleMarkerRef.current.setPosition(latLng);
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
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {title}
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  Google Maps
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Tìm kiếm địa danh Việt Nam (Yên Tử, Đà Lạt, Hồ Tây...) hoặc kéo thả ghim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
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
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                  else setSearchResults(POPULAR_VN_LANDMARKS.slice(0, 6));
                  setShowDropdown(true);
                }}
                placeholder="Nhập địa danh Việt Nam (ví dụ: Yên Tử, Hồ Tây, Chợ Bến Thành, Đà Lạt...)"
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* GPS Location Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingUser}
              title="Vị trí GPS của tôi"
              className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              {isLocatingUser ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              ) : (
                <Navigation className="w-4 h-4 text-sky-500" />
              )}
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </div>

          {/* Search Dropdown / Autocomplete Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-64 overflow-y-auto z-40 divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span>GỢI Ý ĐỊA DANH / ĐỊA ĐIỂM VIỆT NAM:</span>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  Đóng
                </button>
              </div>
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left p-2.5 hover:bg-rose-50/70 transition flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-rose-600">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  {result.city && (
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 shrink-0">
                      {result.city}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Canvas with Toggle Buttons */}
        <div className="relative flex-1 min-h-[320px] sm:min-h-[380px] bg-slate-100 z-10">
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-slate-600 font-semibold">Đang tải bản đồ Google Maps...</p>
            </div>
          )}

          {/* Map Layer Switcher */}
          <button
            type="button"
            onClick={toggleMapType}
            className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-white/95 hover:bg-white text-slate-700 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs"
            title="Đổi chế độ bản đồ"
          >
            <Layers className="w-3.5 h-3.5 text-rose-500" />
            <span>{mapType === 'roadmap' ? 'Vệ tinh' : 'Bản đồ'}</span>
          </button>

          <div ref={mapContainerRef} className="w-full h-full min-h-[320px] sm:min-h-[380px]" />
        </div>

        {/* Selected Address Display & Confirmation */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 shrink-0 space-y-2.5 z-20">
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                Địa điểm đã chọn trên Google Maps
              </span>
              <p className="text-xs font-semibold text-slate-800 break-words">
                {selectedAddress || 'Chưa chọn địa điểm nào (hãy nhấp trên bản đồ hoặc gõ tìm kiếm danh thắng)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
            {selectedAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem trực tiếp trên Google Maps ↗</span>
              </a>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Xác nhận vị trí này
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

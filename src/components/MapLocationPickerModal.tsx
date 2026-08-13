import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Loader2, Map as MapIcon, ExternalLink } from 'lucide-react';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: { address: string; city: string; fullPlaceName?: string }) => void;
  initialAddress?: string;
  title?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    state?: string;
    province?: string;
    country?: string;
    suburb?: string;
    road?: string;
  };
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  title = 'Chọn địa điểm trên bản đồ'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Load Leaflet CSS and JS dynamically
  const loadLeaflet = (): Promise<any> => {
    if ((window as any).L) {
      return Promise.resolve((window as any).L);
    }
    return new Promise((resolve, reject) => {
      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve((window as any).L);
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      } else {
        const checkL = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkL);
            resolve((window as any).L);
          }
        }, 100);
      }
    });
  };

  // Reverse geocode lat/lng via Nominatim
  const reverseGeocode = async (lat: number, lng: number) => {
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

  // Search places via Nominatim API
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=6&addressdetails=1&accept-language=vi`
      );
      if (response.ok) {
        const results: SearchResult[] = await response.json();
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setSelectedAddress(initialAddress);
    setSearchQuery(initialAddress);

    loadLeaflet()
      .then((L) => {
        setLoading(false);

        if (!mapContainerRef.current) return;

        // Destroy previous instance if any
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }

        const defaultLat = 21.0285; // Hanoi / Vietnam default center
        const defaultLng = 105.8542;

        const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 12);
        leafletMapRef.current = map;

        // Tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Marker icon fix
        const markerIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const marker = L.marker([defaultLat, defaultLng], {
          draggable: true,
          icon: markerIcon
        }).addTo(map);
        markerRef.current = marker;

        // Click on map to place pin
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          reverseGeocode(lat, lng);
        });

        // Drag marker
        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          reverseGeocode(latLng.lat, latLng.lng);
        });

        // If initial address exists, search and move map there
        if (initialAddress.trim()) {
          performSearch(initialAddress).then(() => {
            // fetch first result
            fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                initialAddress
              )}&limit=1&accept-language=vi`
            )
              .then((res) => res.json())
              .then((data) => {
                if (data && data[0]) {
                  const lat = parseFloat(data[0].lat);
                  const lon = parseFloat(data[0].lon);
                  map.setView([lat, lon], 14);
                  marker.setLatLng([lat, lon]);
                  setSelectedAddress(data[0].display_name);
                  setSearchQuery(data[0].display_name);
                }
              })
              .catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load Leaflet:', err);
        setLoading(false);
      });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle selecting location from search results dropdown
  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.setView([lat, lon], 15);
      markerRef.current.setLatLng([lat, lon]);
    }

    const display = result.display_name;
    setSelectedAddress(display);
    setSearchQuery(display);

    const addr = result.address || {};
    const city = addr.city || addr.town || addr.state || addr.province || '';
    setSelectedCity(city);

    setShowDropdown(false);
  };

  // Get GPS Location
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

        if (leafletMapRef.current && markerRef.current) {
          leafletMapRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
          reverseGeocode(lat, lng);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        alert('Lỗi định vị GPS: ' + err.message);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              <p className="text-[11px] text-slate-500">
                Gõ tên địa điểm (VD: Yên Tử, Đà Lạt...) hoặc kéo thả ghim trên bản đồ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Dropdown */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0 relative z-20">
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
                placeholder="Nhập địa điểm (ví dụ: Yên Tử, Hồ Tây, Chợ Bến Thành...)"
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

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

          {/* Search Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-60 overflow-y-auto z-30 divide-y divide-slate-100">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left p-3 hover:bg-rose-50 transition flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {result.display_name}
                    </p>
                    {result.address && (
                      <p className="text-[10px] text-slate-400">
                        {[result.address.suburb, result.address.city || result.address.town, result.address.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Canvas */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[350px] bg-slate-100 z-10">
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-slate-600 font-medium">Đang tải bản đồ tương tác...</p>
            </div>
          )}

          <div ref={mapContainerRef} className="w-full h-full min-h-[300px] sm:min-h-[350px]" />
        </div>

        {/* Selected Location & Confirm Footer */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3 z-20">
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                Địa điểm đã chọn
              </span>
              <p className="text-xs font-medium text-slate-800 break-words">
                {selectedAddress || 'Chưa chọn địa điểm nào (hãy nhấp trên bản đồ hoặc tìm kiếm)'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            {selectedAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem trên Google Maps</span>
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

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, Check, X, Compass, Loader2 } from 'lucide-react';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: { address: string; city: string; fullPlaceName?: string }) => void;
  initialAddress?: string;
  title?: string;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  title = 'Chọn địa điểm trên Google Maps'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  const googleMapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const geocoderObj = useRef<any>(null);
  const autocompleteObj = useRef<any>(null);

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

  // Reverse geocode lat/lng to get address
  const reverseGeocode = (lat: number, lng: number) => {
    if (!geocoderObj.current) return;

    geocoderObj.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results && results[0]) {
        const place = results[0];
        const formatted = place.formatted_address;
        setSelectedAddress(formatted);
        setSearchQuery(formatted);

        // Extract city/province from address_components
        let city = '';
        if (place.address_components) {
          for (const comp of place.address_components) {
            if (
              comp.types.includes('administrative_area_level_1') ||
              comp.types.includes('locality')
            ) {
              city = comp.long_name;
            }
          }
        }
        setSelectedCity(city);
      } else {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setErrorMsg('');
    setSelectedAddress(initialAddress);
    setSearchQuery(initialAddress);

    const loadGoogleMapsScript = (key: string): Promise<any> => {
      if ((window as any).google && (window as any).google.maps) {
        return Promise.resolve((window as any).google);
      }
      return new Promise((resolve, reject) => {
        const existing = document.getElementById('google-maps-js');
        if (existing) {
          if ((window as any).google && (window as any).google.maps) {
            resolve((window as any).google);
          } else {
            existing.addEventListener('load', () => resolve((window as any).google));
            existing.addEventListener('error', (e) => reject(e));
          }
          return;
        }
        const script = document.createElement('script');
        script.id = 'google-maps-js';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=vi`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve((window as any).google);
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
    };

    loadGoogleMapsScript(apiKey).then((google) => {
      setMapLoaded(true);
      setLoading(false);

      const defaultLat = 10.7769; // Ho Chi Minh City default
      const defaultLng = 106.7009;

      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 14,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      googleMapObj.current = map;
      geocoderObj.current = new google.maps.Geocoder();

      // Create draggable marker
      const marker = new google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: 'Vị trí đã chọn'
      });
      markerObj.current = marker;

      // Click on map to move marker
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Drag marker listener
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          reverseGeocode(pos.lat(), pos.lng());
        }
      });

      // Autocomplete setup
      if (searchInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ['formatted_address', 'geometry', 'name', 'address_components'],
        });
        autocompleteObj.current = autocomplete;
        autocomplete.bindTo('bounds', map);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) {
            return;
          }

          map.setCenter(place.geometry.location);
          map.setZoom(16);
          marker.setPosition(place.geometry.location);

          const formatted = place.formatted_address || place.name || '';
          setSelectedAddress(formatted);
          setSearchQuery(formatted);

          let city = '';
          if (place.address_components) {
            for (const comp of place.address_components) {
              if (
                comp.types.includes('administrative_area_level_1') ||
                comp.types.includes('locality')
              ) {
                city = comp.long_name;
              }
            }
          }
          setSelectedCity(city);
        });
      }

      // If initialAddress provided, search for it
      if (initialAddress.trim()) {
        geocoderObj.current.geocode({ address: initialAddress }, (results: any[], status: string) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            map.setCenter(loc);
            marker.setPosition(loc);
            reverseGeocode(loc.lat(), loc.lng());
          }
        });
      }
    }).catch((err) => {
      console.warn('Google Maps JS API load notice:', err);
      setLoading(false);
      setMapLoaded(false);
      setErrorMsg('Không thể kết nối Google Maps JS API tự động. Bạn vẫn có thể tìm kiếm và chọn vị trí.');
    });
  }, [isOpen, initialAddress, apiKey]);

  // Fallback search button handler if autocomplete or enter pressed
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (geocoderObj.current && googleMapObj.current && markerObj.current) {
      geocoderObj.current.geocode({ address: searchQuery }, (results: any[], status: string) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          googleMapObj.current.setCenter(loc);
          googleMapObj.current.setZoom(16);
          markerObj.current.setPosition(loc);
          reverseGeocode(loc.lat(), loc.lng());
        } else {
          setSelectedAddress(searchQuery);
        }
      });
    } else {
      setSelectedAddress(searchQuery);
    }
  };

  // Get current user location via browser GPS
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

        if (googleMapObj.current && markerObj.current) {
          const latLng = { lat, lng };
          googleMapObj.current.setCenter(latLng);
          googleMapObj.current.setZoom(16);
          markerObj.current.setPosition(latLng);
          reverseGeocode(lat, lng);
        } else {
          setSelectedAddress(`Vị trí GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        alert('Lỗi xác định vị trí GPS: ' + err.message);
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
              <p className="text-[11px] text-slate-500">Kéo ghim hoặc gõ tìm kiếm để chọn chính xác địa chỉ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập địa chỉ, tên đường, nhà hàng, vị trí Google Maps..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
              />
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingUser}
              title="Lấy vị trí GPS hiện tại của tôi"
              className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              {isLocatingUser ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Navigation className="w-4 h-4 text-sky-500" />}
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </form>
        </div>

        {/* Interactive Google Map Canvas */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-slate-100">
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs text-slate-600 font-medium">Đang tải Google Maps...</p>
            </div>
          )}

          {/* Map Element */}
          <div ref={mapRef} className="w-full h-full min-h-[280px] sm:min-h-[340px]" />

          {/* Fallback if Google Maps fails */}
          {!loading && !mapLoaded && (
            <div className="absolute inset-0 p-4 bg-slate-50 flex flex-col items-center justify-center text-center space-y-3 z-0">
              <Compass className="w-10 h-10 text-rose-400" />
              <div className="max-w-xs space-y-1">
                <p className="text-xs font-bold text-slate-700">Chế độ chọn vị trí nhập trực tiếp</p>
                <p className="text-[11px] text-slate-500">{errorMsg || 'Bạn có thể nhập trực tiếp địa chỉ vào ô tìm kiếm bên trên.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Location Selected Bar & Confirm */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
          <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Địa điểm đã chọn</span>
              <p className="text-xs font-medium text-slate-800 break-words">
                {selectedAddress || 'Chưa chọn địa điểm nào (hãy nhấp trên bản đồ hoặc tìm kiếm)'}
              </p>
              {selectedCity && (
                <span className="text-[11px] text-slate-500 block mt-0.5">Tỉnh/TP: {selectedCity}</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
  );
};

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Heart, 
  Sparkles, 
  Search, 
  Plus, 
  Calendar, 
  Camera, 
  Navigation, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink, 
  Layers, 
  Compass, 
  Route, 
  Star, 
  Clock, 
  Coffee, 
  Plane, 
  Music, 
  BookOpen, 
  Upload, 
  Check, 
  Trash2, 
  Edit3,
  Flame,
  ZoomIn,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  Crosshair,
  Info,
  CheckCircle2,
  ListFilter,
  Play
} from 'lucide-react';
import L from 'leaflet';
import { db, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from '../lib/firebase';
import { UserProfile, CoupleData, JournalEntry, VisitedPlace, TaggedPerson, SavedPlace } from '../types';
import { JournalMusicPlayer } from './JournalMusicPlayer';
import { MapLocationPickerModal, SelectedLocationResult } from './MapLocationPickerModal';
import { formatCoordinates, getDeviceHighAccuracyGPS, reverseGeocodeGPS } from '../utils/geolocation';
import { compressAndConvertToBase64 } from '../utils/imageCompression';
import { isVideoUrl } from '../utils/mediaHelper';

export interface MapFootprintItem {
  id: string;
  type: 'journal' | 'custom_place';
  title: string;
  locationName: string;
  address?: string;
  date: string;
  lat: number;
  lng: number;
  accuracy?: number;
  locationTimestamp?: string;
  placeId?: string;
  category: 'cafe' | 'date' | 'travel' | 'food' | 'special' | 'home';
  rating?: number;
  story?: string;
  imageUrl?: string;
  images?: string[];
  musicUrl?: string;
  musicTitle?: string;
  authorName?: string;
  authorUid?: string;
  taggedPeople?: TaggedPerson[];
  journalRef?: JournalEntry;
  rawPlace?: VisitedPlace;
}

interface LoveFootprintMapProps {
  coupleId: string;
  userProfile: UserProfile;
  coupleData?: CoupleData | null;
  journals?: JournalEntry[];
  savedPlaces?: SavedPlace[];
  onOpenJournalLightbox?: (journal: JournalEntry, imageIndex?: number) => void;
  onNavigateToJournal?: () => void;
}

export const LoveFootprintMap: React.FC<LoveFootprintMapProps> = ({
  coupleId,
  userProfile,
  coupleData,
  journals = [],
  savedPlaces = [],
  onOpenJournalLightbox,
  onNavigateToJournal
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [customPlaces, setCustomPlaces] = useState<VisitedPlace[]>([]);
  const [selectedFootprint, setSelectedFootprint] = useState<MapFootprintItem | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'date' | 'travel' | 'cafe' | 'special'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoveTrail, setShowLoveTrail] = useState(false);
  const [mapTheme, setMapTheme] = useState<'pastel' | 'satellite' | 'streets'>('satellite');
  const [currentActivePhotoIndex, setCurrentActivePhotoIndex] = useState(0);

  // Unlocated Memories banner toggle
  const [showUnlocatedList, setShowUnlocatedList] = useState(false);
  const [fixingJournal, setFixingJournal] = useState<JournalEntry | null>(null);

  // Modal: Add Custom Date Spot / Footprint
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpotTitle, setNewSpotTitle] = useState('');
  const [newSpotLocation, setNewSpotLocation] = useState('');
  const [newSpotAddress, setNewSpotAddress] = useState('');
  const [newSpotDate, setNewSpotDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSpotCategory, setNewSpotCategory] = useState<'cafe' | 'date' | 'travel' | 'food' | 'special'>('date');
  const [newSpotStory, setNewSpotStory] = useState('');
  const [newSpotRating, setNewSpotRating] = useState(5);
  const [newSpotImages, setNewSpotImages] = useState<string[]>([]);
  const [newSpotLat, setNewSpotLat] = useState<number | null>(null);
  const [newSpotLng, setNewSpotLng] = useState<number | null>(null);
  const [newSpotAccuracy, setNewSpotAccuracy] = useState<number | null>(null);
  const [newSpotTimestamp, setNewSpotTimestamp] = useState<string | null>(null);
  const [newSpotPlaceId, setNewSpotPlaceId] = useState<string | null>(null);
  const [submittingSpot, setSubmittingSpot] = useState(false);
  const [isSpotMapPickerOpen, setIsSpotMapPickerOpen] = useState(false);

  // 1. Subscribe to custom visited_places collection in Firestore
  useEffect(() => {
    if (!coupleId) return;

    const placesRef = collection(db, 'couples', coupleId, 'visited_places');
    const q = query(placesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: VisitedPlace[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as VisitedPlace);
      });
      setCustomPlaces(items);
    }, (err) => {
      console.warn('Error subscribing to visited_places:', err);
    });

    return () => unsubscribe();
  }, [coupleId]);

  // 2. Identify unlocated journals (Old memories without high-accuracy GPS coordinates)
  const unlocatedJournals = useMemo(() => {
    return journals.filter(
      (j) => typeof j.lat !== 'number' || typeof j.lng !== 'number' || isNaN(j.lat) || isNaN(j.lng)
    );
  }, [journals]);

  // 3. Build unified list of footprints STRICTLY from saved GPS coordinates
  const unifiedFootprints = useMemo<MapFootprintItem[]>(() => {
    const items: MapFootprintItem[] = [];
    const usedLocations = new Set<string>();

    // 3a. Convert Journals with verified GPS coordinates (source of truth)
    journals.forEach((j) => {
      if (typeof j.lat !== 'number' || typeof j.lng !== 'number' || isNaN(j.lat) || isNaN(j.lng)) {
        return; // Strict rule: No coordinates -> DO NOT GUESS!
      }

      let lat = j.lat;
      let lng = j.lng;
      const locName = j.location || j.locationAddress || 'Kỷ niệm tình yêu';

      // Infer category from title/mood/location for visual pin style
      let cat: 'cafe' | 'date' | 'travel' | 'food' | 'special' | 'home' = 'date';
      const text = `${j.title} ${j.content || ''} ${locName} ${j.mood || ''}`.toLowerCase();
      if (text.includes('cafe') || text.includes('cà phê') || text.includes('trà sữa') || text.includes('coffee')) {
        cat = 'cafe';
      } else if (text.includes('du lịch') || text.includes('khám phá') || text.includes('phượt') || text.includes('biển') || text.includes('đảo') || text.includes('núi')) {
        cat = 'travel';
      } else if (text.includes('ăn') || text.includes('lẩu') || text.includes('nướng') || text.includes('bánh') || text.includes('món')) {
        cat = 'food';
      } else if (text.includes('kỷ niệm') || text.includes('tỏ tình') || text.includes('cầu hôn') || text.includes('yêu') || text.includes('sinh nhật')) {
        cat = 'special';
      }

      // Slight optical offset only if multiple pins land on the exact identical millimeter
      const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (usedLocations.has(coordKey)) {
        lat += (Math.random() - 0.5) * 0.0003;
        lng += (Math.random() - 0.5) * 0.0003;
      }
      usedLocations.add(coordKey);

      items.push({
        id: `journal_${j.id}`,
        type: 'journal',
        title: j.title,
        locationName: locName,
        address: j.locationAddress,
        date: j.date,
        lat,
        lng,
        accuracy: j.accuracy,
        locationTimestamp: j.locationTimestamp,
        placeId: j.placeId,
        category: cat,
        story: j.content,
        imageUrl: j.imageUrl || (j.images && j.images.length > 0 ? j.images[j.mainImageIndex || 0] : undefined),
        images: j.images,
        musicUrl: j.musicUrl,
        musicTitle: j.musicTitle,
        authorName: j.authorName,
        authorUid: j.authorUid,
        taggedPeople: j.taggedPeople,
        journalRef: j
      });
    });

    // 3b. Convert Custom Places with verified GPS coordinates
    customPlaces.forEach((p) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || isNaN(p.lat) || isNaN(p.lng)) {
        return;
      }

      let lat = p.lat;
      let lng = p.lng;
      const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (usedLocations.has(coordKey)) {
        lat += (Math.random() - 0.5) * 0.0003;
        lng += (Math.random() - 0.5) * 0.0003;
      }
      usedLocations.add(coordKey);

      items.push({
        id: `place_${p.id}`,
        type: 'custom_place',
        title: p.name,
        locationName: p.name,
        address: p.address || p.province,
        date: p.dateVisited || p.createdAt?.split('T')[0] || '',
        lat,
        lng,
        accuracy: p.accuracy,
        locationTimestamp: p.locationTimestamp,
        placeId: p.placeId,
        category: p.category || 'travel',
        rating: p.rating || 5,
        story: p.note,
        imageUrl: p.imageUrl || (p.images && p.images.length > 0 ? p.images[0] : undefined),
        images: p.images || (p.imageUrl ? [p.imageUrl] : []),
        authorName: p.addedByName,
        authorUid: p.addedByUid,
        rawPlace: p
      });
    });

    // Sort chronologically (oldest to newest for trail connection)
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [journals, customPlaces]);

  // Filtered Footprints
  const filteredFootprints = useMemo(() => {
    return unifiedFootprints.filter((item) => {
      // Category filter
      if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchLoc = item.locationName.toLowerCase().includes(q);
        const matchStory = (item.story || '').toLowerCase().includes(q);
        const matchAddr = (item.address || '').toLowerCase().includes(q);
        return matchTitle || matchLoc || matchStory || matchAddr;
      }
      return true;
    });
  }, [unifiedFootprints, activeCategoryFilter, searchQuery]);

  // Helper to create custom heart / photo pin icon
  const createMapPinIcon = (item: MapFootprintItem, isSelected: boolean) => {
    const isSpecial = item.category === 'special';
    const isCafe = item.category === 'cafe';
    const isTravel = item.category === 'travel';

    const bgGradient = isSelected
      ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
      : isSpecial
      ? 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
      : isCafe
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : isTravel
      ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
      : 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)';

    const size = isSelected ? 44 : 36;
    const pinHeight = isSelected ? 54 : 44;

    const firstImage = item.images?.find((img) => !isVideoUrl(img)) || (item.imageUrl && !isVideoUrl(item.imageUrl) ? item.imageUrl : undefined);
    const firstMedia = item.imageUrl || (item.images && item.images[0]);
    const thumbnail = firstImage || (firstMedia && item.journalRef?.videoThumbnails?.[firstMedia]);

    return L.divIcon({
      className: 'love-map-pin',
      html: `
        <div style="position: relative; width: ${size}px; height: ${pinHeight}px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
          ${isSelected ? `
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: ${size + 14}px;
              height: ${size + 14}px;
              border-radius: 50%;
              background: rgba(244, 63, 94, 0.25);
              animation: pulse-ring 1.8s infinite;
            "></div>
          ` : ''}
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${bgGradient};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 6px 18px rgba(225, 29, 72, ${isSelected ? '0.55' : '0.35'}), 0 2px 5px rgba(0,0,0,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            border: ${isSelected ? '3px solid white' : '2px solid white'};
            overflow: hidden;
          ">
            ${thumbnail ? `
              <div style="
                transform: rotate(45deg);
                width: 100%;
                height: 100%;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <img src="${thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : `
              <svg style="transform: rotate(45deg); width: ${isSelected ? '20px' : '16px'}; height: ${isSelected ? '20px' : '16px'}; fill: white; color: white;" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3c3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            `}
          </div>
          <div style="
            position: absolute;
            bottom: 0px;
            left: 50%;
            transform: translateX(-50%);
            width: ${size * 0.3}px;
            height: 3px;
            background: rgba(0,0,0,0.3);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [size, pinHeight],
      iconAnchor: [size / 2, pinHeight],
      popupAnchor: [0, -pinHeight]
    });
  };

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map
    const initialCenter = unifiedFootprints.length > 0 
      ? [unifiedFootprints[unifiedFootprints.length - 1].lat, unifiedFootprints[unifiedFootprints.length - 1].lng] as [number, number]
      : [16.0544, 107.5] as [number, number];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: unifiedFootprints.length > 0 ? 11 : 6,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Add Tile Layer (CartoDB Positron for light romantic pastel aesthetic)
    const getTileUrl = (theme: 'pastel' | 'satellite' | 'streets') => {
      if (theme === 'pastel') {
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      } else if (theme === 'satellite') {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      } else {
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
    };

    const tileLayer = L.tileLayer(getTileUrl(mapTheme), {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapTheme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();

    let url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    if (mapTheme === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (mapTheme === 'streets') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstanceRef.current);
  }, [mapTheme]);

  // Render Markers and Love Trail Polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = [];

    // Add markers for filtered items
    filteredFootprints.forEach((item) => {
      const isSelected = selectedFootprint?.id === item.id;
      const marker = L.marker([item.lat, item.lng], {
        icon: createMapPinIcon(item, isSelected),
        title: item.title
      });

      marker.on('click', () => {
        setSelectedFootprint(item);
        setCurrentActivePhotoIndex(0);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([item.lat, item.lng], Math.max(mapInstanceRef.current.getZoom(), 12), {
            duration: 0.8
          });
        }
      });

      marker.addTo(markersGroupRef.current!);
      latLngs.push([item.lat, item.lng]);
    });

    // Draw Love Trail line between points
    if (showLoveTrail && latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#f43f5e',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapInstanceRef.current);
      polylineRef.current = polyline;
    }
  }, [filteredFootprints, selectedFootprint, showLoveTrail]);

  // Auto-fit all currently visible footprints whenever the map opens or filters/search change.
  // Keep every photo pin centered in the visible map area without requiring manual zoom.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || filteredFootprints.length === 0) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (filteredFootprints.length === 1) {
        const only = filteredFootprints[0];
        map.setView([only.lat, only.lng], 15, { animate: true });
        return;
      }

      const bounds = L.latLngBounds(
        filteredFootprints.map((item) => [item.lat, item.lng] as [number, number])
      );

      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 14,
        animate: true,
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [filteredFootprints]);

  // Quick pinpoint / correct location for an unlocated memory
  const handleSaveFixingLocation = async (data: SelectedLocationResult) => {
    if (!fixingJournal || !coupleId) return;

    try {
      const journalRef = doc(db, 'couples', coupleId, 'journals', fixingJournal.id);
      await updateDoc(journalRef, {
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy || null,
        locationTimestamp: data.locationTimestamp || new Date().toISOString(),
        placeId: data.placeId || null,
        location: data.locationName,
        locationAddress: data.address,
        updatedAt: new Date().toISOString()
      });

      setFixingJournal(null);

      // Focus map to newly saved point
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([data.lat, data.lng], 14, { duration: 1 });
      }
    } catch (err) {
      console.error('Lỗi cập nhật tọa độ nhật ký:', err);
      alert('Không thể lưu tọa độ: ' + String(err));
    }
  };

  // Quick Locate user with high accuracy GPS
  const handleLocateMe = async () => {
    if (!mapInstanceRef.current) return;
    try {
      const gps = await getDeviceHighAccuracyGPS();
      mapInstanceRef.current.flyTo([gps.latitude, gps.longitude], 15, { duration: 1.2 });
      L.circle([gps.latitude, gps.longitude], {
        radius: gps.accuracy || 20,
        color: '#f43f5e',
        fillColor: '#f43f5e',
        fillOpacity: 0.2
      }).addTo(mapInstanceRef.current);
    } catch (err: any) {
      alert(err?.message || 'Không thể lấy GPS thiết bị.');
    }
  };

  // Zoom to fit all pins
  const handleFitBounds = () => {
    if (!mapInstanceRef.current || filteredFootprints.length === 0) return;
    const bounds = L.latLngBounds(filteredFootprints.map(f => [f.lat, f.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  // Image Upload handler for Add Spot
  const handleSpotImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const imgs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const b64 = await compressAndConvertToBase64(files[i]);
        imgs.push(b64);
      }
      setNewSpotImages(prev => [...prev, ...imgs]);
    } catch (err) {
      console.error('Lỗi nén ảnh địa điểm:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Submit New Custom Spot with exact GPS coordinates
  const handleAddCustomSpotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !newSpotTitle.trim()) return;

    if (newSpotLat === null || newSpotLng === null) {
      alert('Vui lòng chọn hoặc ghim vị trí GPS chính xác trên bản đồ.');
      return;
    }

    setSubmittingSpot(true);
    try {
      const placesRef = collection(db, 'couples', coupleId, 'visited_places');
      const placeData = {
        name: newSpotTitle.trim(),
        province: newSpotAddress.trim() || newSpotLocation.trim() || 'Việt Nam',
        address: newSpotAddress.trim(),
        category: newSpotCategory,
        lat: newSpotLat,
        lng: newSpotLng,
        accuracy: newSpotAccuracy || null,
        locationTimestamp: newSpotTimestamp || new Date().toISOString(),
        placeId: newSpotPlaceId || null,
        dateVisited: newSpotDate,
        note: newSpotStory.trim() || '',
        rating: newSpotRating,
        imageUrl: newSpotImages.length > 0 ? newSpotImages[0] : '',
        images: newSpotImages,
        addedByUid: userProfile.uid,
        addedByName: userProfile.displayName,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(placesRef, placeData);

      // Reset form
      setNewSpotTitle('');
      setNewSpotLocation('');
      setNewSpotAddress('');
      setNewSpotStory('');
      setNewSpotImages([]);
      setNewSpotLat(null);
      setNewSpotLng(null);
      setNewSpotAccuracy(null);
      setNewSpotTimestamp(null);
      setNewSpotPlaceId(null);
      setShowAddModal(false);

      // Focus map to newly added spot
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([placeData.lat, placeData.lng], 14, { duration: 1 });
      }
    } catch (err: any) {
      console.error('Lỗi thêm địa điểm:', err);
      alert('Không thể thêm địa điểm: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setSubmittingSpot(false);
    }
  };

  // Delete custom place
  const handleDeleteCustomPlace = async (placeId: string) => {
    if (!coupleId) return;
    if (!window.confirm('Bạn có chắc muốn xóa dấu chân địa điểm này?')) return;
    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'visited_places', placeId));
      setSelectedFootprint(null);
    } catch (err) {
      console.error('Lỗi xóa địa điểm:', err);
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl bg-white flex flex-col h-[750px] sm:h-[820px]">

      {/* 1. Header Toolbar */}
      <div className="p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 z-10 shrink-0">

        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            Bản Đồ Dấu Chân Tình Yêu
          </h2>
        </div>

        {/* Right: Search, Filter & Add Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm quán cafe, nơi hẹn..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Unlocated Memories Alert Button */}
          {unlocatedJournals.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUnlocatedList(!showUnlocatedList)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                showUnlocatedList
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title={`${unlocatedJournals.length} kỷ niệm chưa có tọa độ GPS`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{unlocatedJournals.length} chưa ghim GPS</span>
            </button>
          )}

          {/* Add Custom Spot */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ghim điểm hẹn</span>
          </button>
        </div>
      </div>

      {/* 2. Unlocated Memories Notification Banner (if any) */}
      {unlocatedJournals.length > 0 && showUnlocatedList && (
        <div className="p-3.5 bg-amber-50 border-b border-amber-200/80 z-20 shrink-0 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">
                Có {unlocatedJournals.length} kỷ niệm chưa có tọa độ GPS chính xác
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlocatedList(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-amber-800 mb-2.5">
            Bản đồ chỉ hiển thị các kỷ niệm có tọa độ GPS thực tế. Hãy bấm "Ghim GPS" để chọn vị trí chính xác trên bản đồ:
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unlocatedJournals.map((j) => (
              <div
                key={j.id}
                className="p-2 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-2.5 shrink-0 min-w-[240px] max-w-[280px]"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 text-xs font-bold">
                  {j.mood || '💖'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate">{j.title}</div>
                  <div className="text-[10px] text-slate-500">{j.date} {j.location ? `• ${j.location}` : ''}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFixingJournal(j)}
                  className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Ghim GPS</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Category Filter Chips & Map Controls Ribbon */}
      <div className="px-3.5 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto z-10 shrink-0">

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'all', label: 'Tất cả', icon: Sparkles },
            { id: 'date', label: 'Hẹn hò', icon: Heart },
            { id: 'travel', label: 'Du lịch', icon: Plane },
            { id: 'cafe', label: 'Cafe & Trà', icon: Coffee },
            { id: 'special', label: 'Khoảnh khắc vàng', icon: Star },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Trail Toggle & Theme Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowLoveTrail(!showLoveTrail)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1 cursor-pointer ${
              showLoveTrail
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Bật/Tắt đường nối hành trình tình yêu theo thời gian"
          >
            <Route className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đường dấu chân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = mapTheme === 'pastel' ? 'satellite' : mapTheme === 'satellite' ? 'streets' : 'pastel';
              setMapTheme(next);
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
            title="Chuyển đổi kiểu hiển thị bản đồ"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {mapTheme === 'pastel' ? 'Pastel' : mapTheme === 'satellite' ? 'Vệ tinh' : 'Đường phố'}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Main Stage: Leaflet Map */}
      <div className="relative flex-1 w-full bg-slate-100 min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Quick Action Controls on Map */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
          {/* Locate Device GPS Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="p-2.5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-md border border-slate-200/80 transition flex items-center justify-center cursor-pointer hover:text-rose-600"
            title="Định vị vị trí hiện tại của thiết bị"
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          {/* Fit all bounds */}
          <button
            type="button"
            onClick={handleFitBounds}
            className="p-2.5 bg-white/95 hover:bg-white text-slate-700 rounded-2xl shadow-md border border-slate-200/80 transition flex items-center justify-center cursor-pointer hover:text-rose-600"
            title="Thu phóng xem toàn bộ dấu chân"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Source of Truth Watermark Badge — desktop only */}
        <div className="hidden sm:flex absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-md text-[11px] text-slate-600 font-medium items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-rose-500" />
          <span>Tọa độ GPS thiết bị</span>
        </div>

        {/* 5. Selected Footprint — Compact Map Preview */}
        {selectedFootprint && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-[360px] z-30 overflow-hidden rounded-[22px] border border-slate-200/90 bg-white/97 shadow-2xl backdrop-blur-md animate-slideUp">

            {/* Compact header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-600">
                  {selectedFootprint.category === 'cafe' ? '☕ Cafe' :
                   selectedFootprint.category === 'travel' ? '✈️ Du lịch' :
                   selectedFootprint.category === 'food' ? '🍲 Ăn uống' :
                   selectedFootprint.category === 'special' ? '⭐ Đặc biệt' : '💗 Hẹn hò'}
                </span>

                <span className="truncate text-[10px] font-medium text-slate-400">
                  {selectedFootprint.date}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFootprint(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Đóng chi tiết địa điểm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Compact content */}
            <div className="p-3">
              <div className="flex items-start gap-3">

                {/* Information */}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-[15px] font-bold leading-5 text-slate-900">
                    {selectedFootprint.title}
                  </h3>

                  <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <span className="line-clamp-1 text-xs font-semibold text-slate-700">
                      {selectedFootprint.locationName}
                    </span>
                  </div>

                  {selectedFootprint.address &&
                    selectedFootprint.address !== selectedFootprint.locationName && (
                      <p className="ml-5 mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-400">
                        {selectedFootprint.address}
                      </p>
                    )}

                  {/* Metadata condensed into chips */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/80">
                      <Crosshair className="h-3 w-3 text-rose-500" />
                      GPS
                      {typeof selectedFootprint.accuracy === 'number' && (
                        <span className="font-bold text-emerald-600">
                          ±{selectedFootprint.accuracy.toFixed(1)}m
                        </span>
                      )}
                    </span>

                    <span className="max-w-[120px] truncate rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-500 ring-1 ring-inset ring-slate-200/80">
                      {selectedFootprint.authorName || 'Hai đứa'}
                    </span>
                  </div>
                </div>

                {/* Small thumbnail instead of full photo gallery */}
                {(selectedFootprint.imageUrl ||
                  (selectedFootprint.images && selectedFootprint.images.length > 0)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFootprint.journalRef && onOpenJournalLightbox) {
                        onOpenJournalLightbox(
                          selectedFootprint.journalRef,
                          selectedFootprint.journalRef.mainImageIndex || 0
                        );
                      }
                    }}
                    className={`relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${
                      selectedFootprint.journalRef && onOpenJournalLightbox
                        ? 'cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    {(() => {
                      const mediaUrl = selectedFootprint.imageUrl || selectedFootprint.images?.[0] || '';
                      const isVid = isVideoUrl(mediaUrl);
                      const thumb = selectedFootprint.journalRef?.videoThumbnails?.[mediaUrl] || 
                        selectedFootprint.images?.find((img) => !isVideoUrl(img));

                      if (isVid && !thumb) {
                        return (
                          <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                            <video
                              src={mediaUrl}
                              className="h-full w-full object-cover pointer-events-none"
                              preload="metadata"
                              muted
                              playsInline
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                                <Play className="w-3 h-3 fill-white text-white translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="relative w-full h-full">
                          <img
                            src={thumb || mediaUrl}
                            alt={selectedFootprint.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {isVid && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                                <Play className="w-3 h-3 fill-white text-white translate-x-0.5" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {selectedFootprint.images && selectedFootprint.images.length > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        +{selectedFootprint.images.length - 1}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Only custom places show a tiny note preview.
                  Journal story/music/tagged people remain in full journal detail. */}
              {selectedFootprint.type === 'custom_place' && selectedFootprint.story && (
                <p className="mt-2 line-clamp-1 text-[10px] italic leading-4 text-slate-500">
                  “{selectedFootprint.story}”
                </p>
              )}

              {/* Compact actions */}
              <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5">

                {selectedFootprint.type === 'journal' &&
                  selectedFootprint.journalRef &&
                  onOpenJournalLightbox && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenJournalLightbox(
                          selectedFootprint.journalRef!,
                          selectedFootprint.journalRef!.mainImageIndex || 0
                        )
                      }
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 text-[11px] font-bold text-white shadow-xs transition hover:bg-rose-600 cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Xem nhật ký
                    </button>
                  )}

                {selectedFootprint.type === 'journal' && selectedFootprint.journalRef && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFootprint.journalRef) {
                        setFixingJournal(selectedFootprint.journalRef);
                      }
                    }}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                    title="Chỉnh sửa vị trí ghim"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Sửa ghim
                  </button>
                )}

                {selectedFootprint.type === 'custom_place' && selectedFootprint.rawPlace && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomPlace(selectedFootprint.rawPlace!.id)}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    title="Xóa địa điểm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 6. Modal: Add Custom Spot with Live GPS Map Pinning */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Modal Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Ghim Địa Điểm / Quán Hẹn Hò Mới
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lưu tọa độ GPS và kỷ niệm đáng nhớ tại nơi hai đứa từng qua
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleAddCustomSpotSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên địa điểm / Quán cafe / Khách sạn: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cà Phê Trứng Giảng, Đỉnh Fansipan, Bãi Biển Mỹ Khê..."
                  value={newSpotTitle}
                  onChange={(e) => setNewSpotTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              {/* GPS Coordinates & Map Pin Selection */}
              <div className="p-3 bg-rose-50/50 border border-rose-200/70 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tọa độ GPS chính xác:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSpotMapPickerOpen(true)}
                    className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{newSpotLat ? 'Thay đổi vị trí ghim' : 'Ghim trên Bản đồ'}</span>
                  </button>
                </div>

                {newSpotLat !== null && newSpotLng !== null ? (
                  <div className="p-2 bg-white rounded-xl border border-rose-200 text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
                    <div>
                      <div>{newSpotLat.toFixed(6)}, {newSpotLng.toFixed(6)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {newSpotAddress || 'Đã chọn tọa độ GPS chuẩn xác'}
                      </div>
                    </div>
                    {newSpotAccuracy && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-sans font-bold">
                        ±{newSpotAccuracy}m
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-600 italic">
                    ⚠️ Chưa có tọa độ GPS. Hãy bấm nút "Ghim trên Bản đồ" hoặc tự động lấy GPS thiết bị.
                  </div>
                )}
              </div>

              {/* Category & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại địa điểm:
                  </label>
                  <select
                    value={newSpotCategory}
                    onChange={(e) => setNewSpotCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400"
                  >
                    <option value="date">💖 Điểm hẹn hò</option>
                    <option value="cafe">☕ Quán cafe / Trà sữa</option>
                    <option value="travel">✈️ Du lịch / Danh lam</option>
                    <option value="food">🍲 Nhà hàng / Quán ăn</option>
                    <option value="special">⭐ Khoảnh khắc đặc biệt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày ghé thăm:
                  </label>
                  <input
                    type="date"
                    value={newSpotDate}
                    onChange={(e) => setNewSpotDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400"
                  />
                </div>
              </div>

              {/* Story / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cảm xúc / Ghi chú kỷ niệm:
                </label>
                <textarea
                  rows={3}
                  placeholder="Lần đầu anh dẫn em đến đây, đồ uống rất ngon, ngắm hoàng hôn bên nhau..."
                  value={newSpotStory}
                  onChange={(e) => setNewSpotStory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh kỷ niệm chụp tại đây:
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>Chọn ảnh tải lên</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSpotImageUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {newSpotImages.length} ảnh đã chọn
                  </span>
                </div>

                {newSpotImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-2">
                    {newSpotImages.map((img, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 group">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewSpotImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingSpot || !newSpotTitle.trim() || newSpotLat === null}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingSpot ? 'Đang lưu...' : 'Lưu vào bản đồ'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Live Map Picker for Add Spot */}
      <MapLocationPickerModal
        isOpen={isSpotMapPickerOpen}
        onClose={() => setIsSpotMapPickerOpen(false)}
        initialCoords={newSpotLat ? { lat: newSpotLat, lng: newSpotLng!, accuracy: newSpotAccuracy || undefined } : undefined}
        initialLocationName={newSpotTitle || newSpotLocation}
        initialAddress={newSpotAddress}
        title="Ghim tọa độ điểm hẹn hò"
        subtitle="Kéo thả ghim hoặc lấy GPS thiết bị trực tiếp để có tọa độ chính xác."
        savedPlaces={savedPlaces}
        journals={journals}
        coupleId={coupleId}
        userProfile={userProfile}
        onSelectLocation={(data) => {
          setNewSpotLat(data.lat);
          setNewSpotLng(data.lng);
          setNewSpotAccuracy(data.accuracy || null);
          setNewSpotTimestamp(data.locationTimestamp || new Date().toISOString());
          setNewSpotPlaceId(data.placeId || null);
          if (!newSpotTitle.trim()) setNewSpotTitle(data.locationName);
          setNewSpotLocation(data.locationName);
          setNewSpotAddress(data.address);
          setIsSpotMapPickerOpen(false);
        }}
      />

      {/* 8. Modal: Live Map Picker to Fix Unlocated Memory */}
      {fixingJournal && (
        <MapLocationPickerModal
          isOpen={true}
          onClose={() => setFixingJournal(null)}
          initialCoords={fixingJournal.lat ? { lat: fixingJournal.lat, lng: fixingJournal.lng } : undefined}
          initialLocationName={fixingJournal.location || fixingJournal.title}
          initialAddress={fixingJournal.locationAddress || fixingJournal.location}
          title={`Ghim vị trí GPS cho: "${fixingJournal.title}"`}
          subtitle="Tọa độ GPS sẽ được lưu vĩnh viễn vào nhật ký và ghim lên Bản đồ tình yêu."
          savedPlaces={savedPlaces}
          journals={journals}
          coupleId={coupleId}
          userProfile={userProfile}
          onSelectLocation={handleSaveFixingLocation}
        />
      )}

    </div>
  );
};
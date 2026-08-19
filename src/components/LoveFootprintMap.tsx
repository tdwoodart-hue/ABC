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
  Star, 
  Coffee, 
  Plane, 
  Music, 
  BookOpen, 
  Upload, 
  Check, 
  Trash2, 
  Edit3,
  ZoomIn,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  Crosshair,
  Info,
  CheckCircle2,
  Video,
  Play,
  Film
} from 'lucide-react';
import L from 'leaflet';
import { db, collection, addDoc, doc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from '../lib/firebase';
import { UserProfile, CoupleData, JournalEntry, VisitedPlace, TaggedPerson } from '../types';
import { JournalMusicPlayer } from './JournalMusicPlayer';
import { MapLocationPickerModal, SelectedLocationResult } from './MapLocationPickerModal';
import { formatCoordinates, getDeviceHighAccuracyGPS, reverseGeocodeGPS } from '../utils/geolocation';
import { compressImageToDataUrl, isVideoUrl } from '../utils/imageCompression';

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
  onOpenJournalLightbox?: (journal: JournalEntry, imageIndex?: number) => void;
  onNavigateToJournal?: () => void;
}

export const LoveFootprintMap: React.FC<LoveFootprintMapProps> = ({
  coupleId,
  userProfile,
  coupleData,
  journals = [],
  onOpenJournalLightbox,
  onNavigateToJournal
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [customPlaces, setCustomPlaces] = useState<VisitedPlace[]>([]);
  const [selectedFootprint, setSelectedFootprint] = useState<MapFootprintItem | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'date' | 'travel' | 'cafe' | 'special'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Default to Satellite Map as requested by user
  const [mapTheme, setMapTheme] = useState<'satellite' | 'streets' | 'pastel'>('satellite');
  const [currentActiveMediaIndex, setCurrentActiveMediaIndex] = useState(0);

  // Unlocated Memories modal/banner toggle
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
  const [isMediaLoading, setIsMediaLoading] = useState(false);

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

      // Slight optical offset only if multiple pins land on the exact identical coordinate
      const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (usedLocations.has(coordKey)) {
        lat += (Math.random() - 0.5) * 0.0002;
        lng += (Math.random() - 0.5) * 0.0002;
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
        lat += (Math.random() - 0.5) * 0.0002;
        lng += (Math.random() - 0.5) * 0.0002;
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

    // Sort newest to oldest
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  // Custom heart pin marker designed for satellite & street map
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

    const size = isSelected ? 42 : 34;
    const pinHeight = isSelected ? 50 : 42;

    const thumbnail = item.imageUrl || (item.images && item.images[0]);
    const isVideoThumb = isVideoUrl(thumbnail);

    return L.divIcon({
      className: 'love-map-pin',
      html: `
        <div style="position: relative; width: ${size}px; height: ${pinHeight}px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));">
          ${isSelected ? `
            <div style="
              position: absolute;
              top: 0;
              left: 50%;
              transform: translateX(-50%);
              width: ${size + 16}px;
              height: ${size + 16}px;
              border-radius: 50%;
              background: rgba(244, 63, 94, 0.35);
              animation: pulse-ring 1.8s infinite;
            "></div>
          ` : ''}
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${bgGradient};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: ${isSelected ? '2.5px solid #ffffff' : '2px solid #ffffff'};
            overflow: hidden;
          ">
            ${thumbnail ? (
              isVideoThumb ? `
                <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                  <svg style="width: 16px; height: 16px; fill: white; color: white;" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
              ` : `
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
              `
            ) : `
              <svg style="transform: rotate(45deg); width: ${isSelected ? '18px' : '15px'}; height: ${isSelected ? '18px' : '15px'}; fill: white; color: white;" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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
            background: rgba(0,0,0,0.4);
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

  // Helper to remove all tile layers safely
  const clearMapTileLayers = (map: L.Map) => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
  };

  // 4. Initialize Leaflet Map (Default Satellite View)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Map centered at newest footprint or default Vietnam view
    const initialCenter = unifiedFootprints.length > 0 
      ? [unifiedFootprints[0].lat, unifiedFootprints[0].lng] as [number, number]
      : [16.0544, 107.5] as [number, number];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: unifiedFootprints.length > 0 ? 12 : 6,
      zoomControl: false,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // Default to Satellite Tile Layer
    clearMapTileLayers(map);
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );
    satLayer.addTo(map);
    tileLayerRef.current = satLayer;

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
    if (!mapInstanceRef.current) return;
    clearMapTileLayers(mapInstanceRef.current);

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let subdomains: string | undefined = undefined;

    if (mapTheme === 'streets') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    } else if (mapTheme === 'pastel') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      subdomains = 'abcd';
    }

    const tile = L.tileLayer(url, {
      maxZoom: 19,
      subdomains
    });
    tile.addTo(mapInstanceRef.current);
    tileLayerRef.current = tile;
  }, [mapTheme]);

  // Render Markers (NO connecting lines / NO polyline trail as requested)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    // Add markers for filtered items (strictly points without connecting lines)
    filteredFootprints.forEach((item) => {
      const isSelected = selectedFootprint?.id === item.id;
      const marker = L.marker([item.lat, item.lng], {
        icon: createMapPinIcon(item, isSelected),
        title: item.title
      });

      marker.on('click', () => {
        setSelectedFootprint(item);
        setCurrentActiveMediaIndex(0);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([item.lat, item.lng], 15, { duration: 0.6 });
        }
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [filteredFootprints, selectedFootprint]);

  // Center map on user's current GPS location
  const handleLocateMe = async () => {
    try {
      const gps = await getDeviceHighAccuracyGPS();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([gps.latitude, gps.longitude], 16, { duration: 1 });
      }
    } catch (err: any) {
      alert('Không thể định vị vị trí hiện tại của thiết bị.');
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Save manual GPS fix for an old unlocated memory
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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([data.lat, data.lng], 16, { duration: 1 });
      }
    } catch (err) {
      console.error('Lỗi cập nhật tọa độ nhật ký cũ:', err);
      alert('Không thể cập nhật tọa độ GPS.');
    }
  };

  // Handle media file upload (Images AND Videos)
  const handleSpotMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsMediaLoading(true);
    try {
      const newMediaList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await compressImageToDataUrl(files[i]);
        newMediaList.push(dataUrl);
      }
      setNewSpotImages(prev => [...prev, ...newMediaList]);
    } catch (err) {
      console.error('Lỗi đọc file media:', err);
    } finally {
      setIsMediaLoading(false);
      e.target.value = '';
    }
  };

  // Submit new custom spot
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
        note: newSpotStory.trim() || undefined,
        rating: newSpotRating,
        imageUrl: newSpotImages.length > 0 ? newSpotImages[0] : undefined,
        images: newSpotImages,
        addedByUid: userProfile.uid,
        addedByName: userProfile.displayName,
        createdAt: new Date().toISOString()
      };

      await addDoc(placesRef, placeData);
      
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

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([placeData.lat, placeData.lng], 15, { duration: 1 });
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
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg bg-slate-900 flex flex-col h-[650px] sm:h-[760px]">
      
      {/* 1. TOP FLOATING SEARCH & CATEGORY BAR (Clean, Compact, Minimal) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Glass Search & Filter bar */}
        <div className="flex items-center gap-2 pointer-events-auto flex-1 max-w-lg">
          
          {/* Search Box */}
          <div className="relative flex-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-white/60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm địa điểm, quán cafe, nơi hẹn..."
              className="w-full pl-9 pr-8 py-2 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unlocated Alert Badge (if any) */}
          {unlocatedJournals.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUnlocatedList(!showUnlocatedList)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-2 rounded-2xl shadow-md text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              title={`${unlocatedJournals.length} kỷ niệm chưa có GPS`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{unlocatedJournals.length} chưa ghim</span>
            </button>
          )}
        </div>

        {/* Right: Quick Add Button */}
        <div className="flex items-center gap-2 pointer-events-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ghim điểm hẹn</span>
          </button>
        </div>
      </div>

      {/* 2. CATEGORY FILTER PILLS (Floating Over Map) */}
      <div className="absolute top-16 sm:top-14 left-3 z-20 pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-[calc(100vw-40px)] sm:max-w-xl">
        {[
          { id: 'all', label: `Tất cả (${unifiedFootprints.length})`, icon: Sparkles },
          { id: 'date', label: 'Hẹn hò', icon: Heart },
          { id: 'travel', label: 'Du lịch', icon: Plane },
          { id: 'cafe', label: 'Cafe', icon: Coffee },
          { id: 'special', label: 'Đặc biệt', icon: Star },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm backdrop-blur-md ${
                isActive
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-black/40 hover:bg-black/60 text-white border border-white/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. UNLOCATED MEMORIES MODAL / SHEET (Clean overlay) */}
      {unlocatedJournals.length > 0 && showUnlocatedList && (
        <div className="absolute top-28 left-3 right-3 sm:right-auto sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-amber-200 p-3.5 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>{unlocatedJournals.length} kỷ niệm chưa có GPS</span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnlocatedList(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            Bản đồ chỉ hiển thị các kỷ niệm có tọa độ GPS chính xác. Bấm để ghim vị trí:
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {unlocatedJournals.map((j) => (
              <div
                key={j.id}
                className="p-2 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{j.title}</div>
                  <div className="text-[10px] text-slate-400">{j.date} {j.location ? `• ${j.location}` : ''}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFixingJournal(j)}
                  className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer"
                >
                  Ghim GPS
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN MAP CANVAS */}
      <div className="relative flex-1 w-full h-full min-h-0 bg-slate-950" style={{ isolation: 'isolate' }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Right Control Tools */}
        <div className="absolute right-3 top-28 z-20 flex flex-col gap-2 pointer-events-auto">
          
          {/* Layer switcher: Vệ tinh vs Đường phố vs Pastel */}
          <button
            type="button"
            onClick={() => {
              const next = mapTheme === 'satellite' ? 'streets' : mapTheme === 'streets' ? 'pastel' : 'satellite';
              setMapTheme(next);
            }}
            className="w-10 h-10 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg transition cursor-pointer"
            title={`Chế độ bản đồ hiện tại: ${mapTheme === 'satellite' ? 'Ảnh vệ tinh' : mapTheme === 'streets' ? 'Đường phố' : 'Pastel'}`}
          >
            <Layers className="w-5 h-5 text-rose-400" />
          </button>

          {/* Locate Device GPS */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-10 h-10 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg transition cursor-pointer"
            title="Định vị vị trí của tôi"
          >
            <LocateFixed className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg text-lg font-bold transition cursor-pointer"
            title="Phóng to"
          >
            +
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-lg text-lg font-bold transition cursor-pointer"
            title="Thu nhỏ"
          >
            -
          </button>
        </div>

        {/* Map Theme Indicator Badge */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{mapTheme === 'satellite' ? 'Ảnh Vệ Tinh Trực Tuyến' : mapTheme === 'streets' ? 'Bản Đồ Đường Phố' : 'Bản Đồ Nhẹ'}</span>
            <span className="text-rose-400">({filteredFootprints.length} điểm)</span>
          </div>
        </div>
      </div>

      {/* 5. SELECTED FOOTPRINT BOTTOM CARD (Compact, Modern, Supports Videos) */}
      {selectedFootprint && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-[420px] max-h-[75vh] overflow-y-auto z-30 bg-white/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/80 animate-slideUp">
          
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {selectedFootprint.title}
                </h3>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-rose-400" />
                  <span>{selectedFootprint.date}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFootprint(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Media Player / Carousel (Images AND Videos support) */}
          {selectedFootprint.images && selectedFootprint.images.length > 0 && (
            <div className="my-2.5 space-y-1.5">
              {(() => {
                const currentMedia = selectedFootprint.images[currentActiveMediaIndex] || selectedFootprint.images[0];
                const isVid = isVideoUrl(currentMedia);

                return (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                    {isVid ? (
                      <video
                        src={currentMedia}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={currentMedia}
                        alt={selectedFootprint.title}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Media Type Badge */}
                    {isVid && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Film className="w-3 h-3 text-rose-400" />
                        <span>Video</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Thumbnails list if multiple items */}
              {selectedFootprint.images.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {selectedFootprint.images.map((media, idx) => {
                    const isVid = isVideoUrl(media);
                    const isSelected = idx === currentActiveMediaIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentActiveMediaIndex(idx)}
                        className={`relative w-12 h-12 rounded-xl overflow-hidden border shrink-0 transition cursor-pointer ${
                          isSelected ? 'border-rose-500 ring-2 ring-rose-300' : 'border-slate-200 opacity-70'
                        }`}
                      >
                        {isVid ? (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                            <Play className="w-4 h-4 text-rose-400 fill-rose-400" />
                          </div>
                        ) : (
                          <img src={media} alt="Thumb" className="w-full h-full object-cover" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Location details */}
          <div className="space-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex items-center justify-between gap-1 p-2 bg-rose-50/60 rounded-xl border border-rose-100">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-bold text-slate-800 truncate">{selectedFootprint.locationName}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedFootprint.address || selectedFootprint.locationName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Chỉ đường</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* GPS Metadata coordinates badge */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3 h-3 text-rose-400" />
                <span>{selectedFootprint.lat.toFixed(6)}, {selectedFootprint.lng.toFixed(6)}</span>
              </span>
              {selectedFootprint.accuracy && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-sans font-bold">
                  ±{selectedFootprint.accuracy}m
                </span>
              )}
            </div>

            {/* Story */}
            {selectedFootprint.story && (
              <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                {selectedFootprint.story}
              </p>
            )}

            {/* Music */}
            {selectedFootprint.musicUrl && (
              <div className="pt-1">
                <JournalMusicPlayer musicUrl={selectedFootprint.musicUrl} musicTitle={selectedFootprint.musicTitle} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 mt-2">
            {selectedFootprint.type === 'journal' && selectedFootprint.journalRef && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenJournalLightbox && selectedFootprint.journalRef) {
                    onOpenJournalLightbox(selectedFootprint.journalRef, currentActiveMediaIndex);
                  } else if (onNavigateToJournal) {
                    onNavigateToJournal();
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Xem nhật ký</span>
              </button>
            )}

            {selectedFootprint.type === 'custom_place' && (
              <button
                type="button"
                onClick={() => handleDeleteCustomPlace(selectedFootprint.id.replace('place_', ''))}
                className="px-3 py-1.5 text-slate-400 hover:text-rose-500 rounded-xl text-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL: ADD CUSTOM SPOT / FOOTPRINT (Supports Images AND Videos) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-sm">Ghim Điểm Hẹn & Dấu Chân Tình Yêu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleAddCustomSpotSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên địa điểm / Quán cafe / Nơi hẹn hò: *
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
                    <span>{newSpotLat ? 'Đổi vị trí ghim' : 'Ghim trên Bản đồ'}</span>
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
                    ⚠️ Chưa có tọa độ GPS. Hãy bấm nút "Ghim trên Bản đồ" để chọn tọa độ chính xác.
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

              {/* Media Upload: Supports Photos AND Videos */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thêm Ảnh hoặc Video kỷ niệm (Hỗ trợ MP4, WEBM, MOV, Ảnh...):
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition">
                    <Video className="w-4 h-4 text-rose-500" />
                    <span>{isMediaLoading ? 'Đang đọc...' : 'Chọn Ảnh / Video'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleSpotMediaUpload}
                      disabled={isMediaLoading}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {newSpotImages.length} tệp đã chọn
                  </span>
                </div>

                {newSpotImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-2 no-scrollbar">
                    {newSpotImages.map((media, i) => {
                      const isVid = isVideoUrl(media);
                      return (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group bg-slate-900">
                          {isVid ? (
                            <div className="w-full h-full flex items-center justify-center text-white">
                              <Play className="w-5 h-5 text-rose-400 fill-rose-400" />
                            </div>
                          ) : (
                            <img src={media} alt="Preview" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setNewSpotImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      );
                    })}
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
          onSelectLocation={handleSaveFixingLocation}
        />
      )}

    </div>
  );
};

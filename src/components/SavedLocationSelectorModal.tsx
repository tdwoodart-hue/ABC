import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  Star,
  Sparkles,
  Clock,
  Camera,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Navigation,
  Crosshair,
  ChevronRight,
  Filter,
  CheckCircle2,
  Flame,
  Home,
  Coffee,
  Heart,
  Plane,
  Briefcase,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { JournalEntry, SavedPlace, UserProfile } from '../types';
import { extractLocationHistory, LocationHistoryItem } from '../utils/locationHistory';
import { db, collection, addDoc, doc, updateDoc, deleteDoc } from '../lib/firebase';
import { formatDateShortVN } from '../utils/formatDate';
import { getDeviceHighAccuracyGPS, reverseGeocodeGPS } from '../utils/geolocation';

const QUICK_EMOJIS = ['🏡', '☕', '❤️', '🌸', '🍔', '🌴', '⛺', '🏢', '🐾', '🎬', '💍', '✈️', '🏖️', '🛋️', '🍻', '🛍️'];

const PLACE_CATEGORIES: { id: SavedPlace['category'] & string; label: string; icon: any }[] = [
  { id: 'home', label: 'Tổ ấm / Nhà', icon: Home },
  { id: 'cafe', label: 'Quán Cafe', icon: Coffee },
  { id: 'date', label: 'Hẹn hò', icon: Heart },
  { id: 'travel', label: 'Du lịch', icon: Plane },
  { id: 'work', label: 'Cơ quan', icon: Briefcase },
  { id: 'other', label: 'Khác', icon: MapPin },
];

export interface SelectedLocationData {
  locationName: string;
  address: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  placeId?: string;
  locationTimestamp?: string;
}

interface SavedLocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: SelectedLocationData) => void;
  journals: JournalEntry[];
  savedPlaces: SavedPlace[];
  coupleId: string;
  userProfile: UserProfile;
  currentDraftLocation?: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
    placeId?: string;
  };
  onOpenMapPicker?: () => void;
}

export const SavedLocationSelectorModal: React.FC<SavedLocationSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  journals,
  savedPlaces,
  coupleId,
  userProfile,
  currentDraftLocation,
  onOpenMapPicker
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'saved' | 'photos' | 'recent'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal / Form state for Add or Edit Saved Place
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmoji, setFormEmoji] = useState('🏡');
  const [formCategory, setFormCategory] = useState<SavedPlace['category']>('home');
  const [formLat, setFormLat] = useState<number | undefined>(undefined);
  const [formLng, setFormLng] = useState<number | undefined>(undefined);
  const [formAccuracy, setFormAccuracy] = useState<number | undefined>(undefined);
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Extract merged history
  const allHistoryItems = useMemo(() => {
    return extractLocationHistory(journals, savedPlaces);
  }, [journals, savedPlaces]);

  // Filtered and sorted list
  const filteredItems = useMemo(() => {
    let list = [...allHistoryItems];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.customNickname && item.customNickname.toLowerCase().includes(q)) ||
          (item.address && item.address.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    // Filter tab
    if (filterTab === 'saved') {
      list = list.filter((item) => item.isSaved);
    } else if (filterTab === 'photos') {
      list = list.filter((item) => item.photoCount > 0).sort((a, b) => b.photoCount - a.photoCount);
    } else if (filterTab === 'recent') {
      list = list.filter((item) => Boolean(item.lastVisited)).sort((a, b) => (b.lastVisited || '').localeCompare(a.lastVisited || ''));
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    return list;
  }, [allHistoryItems, searchQuery, filterTab, selectedCategory]);

  if (!isOpen) return null;

  const handleOpenAddForm = (initialItem?: LocationHistoryItem | { name?: string; address?: string; lat?: number; lng?: number; accuracy?: number }) => {
    if (initialItem) {
      setEditingPlaceId(initialItem && 'savedPlaceId' in initialItem && initialItem.savedPlaceId ? initialItem.savedPlaceId : null);
      setFormName(initialItem.name || '');
      setFormAddress(initialItem.address || '');
      setFormEmoji(initialItem && 'emoji' in initialItem && initialItem.emoji ? initialItem.emoji : '🏡');
      setFormCategory(initialItem && 'category' in initialItem && initialItem.category ? (initialItem.category as any) : 'home');
      setFormLat(initialItem.lat);
      setFormLng(initialItem.lng);
      setFormAccuracy(initialItem.accuracy);
      setFormNotes(initialItem && 'notes' in initialItem && initialItem.notes ? initialItem.notes : '');
    } else if (currentDraftLocation && (currentDraftLocation.name || currentDraftLocation.lat)) {
      setEditingPlaceId(null);
      setFormName(currentDraftLocation.name || '');
      setFormAddress(currentDraftLocation.address || '');
      setFormEmoji('🏡');
      setFormCategory('home');
      setFormLat(currentDraftLocation.lat);
      setFormLng(currentDraftLocation.lng);
      setFormAccuracy(currentDraftLocation.accuracy);
      setFormNotes('');
    } else {
      setEditingPlaceId(null);
      setFormName('');
      setFormAddress('');
      setFormEmoji('🏡');
      setFormCategory('home');
      setFormLat(undefined);
      setFormLng(undefined);
      setFormAccuracy(undefined);
      setFormNotes('');
    }
    setShowAddForm(true);
  };

  const handleFetchGPSForForm = async () => {
    setIsLocatingGPS(true);
    try {
      const gps = await getDeviceHighAccuracyGPS();
      setFormLat(gps.latitude);
      setFormLng(gps.longitude);
      setFormAccuracy(gps.accuracy);

      const geocoded = await reverseGeocodeGPS(gps.latitude, gps.longitude);
      if (!formName) {
        setFormName(geocoded.placeName);
      }
      if (!formAddress) {
        setFormAddress(geocoded.formattedAddress);
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể lấy vị trí GPS hiện tại.');
    } finally {
      setIsLocatingGPS(false);
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !formName.trim()) {
      alert('Vui lòng nhập tên hoặc tên riêng cho địa điểm.');
      return;
    }

    setIsSaving(true);
    try {
      const placesCol = collection(db, 'couples', coupleId, 'saved_places');
      const payload: Record<string, any> = {
        name: formName.trim(),
        address: formAddress.trim(),
        emoji: formEmoji || '🏡',
        category: formCategory,
        notes: formNotes.trim(),
        updatedAt: new Date().toISOString()
      };

      if (typeof formLat === 'number' && !isNaN(formLat)) {
        payload.lat = formLat;
      }
      if (typeof formLng === 'number' && !isNaN(formLng)) {
        payload.lng = formLng;
      }
      if (typeof formAccuracy === 'number' && !isNaN(formAccuracy)) {
        payload.accuracy = formAccuracy;
      }

      if (editingPlaceId) {
        const placeDoc = doc(db, 'couples', coupleId, 'saved_places', editingPlaceId);
        await updateDoc(placeDoc, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        payload.addedByUid = userProfile.uid;
        payload.addedByName = userProfile.displayName;
        payload.visitCount = 0;
        await addDoc(placesCol, payload);
      }

      setShowAddForm(false);
      setEditingPlaceId(null);
    } catch (err) {
      console.error('Lỗi lưu địa điểm:', err);
      alert('Không thể lưu địa điểm thân quen. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedPlace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!coupleId) return;
    if (!confirm('Bạn có chắc muốn xóa địa điểm thân quen này khỏi danh sách lưu?')) return;

    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'saved_places', id));
    } catch (err) {
      console.error('Lỗi xóa địa điểm:', err);
    }
  };

  const handlePickItem = (item: LocationHistoryItem) => {
    onSelectLocation({
      locationName: item.name,
      address: item.address || item.name,
      lat: item.lat,
      lng: item.lng,
      accuracy: item.accuracy,
      placeId: item.placeId,
      locationTimestamp: item.lastVisited || new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Star className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
                <span>Địa điểm thân quen & Đã từng ghé</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-extrabold">
                  {allHistoryItems.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn địa chỉ chụp nhiều ảnh hoặc đặt tên riêng cho góc kỷ niệm của 2 đứa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenAddForm()}
              className="h-9 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đặt tên địa điểm</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/60 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên riêng, địa chỉ, quán quen, thành phố..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({allHistoryItems.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('saved')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterTab === 'saved'
                  ? 'bg-rose-500 text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Đã đặt tên ({savedPlaces.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('photos')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterTab === 'photos'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>Nhiều ảnh nhất</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('recent')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                filterTab === 'recent'
                  ? 'bg-sky-500 text-white shadow-2xs font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Gần đây nhất</span>
            </button>

            {/* If draft location exists, show quick-save prompt */}
            {currentDraftLocation && (currentDraftLocation.name || currentDraftLocation.lat) && (
              <button
                type="button"
                onClick={() => handleOpenAddForm(currentDraftLocation)}
                className="ml-auto px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 whitespace-nowrap flex items-center gap-1 text-[11px] font-bold"
              >
                <Sparkles className="w-3 h-3 text-rose-500" />
                <span>Lưu vị trí đang chọn</span>
              </button>
            )}
          </div>
        </div>

        {/* LIST CONTENT */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Chưa tìm thấy địa điểm phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn có thể bấm "Đặt tên địa điểm" ở góc trên để tạo mới hoặc lưu tên riêng cho góc kỷ niệm của 2 bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddForm()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đặt tên địa điểm mới</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handlePickItem(item)}
                className="pt-2.5 first:pt-0 group relative bg-white hover:bg-rose-50/40 p-3 rounded-2xl border border-slate-200/70 hover:border-rose-300 transition cursor-pointer shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Emoji Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition shadow-2xs">
                    {item.emoji || (item.isSaved ? '⭐' : '📍')}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.customNickname || item.name}
                      </h4>
                      {item.isSaved && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Đã đặt tên
                        </span>
                      )}
                      {item.photoCount >= 5 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-amber-600" />
                          Chụp nhiều ảnh ({item.photoCount})
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.address || item.name}</span>
                    </p>

                    {/* Stats & Meta Chips */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 pt-0.5">
                      {item.photoCount > 0 && (
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-400" />
                          {item.photoCount} ảnh & video
                        </span>
                      )}

                      {item.entryCount > 0 && (
                        <span>· {item.entryCount} trang kỷ niệm</span>
                      )}

                      {item.lastVisited && (
                        <span>· Ghé gần nhất: {formatDateShortVN(item.lastVisited)}</span>
                      )}

                      {item.lat && item.lng && (
                        <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          GPS: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                        </span>
                      )}
                    </div>

                    {/* Sample images preview */}
                    {item.sampleImages && item.sampleImages.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {item.sampleImages.slice(0, 4).map((img, idx) => (
                          <div key={idx} className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200/80 bg-slate-100 shrink-0">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {item.photoCount > 4 && (
                          <span className="text-[9px] text-slate-400 font-bold ml-1">
                            +{item.photoCount - 4} ảnh khác
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1.5 sm:self-center shrink-0 justify-end pt-1 sm:pt-0">
                  {!item.isSaved ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddForm(item);
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[11px] font-bold border border-rose-200 flex items-center gap-1 transition"
                      title="Đặt tên riêng & ghim địa điểm này"
                    >
                      <Star className="w-3 h-3 text-rose-500" />
                      <span>Đặt tên riêng</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenAddForm(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Chỉnh sửa tên / địa chỉ"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedPlace(item.savedPlaceId || item.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Xóa khỏi địa điểm đã lưu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePickItem(item)}
                    className="px-3 py-1.5 bg-rose-500 group-hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition"
                  >
                    <span>Chọn</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BOTTOM FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Nhấp vào bất kỳ địa điểm nào để điền tự động vào kỷ niệm.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* NESTED FORM MODAL: ADD / EDIT SAVED PLACE */}
      {showAddForm && (
        <div className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlace}
            className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {editingPlaceId ? 'Chỉnh sửa địa điểm thân quen' : 'Đặt tên riêng cho địa điểm'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Lưu vào danh sách để chọn nhanh cho những lần chụp ảnh tiếp theo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Emoji & Nickname */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên riêng / Biệt danh địa điểm <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl cursor-pointer">
                    {formEmoji}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="VD: Tổ ấm của chúng mình, Góc cafe quen, Nhà Dương, Nhà Chúc Gà, Chỗ tỏ tình..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              {/* Quick Emojis */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">Biểu tượng:</span>
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFormEmoji(em)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition ${
                      formEmoji === em ? 'bg-rose-100 border border-rose-300 scale-110' : 'hover:bg-slate-100'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phân loại không gian
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PLACE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-300'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ chi tiết <span className="text-[10px] text-slate-400">(Số nhà, Đường, Quận/Huyện, Tỉnh/TP)</span>
              </label>
              <input
                type="text"
                placeholder="VD: 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh..."
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
              />
            </div>

            {/* GPS Coordinates */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-rose-500" />
                  Tọa độ GPS vị trí
                </span>
                <button
                  type="button"
                  onClick={handleFetchGPSForForm}
                  disabled={isLocatingGPS}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isLocatingGPS ? 'Đang đọc GPS...' : 'Lấy GPS hiện tại'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Vĩ độ (Lat)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="21.028511"
                    value={formLat !== undefined ? formLat : ''}
                    onChange={(e) => setFormLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kinh độ (Lng)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="105.854444"
                    value={formLng !== undefined ? formLng : ''}
                    onChange={(e) => setFormLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú riêng của 2 đứa <span className="text-[10px] text-slate-400">(Không bắt buộc)</span>
              </label>
              <textarea
                rows={2}
                placeholder="VD: Quán cafe hẹn hò đầu tiên, nơi chụp bộ ảnh kỷ niệm mùa thu..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu địa điểm'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

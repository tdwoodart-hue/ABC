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
  const [showAdvancedPlaceForm, setShowAdvancedPlaceForm] = useState(false);

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
    setShowAdvancedPlaceForm(false);
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
      locationName: item.customNickname || item.name,
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
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <h3 className="app-section-title">Địa điểm</h3>
            <p className="app-caption mt-0.5">{allHistoryItems.length} địa điểm</p>
          </div>

          <div className="flex items-center gap-1">
            {onOpenMapPicker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMapPicker();
                }}
                className="app-icon-button"
                aria-label="Mở bản đồ"
                title="Bản đồ"
              >
                <MapPin className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenAddForm()}
              className="app-icon-button app-icon-button-brand"
              aria-label="Thêm địa điểm"
              title="Thêm"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="app-icon-button"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-slate-100 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Tìm địa điểm"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="app-control h-11 w-full pl-10 pr-9 text-sm placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="app-icon-button absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`app-chip ${filterTab === 'all' ? 'app-chip-active' : ''}`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('saved')}
              className={`app-chip ${filterTab === 'saved' ? 'app-chip-active' : ''}`}
            >
              <Star className="h-3 w-3" />
              Đã lưu
            </button>

            {currentDraftLocation && (currentDraftLocation.name || currentDraftLocation.lat) && (
              <button
                type="button"
                onClick={() => handleOpenAddForm(currentDraftLocation)}
                className="app-chip ml-auto"
              >
                Lưu vị trí này
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <MapPin className="mx-auto h-6 w-6 text-slate-300" />
              <p className="app-caption mt-2">Không có địa điểm</p>
              <button
                type="button"
                onClick={() => handleOpenAddForm()}
                className="app-button app-button-primary mt-4 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handlePickItem(item)}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg">
                  {item.emoji || (item.isSaved ? '⭐' : '📍')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {item.customNickname || item.name}
                    </span>
                    {item.isSaved && <Star className="h-3 w-3 shrink-0 fill-rose-400 text-rose-400" />}
                  </div>
                  <p className="truncate text-[11px] text-slate-400">
                    {item.address || item.name}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {item.isSaved ? (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenAddForm(item);
                        }}
                        className="app-icon-button h-9 w-9"
                        aria-label="Sửa"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) =>
                          handleDeleteSavedPlace(item.savedPlaceId || item.id, event)
                        }
                        className="app-icon-button h-9 w-9 hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenAddForm(item);
                      }}
                      className="app-icon-button h-9 w-9"
                      aria-label="Lưu"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>

        {showAddForm && (
          <div className="absolute inset-0 z-20 flex items-end bg-black/25 sm:items-center sm:justify-center sm:p-4">
            <form
              onSubmit={handleSavePlace}
              className="w-full rounded-t-[24px] bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-[24px]"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="app-section-title">
                  {editingPlaceId ? 'Sửa địa điểm' : 'Thêm địa điểm'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="app-icon-button h-9 w-9"
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  placeholder="Tên địa điểm"
                  className="app-control w-full px-3 text-sm"
                />

                <input
                  type="text"
                  value={formAddress}
                  onChange={(event) => setFormAddress(event.target.value)}
                  placeholder="Địa chỉ"
                  className="app-control w-full px-3 text-sm"
                />

                <button
                  type="button"
                  onClick={handleFetchGPSForForm}
                  disabled={isLocatingGPS}
                  className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLocatingGPS ? (
                    <Navigation className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Crosshair className="h-4 w-4" />
                  )}
                  Vị trí hiện tại
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvancedPlaceForm((value) => !value)}
                  className="text-xs font-semibold text-slate-500"
                >
                  {showAdvancedPlaceForm ? 'Ẩn tùy chọn' : 'Tùy chọn'}
                </button>

                {showAdvancedPlaceForm && (
                  <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormEmoji(emoji)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            formEmoji === emoji ? 'bg-rose-100 ring-1 ring-rose-200' : 'bg-white'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {PLACE_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const selected = formCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setFormCategory(category.id)}
                            className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${
                              selected
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-white text-slate-500'
                            }`}
                          >
                            <Icon className="mx-auto mb-1 h-3.5 w-3.5" />
                            {category.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(event) => setFormNotes(event.target.value)}
                      placeholder="Ghi chú"
                      className="app-control w-full resize-none px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="app-button app-button-secondary flex-1"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim()}
                  className="app-button app-button-primary flex-[1.2] disabled:opacity-40"
                >
                  {isSaving ? 'Đang lưu' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

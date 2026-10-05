import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { JournalEntry, SavedPlace, UserProfile } from '../types';
import {
  extractLocationHistory,
  LocationHistoryItem,
} from '../utils/locationHistory';
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from '../lib/firebase';
import {
  getDeviceHighAccuracyGPS,
  reverseGeocodeGPS,
} from '../utils/geolocation';

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

export const SavedLocationSelectorModal: React.FC<
  SavedLocationSelectorModalProps
> = ({
  isOpen,
  onClose,
  onSelectLocation,
  journals,
  savedPlaces,
  coupleId,
  userProfile,
  currentDraftLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();
  const [formAccuracy, setFormAccuracy] = useState<number | undefined>();
  const [formEmoji, setFormEmoji] = useState('📍');
  const [formCategory, setFormCategory] =
    useState<SavedPlace['category']>('other');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  const items = useMemo(
    () => extractLocationHistory(journals, savedPlaces),
    [journals, savedPlaces]
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (savedOnly && !item.isSaved) return false;
      if (!query) return true;

      return (
        item.name.toLowerCase().includes(query) ||
        item.customNickname?.toLowerCase().includes(query) ||
        item.address?.toLowerCase().includes(query)
      );
    });
  }, [items, savedOnly, searchQuery]);

  if (!isOpen) return null;

  const openForm = (
    item?:
      | LocationHistoryItem
      | {
          name?: string;
          address?: string;
          lat?: number;
          lng?: number;
          accuracy?: number;
        }
  ) => {
    if (item) {
      setEditingPlaceId(
        'savedPlaceId' in item ? item.savedPlaceId || null : null
      );
      setFormName(
        'customNickname' in item && item.customNickname
          ? item.customNickname
          : item.name || ''
      );
      setFormAddress(item.address || '');
      setFormLat(item.lat);
      setFormLng(item.lng);
      setFormAccuracy(item.accuracy);
      setFormEmoji('emoji' in item && item.emoji ? item.emoji : '📍');
      setFormCategory(
        'category' in item && item.category
          ? (item.category as SavedPlace['category'])
          : 'other'
      );
      setFormNotes('notes' in item && item.notes ? item.notes : '');
    } else if (
      currentDraftLocation &&
      (currentDraftLocation.name || currentDraftLocation.lat)
    ) {
      setEditingPlaceId(null);
      setFormName(currentDraftLocation.name || '');
      setFormAddress(currentDraftLocation.address || '');
      setFormLat(currentDraftLocation.lat);
      setFormLng(currentDraftLocation.lng);
      setFormAccuracy(currentDraftLocation.accuracy);
      setFormEmoji('📍');
      setFormCategory('other');
      setFormNotes('');
    } else {
      setEditingPlaceId(null);
      setFormName('');
      setFormAddress('');
      setFormLat(undefined);
      setFormLng(undefined);
      setFormAccuracy(undefined);
      setFormEmoji('📍');
      setFormCategory('other');
      setFormNotes('');
    }

    setShowForm(true);
  };

  const fetchCurrentLocation = async () => {
    setIsLocatingGPS(true);

    try {
      const gps = await getDeviceHighAccuracyGPS();
      setFormLat(gps.latitude);
      setFormLng(gps.longitude);
      setFormAccuracy(gps.accuracy);

      const geo = await reverseGeocodeGPS(gps.latitude, gps.longitude);
      if (!formName) setFormName(geo.placeName);
      setFormAddress(geo.formattedAddress);
    } catch (error: any) {
      alert(error?.message || 'Không thể lấy vị trí hiện tại.');
    } finally {
      setIsLocatingGPS(false);
    }
  };

  const savePlace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!coupleId || !formName.trim()) return;

    setIsSaving(true);

    try {
      const payload: Record<string, any> = {
        name: formName.trim(),
        address: formAddress.trim(),
        emoji: formEmoji || '📍',
        category: formCategory || 'other',
        notes: formNotes,
        updatedAt: new Date().toISOString(),
      };

      if (typeof formLat === 'number') payload.lat = formLat;
      if (typeof formLng === 'number') payload.lng = formLng;
      if (typeof formAccuracy === 'number') payload.accuracy = formAccuracy;

      if (editingPlaceId) {
        await updateDoc(
          doc(db, 'couples', coupleId, 'saved_places', editingPlaceId),
          payload
        );
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'saved_places'), {
          ...payload,
          createdAt: new Date().toISOString(),
          addedByUid: userProfile.uid,
          addedByName: userProfile.displayName,
          visitCount: 0,
        });
      }

      setShowForm(false);
      setEditingPlaceId(null);
    } catch (error) {
      console.error('Lỗi lưu địa điểm:', error);
      alert('Không thể lưu địa điểm.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeSavedPlace = async (
    id: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (!coupleId || !confirm('Xóa địa điểm đã lưu?')) return;

    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'saved_places', id));
    } catch (error) {
      console.error('Lỗi xóa địa điểm:', error);
    }
  };

  const pick = (item: LocationHistoryItem) => {
    onSelectLocation({
      locationName: item.customNickname || item.name,
      address: item.address || item.name,
      lat: item.lat,
      lng: item.lng,
      accuracy: item.accuracy,
      placeId: item.placeId,
      locationTimestamp: item.lastVisited || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="app-modal-backdrop" onClick={onClose} aria-label="Đóng" />
      <div className="app-sheet relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[24px] sm:max-w-xl sm:rounded-[24px]">
        <div className="app-sheet-header">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-rose-500" />
            <h3 className="app-section-title">Địa điểm</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openForm(currentDraftLocation)}
              className="app-icon-button h-9 w-9"
              aria-label="Lưu địa điểm"
              title="Lưu địa điểm"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="app-icon-button h-9 w-9"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2 border-y border-slate-100 px-4 py-3 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm địa điểm"
              className="app-control h-11 w-full pl-10 pr-3 text-sm"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSavedOnly(false)}
              className={`app-chip ${!savedOnly ? 'app-chip-active' : ''}`}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => setSavedOnly(true)}
              className={`app-chip ${savedOnly ? 'app-chip-active' : ''}`}
            >
              <Star className="h-3 w-3" />
              Đã lưu
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Chưa có địa điểm
              </p>
              <button
                type="button"
                onClick={() => openForm(currentDraftLocation)}
                className="app-button app-button-primary mt-4 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => pick(item)}
                  className="group flex cursor-pointer items-center gap-3 px-2 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg">
                    {item.emoji || (item.isSaved ? '⭐' : '📍')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {item.customNickname || item.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {item.address || item.name}
                    </div>
                  </div>

                  {item.isSaved && (
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openForm(item)}
                        className="app-icon-button h-8 w-8"
                        aria-label="Sửa"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(event) =>
                          removeSavedPlace(item.savedPlaceId || item.id, event)
                        }
                        className="app-icon-button h-8 w-8 hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="app-modal-backdrop" onClick={() => setShowForm(false)} aria-label="Đóng" />
          <form
            onSubmit={savePlace}
            className="app-sheet relative z-10 w-full overflow-hidden rounded-t-[24px] sm:max-w-md sm:rounded-[24px]"
          >
            <div className="app-sheet-header">
              <h4 className="app-section-title">
                {editingPlaceId ? 'Sửa địa điểm' : 'Lưu địa điểm'}
              </h4>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4 sm:px-5">
              <input
                type="text"
                required
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                placeholder="Tên địa điểm"
                className="app-control h-11 w-full px-3 text-sm"
              />

              <input
                type="text"
                value={formAddress}
                onChange={(event) => setFormAddress(event.target.value)}
                placeholder="Địa chỉ"
                className="app-control h-11 w-full px-3 text-sm"
              />

              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isLocatingGPS}
                className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-1.5"
              >
                {isLocatingGPS ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {isLocatingGPS ? 'Đang lấy vị trí' : 'Dùng vị trí hiện tại'}
              </button>
            </div>

            <div className="app-sheet-footer">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="app-button app-button-primary flex-[1.2]"
              >
                <span className="inline-flex items-center gap-1.5">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isSaving ? 'Đang lưu' : 'Lưu'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  UserProfile,
  CoupleData,
  Companion,
  TaggedPerson,
  JournalExpense,
  SavedPlace,
  JournalEntry,
} from '../types';
import { TagPeopleSelector } from './TagPeopleSelector';
import { JournalMusicPlayer } from './JournalMusicPlayer';
import { VoiceMemoRecorder } from './journal/VoiceMemoRecorder';
import { isVideoUrl } from '../utils/mediaHelper';
import {
  extractLocationHistory,
  LocationHistoryItem,
} from '../utils/locationHistory';
import {
  SavedLocationSelectorModal,
  SelectedLocationData,
} from './SavedLocationSelectorModal';
import {
  Calendar,
  Camera,
  Check,
  Crosshair,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  MoreHorizontal,
  Music,
  Navigation,
  Play,
  Receipt,
  Star,
  Upload,
  Users,
  X,
} from 'lucide-react';

export interface JournalFormData {
  title: string;
  content: string;
  date: string;
  location: string;
  locationAddress: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  locationTimestamp: string | null;
  placeId: string | null;
  images: string[];
  videoThumbnails: Record<string, string>;
  mainImageIndex: number;
  expenses: JournalExpense[];
  taggedPeople: TaggedPerson[];
  musicUrl: string;
  musicTitle: string;
  voiceMemoUrl?: string;
  voiceMemoDuration?: number;
  voiceMemoTitle?: string;
  voiceMemoRecordedByName?: string;
}

interface JournalFormProps {
  mode: 'create' | 'edit';
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  companions: Companion[];
  formData: JournalFormData;
  isAuthor: boolean;
  isLoading: boolean;
  imageUploading: boolean;
  autoLocatingGPS: boolean;
  savedPlaces?: SavedPlace[];
  journals?: JournalEntry[];
  onFormChange: (updated: Partial<JournalFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenMapPicker: () => void;
  onAutoDetectGPS: () => void;
  onOpenCamera: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCompanionManager: () => void;
}

type ComposerPanel = 'location' | 'people' | 'voice' | 'more' | null;

export const JournalForm: React.FC<JournalFormProps> = ({
  mode,
  userProfile,
  coupleData,
  companions,
  formData,
  isAuthor,
  isLoading,
  imageUploading,
  autoLocatingGPS,
  savedPlaces = [],
  journals = [],
  onFormChange,
  onSubmit,
  onCancel,
  onOpenMapPicker,
  onAutoDetectGPS,
  onOpenCamera,
  onFilesSelected,
  onOpenCompanionManager,
}) => {
  const canEdit = isAuthor || mode === 'create';
  const [panel, setPanel] = useState<ComposerPanel>(null);
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);
  const [selectedPlaceNotice, setSelectedPlaceNotice] = useState<string | null>(null);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  const quickPlaces = useMemo(() => {
    const history = extractLocationHistory(journals, savedPlaces);
    return history.slice(0, 5);
  }, [journals, savedPlaces]);

  const activeExtrasCount = [
    Boolean(formData.title.trim()),
    Boolean(formData.musicUrl.trim()),
    formData.expenses.length > 0,
  ].filter(Boolean).length;

  const togglePanel = (next: Exclude<ComposerPanel, null>) => {
    setPanel((current) => (current === next ? null : next));
  };

  const handleSelectQuickLocation = (
    place: LocationHistoryItem | SelectedLocationData
  ) => {
    const locationName =
      ('customNickname' in place && place.customNickname)
        ? place.customNickname
        : ('locationName' in place && place.locationName)
          ? place.locationName
          : ('name' in place && place.name)
            ? place.name
            : '';

    onFormChange({
      location: locationName,
      locationAddress: place.address || locationName,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      accuracy: place.accuracy ?? null,
      placeId: place.placeId ?? null,
      locationTimestamp:
        'lastVisited' in place && place.lastVisited
          ? place.lastVisited
          : new Date().toISOString(),
    });

    setSelectedPlaceNotice(locationName ? `Đã chọn ${locationName}` : 'Đã chọn địa điểm');
    window.setTimeout(() => setSelectedPlaceNotice(null), 2200);
  };

  const handleClearLocation = () => {
    onFormChange({
      location: '',
      locationAddress: '',
      lat: null,
      lng: null,
      accuracy: null,
      locationTimestamp: null,
      placeId: null,
    });
  };

  const handleRemoveImage = (index: number) => {
    const images = formData.images.filter((_, currentIndex) => currentIndex !== index);
    let mainImageIndex = formData.mainImageIndex;

    if (mainImageIndex === index || mainImageIndex >= images.length) {
      mainImageIndex = 0;
    } else if (mainImageIndex > index) {
      mainImageIndex -= 1;
    }

    onFormChange({ images, mainImageIndex });
  };

  const handleAddExpense = () => {
    if (!newExpTitle.trim() || !newExpAmount) return;

    const amount = Number(newExpAmount.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const expense: JournalExpense = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newExpTitle.trim(),
      amount,
    };

    onFormChange({ expenses: [...formData.expenses, expense] });
    setNewExpTitle('');
    setNewExpAmount('');
  };

  const handleRemoveExpense = (expenseId: string) => {
    onFormChange({
      expenses: formData.expenses.filter((expense) => expense.id !== expenseId),
    });
  };

  const iconButtonClass = (active = false) =>
    `relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
      active
        ? 'border-rose-200 bg-rose-50 text-rose-600'
        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`;

  return (
    <form
      onSubmit={onSubmit}
      className="animate-in fade-in overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm duration-200"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-900">
            {mode === 'create'
              ? 'Viết nhật ký'
              : canEdit
                ? 'Chỉnh sửa nhật ký'
                : 'Nhật ký'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative flex min-h-9 items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 text-xs font-semibold text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              required
              disabled={!canEdit}
              value={formData.date}
              onChange={(event) => onFormChange({ date: event.target.value })}
              className="max-w-[118px] bg-transparent text-xs font-semibold text-slate-600 outline-none disabled:opacity-70"
              aria-label="Ngày nhật ký"
            />
          </label>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <textarea
          rows={5}
          disabled={!canEdit}
          placeholder={mode === 'create' ? 'Hôm nay có gì đáng nhớ?' : 'Viết lại khoảnh khắc này...'}
          value={formData.content}
          onChange={(event) => onFormChange({ content: event.target.value })}
          className="min-h-[128px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-700"
        />

        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {formData.images.map((mediaUrl, index) => {
              const video = isVideoUrl(mediaUrl);
              const thumbnail = formData.videoThumbnails[mediaUrl];
              const isMain = formData.mainImageIndex === index;

              return (
                <div
                  key={`${mediaUrl}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100"
                >
                  {video ? (
                    thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={mediaUrl}
                        className="h-full w-full object-cover"
                        preload="metadata"
                      />
                    )
                  ) : (
                    <img
                      src={mediaUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}

                  {video && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="rounded-full bg-black/55 p-2 text-white">
                        <Play className="h-4 w-4 fill-white" />
                      </div>
                    </div>
                  )}

                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => onFormChange({ mainImageIndex: index })}
                        className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition ${
                          isMain
                            ? 'bg-amber-400 text-white'
                            : 'bg-black/50 text-white hover:bg-black/70'
                        }`}
                        aria-label={isMain ? 'Ảnh chính' : 'Đặt làm ảnh chính'}
                        title={isMain ? 'Ảnh chính' : 'Đặt làm ảnh chính'}
                      >
                        <Star className={`h-3.5 w-3.5 ${isMain ? 'fill-white' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white shadow-sm transition hover:bg-rose-600"
                        aria-label="Xóa ảnh hoặc video"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {imageUploading && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
            Đang tải ảnh/video...
          </div>
        )}

        {(formData.location ||
          formData.taggedPeople.length > 0 ||
          formData.voiceMemoUrl ||
          formData.musicUrl ||
          formData.expenses.length > 0 ||
          formData.title) && (
          <div className="flex flex-wrap gap-1.5">
            {formData.location && (
              <button
                type="button"
                onClick={() => togglePanel('location')}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{formData.location}</span>
              </button>
            )}

            {formData.taggedPeople.length > 0 && (
              <button
                type="button"
                onClick={() => togglePanel('people')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                <Users className="h-3 w-3" />
                {formData.taggedPeople.length}
              </button>
            )}

            {formData.voiceMemoUrl && (
              <button
                type="button"
                onClick={() => togglePanel('voice')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                <Mic className="h-3 w-3" />
                {formData.voiceMemoDuration
                  ? `${Math.max(1, Math.round(formData.voiceMemoDuration))}s`
                  : 'Ghi âm'}
              </button>
            )}

            {formData.musicUrl && (
              <button
                type="button"
                onClick={() => togglePanel('more')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                <Music className="h-3 w-3" />
                {formData.musicTitle || 'Nhạc'}
              </button>
            )}

            {formData.expenses.length > 0 && (
              <button
                type="button"
                onClick={() => togglePanel('more')}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
              >
                <Receipt className="h-3 w-3" />
                {formData.expenses.length}
              </button>
            )}

            {formData.title && (
              <button
                type="button"
                onClick={() => togglePanel('more')}
                className="max-w-[180px] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              >
                {formData.title}
              </button>
            )}
          </div>
        )}

        {canEdit && (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-3 no-scrollbar">
            <button
              type="button"
              onClick={onOpenCamera}
              disabled={imageUploading}
              className={iconButtonClass(false)}
              aria-label="Chụp ảnh"
              title="Chụp ảnh"
            >
              <Camera className="h-5 w-5" />
            </button>

            <label
              className={`${iconButtonClass(false)} ${
                imageUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }`}
              aria-label="Chọn ảnh hoặc video"
              title="Chọn ảnh/video"
            >
              <ImageIcon className="h-5 w-5" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,image/*"
                multiple
                onChange={onFilesSelected}
                className="hidden"
                disabled={imageUploading}
              />
            </label>

            <button
              type="button"
              onClick={() => togglePanel('location')}
              className={iconButtonClass(panel === 'location' || Boolean(formData.location))}
              aria-label="Địa điểm"
              title="Địa điểm"
            >
              <MapPin className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel('people')}
              className={iconButtonClass(panel === 'people' || formData.taggedPeople.length > 0)}
              aria-label="Gắn người"
              title="Gắn người"
            >
              <Users className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel('voice')}
              className={iconButtonClass(panel === 'voice' || Boolean(formData.voiceMemoUrl))}
              aria-label="Ghi âm"
              title="Ghi âm"
            >
              <Mic className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel('more')}
              className={iconButtonClass(panel === 'more' || activeExtrasCount > 0)}
              aria-label="Thêm tùy chọn"
              title="Thêm tùy chọn"
            >
              <MoreHorizontal className="h-5 w-5" />
              {activeExtrasCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {activeExtrasCount}
                </span>
              )}
            </button>
          </div>
        )}

        {panel === 'location' && (
          <div className="animate-in fade-in space-y-3 rounded-2xl bg-slate-50 p-3 duration-150">
            {canEdit && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={onAutoDetectGPS}
                  disabled={autoLocatingGPS}
                  className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-2 text-xs font-semibold text-slate-700 shadow-xs disabled:opacity-50"
                >
                  {autoLocatingGPS ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5 text-sky-500" />
                  )}
                  Hiện tại
                </button>

                <button
                  type="button"
                  onClick={() => setIsSavedPlacesModalOpen(true)}
                  className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-2 text-xs font-semibold text-slate-700 shadow-xs"
                >
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Đã lưu
                </button>

                <button
                  type="button"
                  onClick={onOpenMapPicker}
                  className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-2 text-xs font-semibold text-slate-700 shadow-xs"
                >
                  <MapPin className="h-3.5 w-3.5 text-rose-500" />
                  Bản đồ
                </button>
              </div>
            )}

            {quickPlaces.length > 0 && canEdit && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {quickPlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectQuickLocation(place)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {place.emoji || (place.isSaved ? '⭐' : '📍')}{' '}
                    {place.customNickname || place.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                disabled={!canEdit}
                value={formData.location}
                onChange={(event) => onFormChange({ location: event.target.value })}
                placeholder="Tên địa điểm"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-300 disabled:bg-slate-100"
              />
              {formData.location && canEdit && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-xs hover:text-rose-500"
                  aria-label="Xóa địa điểm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {formData.lat !== null && formData.lng !== null && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Crosshair className="h-3.5 w-3.5 text-rose-500" />
                <span>
                  {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                </span>
                {formData.accuracy ? <span>±{Math.round(formData.accuracy)}m</span> : null}
              </div>
            )}

            {selectedPlaceNotice && (
              <div className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                <Check className="h-3.5 w-3.5" />
                {selectedPlaceNotice}
              </div>
            )}
          </div>
        )}

        {panel === 'people' && (
          <div className="animate-in fade-in rounded-2xl bg-slate-50 p-3 duration-150">
            <TagPeopleSelector
              userProfile={userProfile}
              coupleData={coupleData}
              companions={companions}
              selectedTags={formData.taggedPeople}
              onChange={(tags) => onFormChange({ taggedPeople: tags })}
              onOpenCompanionManager={onOpenCompanionManager}
            />
          </div>
        )}

        {panel === 'voice' && (
          <div className="animate-in fade-in rounded-2xl bg-slate-50 p-3 duration-150">
            <VoiceMemoRecorder
              currentVoiceUrl={formData.voiceMemoUrl}
              currentVoiceDuration={formData.voiceMemoDuration}
              currentVoiceTitle={formData.voiceMemoTitle}
              recordedByName={
                formData.voiceMemoRecordedByName || userProfile.displayName
              }
              onVoiceMemoSaved={(data) =>
                onFormChange({
                  voiceMemoUrl: data.url,
                  voiceMemoDuration: data.duration,
                  voiceMemoTitle: data.title,
                  voiceMemoRecordedByName:
                    data.recordedByName || userProfile.displayName,
                })
              }
              onVoiceMemoRemoved={() =>
                onFormChange({
                  voiceMemoUrl: '',
                  voiceMemoDuration: 0,
                  voiceMemoTitle: '',
                  voiceMemoRecordedByName: '',
                })
              }
              disabled={!canEdit}
            />
          </div>
        )}

        {panel === 'more' && (
          <div className="animate-in fade-in space-y-4 rounded-2xl bg-slate-50 p-3 duration-150">
            <input
              type="text"
              disabled={!canEdit}
              value={formData.title}
              onChange={(event) => onFormChange({ title: event.target.value })}
              placeholder="Tiêu đề (không bắt buộc)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-rose-300 disabled:bg-slate-100"
            />

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Music className="h-4 w-4 text-rose-500" />
                Nhạc
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="url"
                  disabled={!canEdit}
                  value={formData.musicUrl}
                  onChange={(event) => onFormChange({ musicUrl: event.target.value })}
                  placeholder="Link bài hát"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-rose-300 disabled:bg-slate-100"
                />
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.musicTitle}
                  onChange={(event) => onFormChange({ musicTitle: event.target.value })}
                  placeholder="Tên bài hát"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-rose-300 disabled:bg-slate-100"
                />
              </div>

              {formData.musicUrl.trim() && (
                <JournalMusicPlayer
                  musicUrl={formData.musicUrl.trim()}
                  musicTitle={formData.musicTitle.trim()}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Receipt className="h-4 w-4 text-amber-600" />
                Chi tiêu
              </div>

              {canEdit && (
                <div className="grid grid-cols-[1fr_110px_auto] gap-2">
                  <input
                    type="text"
                    value={newExpTitle}
                    onChange={(event) => setNewExpTitle(event.target.value)}
                    placeholder="Khoản chi"
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-300"
                  />
                  <input
                    type="number"
                    value={newExpAmount}
                    onChange={(event) => setNewExpAmount(event.target.value)}
                    placeholder="Số tiền"
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"
                    aria-label="Thêm khoản chi"
                  >
                    +
                  </button>
                </div>
              )}

              {formData.expenses.length > 0 && (
                <div className="space-y-1">
                  {formData.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium text-slate-700">
                        {expense.title}
                      </span>
                      <div className="ml-3 flex items-center gap-2">
                        <span className="font-bold text-amber-700">
                          {expense.amount.toLocaleString('vi-VN')} đ
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(expense.id)}
                            className="text-slate-400 hover:text-rose-500"
                            aria-label="Xóa khoản chi"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isSavedPlacesModalOpen && coupleData?.id && (
          <SavedLocationSelectorModal
            isOpen={isSavedPlacesModalOpen}
            onClose={() => setIsSavedPlacesModalOpen(false)}
            onSelectLocation={handleSelectQuickLocation}
            journals={journals}
            savedPlaces={savedPlaces}
            coupleId={coupleData.id}
            userProfile={userProfile}
            currentDraftLocation={{
              name: formData.location,
              address: formData.locationAddress || formData.location,
              lat: formData.lat ?? undefined,
              lng: formData.lng ?? undefined,
              accuracy: formData.accuracy ?? undefined,
              placeId: formData.placeId ?? undefined,
            }}
            onOpenMapPicker={onOpenMapPicker}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 px-2 text-xs font-semibold text-slate-500"
        >
          {canEdit ? 'Hủy' : 'Đóng'}
        </button>

        {canEdit && (
          <button
            type="submit"
            disabled={isLoading || imageUploading}
            className="inline-flex min-h-10 min-w-[112px] items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang lưu
              </>
            ) : mode === 'create' ? (
              'Lưu nhật ký'
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        )}
      </div>
    </form>
  );
};

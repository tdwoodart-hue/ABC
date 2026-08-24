import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  CoupleData,
  Companion,
  TaggedPerson,
  JournalExpense,
  SavedPlace,
  JournalEntry
} from '../types';
import { CameraLocationMetadata } from './CameraCaptureModal';
import { TagPeopleSelector } from './TagPeopleSelector';
import { JournalMusicPlayer } from './JournalMusicPlayer';
import { VoiceMemoRecorder } from './journal/VoiceMemoRecorder';
import { isVideoUrl } from '../utils/mediaHelper';
import { extractLocationHistory, LocationHistoryItem } from '../utils/locationHistory';
import { SavedLocationSelectorModal, SelectedLocationData } from './SavedLocationSelectorModal';
import {
  Sparkles,
  MapPin,
  Navigation,
  Loader2,
  Crosshair,
  Calendar,
  Camera,
  Upload,
  Play,
  Star,
  X,
  Music,
  Mic,
  Receipt,
  Edit3,
  Users,
  Image as ImageIcon,
  Heart,
  ChevronRight,
  ChevronDown,
  Check
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
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [activeSection, setActiveSection] = useState<'info' | 'media' | 'location' | 'music_expense'>('info');
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);
  const [selectedPlaceNotice, setSelectedPlaceNotice] = useState<string | null>(null);

  // Top quick suggestions (saved places + high photo count places)
  const quickPlaces = useMemo(() => {
    const history = extractLocationHistory(journals, savedPlaces);
    return history.slice(0, 5);
  }, [journals, savedPlaces]);

  const handleSelectQuickLocation = (place: LocationHistoryItem | SelectedLocationData) => {
    const locName =
      ('customNickname' in place && place.customNickname)
        ? place.customNickname
        : ('locationName' in place && place.locationName)
          ? place.locationName
          : ('name' in place && place.name)
            ? place.name
            : '';
    const locAddress = place.address || locName;
    
    onFormChange({
      location: locName,
      locationAddress: locAddress,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      accuracy: place.accuracy ?? null,
      placeId: place.placeId ?? null,
      locationTimestamp: 'lastVisited' in place && place.lastVisited ? place.lastVisited : new Date().toISOString()
    });

    setSelectedPlaceNotice(`Đã chọn: ${locName}`);
    setTimeout(() => setSelectedPlaceNotice(null), 3000);
  };

  const handleAddExpense = () => {
    if (!newExpTitle.trim() || !newExpAmount) return;
    const numAmount = parseFloat(newExpAmount.replace(/[^0-9]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newExpense: JournalExpense = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title: newExpTitle.trim(),
      amount: numAmount,
    };

    onFormChange({
      expenses: [...formData.expenses, newExpense],
    });
    setNewExpTitle('');
    setNewExpAmount('');
  };

  const handleRemoveExpense = (id: string) => {
    onFormChange({
      expenses: formData.expenses.filter((e) => e.id !== id),
    });
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    let newMainIdx = formData.mainImageIndex;
    if (formData.mainImageIndex === index) {
      newMainIdx = 0;
    } else if (formData.mainImageIndex > index) {
      newMainIdx = formData.mainImageIndex - 1;
    }
    onFormChange({
      images: updatedImages,
      mainImageIndex: newMainIdx,
    });
  };

  const handleClearGPS = () => {
    onFormChange({
      lat: null,
      lng: null,
      accuracy: null,
      locationTimestamp: null,
      placeId: null,
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-3xl border border-rose-200/80 shadow-md p-5 sm:p-6 space-y-5 animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            {mode === 'create' ? <Sparkles className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              {mode === 'create'
                ? 'Ghi lại trang kỷ niệm mới'
                : isAuthor
                ? 'Chỉnh sửa trang kỷ niệm'
                : 'Chi tiết trang kỷ niệm'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {mode === 'create'
                ? 'Lưu lại những khoảnh khắc đẹp của hai đứa'
                : 'Cập nhật nội dung, địa điểm và hình ảnh'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('info')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'info'
              ? 'bg-rose-500 text-white shadow-2xs font-bold'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>1. Kỷ niệm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('media')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'media'
              ? 'bg-rose-500 text-white shadow-2xs font-bold'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>2. Khoảnh khắc ({formData.images.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('location')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'location'
              ? 'bg-rose-500 text-white shadow-2xs font-bold'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>3. Không gian & Đồng hành</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('music_expense')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'music_expense'
              ? 'bg-rose-500 text-white shadow-2xs font-bold'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>4. Lời thì thầm & Nhạc {formData.voiceMemoUrl ? '🎙️' : ''}</span>
        </button>
      </div>

      {/* SECTION 1: KỶ NIỆM (Tiêu đề, Ngày, Nội dung tâm sự) */}
      {activeSection === 'info' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề kỷ niệm <span className="text-[11px] font-normal text-slate-400">(không bắt buộc)</span>
            </label>
            <input
              type="text"
              disabled={!isAuthor && mode === 'edit'}
              placeholder="Không bắt buộc — có thể để trống (VD: Một ngày mưa ấm áp...)"
              value={formData.title}
              onChange={(e) => onFormChange({ title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày kỷ niệm <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                disabled={!isAuthor && mode === 'edit'}
                value={formData.date}
                onChange={(e) => onFormChange({ date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition disabled:bg-slate-100"
              />
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setActiveSection('media')}
                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-rose-200/60"
              >
                <span>Thêm ảnh & video</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Dòng tâm sự / Cảm xúc
                <span className="text-slate-400 font-normal ml-1">(Không bắt buộc)</span>
              </label>
              <button
                type="button"
                onClick={() => setActiveSection('music_expense')}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200/60 transition"
              >
                <Mic className="w-3 h-3 text-rose-500" />
                <span>{formData.voiceMemoUrl ? 'Đã có ghi âm 🎙️' : '+ Ghi âm giọng nói 🎙️'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              disabled={!isAuthor && mode === 'edit'}
              placeholder="Chia sẻ những suy nghĩ, cảm xúc chân thành hoặc kỷ niệm đáng nhớ trong khoảnh khắc này..."
              value={formData.content}
              onChange={(e) => onFormChange({ content: e.target.value })}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition disabled:bg-slate-100 leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SECTION 2: KHOẢNH KHẮC (Ảnh & Video) */}
      {activeSection === 'media' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {(isAuthor || mode === 'create') && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenCamera}
                className="flex items-center justify-center gap-2 py-3 px-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold cursor-pointer transition shadow-2xs"
              >
                <Camera className="w-4 h-4 text-rose-600" />
                <span>Chụp ảnh ngay</span>
              </button>

              <label className="flex items-center justify-center gap-2 py-3 px-3.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-2xl text-xs text-slate-700 font-semibold cursor-pointer transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{imageUploading ? 'Đang tải lên...' : 'Tải ảnh / video'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm,video/x-m4v,video/*,image/*"
                  multiple
                  onChange={onFilesSelected}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            </div>
          )}

          {/* Media Preview Grid */}
          {formData.images.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold">Đã chọn {formData.images.length} ảnh/video:</span>
                <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Ảnh/Video bìa: #{formData.mainImageIndex + 1}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {formData.images.map((mediaUrl, idx) => {
                  const isVid = isVideoUrl(mediaUrl);
                  const thumb = formData.videoThumbnails[mediaUrl];
                  const isMain = formData.mainImageIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`relative h-28 rounded-2xl overflow-hidden bg-slate-900 border-2 transition ${
                        isMain
                          ? 'border-amber-400 shadow-sm ring-2 ring-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      {isVid ? (
                        thumb ? (
                          <img src={thumb} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                        ) : (
                          <video src={mediaUrl} className="w-full h-full object-cover opacity-80" preload="metadata" />
                        )
                      ) : (
                        <img src={mediaUrl} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                      )}

                      {isVid && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                          <div className="p-1 rounded-full bg-black/60 text-white backdrop-blur-xs">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        </div>
                      )}

                      {(isAuthor || mode === 'create') && (
                        <>
                          <button
                            type="button"
                            onClick={() => onFormChange({ mainImageIndex: idx })}
                            className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs z-10 ${
                              isMain
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-black/60 hover:bg-amber-400 hover:text-slate-950 text-white'
                            }`}
                            title="Đặt làm ảnh/video bìa chính"
                          >
                            <Star className={`w-3 h-3 ${isMain ? 'fill-slate-950 text-slate-950' : 'text-amber-300'}`} />
                            <span>{isMain ? 'Bìa' : 'Đặt bìa'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition cursor-pointer z-10"
                            title="Xóa tệp này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Chưa có ảnh hoặc video nào</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bấm "Chụp ảnh ngay" hoặc "Tải ảnh / video" để lưu lại khoảnh khắc.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: KHÔNG GIAN & ĐỒNG HÀNH (Địa điểm, GPS, Ghim Map, Gắn thẻ người) */}
      {activeSection === 'location' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Địa điểm ghé thăm</span>
              </label>
              {(isAuthor || mode === 'create') && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsSavedPlacesModalOpen(true)}
                    className="text-[11px] text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl border border-rose-200/90 transition shadow-2xs"
                    title="Chọn từ địa điểm đã lưu hoặc các góc quen chụp nhiều ảnh"
                  >
                    <Star className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    <span>Địa điểm thân quen</span>
                    {savedPlaces.length > 0 && (
                      <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                        {savedPlaces.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onAutoDetectGPS}
                    disabled={autoLocatingGPS}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-xl border border-sky-200/80 transition shadow-2xs"
                    title="Lấy GPS thiết bị"
                  >
                    {autoLocatingGPS ? (
                      <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                    ) : (
                      <Navigation className="w-3 h-3 text-sky-600" />
                    )}
                    <span>{autoLocatingGPS ? 'Đang đọc GPS...' : 'GPS của tôi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenMapPicker}
                    className="text-[11px] text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 transition shadow-2xs"
                  >
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Ghim Bản đồ</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Frequent & Saved Places Pills */}
            {quickPlaces.length > 0 && (
              <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Góc quen hay ghé & chụp nhiều ảnh:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSavedPlacesModalOpen(true)}
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-0.5 text-[10px]"
                  >
                    <span>Xem tất cả ({quickPlaces.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {quickPlaces.map((qp) => {
                    const isSelected = formData.location === (qp.customNickname || qp.name);
                    return (
                      <button
                        key={qp.id}
                        type="button"
                        onClick={() => handleSelectQuickLocation(qp)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                            : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200/90'
                        }`}
                        title={qp.address || qp.name}
                      >
                        <span>{qp.emoji || (qp.isSaved ? '⭐' : '📍')}</span>
                        <span className="font-bold max-w-[130px] truncate">{qp.customNickname || qp.name}</span>
                        {qp.photoCount > 0 && (
                          <span className={`text-[10px] px-1 py-0.2 rounded font-sans ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {qp.photoCount} ảnh
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location Name Input */}
            <div className="relative">
              <input
                type="text"
                disabled={!isAuthor && mode === 'edit'}
                placeholder="VD: Tổ ấm của chúng mình, Cafe Giảng, Phố cổ Hội An, Landmark 81..."
                value={formData.location}
                onChange={(e) => onFormChange({ location: e.target.value })}
                className="w-full pl-3.5 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition disabled:bg-slate-100"
              />

              {/* Quick Save / Nickname Button */}
              {formData.location.trim() && (
                <button
                  type="button"
                  onClick={() => setIsSavedPlacesModalOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                  title="Đặt tên riêng & Lưu vào danh sách địa điểm thân quen"
                >
                  <Star className="w-3 h-3 fill-rose-500 text-rose-500" />
                  <span>Lưu / Đặt tên</span>
                </button>
              )}
            </div>

            {selectedPlaceNotice && (
              <div className="text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{selectedPlaceNotice}</span>
              </div>
            )}

            {/* GPS Metadata Badge */}
            {formData.lat !== null && formData.lng !== null && (
              <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200/80 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Crosshair className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="font-bold">
                    {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                  </span>
                  {formData.accuracy && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-sans font-bold">
                      ±{formData.accuracy.toFixed(0)}m
                    </span>
                  )}
                </div>
                {(isAuthor || mode === 'create') && (
                  <button
                    type="button"
                    onClick={handleClearGPS}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Xóa GPS
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tag People / Companions */}
          <div className="pt-2">
            <TagPeopleSelector
              userProfile={userProfile}
              coupleData={coupleData}
              companions={companions}
              selectedTags={formData.taggedPeople}
              onChange={(tags) => onFormChange({ taggedPeople: tags })}
              onOpenCompanionManager={onOpenCompanionManager}
            />
          </div>

          {/* Saved Locations Modal */}
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
                placeId: formData.placeId ?? undefined
              }}
              onOpenMapPicker={onOpenMapPicker}
            />
          )}
        </div>
      )}

      {/* SECTION 4: LỜI THÌ THẦM, NHẠC & CHI TIÊU */}
      {activeSection === 'music_expense' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Voice Memo Recorder */}
          <VoiceMemoRecorder
            currentVoiceUrl={formData.voiceMemoUrl}
            currentVoiceDuration={formData.voiceMemoDuration}
            currentVoiceTitle={formData.voiceMemoTitle}
            recordedByName={formData.voiceMemoRecordedByName || userProfile.displayName}
            onVoiceMemoSaved={(data) => {
              onFormChange({
                voiceMemoUrl: data.url,
                voiceMemoDuration: data.duration,
                voiceMemoTitle: data.title,
                voiceMemoRecordedByName: data.recordedByName || userProfile.displayName,
              });
            }}
            onVoiceMemoRemoved={() => {
              onFormChange({
                voiceMemoUrl: '',
                voiceMemoDuration: 0,
                voiceMemoTitle: '',
                voiceMemoRecordedByName: '',
              });
            }}
            disabled={!isAuthor && mode === 'edit'}
          />

          {/* Music Attachment */}
          <div className="p-4 bg-rose-50/40 border border-rose-200/60 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-rose-500" />
                <span>Gắn link bài hát kỷ niệm</span>
                <span className="text-slate-400 font-normal text-[11px]">(Tùy chọn)</span>
              </label>
              {formData.musicUrl && (isAuthor || mode === 'create') && (
                <button
                  type="button"
                  onClick={() => onFormChange({ musicUrl: '', musicTitle: '' })}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Xóa nhạc
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="url"
                disabled={!isAuthor && mode === 'edit'}
                placeholder="Dán link bài hát (YouTube, Spotify, Zing, link .mp3...)"
                value={formData.musicUrl}
                onChange={(e) => onFormChange({ musicUrl: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400 disabled:bg-slate-100"
              />
              <input
                type="text"
                disabled={!isAuthor && mode === 'edit'}
                placeholder="Tên bài hát (VD: Cơn Mưa Tình Yêu...)"
                value={formData.musicTitle}
                onChange={(e) => onFormChange({ musicTitle: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400 disabled:bg-slate-100"
              />
            </div>

            {formData.musicUrl.trim() && (
              <div className="pt-1">
                <JournalMusicPlayer
                  musicUrl={formData.musicUrl.trim()}
                  musicTitle={formData.musicTitle.trim()}
                />
              </div>
            )}
          </div>

          {/* Expenses Attachment */}
          <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                Chi tiêu kỷ niệm này
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                (Chỉ xem trong chi tiết, ẩn ngoài bảng tin)
              </span>
            </div>

            {(isAuthor || mode === 'create') && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Tên khoản chi (VD: Vé xem phim, Ăn tối...)"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <input
                  type="number"
                  placeholder="Số tiền (đ)"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  className="w-full sm:w-32 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer shrink-0"
                >
                  + Thêm
                </button>
              </div>
            )}

            {formData.expenses.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {formData.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-100 text-xs"
                  >
                    <span className="font-medium text-slate-700">{exp.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-700">
                        {exp.amount.toLocaleString('vi-VN')} đ
                      </span>
                      {(isAuthor || mode === 'create') && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 text-xs font-bold text-amber-950 border-t border-amber-200">
                  <span>TỔNG CỘNG:</span>
                  <span className="text-sm text-amber-700">
                    {formData.expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800/70 italic">
                Chưa có khoản chi tiêu nào được thêm.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form Footer Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
        >
          {isAuthor || mode === 'create' ? 'Hủy' : 'Đóng chi tiết'}
        </button>

        {(isAuthor || mode === 'create') && (
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{mode === 'create' ? 'Lưu trang nhật ký ✨' : 'Lưu thay đổi ✨'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
};

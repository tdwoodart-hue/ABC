import React from 'react';
import { isVideoUrl } from '../../utils/mediaHelper';
import { Camera, Upload, Play, Star, X, Image as ImageIcon } from 'lucide-react';

interface JournalMediaUploadProps {
  mode: 'create' | 'edit';
  isAuthor: boolean;
  images: string[];
  videoThumbnails: Record<string, string>;
  mainImageIndex: number;
  imageUploading: boolean;
  onOpenCamera: () => void;
  onFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSetMainImage: (index: number) => void;
  onRemoveImage: (index: number) => void;
}

export const JournalMediaUpload: React.FC<JournalMediaUploadProps> = ({
  mode,
  isAuthor,
  images,
  videoThumbnails,
  mainImageIndex,
  imageUploading,
  onOpenCamera,
  onFilesSelected,
  onSetMainImage,
  onRemoveImage,
}) => {
  return (
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
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Đã chọn {images.length} ảnh/video:</span>
            <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Ảnh/Video bìa: #{mainImageIndex + 1}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {images.map((mediaUrl, idx) => {
              const isVid = isVideoUrl(mediaUrl);
              const thumb = videoThumbnails[mediaUrl];
              const isMain = mainImageIndex === idx;

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
                        onClick={() => onSetMainImage(idx)}
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
                        onClick={() => onRemoveImage(idx)}
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
  );
};

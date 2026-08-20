import React from 'react';
import { JournalEntry } from '../../types';
import { isVideoUrl } from '../../utils/mediaHelper';
import { Play, ZoomIn, MessageSquare } from 'lucide-react';

interface JournalMediaGalleryProps {
  item: JournalEntry;
  mediaList: string[];
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
}

export const JournalMediaGallery: React.FC<JournalMediaGalleryProps> = ({
  item,
  mediaList,
  onOpenLightbox,
}) => {
  if (!mediaList || mediaList.length === 0) return null;

  if (mediaList.length === 1) {
    const mediaUrl = mediaList[0];
    const isVid = isVideoUrl(mediaUrl);
    const thumb = item.videoThumbnails?.[mediaUrl];
    const imgCommentsCount = (item.imageComments || []).filter(
      (c) => c.imageIndex === 0 || (c.imageUrl && c.imageUrl === mediaUrl)
    ).length;

    return (
      <div className="pt-1">
        <div
          onClick={() => onOpenLightbox(item, 0)}
          className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-2xs hover:shadow-md transition flex items-center justify-center max-h-[500px]"
        >
          {isVid ? (
            thumb ? (
              <img
                src={thumb}
                alt={item.title}
                className="w-full h-auto max-h-[500px] object-contain rounded-2xl group-hover:scale-101 transition duration-300"
              />
            ) : (
              <video
                src={mediaUrl}
                className="w-full h-auto max-h-[500px] object-contain rounded-2xl opacity-90"
                preload="metadata"
              />
            )
          ) : (
            <img
              src={mediaUrl}
              alt={item.title}
              className="w-full h-auto max-h-[500px] object-contain rounded-2xl group-hover:scale-101 transition duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {/* Video Play Overlay */}
          {isVid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
              <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition shadow-md">
                <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Comment Count on Photo */}
          {imgCommentsCount > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-10">
              <MessageSquare className="w-3 h-3 text-rose-400" />
              <span>{imgCommentsCount}</span>
            </div>
          )}

          {/* Hover Zoom Icon */}
          {!isVid && (
            <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="p-2 rounded-full bg-white/30 backdrop-blur-md text-white shadow-sm">
                <ZoomIn className="w-5 h-5 drop-shadow" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <div
        className={`grid gap-2 ${
          mediaList.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {mediaList.map((mediaUrl, idx) => {
          const isVid = isVideoUrl(mediaUrl);
          const thumb = item.videoThumbnails?.[mediaUrl];
          const imgCommentsCount = (item.imageComments || []).filter(
            (c) => c.imageIndex === idx || (c.imageUrl && c.imageUrl === mediaUrl)
          ).length;

          return (
            <div
              key={idx}
              onClick={() => onOpenLightbox(item, idx)}
              className="relative h-40 sm:h-48 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-2xs hover:shadow-md transition"
            >
              {isVid ? (
                thumb ? (
                  <img
                    src={thumb}
                    alt={`${item.title} ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                    preload="metadata"
                  />
                )
              ) : (
                <img
                  src={mediaUrl}
                  alt={`${item.title} ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}

              {/* Video Play Overlay */}
              {isVid && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition shadow-md">
                    <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Photo comment badge */}
              {imgCommentsCount > 0 && (
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm z-10">
                  <MessageSquare className="w-3 h-3 text-rose-400" />
                  <span>{imgCommentsCount}</span>
                </div>
              )}

              {/* Hover Zoom Icon */}
              {!isVid && (
                <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="p-1.5 rounded-full bg-white/30 backdrop-blur-md text-white shadow-sm">
                    <ZoomIn className="w-4 h-4 drop-shadow" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

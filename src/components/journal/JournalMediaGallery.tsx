import React from 'react';
import { JournalEntry } from '../../types';
import { isVideoUrl } from '../../utils/mediaHelper';
import { Play, ZoomIn, MessageSquare } from 'lucide-react';

interface JournalMediaGalleryProps {
  item: JournalEntry;
  mediaList: string[];
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
}

interface MediaTileProps {
  item: JournalEntry;
  mediaUrl: string;
  index: number;
  className?: string;
  remainingCount?: number;
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
}

const MediaTile: React.FC<MediaTileProps> = ({
  item,
  mediaUrl,
  index,
  className = '',
  remainingCount = 0,
  onOpenLightbox,
}) => {
  const isVid = isVideoUrl(mediaUrl);
  const thumb = item.videoThumbnails?.[mediaUrl];

  const imgCommentsCount = (item.imageComments || []).filter(
    (comment) =>
      comment.imageIndex === index ||
      (comment.imageUrl && comment.imageUrl === mediaUrl)
  ).length;

  return (
    <button
      type="button"
      onClick={() => onOpenLightbox(item, index)}
      className={`group relative block w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 text-left shadow-2xs transition hover:shadow-md ${className}`}
      aria-label={`Mở media ${index + 1} của ${item.title}`}
    >
      {isVid ? (
        thumb ? (
          <img
            src={thumb}
            alt={`${item.title} ${index + 1}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <video
            src={mediaUrl}
            className="h-full w-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        )
      ) : (
        <img
          src={mediaUrl}
          alt={`${item.title} ${index + 1}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={(event) => {
            (event.target as HTMLElement).style.display = 'none';
          }}
        />
      )}

      {isVid && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
            <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
          </div>
        </div>
      )}

      {imgCommentsCount > 0 && (
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
          <MessageSquare className="h-3 w-3" />
          <span>{imgCommentsCount}</span>
        </div>
      )}

      {!isVid && remainingCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
          <div className="rounded-full bg-black/35 p-2 text-white backdrop-blur-sm">
            <ZoomIn className="h-4 w-4" />
          </div>
        </div>
      )}

      {remainingCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white backdrop-blur-[1px]">
          <span className="text-2xl font-bold tracking-tight">
            +{remainingCount}
          </span>
        </div>
      )}
    </button>
  );
};

export const JournalMediaGallery: React.FC<JournalMediaGalleryProps> = ({
  item,
  mediaList,
  onOpenLightbox,
}) => {
  if (!mediaList || mediaList.length === 0) return null;

  /*
   * Feed rule:
   * - 1 media: one consistent 4:5 preview on mobile, wider on desktop.
   * - 2 media: balanced two-column preview.
   * - 3 media: one large tile + two supporting tiles.
   * - 4+ media: compact 2x2 grid, with +N on tile 4.
   *
   * Full original media remains available in the lightbox.
   */
  if (mediaList.length === 1) {
    return (
      <div className="pt-1">
        <MediaTile
          item={item}
          mediaUrl={mediaList[0]}
          index={0}
          onOpenLightbox={onOpenLightbox}
          className="aspect-[4/5] max-h-[560px] sm:aspect-[16/10]"
        />
      </div>
    );
  }

  if (mediaList.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 pt-1">
        {mediaList.map((mediaUrl, index) => (
          <MediaTile
            key={`${mediaUrl}-${index}`}
            item={item}
            mediaUrl={mediaUrl}
            index={index}
            onOpenLightbox={onOpenLightbox}
            className="aspect-[4/5]"
          />
        ))}
      </div>
    );
  }

  if (mediaList.length === 3) {
    return (
      <div className="grid h-[360px] grid-cols-2 grid-rows-2 gap-2 pt-1 sm:h-[440px]">
        <MediaTile
          item={item}
          mediaUrl={mediaList[0]}
          index={0}
          onOpenLightbox={onOpenLightbox}
          className="row-span-2 h-full"
        />

        <MediaTile
          item={item}
          mediaUrl={mediaList[1]}
          index={1}
          onOpenLightbox={onOpenLightbox}
          className="h-full"
        />

        <MediaTile
          item={item}
          mediaUrl={mediaList[2]}
          index={2}
          onOpenLightbox={onOpenLightbox}
          className="h-full"
        />
      </div>
    );
  }

  const visibleMedia = mediaList.slice(0, 4);
  const remainingCount = Math.max(0, mediaList.length - 4);

  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      {visibleMedia.map((mediaUrl, index) => (
        <MediaTile
          key={`${mediaUrl}-${index}`}
          item={item}
          mediaUrl={mediaUrl}
          index={index}
          onOpenLightbox={onOpenLightbox}
          remainingCount={index === 3 ? remainingCount : 0}
          className="aspect-square"
        />
      ))}
    </div>
  );
};
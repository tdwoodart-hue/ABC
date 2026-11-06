import React from 'react';
import type { JournalEntry } from '../../types';
import { isVideoUrl } from '../../utils/mediaHelper';
import { journalMediaOrder } from '../../utils/journalPresentation';
import { ImageOff, MessageSquare, Play } from 'lucide-react';

interface JournalMediaGalleryProps {
  item: JournalEntry;
  mediaList: string[];
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
}

const MediaTile: React.FC<{
  item: JournalEntry; url: string; index: number; extra: number; position: number; total: number;
  onOpen: JournalMediaGalleryProps['onOpenLightbox'];
}> = ({ item, url, index, extra, position, total, onOpen }) => {
  const video = isVideoUrl(url);
  const preview = video ? item.videoThumbnails?.[url] : url;
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = failedUrl === (preview || url);
  const comments = (item.imageComments || []).filter(comment => comment.imageUrl ? comment.imageUrl === url : comment.imageIndex === index).length;
  return <button type="button" className={`journal-media-tile ${total === 3 && position === 0 ? 'is-large' : ''}`} onClick={() => onOpen(item, index)} aria-label={`Mở ${video ? 'video' : 'ảnh'} ${index + 1} của ${item.title || 'bài viết'}`}>
    {failed ? <span className="journal-media-fallback"><ImageOff size={24} /><span>Chạm để mở {video ? 'video' : 'ảnh'}</span></span> : preview ? <img src={preview} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(preview)} /> : <video src={url} preload="metadata" muted playsInline onError={() => setFailedUrl(url)} />}
    {video && !extra && <span className="journal-video-play"><Play size={20} fill="currentColor" /></span>}
    {comments > 0 && !extra && <span className="journal-image-comments"><MessageSquare size={13} />{comments}</span>}
    {extra > 0 && <span className="journal-media-more">+{extra}<small>Xem tất cả</small></span>}
  </button>;
}

export const JournalMediaGallery: React.FC<JournalMediaGalleryProps> = ({ item, mediaList, onOpenLightbox }) => {
  const ordered = journalMediaOrder(mediaList, item.mainImageIndex);
  if (!ordered.length) return null;
  return <div className={`journal-media-grid media-count-${Math.min(ordered.length, 4)}`}>
    {ordered.slice(0, 4).map(({ url, index }, position) => <MediaTile key={`${url}-${index}`} item={item} url={url} index={index} position={position} total={ordered.length} extra={position === 3 ? ordered.length - 4 : 0} onOpen={onOpenLightbox} />)}
  </div>;
};

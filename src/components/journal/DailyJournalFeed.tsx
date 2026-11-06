import React from 'react';
import { ChevronDown, Images, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { JournalEntry } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { groupJournalDays, journalMediaOrder } from '../../utils/journalPresentation';
import { isVideoUrl } from '../../utils/mediaHelper';

interface DailyJournalFeedProps {
  journals: JournalEntry[];
  renderJournal: (journal: JournalEntry) => React.ReactNode;
  targetJournalId?: string | null;
}

type DayGroup = ReturnType<typeof groupJournalDays>[number];

const DaySection: React.FC<{
  group: DayGroup;
  renderJournal: DailyJournalFeedProps['renderJournal'];
  targetJournalId?: string | null;
  defaultOpen: boolean;
}> = ({ group, renderJournal, targetJournalId, defaultOpen }) => {
  const [expanded, setExpanded] = React.useState(defaultOpen);
  const single = group.items.length === 1;
  const open = single || expanded;
  React.useEffect(() => { if (defaultOpen) setExpanded(true); }, [defaultOpen]);
  const contentId = React.useId();
  const reduced = useReducedMotion();
  const containsTarget = !!targetJournalId && group.items.some(item => item.id === targetJournalId);
  React.useEffect(() => {
    if (!containsTarget || !targetJournalId) return;
    setExpanded(true);
    const timer = window.setTimeout(() => document.getElementById(`journal-card-${targetJournalId}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }), 180);
    return () => window.clearTimeout(timer);
  }, [containsTarget, targetJournalId, reduced]);
  const dayNumber = group.dateKey === 'unknown' ? '—' : group.dateKey.slice(8);
  const dateLabel = group.dateKey === 'unknown' ? 'Chưa có ngày' : formatDateVN(group.dateKey);
  const toggleLabel = `${open ? 'Thu gọn' : 'Mở'} ${group.items.length} bài ngày ${dateLabel}`;
  const previews = group.items.flatMap(item => {
    const media = item.images?.length ? item.images : item.imageUrl ? [item.imageUrl] : [];
    return journalMediaOrder(media, item.mainImageIndex).slice(0, 1).map(({ url }) => ({ url: isVideoUrl(url) ? item.videoThumbnails?.[url] : url, video: isVideoUrl(url), id: item.id }));
  }).filter(item => item.url).slice(0, 3);

  return <section className="journal-day" id={`journal-day-${group.dateKey}`} aria-label={`Nhật ký ngày ${dateLabel}`}>
    <div className="journal-day-heading">
      <span className="journal-day-number" aria-hidden="true">{dayNumber}</span>
      <div><h3>{dateLabel}</h3><span>{group.items.length} {group.items.length === 1 ? 'bài viết' : 'bài viết trong ngày'}</span></div>
      {!single && <button type="button" className="journal-day-toggle" aria-label={toggleLabel} aria-expanded={open} aria-controls={contentId} onClick={() => setExpanded(value => !value)}><ChevronDown size={18} className={open ? 'is-open' : ''} /></button>}
    </div>
    {open ? <div id={contentId} className="journal-day-posts journal-panel">
      {group.items.map(item => <React.Fragment key={item.id}>{renderJournal(item)}</React.Fragment>)}
    </div> : <><div id={contentId} hidden /><button type="button" className="journal-day-summary" onClick={() => setExpanded(true)} aria-label={toggleLabel} aria-expanded={false} aria-controls={contentId}>
      {previews.length ? <span className="journal-day-thumbnails">{previews.map(preview => <span key={preview.id}><img src={preview.url} alt="" loading="lazy" />{preview.video && <Play size={14} fill="currentColor" />}</span>)}</span> : <Images size={24} aria-hidden="true" />}
      <span className="journal-day-summary-text"><strong>{group.items[0].title || 'Những khoảnh khắc trong ngày'}</strong><small>{group.items.length > 1 ? `Và ${group.items.length - 1} bài viết khác` : 'Mở bài viết'}</small></span><ChevronDown size={17} />
    </button></>}
  </section>;
}

export const DailyJournalFeed: React.FC<DailyJournalFeedProps> = ({ journals, renderJournal, targetJournalId }) => {
  const groups = React.useMemo(() => groupJournalDays(journals), [journals]);
  const latest = groups.reduce((key, group) => group.dateKey !== 'unknown' && group.dateKey > key ? group.dateKey : key, '');
  return <div className="journal-timeline">{groups.map(group => <DaySection key={group.dateKey} group={group} defaultOpen={group.dateKey === latest} renderJournal={renderJournal} targetJournalId={targetJournalId} />)}</div>;
};

import React from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Images,
  MapPin,
  MessageCircle,
  Play,
} from 'lucide-react';

import { JournalEntry } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { isVideoUrl } from '../../utils/mediaHelper';

interface DailyJournalFeedProps {
  journals: JournalEntry[];
  renderJournal: (journal: JournalEntry) => React.ReactNode;
}

type DayGroup = {
  dateKey: string;
  items: JournalEntry[];
};

const getDateKey = (journal: JournalEntry): string => {
  if (journal.date && journal.date.length >= 10) {
    return journal.date.slice(0, 10);
  }

  if (journal.createdAt) {
    const parsed = new Date(journal.createdAt);

    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }
  }

  return 'unknown';
};

const getMediaList = (journal: JournalEntry): string[] => {
  if (journal.images && journal.images.length > 0) {
    return journal.images;
  }

  return journal.imageUrl ? [journal.imageUrl] : [];
};

const getPreviewUrl = (
  journal: JournalEntry,
  mediaUrl: string
): string => {
  if (!isVideoUrl(mediaUrl)) {
    return mediaUrl;
  }

  return (
    journal.videoThumbnails?.[mediaUrl] ||
    ''
  );
};

const formatTime = (journal: JournalEntry): string => {
  const raw =
    journal.createdAt ||
    journal.updatedAt ||
    '';

  if (!raw) return '';

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const groupJournalsByDay = (
  journals: JournalEntry[]
): DayGroup[] => {
  const groups = new Map<string, JournalEntry[]>();
  const order: string[] = [];

  journals.forEach((journal) => {
    const dateKey = getDateKey(journal);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
      order.push(dateKey);
    }

    groups.get(dateKey)?.push(journal);
  });

  return order.map((dateKey) => ({
    dateKey,
    items: groups.get(dateKey) || [],
  }));
};

interface DailyCapsuleProps {
  group: DayGroup;
  renderJournal: (journal: JournalEntry) => React.ReactNode;
}

const DailyCapsule: React.FC<DailyCapsuleProps> = ({
  group,
  renderJournal,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  const stats = React.useMemo(() => {
    let mediaCount = 0;
    let commentCount = 0;

    const locations = new Map<string, string>();
    const previews: Array<{
      url: string;
      isVideo: boolean;
    }> = [];

    group.items.forEach((journal) => {
      const mediaList = getMediaList(journal);

      mediaCount += mediaList.length;

      commentCount +=
        (journal.comments?.length || 0) +
        (journal.imageComments?.length || 0);

      const location =
        journal.location?.trim() ||
        journal.locationAddress?.trim();

      if (location) {
        locations.set(
          location.toLowerCase(),
          location
        );
      }

      mediaList.forEach((mediaUrl) => {
        if (previews.length >= 4) return;

        const previewUrl =
          getPreviewUrl(journal, mediaUrl);

        if (!previewUrl) return;

        previews.push({
          url: previewUrl,
          isVideo: isVideoUrl(mediaUrl),
        });
      });
    });

    return {
      mediaCount,
      commentCount,
      locations: [...locations.values()],
      previews,
    };
  }, [group.items]);


  const summaryText = React.useMemo(() => {
    const locationCount = stats.locations.length;

    if (
      stats.mediaCount >= 8 &&
      locationCount >= 2
    ) {
      return 'Một ngày khá nhiều chuyện để nhớ.';
    }

    if (locationCount >= 3) {
      return 'Hôm đó hai đứa đi cũng kha khá nơi đó.';
    }

    if (stats.mediaCount >= 10) {
      return 'Ngày này chụp hơi nhiều ảnh nha.';
    }

    if (group.items.length >= 4) {
      return 'Một ngày được kể bằng khá nhiều khoảnh khắc.';
    }

    return 'Mấy khoảnh khắc trong cùng một ngày.';
  }, [
    group.items.length,
    stats.locations.length,
    stats.mediaCount,
  ]);

  return (
    <div
      id={`journal-day-${group.dateKey}`}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="block w-full text-left"
        aria-expanded={expanded}
      >
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>
                  {group.dateKey === 'unknown'
                    ? 'Một ngày của chúng mình'
                    : formatDateVN(group.dateKey)}
                </span>
              </div>

              <h3 className="mt-1.5 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                {group.items.length} khoảnh khắc trong ngày
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {summaryText}
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>

          {stats.previews.length > 0 && (
            <div
              className={`grid overflow-hidden rounded-2xl bg-slate-100 ${
                stats.previews.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-2'
              }`}
            >
              {stats.previews.map((preview, index) => {
                const isFirstOfThree =
                  stats.previews.length === 3 &&
                  index === 0;

                return (
                  <div
                    key={`${preview.url}-${index}`}
                    className={`relative overflow-hidden bg-slate-900 ${
                      stats.previews.length === 1
                        ? 'aspect-[16/9]'
                        : isFirstOfThree
                          ? 'row-span-2 min-h-[220px]'
                          : 'aspect-square'
                    }`}
                  >
                    <img
                      src={preview.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />

                    {preview.isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                          <Play className="h-4 w-4 translate-x-px fill-white" />
                        </div>
                      </div>
                    )}

                    {index === 3 &&
                      stats.mediaCount >
                        stats.previews.length && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-black text-white">
                          +
                          {stats.mediaCount -
                            stats.previews.length}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Images className="h-3.5 w-3.5 text-rose-400" />
              {stats.mediaCount} media
            </span>

            {stats.locations.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span className="max-w-[180px] truncate">
                  {stats.locations.length === 1
                    ? stats.locations[0]
                    : `${stats.locations.length} địa điểm`}
                </span>
              </span>
            )}

            {stats.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5 text-rose-400" />
                {stats.commentCount}
              </span>
            )}
          </div>

          {!expanded && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="space-y-2">
                {group.items
                  .slice(0, 3)
                  .map((journal) => (
                    <div
                      key={journal.id}
                      className="flex items-center gap-2.5"
                    >
                      <span className="w-10 shrink-0 text-[10px] font-bold text-slate-300">
                        {formatTime(journal) || '•'}
                      </span>

                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />

                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                        {journal.title || 'Một khoảnh khắc'}
                      </span>
                    </div>
                  ))}

                {group.items.length > 3 && (
                  <div className="pl-[50px] text-[10px] font-semibold text-slate-300">
                    +{group.items.length - 3} khoảnh khắc nữa
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/45 p-3 sm:p-4">
          <div className="relative space-y-4">
            <div className="pointer-events-none absolute bottom-6 left-[14px] top-6 w-px bg-rose-100 sm:left-[18px]" />

            {group.items.map((journal, index) => (
              <div
                key={journal.id}
                className="relative pl-7 sm:pl-9"
              >
                <div className="absolute left-[9px] top-6 z-[1] h-3 w-3 rounded-full border-2 border-white bg-rose-400 shadow-xs sm:left-[13px]" />

                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span className="text-[10px] font-bold text-rose-500">
                    {formatTime(journal) ||
                      `Khoảnh khắc ${index + 1}`}
                  </span>
                </div>

                {renderJournal(journal)}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
          >
            Thu gọn ngày này
          </button>
        </div>
      )}
    </div>
  );
};

export const DailyJournalFeed: React.FC<
  DailyJournalFeedProps
> = ({
  journals,
  renderJournal,
}) => {
  const groups = React.useMemo(
    () => groupJournalsByDay(journals),
    [journals]
  );

  return (
    <div className="space-y-4">
      {groups.map((group) =>
        group.items.length === 1 ? (
          <React.Fragment
            key={group.items[0].id}
          >
            {renderJournal(group.items[0])}
          </React.Fragment>
        ) : (
          <DailyCapsule
            key={group.dateKey}
            group={group}
            renderJournal={renderJournal}
          />
        )
      )}
    </div>
  );
};
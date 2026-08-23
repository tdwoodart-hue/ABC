import React from 'react';
import {
  Calendar,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Sparkles,
  X,
} from 'lucide-react';

import type { CoupleData, JournalEntry } from '../types';
import {
  db,
  OUR_COUPLE_ID,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from '../lib/firebase';
import { isVideoUrl } from '../utils/mediaHelper';
import type { TabType } from './LightHomeScreen';

interface TimeMachineEasterEggProps {
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
}

type QuickPreset =
  | '1m'
  | '6m'
  | '1y'
  | '2y'
  | 'start';

const LONG_PRESS_MS = 1200;
const MAX_MOVE_PX = 14;

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatVNDate = (value?: string | null) => {
  const date = parseLocalDate(value);

  if (!date) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getPresetDate = (
  preset: QuickPreset,
  anniversaryDate?: string
) => {
  if (preset === 'start' && anniversaryDate) {
    return anniversaryDate;
  }

  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );

  if (preset === '1m') {
    target.setMonth(target.getMonth() - 1);
  } else if (preset === '6m') {
    target.setMonth(target.getMonth() - 6);
  } else if (preset === '1y') {
    target.setFullYear(target.getFullYear() - 1);
  } else if (preset === '2y') {
    target.setFullYear(target.getFullYear() - 2);
  }

  return toLocalDateKey(target);
};

const getJournalMediaCount = (journal: JournalEntry) => {
  if (journal.images && journal.images.length > 0) {
    return journal.images.filter(Boolean).length;
  }

  return journal.imageUrl ? 1 : 0;
};

const getJournalPreview = (journal: JournalEntry) => {
  if (journal.images && journal.images.length > 0) {
    const safeIndex = Math.min(
      Math.max(0, journal.mainImageIndex || 0),
      journal.images.length - 1
    );

    return (
      journal.images[safeIndex] ||
      journal.images[0] ||
      ''
    );
  }

  return journal.imageUrl || '';
};

export const TimeMachineEasterEgg: React.FC<
  TimeMachineEasterEggProps
> = ({
  activeTab,
  onNavigate,
}) => {
  const [coupleData, setCoupleData] =
    React.useState<CoupleData | null>(null);

  const [journals, setJournals] =
    React.useState<JournalEntry[]>([]);

  const [isOpen, setIsOpen] = React.useState(false);

  const [selectedDate, setSelectedDate] =
    React.useState(() =>
      getPresetDate('1y')
    );

  const timerRef = React.useRef<number | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);
  const startPointRef = React.useRef<{
    x: number;
    y: number;
  } | null>(null);
  const pressedElementRef =
    React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const coupleRef = doc(
      db,
      'couples',
      OUR_COUPLE_ID
    );

    const unsubscribeCouple = onSnapshot(
      coupleRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCoupleData(null);
          return;
        }

        setCoupleData({
          id: snapshot.id,
          ...snapshot.data(),
        } as CoupleData);
      },
      (error) => {
        console.warn(
          'Không thể tải couple data cho Time Machine:',
          error
        );
      }
    );

    const journalsRef = collection(
      db,
      'couples',
      OUR_COUPLE_ID,
      'journals'
    );

    const journalsQuery = query(
      journalsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribeJournals = onSnapshot(
      journalsQuery,
      (snapshot) => {
        const items: JournalEntry[] = [];

        snapshot.forEach((snapshotDoc) => {
          items.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as JournalEntry);
        });

        setJournals(items);
      },
      (error) => {
        console.warn(
          'Không thể tải Journal cho Time Machine:',
          error
        );
      }
    );

    return () => {
      unsubscribeCouple();
      unsubscribeJournals();
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    setSelectedDate(
      getPresetDate(
        '1y',
        coupleData?.anniversaryDate
      )
    );
  }, [
    isOpen,
    coupleData?.anniversaryDate,
  ]);

  const partnerNames = React.useMemo(() => {
    return new Set(
      [
        coupleData?.user1Name,
        coupleData?.user2Name,
        'Dương',
        'Chúc Gà',
      ]
        .filter(Boolean)
        .map((name) =>
          String(name).trim()
        )
    );
  }, [
    coupleData?.user1Name,
    coupleData?.user2Name,
  ]);

  const isPartnerNameElement =
    React.useCallback(
      (
        target: EventTarget | null
      ): HTMLElement | null => {
        if (
          activeTab !== 'home' ||
          !(target instanceof HTMLElement)
        ) {
          return null;
        }

        const span = target.closest('span');

        if (!(span instanceof HTMLElement)) {
          return null;
        }

        const text =
          span.textContent?.trim() || '';

        if (!partnerNames.has(text)) {
          return null;
        }

        /*
         * Restrict the trigger to the partner cards on Home.
         * Current HomeTab partner cards use the Tailwind `group` class.
         * This avoids triggering on the same name elsewhere in the app.
         */
        const partnerCard =
          span.closest('.group');

        if (!partnerCard) {
          return null;
        }

        return span;
      },
      [activeTab, partnerNames]
    );

  const clearLongPress =
    React.useCallback(() => {
      if (timerRef.current !== null) {
        window.clearTimeout(
          timerRef.current
        );

        timerRef.current = null;
      }

      pointerIdRef.current = null;
      startPointRef.current = null;

      if (pressedElementRef.current) {
        pressedElementRef.current.style.removeProperty(
          '-webkit-user-select'
        );
        pressedElementRef.current.style.removeProperty(
          'user-select'
        );
        pressedElementRef.current.style.removeProperty(
          '-webkit-touch-callout'
        );
      }

      pressedElementRef.current = null;
    }, []);

  React.useEffect(() => {
    if (activeTab !== 'home') {
      clearLongPress();
      return;
    }

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const nameElement =
        isPartnerNameElement(event.target);

      if (!nameElement) {
        return;
      }

      clearLongPress();

      pointerIdRef.current =
        event.pointerId;

      startPointRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      pressedElementRef.current =
        nameElement;

      /*
       * Invisible behavior-only styles.
       * They stop iOS text selection/callout during a long press,
       * but do not alter the HomeTab appearance.
       */
      nameElement.style.setProperty(
        '-webkit-user-select',
        'none'
      );
      nameElement.style.setProperty(
        'user-select',
        'none'
      );
      nameElement.style.setProperty(
        '-webkit-touch-callout',
        'none'
      );

      timerRef.current =
        window.setTimeout(() => {
          timerRef.current = null;

          setIsOpen(true);

          if (
            typeof navigator !==
              'undefined' &&
            'vibrate' in navigator
          ) {
            navigator.vibrate?.([
              30,
              30,
              45,
            ]);
          }

          clearLongPress();
        }, LONG_PRESS_MS);
    };

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      if (
        pointerIdRef.current !==
          event.pointerId ||
        !startPointRef.current
      ) {
        return;
      }

      const dx =
        event.clientX -
        startPointRef.current.x;

      const dy =
        event.clientY -
        startPointRef.current.y;

      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      if (distance > MAX_MOVE_PX) {
        clearLongPress();
      }
    };

    const handlePointerEnd = (
      event: PointerEvent
    ) => {
      if (
        pointerIdRef.current ===
        event.pointerId
      ) {
        clearLongPress();
      }
    };

    const handleContextMenu = (
      event: MouseEvent
    ) => {
      if (
        isPartnerNameElement(event.target)
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener(
      'pointerdown',
      handlePointerDown,
      true
    );

    document.addEventListener(
      'pointermove',
      handlePointerMove,
      true
    );

    document.addEventListener(
      'pointerup',
      handlePointerEnd,
      true
    );

    document.addEventListener(
      'pointercancel',
      handlePointerEnd,
      true
    );

    document.addEventListener(
      'contextmenu',
      handleContextMenu,
      true
    );

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown,
        true
      );

      document.removeEventListener(
        'pointermove',
        handlePointerMove,
        true
      );

      document.removeEventListener(
        'pointerup',
        handlePointerEnd,
        true
      );

      document.removeEventListener(
        'pointercancel',
        handlePointerEnd,
        true
      );

      document.removeEventListener(
        'contextmenu',
        handleContextMenu,
        true
      );

      clearLongPress();
    };
  }, [
    activeTab,
    clearLongPress,
    isPartnerNameElement,
  ]);

  const snapshot = React.useMemo(() => {
    const selected =
      parseLocalDate(selectedDate);

    if (!selected) {
      return {
        daysTogether: 0,
        totalJournals: 0,
        totalMedia: 0,
        memories: [] as JournalEntry[],
        exact: false,
        nearestDistance: null as
          | number
          | null,
      };
    }

    const anniversary =
      parseLocalDate(
        coupleData?.anniversaryDate
      );

    let daysTogether = 0;

    if (
      anniversary &&
      selected >= anniversary
    ) {
      daysTogether =
        Math.floor(
          (
            selected.getTime() -
            anniversary.getTime()
          ) /
            (1000 * 60 * 60 * 24)
        ) + 1;
    }

    const dated = journals
      .map((journal) => ({
        journal,
        date: parseLocalDate(
          journal.date
        ),
      }))
      .filter(
        (
          item
        ): item is {
          journal: JournalEntry;
          date: Date;
        } => Boolean(item.date)
      );

    const untilDate = dated.filter(
      (item) => item.date <= selected
    );

    const totalMedia =
      untilDate.reduce(
        (sum, item) =>
          sum +
          getJournalMediaCount(
            item.journal
          ),
        0
      );

    const exactMemories = dated
      .filter(
        (item) =>
          toLocalDateKey(
            item.date
          ) === selectedDate
      )
      .map((item) => item.journal);

    if (exactMemories.length > 0) {
      return {
        daysTogether,
        totalJournals:
          untilDate.length,
        totalMedia,
        memories:
          exactMemories.slice(0, 6),
        exact: true,
        nearestDistance: 0,
      };
    }

    const nearest = dated
      .map((item) => ({
        ...item,
        distance: Math.abs(
          Math.round(
            (
              item.date.getTime() -
              selected.getTime()
            ) /
              (1000 *
                60 *
                60 *
                24)
          )
        ),
      }))
      .sort((a, b) => {
        if (
          a.distance !== b.distance
        ) {
          return (
            a.distance -
            b.distance
          );
        }

        return (
          b.date.getTime() -
          a.date.getTime()
        );
      });

    const nearestDistance =
      nearest[0]?.distance ?? null;

    const memories =
      nearestDistance === null
        ? []
        : nearest
            .filter(
              (item) =>
                item.distance ===
                nearestDistance
            )
            .slice(0, 4)
            .map(
              (item) =>
                item.journal
            );

    return {
      daysTogether,
      totalJournals:
        untilDate.length,
      totalMedia,
      memories,
      exact: false,
      nearestDistance,
    };
  }, [
    selectedDate,
    coupleData?.anniversaryDate,
    journals,
  ]);

  const openJournal = (
    journal: JournalEntry
  ) => {
    setIsOpen(false);
    onNavigate('journal');

    window.setTimeout(() => {
      const url =
        `/journal?post=${encodeURIComponent(
          journal.id
        )}`;

      window.history.replaceState(
        null,
        '',
        url
      );

      window.dispatchEvent(
        new PopStateEvent(
          'popstate'
        )
      );
    }, 40);
  };

  if (!isOpen) {
    return null;
  }

  const presets: {
    id: QuickPreset;
    label: string;
  }[] = [
    {
      id: '1m',
      label: '1 tháng trước',
    },
    {
      id: '6m',
      label: '6 tháng trước',
    },
    {
      id: '1y',
      label: 'Ngày này 1 năm trước',
    },
    {
      id: '2y',
      label: 'Ngày này 2 năm trước',
    },
    {
      id: 'start',
      label: 'Ngày bắt đầu',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() =>
        setIsOpen(false)
      }
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-[30px] sm:rounded-[30px] border border-slate-200 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <Clock3 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                  Time Machine
                </span>
              </div>

              <h2 className="text-lg font-black text-slate-900 mt-1">
                Cỗ máy thời gian
              </h2>

              <p className="text-[11px] text-slate-400 mt-0.5">
                Quay lại một thời điểm của hai đứa.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0"
              aria-label="Đóng Time Machine"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={
                  preset.id ===
                    'start' &&
                  !coupleData?.anniversaryDate
                }
                onClick={() =>
                  setSelectedDate(
                    getPresetDate(
                      preset.id,
                      coupleData?.anniversaryDate
                    )
                  )
                }
                className="shrink-0 h-8 px-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-40"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-rose-500/20 blur-3xl" />

            <div className="relative">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">
                Đang quay về
              </span>

              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-rose-300" />

                <input
                  type="date"
                  value={selectedDate}
                  max={toLocalDateKey(
                    new Date()
                  )}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value
                    )
                  }
                  className="bg-transparent text-lg font-black text-white outline-none [color-scheme:dark]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                  <p className="text-lg font-black">
                    {
                      snapshot.daysTogether
                    }
                  </p>
                  <p className="text-[9px] text-white/50">
                    ngày bên nhau
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                  <p className="text-lg font-black">
                    {
                      snapshot.totalJournals
                    }
                  </p>
                  <p className="text-[9px] text-white/50">
                    bài đã có
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                  <p className="text-lg font-black">
                    {
                      snapshot.totalMedia
                    }
                  </p>
                  <p className="text-[9px] text-white/50">
                    ảnh / video
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-2.5">
              <div>
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  {snapshot.exact
                    ? 'Kỷ niệm ngày đó'
                    : 'Kỷ niệm gần thời điểm này'}
                </h3>

                {!snapshot.exact &&
                  snapshot.nearestDistance !==
                    null && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Gần nhất cách{' '}
                      {
                        snapshot.nearestDistance
                      }{' '}
                      ngày
                    </p>
                  )}
              </div>

              <span className="text-[10px] text-slate-400 shrink-0">
                {formatVNDate(
                  selectedDate
                )}
              </span>
            </div>

            {snapshot.memories.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                <Clock3 className="w-6 h-6 text-slate-300 mx-auto" />

                <p className="text-xs font-bold text-slate-500 mt-2">
                  Chưa có kỷ niệm ở thời điểm này
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshot.memories.map(
                  (journal) => {
                    const preview =
                      getJournalPreview(
                        journal
                      );

                    const previewIsVideo =
                      Boolean(preview) &&
                      isVideoUrl(
                        preview
                      );

                    return (
                      <button
                        key={journal.id}
                        type="button"
                        onClick={() =>
                          openJournal(
                            journal
                          )
                        }
                        className="w-full p-2.5 rounded-2xl border border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/30 transition flex items-center gap-3 text-left"
                      >
                        {preview &&
                        !previewIsVideo ? (
                          <img
                            src={preview}
                            alt={
                              journal.title
                            }
                            className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-slate-300" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-800 truncate">
                            {
                              journal.title
                            }
                          </h4>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatVNDate(
                              journal.date
                            )}
                          </p>

                          {journal.content && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                              {
                                journal.content
                              }
                            </p>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
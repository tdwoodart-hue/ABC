import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';

import { JournalEntry } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { useMemoryOfTheDay } from './hooks/useMemoryOfTheDay';

interface MemoryOfTheDayCardProps {
  journals: JournalEntry[];
  onOpenJournal: (journal: JournalEntry) => void;
}

export const MemoryOfTheDayCard: React.FC<MemoryOfTheDayCardProps> = ({
  journals,
  onOpenJournal,
}) => {
  const {
    memoryOfTheDay,
    memoryPreview,
    memoryCaption,
    memoryTone,
  } = useMemoryOfTheDay(journals);

  if (!memoryOfTheDay) return null;

  return (
    <button
      type="button"
      onClick={() => onOpenJournal(memoryOfTheDay.journal)}
      className="group relative block w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
    >
      {memoryPreview ? (
        <>
          <img
            src={memoryPreview}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
          />

          <div className={`absolute inset-0 ${memoryTone.panelGradient}`} />

          <div className="absolute bottom-0 right-0 top-0 w-[46%] sm:w-[48%]">
            <img
              src={memoryPreview}
              alt={memoryOfTheDay.journal.title || 'Kỷ niệm'}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />

            <div className={`absolute inset-0 ${memoryTone.imageOverlay}`} />
          </div>
        </>
      ) : (
        <div className={`absolute inset-0 ${memoryTone.panelFallback}`} />
      )}

      <div className="relative z-[2] flex min-h-[190px] items-end p-5 sm:min-h-[215px] sm:p-6">
        <div className="max-w-[72%] sm:max-w-[64%]">
          <div
            className={`mb-3 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-bold leading-snug backdrop-blur-md ${memoryTone.chip}`}
          >
            <span className="truncate">
              {memoryCaption}
            </span>
          </div>

          <h3 className="line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">
            {memoryOfTheDay.journal.title || 'Một kỷ niệm cũ'}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-white/70">
            <span>
              {formatDateVN(memoryOfTheDay.journal.date)}
            </span>
          </div>

          {memoryOfTheDay.journal.location && (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-white/70">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-300" />

              <span className="truncate">
                {memoryOfTheDay.journal.location}
              </span>
            </div>
          )}

          <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white">
            <span>Xem lại kỷ niệm</span>

            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
};
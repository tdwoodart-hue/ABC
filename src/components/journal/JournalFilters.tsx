import React, { useEffect, useState } from 'react';
import { Companion, JournalEntry } from '../../types';
import {
  ArrowDownUp,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Compass,
  Map,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';

interface JournalFiltersProps {
  journals: JournalEntry[];
  companions: Companion[];
  journalViewTab: 'feed' | 'love_map' | 'places';
  setJournalViewTab: (tab: 'feed' | 'love_map' | 'places') => void;

  selectedCompanionFilter: string | null;
  setSelectedCompanionFilter: (id: string | null) => void;

  journalDateFilterMode:
    | 'all'
    | 'this_month'
    | 'last_month'
    | 'this_year'
    | 'month'
    | 'custom';

  setJournalDateFilterMode: (
    mode:
      | 'all'
      | 'this_month'
      | 'last_month'
      | 'this_year'
      | 'month'
      | 'custom'
  ) => void;

  journalFilterMonth: string;
  setJournalFilterMonth: (month: string) => void;

  journalFilterStartDate: string;
  setJournalFilterStartDate: (date: string) => void;

  journalFilterEndDate: string;
  setJournalFilterEndDate: (date: string) => void;

  isCustomDateOpen: boolean;
  setIsCustomDateOpen: (open: boolean) => void;

  journalSortOrder: 'newest' | 'oldest';
  setJournalSortOrder: (
    order:
      | 'newest'
      | 'oldest'
      | ((prev: 'newest' | 'oldest') => 'newest' | 'oldest')
  ) => void;

  journalSearch: string;
  setJournalSearch: (query: string) => void;

  availableMonths: string[];

  isAnyFilterActive: boolean;
  onResetFilters: () => void;
}

export const JournalFilters: React.FC<JournalFiltersProps> = ({
  journals,
  companions,
  journalViewTab,
  setJournalViewTab,

  selectedCompanionFilter,
  setSelectedCompanionFilter,

  journalDateFilterMode,
  setJournalDateFilterMode,

  journalFilterMonth,
  setJournalFilterMonth,

  journalFilterStartDate,
  setJournalFilterStartDate,

  journalFilterEndDate,
  setJournalFilterEndDate,

  isCustomDateOpen,
  setIsCustomDateOpen,

  journalSortOrder,
  setJournalSortOrder,

  journalSearch,
  setJournalSearch,

  availableMonths,

  isAnyFilterActive,
  onResetFilters,
}) => {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const filterCount =
    (journalDateFilterMode !== 'all' ? 1 : 0) +
    (selectedCompanionFilter ? 1 : 0) +
    (journalSortOrder !== 'newest' ? 1 : 0);

  useEffect(() => {
    if (!isFilterSheetOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterSheetOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return (
    <div className="space-y-3">
      <div className="app-segmented grid grid-cols-3 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = journalViewTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`subtab-${tab.id}`}
              type="button"
              onClick={() => setJournalViewTab(tab.id)}
              className={`app-segmented-item flex min-w-0 items-center justify-center gap-1.5 px-2 ${
                isActive ? 'app-segmented-item-active' : ''
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {journalViewTab === 'feed' && (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={journalSearch}
              onChange={(event) => setJournalSearch(event.target.value)}
              placeholder="Tìm nhật ký"
              className="app-control h-11 w-full pl-10 pr-10 text-sm placeholder:text-slate-400"
            />
            {journalSearch && (
              <button
                type="button"
                onClick={() => setJournalSearch('')}
                className="app-icon-button absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`app-icon-button relative h-11 w-11 border bg-white ${
              filterCount > 0
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-[var(--app-border)]'
            }`}
            aria-label={filterCount > 0 ? `Bộ lọc, ${filterCount} đang bật` : 'Bộ lọc'}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setIsFilterSheetOpen(false)}
            aria-label="Đóng"
          />

          <div className="relative z-10 flex max-h-[86vh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:max-w-md sm:rounded-[24px]">
            <div className="flex items-center justify-between px-4 py-3.5">
              <h3 className="app-section-title">Bộ lọc</h3>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-4 pb-4">
              <section className="space-y-2.5">
                <span className="app-caption font-semibold">Thời gian</span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all' as const, label: 'Tất cả' },
                    { id: 'this_month' as const, label: 'Tháng này' },
                    { id: 'last_month' as const, label: 'Tháng trước' },
                    { id: 'this_year' as const, label: 'Năm nay' },
                  ].map((option) => {
                    const selected = journalDateFilterMode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setQuickDateFilter(option.id)}
                        className={`app-button min-h-10 px-3 py-2 ${
                          selected ? 'app-button-primary' : 'app-button-secondary'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {availableMonths.length > 0 && (
                  <div className="relative">
                    <select
                      value={journalDateFilterMode === 'month' ? journalFilterMonth : ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) return;
                        setJournalFilterMonth(value);
                        setJournalDateFilterMode('month');
                        setIsCustomDateOpen(false);
                      }}
                      className="app-control h-11 w-full appearance-none px-3 pr-9 text-sm"
                    >
                      <option value="">Theo tháng...</option>
                      {availableMonths.map((monthValue) => (
                        <option key={monthValue} value={monthValue}>
                          {getMonthLabel(monthValue)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={openCustomDate}
                  className={`app-button w-full text-left ${
                    journalDateFilterMode === 'custom'
                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                      : 'app-button-secondary'
                  }`}
                >
                  Khoảng ngày
                </button>

                {(journalDateFilterMode === 'custom' || isCustomDateOpen) && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      aria-label="Từ ngày"
                      type="date"
                      value={journalFilterStartDate}
                      onChange={(event) => {
                        setJournalFilterStartDate(event.target.value);
                        setJournalDateFilterMode('custom');
                      }}
                      className="app-control h-11 min-w-0 px-2 text-sm"
                    />
                    <input
                      aria-label="Đến ngày"
                      type="date"
                      value={journalFilterEndDate}
                      onChange={(event) => {
                        setJournalFilterEndDate(event.target.value);
                        setJournalDateFilterMode('custom');
                      }}
                      className="app-control h-11 min-w-0 px-2 text-sm"
                    />
                    {(journalFilterStartDate || journalFilterEndDate) && (
                      <button
                        type="button"
                        onClick={clearCustomDates}
                        className="col-span-2 text-left text-xs font-semibold text-slate-500"
                      >
                        Xóa khoảng ngày
                      </button>
                    )}
                  </div>
                )}
              </section>

              {companions.length > 0 && (
                <section className="space-y-2.5">
                  <span className="app-caption font-semibold">Đi cùng</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanionFilter(null)}
                      className={`app-chip ${
                        selectedCompanionFilter === null ? 'app-chip-active' : ''
                      }`}
                    >
                      Tất cả
                    </button>

                    {companions.map((companion) => {
                      const selected = selectedCompanionFilter === companion.id;
                      return (
                        <button
                          key={companion.id}
                          type="button"
                          onClick={() =>
                            setSelectedCompanionFilter(selected ? null : companion.id)
                          }
                          className={`app-chip ${selected ? 'app-chip-active' : ''}`}
                        >
                          <span>{companion.emoji || '🐾'}</span>
                          <span>{companion.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-2.5">
                <span className="app-caption font-semibold">Sắp xếp</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJournalSortOrder('newest')}
                    className={`app-button min-h-10 px-3 py-2 ${
                      journalSortOrder === 'newest'
                        ? 'app-button-primary'
                        : 'app-button-secondary'
                    }`}
                  >
                    Mới nhất
                  </button>
                  <button
                    type="button"
                    onClick={() => setJournalSortOrder('oldest')}
                    className={`app-button min-h-10 px-3 py-2 ${
                      journalSortOrder === 'oldest'
                        ? 'app-button-primary'
                        : 'app-button-secondary'
                    }`}
                  >
                    Cũ nhất
                  </button>
                </div>
              </section>
            </div>

            <div
              className="flex gap-2 border-t border-slate-100 px-4 pt-3"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                type="button"
                onClick={onResetFilters}
                disabled={!isAnyFilterActive}
                className="app-button app-button-secondary flex-1 disabled:opacity-40"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="app-button app-button-primary flex-[1.25]"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

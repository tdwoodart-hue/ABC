import React, { useEffect, useMemo, useState } from 'react';
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

  const locationCount = useMemo(
    () => journals.filter((journal) => Boolean(journal.location)).length,
    [journals]
  );

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

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterSheetOpen]);

  useEffect(() => {
    if (journalViewTab !== 'feed') {
      setIsFilterSheetOpen(false);
    }
  }, [journalViewTab]);

  const setQuickDateFilter = (
    mode: 'all' | 'this_month' | 'last_month' | 'this_year'
  ) => {
    setJournalDateFilterMode(mode);
    setIsCustomDateOpen(false);

    setJournalFilterMonth('');
  };

  const openCustomDate = () => {
    setJournalDateFilterMode('custom');
    setIsCustomDateOpen(true);
  };

  const clearCustomDates = () => {
    setJournalFilterStartDate('');
    setJournalFilterEndDate('');
  };

  const getMonthLabel = (monthValue: string) => {
    const [year, month] = monthValue.split('-');
    const count = journals.filter((journal) =>
      journal.date?.startsWith(monthValue)
    ).length;

    return `Tháng ${month}/${year} (${count})`;
  };

  const tabs = [
    {
      id: 'feed' as const,
      label: 'Nhật ký',
      count: journals.length,
      icon: BookOpen,
    },
    {
      id: 'love_map' as const,
      label: 'Bản đồ',
      count: locationCount,
      icon: Compass,
    },
    {
      id: 'places' as const,
      label: 'Đã đi',
      icon: Map,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Main Journal Views */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = journalViewTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`subtab-${tab.id}`}
              type="button"
              onClick={() => setJournalViewTab(tab.id)}
              className={`min-w-0 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-rose-500'
                  }`}
                />

                <span className="truncate">{tab.label}</span>

                {typeof tab.count === 'number' && (
                  <span
                    className={`hidden min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] leading-none sm:inline ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter: only relevant to feed */}
      {journalViewTab === 'feed' && (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={journalSearch}
              onChange={(event) => setJournalSearch(event.target.value)}
              placeholder="Tìm kỷ niệm..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />

            {journalSearch && (
              <button
                type="button"
                onClick={() => setJournalSearch('')}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`relative flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold shadow-2xs transition ${
              filterCount > 0
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Bộ lọc</span>

            {filterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Active filters summary */}
      {journalViewTab === 'feed' && isAnyFilterActive && (
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {journalDateFilterMode !== 'all' && (
            <span className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
              {journalDateFilterMode === 'this_month' && 'Tháng này'}
              {journalDateFilterMode === 'last_month' && 'Tháng trước'}
              {journalDateFilterMode === 'this_year' && 'Năm nay'}
              {journalDateFilterMode === 'month' &&
                (journalFilterMonth
                  ? getMonthLabel(journalFilterMonth).replace(/\s\(\d+\)$/, '')
                  : 'Theo tháng')}
              {journalDateFilterMode === 'custom' && 'Khoảng ngày'}
            </span>
          )}

          {selectedCompanionFilter && (
            <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              {companions.find(
                (companion) => companion.id === selectedCompanionFilter
              )?.name || 'Người đồng hành'}
            </span>
          )}

          {journalSortOrder === 'oldest' && (
            <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Cũ nhất trước
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
          >
            <RotateCcw className="h-3 w-3" />
            Đặt lại
          </button>
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc nhật ký"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsFilterSheetOpen(false)}
            aria-label="Đóng bộ lọc"
          />

          <div className="relative z-10 max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bộ lọc nhật ký
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chỉ hiện những kỷ niệm bạn muốn tìm
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-138px)] space-y-6 overflow-y-auto px-5 py-5">
              {/* Date */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-slate-800">
                    Thời gian
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'all' as const, label: 'Tất cả' },
                    {
                      id: 'this_month' as const,
                      label: 'Tháng này',
                    },
                    {
                      id: 'last_month' as const,
                      label: 'Tháng trước',
                    },
                    {
                      id: 'this_year' as const,
                      label: 'Năm nay',
                    },
                  ].map((option) => {
                    const selected =
                      journalDateFilterMode === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setQuickDateFilter(option.id)}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          selected
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {availableMonths.length > 0 && (
                  <div className="relative mt-3">
                    <select
                      value={
                        journalDateFilterMode === 'month'
                          ? journalFilterMonth
                          : ''
                      }
                      onChange={(event) => {
                        const value = event.target.value;

                        if (!value) return;

                        setJournalFilterMonth(value);
                        setJournalDateFilterMode('month');
                        setIsCustomDateOpen(false);
                      }}
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="">Chọn một tháng cụ thể</option>

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
                  className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                    journalDateFilterMode === 'custom'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Chọn khoảng ngày</span>

                  {journalDateFilterMode === 'custom' && (
                    <Check className="h-4 w-4" />
                  )}
                </button>

                {(journalDateFilterMode === 'custom' ||
                  isCustomDateOpen) && (
                  <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Từ ngày
                      </span>
                      <input
                        type="date"
                        value={journalFilterStartDate}
                        onChange={(event) => {
                          setJournalFilterStartDate(
                            event.target.value
                          );
                          setJournalDateFilterMode('custom');
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Đến ngày
                      </span>
                      <input
                        type="date"
                        value={journalFilterEndDate}
                        onChange={(event) => {
                          setJournalFilterEndDate(
                            event.target.value
                          );
                          setJournalDateFilterMode('custom');
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                      />
                    </label>

                    {(journalFilterStartDate ||
                      journalFilterEndDate) && (
                      <button
                        type="button"
                        onClick={clearCustomDates}
                        className="text-left text-xs font-semibold text-slate-500 hover:text-rose-600 sm:col-span-2"
                      >
                        Xóa khoảng ngày
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Companion */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-slate-800">
                    Đi cùng ai
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCompanionFilter(null)
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      selectedCompanionFilter === null
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Tất cả
                  </button>

                  {companions.map((companion) => {
                    const selected =
                      selectedCompanionFilter === companion.id;

                    const count = journals.filter((journal) =>
                      journal.taggedPeople?.some(
                        (person) => person.id === companion.id
                      )
                    ).length;

                    return (
                      <button
                        key={companion.id}
                        type="button"
                        onClick={() =>
                          setSelectedCompanionFilter(
                            selected ? null : companion.id
                          )
                        }
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          selected
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{companion.emoji || '🐾'}</span>
                        <span>{companion.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            selected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {companions.length === 0 && (
                    <p className="text-xs text-slate-400">
                      Chưa có người hoặc thú cưng nào để lọc.
                    </p>
                  )}
                </div>
              </section>

              {/* Sort */}
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <ArrowDownUp className="h-4 w-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-slate-800">
                    Sắp xếp
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJournalSortOrder('newest')}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      journalSortOrder === 'newest'
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Mới nhất trước
                  </button>

                  <button
                    type="button"
                    onClick={() => setJournalSortOrder('oldest')}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      journalSortOrder === 'oldest'
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cũ nhất trước
                  </button>
                </div>
              </section>
            </div>

            <div
              className="flex items-center gap-2 border-t border-slate-100 bg-white px-5 pt-3"
              style={{
                paddingBottom:
                  'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <button
                type="button"
                onClick={onResetFilters}
                disabled={!isAnyFilterActive}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-40"
              >
                Đặt lại
              </button>

              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="h-11 flex-[1.35] rounded-xl bg-rose-500 px-4 text-sm font-bold text-white shadow-xs transition hover:bg-rose-600"
              >
                Xem kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { Companion, JournalEntry } from '../../types';
import {
  BookOpen,
  Compass,
  Map,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  ArrowDownUp,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';

interface JournalFiltersProps {
  journals: JournalEntry[];
  companions: Companion[];
  journalViewTab: 'feed' | 'love_map' | 'places';
  setJournalViewTab: (tab: 'feed' | 'love_map' | 'places') => void;
  selectedCompanionFilter: string | null;
  setSelectedCompanionFilter: (id: string | null) => void;
  journalDateFilterMode: 'all' | 'this_month' | 'last_month' | 'this_year' | 'month' | 'custom';
  setJournalDateFilterMode: (mode: 'all' | 'this_month' | 'last_month' | 'this_year' | 'month' | 'custom') => void;
  journalFilterMonth: string;
  setJournalFilterMonth: (m: string) => void;
  journalFilterStartDate: string;
  setJournalFilterStartDate: (d: string) => void;
  journalFilterEndDate: string;
  setJournalFilterEndDate: (d: string) => void;
  isCustomDateOpen: boolean;
  setIsCustomDateOpen: (open: boolean) => void;
  journalSortOrder: 'newest' | 'oldest';
  setJournalSortOrder: (order: 'newest' | 'oldest' | ((prev: 'newest' | 'oldest') => 'newest' | 'oldest')) => void;
  journalSearch: string;
  setJournalSearch: (q: string) => void;
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
  return (
    <div className="space-y-4">
      {/* Subtab Pills + Companion Filter Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          id="subtab-feed"
          type="button"
          onClick={() => setJournalViewTab('feed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            journalViewTab === 'feed'
              ? 'bg-rose-500 text-white shadow-2xs'
              : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Nhật ký ({journals.length})</span>
        </button>

        <button
          id="subtab-love-map"
          type="button"
          onClick={() => setJournalViewTab('love_map')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            journalViewTab === 'love_map'
              ? 'bg-rose-500 text-white shadow-2xs'
              : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-rose-400" />
          <span>🗺️ Bản đồ tình yêu ({journals.filter((j) => j.location).length})</span>
        </button>

        <button
          id="subtab-places"
          type="button"
          onClick={() => setJournalViewTab('places')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            journalViewTab === 'places'
              ? 'bg-rose-500 text-white shadow-2xs'
              : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>63 Tỉnh thành</span>
        </button>

        {/* Quick Companion Filter Chips */}
        {journalViewTab === 'feed' && companions.length > 0 && (
          <>
            <div className="h-4 w-[1px] bg-slate-200 shrink-0 mx-1" />
            <button
              type="button"
              onClick={() => setSelectedCompanionFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer whitespace-nowrap ${
                selectedCompanionFilter === null
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
            {companions.map((comp) => {
              const isSelected = selectedCompanionFilter === comp.id;
              const count = journals.filter((j) =>
                j.taggedPeople?.some((p) => p.id === comp.id)
              ).length;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompanionFilter(isSelected ? null : comp.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{comp.emoji || '🐾'}</span>
                  <span>{comp.name}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-md ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Toolbar: Time Filter, Sort & Search */}
      {journalViewTab === 'feed' && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Left: Time chips and dropdown */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0 mr-0.5">
                <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="hidden sm:inline">Thời gian:</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setJournalDateFilterMode('all');
                  setIsCustomDateOpen(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                  journalDateFilterMode === 'all'
                    ? 'bg-rose-500 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                Tất cả
              </button>

              <button
                type="button"
                onClick={() => {
                  setJournalDateFilterMode('this_month');
                  setIsCustomDateOpen(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                  journalDateFilterMode === 'this_month'
                    ? 'bg-rose-500 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                Tháng này
              </button>

              <button
                type="button"
                onClick={() => {
                  setJournalDateFilterMode('last_month');
                  setIsCustomDateOpen(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                  journalDateFilterMode === 'last_month'
                    ? 'bg-rose-500 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                Tháng trước
              </button>

              <button
                type="button"
                onClick={() => {
                  setJournalDateFilterMode('this_year');
                  setIsCustomDateOpen(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                  journalDateFilterMode === 'this_year'
                    ? 'bg-rose-500 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                Năm nay
              </button>

              {/* Month select dropdown */}
              {availableMonths.length > 0 && (
                <div className="relative shrink-0">
                  <select
                    value={journalDateFilterMode === 'month' ? journalFilterMonth : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setJournalFilterMonth(e.target.value);
                        setJournalDateFilterMode('month');
                        setIsCustomDateOpen(false);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer appearance-none pr-6 ${
                      journalDateFilterMode === 'month'
                        ? 'bg-rose-500 text-white shadow-2xs font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    <option value="" disabled>
                      Theo tháng...
                    </option>
                    {availableMonths.map((m) => {
                      const [y, mon] = m.split('-');
                      const count = journals.filter((j) => j.date?.startsWith(m)).length;
                      return (
                        <option key={m} value={m} className="text-slate-800 bg-white">
                          Tháng {mon}/{y} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    className={`w-3 h-3 absolute right-1.5 top-2 pointer-events-none ${
                      journalDateFilterMode === 'month' ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                </div>
              )}

              {/* Custom Date Filter */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isCustomDateOpen;
                  setIsCustomDateOpen(nextState);
                  if (nextState) {
                    setJournalDateFilterMode('custom');
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  journalDateFilterMode === 'custom' || isCustomDateOpen
                    ? 'bg-rose-500 text-white shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span>Tùy chọn ngày</span>
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            </div>

            {/* Right: Sort Order + Compact Search */}
            <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <button
                type="button"
                onClick={() => setJournalSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  journalSortOrder === 'oldest'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
                title={
                  journalSortOrder === 'newest'
                    ? 'Đang sắp xếp: Gần nhất (mới nhất trước)'
                    : 'Đang sắp xếp: Cũ nhất (lâu nhất trước)'
                }
              >
                <ArrowDownUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{journalSortOrder === 'newest' ? 'Gần nhất' : 'Cũ nhất'}</span>
              </button>

              {/* Search Box */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kỷ niệm..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-28 sm:w-36 focus:w-44 sm:focus:w-52 transition-all duration-200 pl-7 pr-6 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 shadow-2xs placeholder:text-slate-400"
                />
                {journalSearch && (
                  <button
                    type="button"
                    onClick={() => setJournalSearch('')}
                    className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reset Filters */}
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition cursor-pointer border border-rose-200/60 shrink-0 shadow-2xs"
                  title="Đặt lại bộ lọc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Đặt lại</span>
                </button>
              )}
            </div>
          </div>

          {/* Custom Date Range Accordion */}
          {(journalDateFilterMode === 'custom' || isCustomDateOpen) && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-[11px]">Từ ngày:</span>
                <input
                  type="date"
                  value={journalFilterStartDate}
                  onChange={(e) => {
                    setJournalFilterStartDate(e.target.value);
                    setJournalDateFilterMode('custom');
                  }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-[11px]">Đến ngày:</span>
                <input
                  type="date"
                  value={journalFilterEndDate}
                  onChange={(e) => {
                    setJournalFilterEndDate(e.target.value);
                    setJournalDateFilterMode('custom');
                  }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {(journalFilterStartDate || journalFilterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setJournalFilterStartDate('');
                    setJournalFilterEndDate('');
                  }}
                  className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium cursor-pointer"
                >
                  Xóa ngày
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

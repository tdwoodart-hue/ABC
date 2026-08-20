import React from 'react';
import { Companion } from '../../types';
import { BookOpen, PawPrint, Plus } from 'lucide-react';

interface JournalHeaderProps {
  companions: Companion[];
  showAddJournal: boolean;
  setShowAddJournal: (show: boolean) => void;
  onOpenCompanionManager: () => void;
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  companions,
  showAddJournal,
  setShowAddJournal,
  onOpenCompanionManager,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-rose-500 shrink-0" />
          <span>Nhật Ký Tình Yêu</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Album kỷ niệm số lưu giữ những hành trình ngọt ngào của hai bạn
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCompanionManager}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200/80 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs whitespace-nowrap"
          title="Quản lý thú cưng & bạn bè xuất hiện trong kỷ niệm"
        >
          <PawPrint className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="hidden sm:inline">Thú cưng & Bạn bè</span>
          <span className="sm:hidden">Thú cưng</span>
          {companions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[10px] flex items-center justify-center font-bold">
              {companions.length}
            </span>
          )}
        </button>

        <button
          id="btn-open-create-journal"
          type="button"
          onClick={() => setShowAddJournal(!showAddJournal)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Viết nhật ký</span>
        </button>
      </div>
    </div>
  );
};

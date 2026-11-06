import React from 'react';
import { Companion } from '../../types';
import { PawPrint, Plus } from 'lucide-react';

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
    <div className="us-tool-header flex items-center justify-between gap-3">
      <div><h2 className="app-page-title">Nhật ký của mình</h2><p className="us-tool-description hidden sm:block">Những ngày bình thường, những chuyện đáng nhớ.</p></div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCompanionManager}
          className="app-icon-button relative border border-[var(--app-border)] bg-white"
          aria-label="Người và thú cưng"
          title="Người và thú cưng"
        >
          <PawPrint className="h-4.5 w-4.5" />
          {companions.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {companions.length}
            </span>
          )}
        </button>

        <button
          id="btn-open-create-journal"
          type="button"
          onClick={() => setShowAddJournal(!showAddJournal)}
          className="app-button app-button-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Viết nhật ký</span>
        </button>
      </div>
    </div>
  );
};

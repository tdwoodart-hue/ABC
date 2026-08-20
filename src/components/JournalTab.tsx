import React from 'react';
import {
  UserProfile,
  CoupleData,
  Companion,
  JournalEntry,
} from '../types';

import { JournalForm, JournalFormData } from './JournalForm';
import { LoveFootprintMap } from './LoveFootprintMap';
import { VisitedPlacesTracker } from './VisitedPlacesTracker';

import { JournalHeader } from './journal/JournalHeader';
import { JournalFilters } from './journal/JournalFilters';
import { JournalCard } from './journal/JournalCard';

import { BookOpen, RotateCcw } from 'lucide-react';

interface JournalTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals: JournalEntry[];
  companions: Companion[];

  journalViewTab: 'feed' | 'love_map' | 'places';
  setJournalViewTab: (tab: 'feed' | 'love_map' | 'places') => void;

  showAddJournal: boolean;
  setShowAddJournal: (show: boolean) => void;

  addingJournal: boolean;
  journalImageLoading: boolean;
  autoLocatingGPS: boolean;

  createFormData: JournalFormData;
  onCreateFormChange: (updated: Partial<JournalFormData>) => void;
  onAddJournalSubmit: (e: React.FormEvent) => void;

  editingJournalId: string | null;
  savingEdit: boolean;
  editImageLoading: boolean;
  editFormData: JournalFormData;
  onEditFormChange: (updated: Partial<JournalFormData>) => void;
  onSaveEditJournalSubmit: (
    journalId: string,
    e: React.FormEvent
  ) => void;
  onCancelEditJournal: () => void;
  onStartEditJournal: (item: JournalEntry) => void;

  onRequestDeleteJournal: (item: JournalEntry) => void;
  onApproveDeleteJournal: (journalId: string) => void;
  onCancelDeleteRequest: (journalId: string) => void;

  onOpenLightbox: (
    journal: JournalEntry,
    imageIndex?: number
  ) => void;

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
  filteredJournals: JournalEntry[];

  commentInputs: Record<string, string>;
  onCommentInputChange: (
    journalId: string,
    value: string
  ) => void;
  onAddComment: (
    journalId: string,
    e: React.FormEvent
  ) => void;

  onOpenCompanionManager: () => void;

  onOpenCreateMapPicker: () => void;
  onAutoDetectCreateGPS: () => void;
  onOpenCreateCamera: () => void;
  onCreateFilesSelected: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onOpenEditMapPicker: () => void;
  onAutoDetectEditGPS: () => void;
  onOpenEditCamera: () => void;
  onEditFilesSelected: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

export const JournalTab: React.FC<JournalTabProps> = ({
  userProfile,
  coupleData,
  journals,
  companions,

  journalViewTab,
  setJournalViewTab,

  showAddJournal,
  setShowAddJournal,

  addingJournal,
  journalImageLoading,
  autoLocatingGPS,

  createFormData,
  onCreateFormChange,
  onAddJournalSubmit,

  editingJournalId,
  savingEdit,
  editImageLoading,
  editFormData,
  onEditFormChange,
  onSaveEditJournalSubmit,
  onCancelEditJournal,
  onStartEditJournal,

  onRequestDeleteJournal,
  onApproveDeleteJournal,
  onCancelDeleteRequest,

  onOpenLightbox,

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
  filteredJournals,

  commentInputs,
  onCommentInputChange,
  onAddComment,

  onOpenCompanionManager,

  onOpenCreateMapPicker,
  onAutoDetectCreateGPS,
  onOpenCreateCamera,
  onCreateFilesSelected,

  onOpenEditMapPicker,
  onAutoDetectEditGPS,
  onOpenEditCamera,
  onEditFilesSelected,
}) => {
  const isAnyFilterActive =
    journalDateFilterMode !== 'all' ||
    Boolean(journalSearch.trim()) ||
    Boolean(selectedCompanionFilter) ||
    journalSortOrder !== 'newest';

  const handleResetFilters = () => {
    setJournalDateFilterMode('all');
    setJournalFilterMonth('');
    setJournalFilterStartDate('');
    setJournalFilterEndDate('');
    setIsCustomDateOpen(false);
    setJournalSearch('');
    setSelectedCompanionFilter(null);
    setJournalSortOrder('newest');
  };

  return (
    <section
      id="journal-tab-container"
      className="space-y-5 sm:space-y-6"
    >
      <JournalHeader
        companions={companions}
        showAddJournal={showAddJournal}
        setShowAddJournal={setShowAddJournal}
        onOpenCompanionManager={onOpenCompanionManager}
      />

      <JournalFilters
        journals={journals}
        companions={companions}
        journalViewTab={journalViewTab}
        setJournalViewTab={setJournalViewTab}
        selectedCompanionFilter={selectedCompanionFilter}
        setSelectedCompanionFilter={setSelectedCompanionFilter}
        journalDateFilterMode={journalDateFilterMode}
        setJournalDateFilterMode={setJournalDateFilterMode}
        journalFilterMonth={journalFilterMonth}
        setJournalFilterMonth={setJournalFilterMonth}
        journalFilterStartDate={journalFilterStartDate}
        setJournalFilterStartDate={setJournalFilterStartDate}
        journalFilterEndDate={journalFilterEndDate}
        setJournalFilterEndDate={setJournalFilterEndDate}
        isCustomDateOpen={isCustomDateOpen}
        setIsCustomDateOpen={setIsCustomDateOpen}
        journalSortOrder={journalSortOrder}
        setJournalSortOrder={setJournalSortOrder}
        journalSearch={journalSearch}
        setJournalSearch={setJournalSearch}
        availableMonths={availableMonths}
        isAnyFilterActive={isAnyFilterActive}
        onResetFilters={handleResetFilters}
      />

      {showAddJournal && (
        <JournalForm
          mode="create"
          userProfile={userProfile}
          coupleData={coupleData}
          companions={companions}
          formData={createFormData}
          isAuthor
          isLoading={addingJournal}
          imageUploading={journalImageLoading}
          autoLocatingGPS={autoLocatingGPS}
          onFormChange={onCreateFormChange}
          onSubmit={onAddJournalSubmit}
          onCancel={() => setShowAddJournal(false)}
          onOpenMapPicker={onOpenCreateMapPicker}
          onAutoDetectGPS={onAutoDetectCreateGPS}
          onOpenCamera={onOpenCreateCamera}
          onFilesSelected={onCreateFilesSelected}
          onOpenCompanionManager={onOpenCompanionManager}
        />
      )}

      {journalViewTab === 'feed' && (
        <>
          {filteredJournals.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-10 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <BookOpen className="h-6 w-6" />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                {journals.length === 0
                  ? 'Chưa có kỷ niệm nào'
                  : 'Không tìm thấy kỷ niệm phù hợp'}
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                {journals.length === 0
                  ? 'Bấm “Viết nhật ký” để lưu lại khoảnh khắc đầu tiên của hai bạn.'
                  : 'Thử thay đổi từ khóa hoặc bộ lọc đang sử dụng.'}
              </p>

              {journals.length > 0 && isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJournals.map((item) =>
                editingJournalId === item.id ? (
                  <JournalForm
                    key={item.id}
                    mode="edit"
                    userProfile={userProfile}
                    coupleData={coupleData}
                    companions={companions}
                    formData={editFormData}
                    isAuthor={
                      item.authorUid === userProfile.uid
                    }
                    isLoading={savingEdit}
                    imageUploading={editImageLoading}
                    autoLocatingGPS={autoLocatingGPS}
                    onFormChange={onEditFormChange}
                    onSubmit={(event) =>
                      onSaveEditJournalSubmit(
                        item.id,
                        event
                      )
                    }
                    onCancel={onCancelEditJournal}
                    onOpenMapPicker={onOpenEditMapPicker}
                    onAutoDetectGPS={onAutoDetectEditGPS}
                    onOpenCamera={onOpenEditCamera}
                    onFilesSelected={onEditFilesSelected}
                    onOpenCompanionManager={
                      onOpenCompanionManager
                    }
                  />
                ) : (
                  <JournalCard
                    key={item.id}
                    item={item}
                    userProfile={userProfile}
                    coupleData={coupleData}
                    selectedCompanionFilter={
                      selectedCompanionFilter
                    }
                    commentInput={
                      commentInputs[item.id] || ''
                    }
                    onCompanionClick={(companionId) =>
                      setSelectedCompanionFilter(
                        selectedCompanionFilter ===
                          companionId
                          ? null
                          : companionId
                      )
                    }
                    onOpenLightbox={(journal, index) =>
                      onOpenLightbox(journal, index)
                    }
                    onStartEdit={onStartEditJournal}
                    onRequestDelete={
                      onRequestDeleteJournal
                    }
                    onApproveDelete={
                      onApproveDeleteJournal
                    }
                    onCancelDeleteRequest={
                      onCancelDeleteRequest
                    }
                    onCommentInputChange={
                      onCommentInputChange
                    }
                    onAddComment={onAddComment}
                  />
                )
              )}
            </div>
          )}
        </>
      )}

      {journalViewTab === 'love_map' && (
        <LoveFootprintMap
          coupleId={
            coupleData?.id ||
            userProfile.coupleId ||
            'our_forever_couple_id'
          }
          userProfile={userProfile}
          coupleData={coupleData}
          journals={journals}
          onOpenJournalLightbox={(journal, index) =>
            onOpenLightbox(journal, index)
          }
          onNavigateToJournal={() =>
            setJournalViewTab('feed')
          }
        />
      )}

      {journalViewTab === 'places' && (
        <VisitedPlacesTracker
          coupleId={
            coupleData?.id ||
            userProfile.coupleId ||
            'our_forever_couple_id'
          }
          userProfile={userProfile}
          coupleData={coupleData}
          journals={journals}
          onOpenJournalLightbox={(journal, index) =>
            onOpenLightbox(journal, index)
          }
          defaultCollapsed={false}
        />
      )}
    </section>
  );
};
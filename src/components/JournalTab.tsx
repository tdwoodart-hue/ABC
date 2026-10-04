import React, { useCallback, useMemo } from 'react';
import {
  UserProfile,
  CoupleData,
  Companion,
  JournalEntry,
  SavedPlace,
} from '../types';
import { JournalHeader } from './journal/JournalHeader';
import { JournalFilters } from './journal/JournalFilters';
import { JournalForm, JournalFormData } from './JournalForm';
import { JournalCard } from './journal/JournalCard';
import { DailyJournalFeed } from './journal/DailyJournalFeed';
import { LoveFootprintMap } from './LoveFootprintMap';
import { VisitedPlacesTracker } from './VisitedPlacesTracker';
import { BookOpen, Plus, RotateCcw } from 'lucide-react';

export interface JournalTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals: JournalEntry[];
  companions: Companion[];
  savedPlaces?: SavedPlace[];
  targetJournalId?: string | null;
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
  onSaveEditJournalSubmit: (journalId: string, e: React.FormEvent) => void;
  onCancelEditJournal: () => void;
  onStartEditJournal: (journal: JournalEntry) => void;
  onRequestDeleteJournal: (journal: JournalEntry) => void;
  onApproveDeleteJournal: (journalId: string) => void;
  onCancelDeleteRequest: (journalId: string) => void;
  onOpenLightbox: (journal: JournalEntry, imageIndex?: number) => void;
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
  onCommentInputChange: (journalId: string, value: string) => void;
  onAddComment: (journalId: string, e: React.FormEvent) => void;
  onAddVoiceComment?: (journalId: string, voiceData: { url: string; duration: number; textNote?: string }) => Promise<void>;
  onOpenCompanionManager: () => void;
  onOpenCreateMapPicker: () => void;
  onAutoDetectCreateGPS: () => void;
  onOpenCreateCamera: () => void;
  onCreateFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenEditMapPicker: () => void;
  onAutoDetectEditGPS: () => void;
  onOpenEditCamera: () => void;
  onEditFilesSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const JournalTab: React.FC<JournalTabProps> = ({
  userProfile,
  coupleData,
  journals,
  companions,
  savedPlaces = [],
  targetJournalId,
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
  onAddVoiceComment,
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
  const isAnyFilterActive = useMemo(() => {
    return (
      selectedCompanionFilter !== null ||
      journalDateFilterMode !== 'all' ||
      journalSearch.trim().length > 0 ||
      journalSortOrder !== 'newest'
    );
  }, [
    selectedCompanionFilter,
    journalDateFilterMode,
    journalSearch,
    journalSortOrder,
  ]);

  const handleResetFilters = useCallback(() => {
    setSelectedCompanionFilter(null);
    setJournalDateFilterMode('all');
    setJournalSearch('');
    setJournalSortOrder('newest');
    setIsCustomDateOpen(false);
  }, [
    setSelectedCompanionFilter,
    setJournalDateFilterMode,
    setJournalSearch,
    setJournalSortOrder,
    setIsCustomDateOpen,
  ]);

  const handleOpenPost = useCallback(
    (journal: JournalEntry) => {
      onOpenLightbox(journal, 0);
    },
    [onOpenLightbox]
  );

  const handleOpenPostMedia = useCallback(
    (journal: JournalEntry, imageIndex = 0) => {
      onOpenLightbox(journal, imageIndex);
    },
    [onOpenLightbox]
  );

  const renderJournalItem = useCallback(
    (item: JournalEntry): React.ReactNode => {
      if (editingJournalId === item.id) {
        return (
          <JournalForm
            key={item.id}
            mode="edit"
            userProfile={userProfile}
            coupleData={coupleData}
            companions={companions}
            formData={editFormData}
            isAuthor={item.authorUid === userProfile.uid}
            isLoading={savingEdit}
            imageUploading={editImageLoading}
            autoLocatingGPS={autoLocatingGPS}
            savedPlaces={savedPlaces}
            journals={journals}
            onFormChange={onEditFormChange}
            onSubmit={(event) =>
              onSaveEditJournalSubmit(item.id, event)
            }
            onCancel={onCancelEditJournal}
            onOpenMapPicker={onOpenEditMapPicker}
            onAutoDetectGPS={onAutoDetectEditGPS}
            onOpenCamera={onOpenEditCamera}
            onFilesSelected={onEditFilesSelected}
            onOpenCompanionManager={onOpenCompanionManager}
          />
        );
      }

      return (
        <JournalCard
          key={item.id}
          item={item}
          userProfile={userProfile}
          coupleData={coupleData}
          selectedCompanionFilter={selectedCompanionFilter}
          commentInput={commentInputs[item.id] || ''}
          onCompanionClick={(companionId) =>
            setSelectedCompanionFilter(
              selectedCompanionFilter === companionId
                ? null
                : companionId
            )
          }
          onOpenPost={handleOpenPost}
          onOpenLightbox={handleOpenPostMedia}
          onStartEdit={onStartEditJournal}
          onRequestDelete={onRequestDeleteJournal}
          onApproveDelete={onApproveDeleteJournal}
          onCancelDeleteRequest={onCancelDeleteRequest}
          onCommentInputChange={onCommentInputChange}
          onAddComment={onAddComment}
          onAddVoiceComment={onAddVoiceComment}
        />
      );
    },
    [
      editingJournalId,
      userProfile,
      coupleData,
      companions,
      editFormData,
      savingEdit,
      editImageLoading,
      autoLocatingGPS,
      savedPlaces,
      journals,
      onEditFormChange,
      onSaveEditJournalSubmit,
      onCancelEditJournal,
      onOpenEditMapPicker,
      onAutoDetectEditGPS,
      onOpenEditCamera,
      onEditFilesSelected,
      onOpenCompanionManager,
      selectedCompanionFilter,
      commentInputs,
      setSelectedCompanionFilter,
      handleOpenPost,
      handleOpenPostMedia,
      onStartEditJournal,
      onRequestDeleteJournal,
      onApproveDeleteJournal,
      onCancelDeleteRequest,
      onCommentInputChange,
      onAddComment,
      onAddVoiceComment,
    ]
  );

  const coupleId = coupleData?.id || userProfile.coupleId || '';

  return (
    <div className="space-y-4 pb-24">
      {/* HEADER SECTION */}
      <JournalHeader
        companions={companions}
        showAddJournal={showAddJournal}
        setShowAddJournal={setShowAddJournal}
        onOpenCompanionManager={onOpenCompanionManager}
      />

      {/* CREATE JOURNAL FORM */}
      {showAddJournal && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-200">
          <JournalForm
            mode="create"
            userProfile={userProfile}
            coupleData={coupleData}
            companions={companions}
            formData={createFormData}
            isAuthor={true}
            isLoading={addingJournal}
            imageUploading={journalImageLoading}
            autoLocatingGPS={autoLocatingGPS}
            savedPlaces={savedPlaces}
            journals={journals}
            onFormChange={onCreateFormChange}
            onSubmit={onAddJournalSubmit}
            onCancel={() => setShowAddJournal(false)}
            onOpenMapPicker={onOpenCreateMapPicker}
            onAutoDetectGPS={onAutoDetectCreateGPS}
            onOpenCamera={onOpenCreateCamera}
            onFilesSelected={onCreateFilesSelected}
            onOpenCompanionManager={onOpenCompanionManager}
          />
        </div>
      )}

      {/* VIEW TABS & FILTERS */}
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

      {/* TAB CONTENT: MAP VIEW */}
      {journalViewTab === 'love_map' && (
        <LoveFootprintMap
          coupleId={coupleId}
          userProfile={userProfile}
          coupleData={coupleData}
          journals={journals}
          savedPlaces={savedPlaces}
          onOpenJournalLightbox={(journal, imageIndex) =>
            onOpenLightbox(journal, imageIndex ?? 0)
          }
          onNavigateToJournal={() => setJournalViewTab('feed')}
        />
      )}

      {/* TAB CONTENT: PLACES / PROVINCES TRACKER */}
      {journalViewTab === 'places' && (
        <VisitedPlacesTracker
          coupleId={coupleId}
          userProfile={userProfile}
          coupleData={coupleData}
          journals={journals}
          onOpenJournalLightbox={(journal, imageIndex) =>
            onOpenLightbox(journal, imageIndex ?? 0)
          }
        />
      )}

      {/* TAB CONTENT: JOURNAL FEED WITH DAILY CAPSULES */}
      {journalViewTab === 'feed' && (
        <>
          {filteredJournals.length === 0 ? (
            <div className="app-card px-5 py-8 text-center sm:py-10">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="app-section-title">
                {isAnyFilterActive ? 'Không có kết quả' : 'Chưa có bài nào'}
              </h3>

              <div className="mt-4 flex justify-center">
                {isAnyFilterActive ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="app-button app-button-secondary inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Đặt lại</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddJournal(true)}
                    className="app-button app-button-primary inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Viết</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <DailyJournalFeed
              journals={filteredJournals}
              renderJournal={renderJournalItem}
              targetJournalId={targetJournalId}
            />
          )}
        </>
      )}
    </div>
  );
};
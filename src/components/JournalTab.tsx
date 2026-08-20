import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { runTransaction } from 'firebase/firestore';

import {
  UserProfile,
  CoupleData,
  Companion,
  JournalEntry,
} from '../types';

import { db, doc } from '../lib/firebase';

import { JournalForm, JournalFormData } from './JournalForm';
import { LoveFootprintMap } from './LoveFootprintMap';
import { VisitedPlacesTracker } from './VisitedPlacesTracker';

import { JournalHeader } from './journal/JournalHeader';
import { JournalFilters } from './journal/JournalFilters';
import { JournalCard } from './journal/JournalCard';

import {
  ArrowLeft,
  BookOpen,
  Link2,
  Loader2,
  RotateCcw,
} from 'lucide-react';

type RoutableJournal = JournalEntry & {
  postNumber?: number;
};

function getPostNumber(
  journal: JournalEntry
): number | null {
  const value = Number(
    (journal as RoutableJournal)
      .postNumber
  );

  return Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function getJournalPathPostNumber():
  | number
  | null {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  const match =
    window.location.pathname.match(
      /^\/journal\/([1-9]\d*)\/?$/
    );

  if (!match) return null;

  const value = Number(match[1]);

  return Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

interface JournalTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals: JournalEntry[];
  companions: Companion[];

  journalViewTab:
    | 'feed'
    | 'love_map'
    | 'places';

  setJournalViewTab: (
    tab:
      | 'feed'
      | 'love_map'
      | 'places'
  ) => void;

  showAddJournal: boolean;
  setShowAddJournal: (
    show: boolean
  ) => void;

  addingJournal: boolean;
  journalImageLoading: boolean;
  autoLocatingGPS: boolean;

  createFormData: JournalFormData;

  onCreateFormChange: (
    updated: Partial<JournalFormData>
  ) => void;

  onAddJournalSubmit: (
    e: React.FormEvent
  ) => void;

  editingJournalId:
    | string
    | null;

  savingEdit: boolean;
  editImageLoading: boolean;
  editFormData: JournalFormData;

  onEditFormChange: (
    updated: Partial<JournalFormData>
  ) => void;

  onSaveEditJournalSubmit: (
    journalId: string,
    e: React.FormEvent
  ) => void;

  onCancelEditJournal: () => void;

  onStartEditJournal: (
    item: JournalEntry
  ) => void;

  onRequestDeleteJournal: (
    item: JournalEntry
  ) => void;

  onApproveDeleteJournal: (
    journalId: string
  ) => void;

  onCancelDeleteRequest: (
    journalId: string
  ) => void;

  onOpenLightbox: (
    journal: JournalEntry,
    imageIndex?: number
  ) => void;

  selectedCompanionFilter:
    | string
    | null;

  setSelectedCompanionFilter: (
    id: string | null
  ) => void;

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

  setJournalFilterMonth: (
    month: string
  ) => void;

  journalFilterStartDate: string;

  setJournalFilterStartDate: (
    date: string
  ) => void;

  journalFilterEndDate: string;

  setJournalFilterEndDate: (
    date: string
  ) => void;

  isCustomDateOpen: boolean;

  setIsCustomDateOpen: (
    open: boolean
  ) => void;

  journalSortOrder:
    | 'newest'
    | 'oldest';

  setJournalSortOrder: (
    order:
      | 'newest'
      | 'oldest'
      | ((
          prev:
            | 'newest'
            | 'oldest'
        ) =>
          | 'newest'
          | 'oldest')
  ) => void;

  journalSearch: string;

  setJournalSearch: (
    query: string
  ) => void;

  availableMonths: string[];
  filteredJournals: JournalEntry[];

  commentInputs: Record<
    string,
    string
  >;

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

export const JournalTab:
  React.FC<JournalTabProps> = ({
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
    const [
      requestedPostNumber,
      setRequestedPostNumber,
    ] = useState<number | null>(
      () => getJournalPathPostNumber()
    );

    const [
      assigningPostNumbers,
      setAssigningPostNumbers,
    ] = useState(false);

    const isAnyFilterActive =
      journalDateFilterMode !==
        'all' ||
      Boolean(
        journalSearch.trim()
      ) ||
      Boolean(
        selectedCompanionFilter
      ) ||
      journalSortOrder !==
        'newest';

    const handleResetFilters =
      useCallback(() => {
        setJournalDateFilterMode(
          'all'
        );

        setJournalFilterMonth('');
        setJournalFilterStartDate(
          ''
        );
        setJournalFilterEndDate('');
        setIsCustomDateOpen(false);
        setJournalSearch('');

        setSelectedCompanionFilter(
          null
        );

        setJournalSortOrder(
          'newest'
        );
      }, [
        setJournalDateFilterMode,
        setJournalFilterMonth,
        setJournalFilterStartDate,
        setJournalFilterEndDate,
        setIsCustomDateOpen,
        setJournalSearch,
        setSelectedCompanionFilter,
        setJournalSortOrder,
      ]);

    const existingMaxPostNumber =
      useMemo(() => {
        return journals.reduce(
          (max, journal) => {
            const postNumber =
              getPostNumber(
                journal
              );

            return postNumber
              ? Math.max(
                  max,
                  postNumber
                )
              : max;
          },
          0
        );
      }, [journals]);

    /*
     * Atomic route-number allocator.
     *
     * A shared Firestore counter prevents /5 from being assigned
     * to two posts if both phones create/open posts at the same time.
     */
    const ensurePostNumber =
      useCallback(
        async (
          journal: JournalEntry
        ): Promise<number> => {
          const current =
            getPostNumber(
              journal
            );

          if (current) {
            return current;
          }

          if (
            !userProfile.coupleId
          ) {
            throw new Error(
              'Thiếu coupleId.'
            );
          }

          const journalRef = doc(
            db,
            'couples',
            userProfile.coupleId,
            'journals',
            journal.id
          );

          const routingRef = doc(
            db,
            'couples',
            userProfile.coupleId,
            'meta',
            'journalRouting'
          );

          return runTransaction(
            db,
            async (
              transaction
            ) => {
              const [
                journalSnapshot,
                routingSnapshot,
              ] =
                await Promise.all([
                  transaction.get(
                    journalRef
                  ),
                  transaction.get(
                    routingRef
                  ),
                ]);

              if (
                !journalSnapshot.exists()
              ) {
                throw new Error(
                  'Bài viết không còn tồn tại.'
                );
              }

              const latestNumber =
                Number(
                  journalSnapshot.data()
                    .postNumber
                );

              if (
                Number.isInteger(
                  latestNumber
                ) &&
                latestNumber > 0
              ) {
                return latestNumber;
              }

              const storedNext =
                Number(
                  routingSnapshot.exists()
                    ? routingSnapshot.data()
                        .nextPostNumber
                    : 0
                );

              const nextPostNumber =
                Math.max(
                  Number.isInteger(
                    storedNext
                  ) &&
                    storedNext > 0
                    ? storedNext
                    : 1,
                  existingMaxPostNumber +
                    1
                );

              transaction.update(
                journalRef,
                {
                  postNumber:
                    nextPostNumber,
                }
              );

              transaction.set(
                routingRef,
                {
                  nextPostNumber:
                    nextPostNumber + 1,
                  updatedAt:
                    new Date().toISOString(),
                },
                {
                  merge: true,
                }
              );

              return nextPostNumber;
            }
          );
        },
        [
          existingMaxPostNumber,
          userProfile.coupleId,
        ]
      );

    /*
     * One-time migration for old posts.
     *
     * Old journals do not have postNumber. We assign their numbers
     * from oldest-created to newest-created, then persist the number.
     * After that sorting/filtering/deleting other posts cannot change it.
     */
    useEffect(() => {
      if (
        !userProfile.coupleId ||
        journals.length === 0
      ) {
        return;
      }

      const unnumbered =
        journals
          .filter(
            (journal) =>
              !getPostNumber(
                journal
              )
          )
          .sort((a, b) => {
            const timeA =
              new Date(
                a.createdAt || 0
              ).getTime();

            const timeB =
              new Date(
                b.createdAt || 0
              ).getTime();

            if (
              timeA !== timeB
            ) {
              return (
                timeA - timeB
              );
            }

            return a.id.localeCompare(
              b.id
            );
          });

      if (
        unnumbered.length === 0
      ) {
        setAssigningPostNumbers(
          false
        );
        return;
      }

      let cancelled = false;

      setAssigningPostNumbers(
        true
      );

      void (async () => {
        try {
          for (const journal of unnumbered) {
            if (cancelled) {
              return;
            }

            await ensurePostNumber(
              journal
            );
          }
        } catch (error) {
          console.error(
            'Không thể gán URL cho bài nhật ký:',
            error
          );
        } finally {
          if (!cancelled) {
            setAssigningPostNumbers(
              false
            );
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      journals,
      userProfile.coupleId,
      ensurePostNumber,
    ]);

    const routeJournal =
      useMemo(() => {
        if (
          requestedPostNumber ===
          null
        ) {
          return null;
        }

        return (
          journals.find(
            (journal) =>
              getPostNumber(
                journal
              ) ===
              requestedPostNumber
          ) || null
        );
      }, [
        journals,
        requestedPostNumber,
      ]);

    const numberingComplete =
      useMemo(
        () =>
          journals.length === 0 ||
          journals.every(
            (journal) =>
              Boolean(
                getPostNumber(
                  journal
                )
              )
          ),
        [journals]
      );

    /*
     * Keep /journal/:postNumber synced with the selected journal.
     */
    useEffect(() => {
      if (
        requestedPostNumber ===
          null ||
        !routeJournal
      ) {
        return;
      }

      setJournalViewTab('feed');

      const targetPath =
        `/journal/${requestedPostNumber}`;

      if (
        window.location.pathname !==
        targetPath
      ) {
        window.history.replaceState(
          {
            journalPost:
              requestedPostNumber,
          },
          '',
          targetPath
        );
      }

      window.scrollTo({
        top: 0,
        behavior: 'auto',
      });
    }, [
      requestedPostNumber,
      routeJournal,
      setJournalViewTab,
    ]);

    /*
     * Browser back/forward:
     * /journal   -> feed
     * /journal/1 -> single post 1
     */
    useEffect(() => {
      const handlePopState =
        () => {
          setRequestedPostNumber(
            getJournalPathPostNumber()
          );

          window.scrollTo({
            top: 0,
            behavior: 'auto',
          });
        };

      window.addEventListener(
        'popstate',
        handlePopState
      );

      return () => {
        window.removeEventListener(
          'popstate',
          handlePopState
        );
      };
    }, []);

    const navigateToPost =
      useCallback(
        async (
          journal: JournalEntry,
          pushHistory = true
        ) => {
          try {
            const postNumber =
              await ensurePostNumber(
                journal
              );

            const targetPath =
              `/journal/${postNumber}`;

            if (
              window.location.pathname !==
              targetPath
            ) {
              if (pushHistory) {
                window.history.pushState(
                  {
                    journalPost:
                      postNumber,
                  },
                  '',
                  targetPath
                );
              } else {
                window.history.replaceState(
                  {
                    journalPost:
                      postNumber,
                  },
                  '',
                  targetPath
                );
              }
            }

            setRequestedPostNumber(
              postNumber
            );

            setJournalViewTab(
              'feed'
            );

            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });

            return postNumber;
          } catch (error) {
            console.error(
              'Không thể mở URL bài viết:',
              error
            );

            return null;
          }
        },
        [
          ensurePostNumber,
          setJournalViewTab,
        ]
      );

    const handleOpenPost =
      useCallback(
        (
          journal: JournalEntry
        ) => {
          void navigateToPost(
            journal
          );
        },
        [navigateToPost]
      );

    const handleOpenPostMedia =
      useCallback(
        (
          journal: JournalEntry,
          imageIndex = 0
        ) => {
          const currentNumber =
            getPostNumber(
              journal
            );

          /*
           * If already inside this post route, do not create
           * another history entry just because a photo was opened.
           */
          if (
            currentNumber &&
            requestedPostNumber ===
              currentNumber
          ) {
            onOpenLightbox(
              journal,
              imageIndex
            );

            return;
          }

          void navigateToPost(
            journal
          ).then(
            (
              postNumber
            ) => {
              if (
                postNumber
              ) {
                onOpenLightbox(
                  journal,
                  imageIndex
                );
              }
            }
          );
        },
        [
          navigateToPost,
          onOpenLightbox,
          requestedPostNumber,
        ]
      );

    const leaveSinglePost =
      useCallback(() => {
        setRequestedPostNumber(
          null
        );

        setJournalViewTab('feed');

        if (
          window.location.pathname !==
          '/journal'
        ) {
          window.history.replaceState(
            null,
            '',
            '/journal'
          );
        }

        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, [setJournalViewTab]);

    /*
     * SINGLE POST PAGE: /journal/1, /journal/2, /journal/3...
     */
    if (
      requestedPostNumber !==
      null
    ) {
      if (!routeJournal) {
        const stillPreparing =
          assigningPostNumbers ||
          !numberingComplete;

        return (
          <section className="space-y-4">
            <button
              type="button"
              onClick={
                leaveSinglePost
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Nhật ký
            </button>

            <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-12 text-center shadow-sm">
              {stillPreparing ? (
                <>
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-rose-500" />

                  <h3 className="mt-3 text-sm font-bold text-slate-800">
                    Đang mở bài /journal/
                    {
                      requestedPostNumber
                    }
                  </h3>
                </>
              ) : (
                <>
                  <Link2 className="mx-auto h-7 w-7 text-slate-300" />

                  <h3 className="mt-3 text-sm font-bold text-slate-800">
                    Không tìm thấy bài /journal/
                    {
                      requestedPostNumber
                    }
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Bài có thể đã bị
                    xóa hoặc đường dẫn
                    không tồn tại.
                  </p>
                </>
              )}
            </div>
          </section>
        );
      }

      return (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={
                leaveSinglePost
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Nhật ký
            </button>

            <div className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
              /
              {
                requestedPostNumber
              }
            </div>
          </div>

          <JournalCard
            item={routeJournal}
            userProfile={
              userProfile
            }
            coupleData={
              coupleData
            }
            selectedCompanionFilter={
              selectedCompanionFilter
            }
            commentInput={
              commentInputs[
                routeJournal.id
              ] || ''
            }
            onCompanionClick={(
              companionId
            ) =>
              setSelectedCompanionFilter(
                selectedCompanionFilter ===
                  companionId
                  ? null
                  : companionId
              )
            }
            onOpenPost={
              handleOpenPost
            }
            onOpenLightbox={
              handleOpenPostMedia
            }
            onStartEdit={
              onStartEditJournal
            }
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
            onAddComment={
              onAddComment
            }
            singlePostView
          />
        </section>
      );
    }

    return (
      <section
        id="journal-tab-container"
        className="space-y-5 sm:space-y-6"
      >
        <JournalHeader
          companions={companions}
          showAddJournal={
            showAddJournal
          }
          setShowAddJournal={
            setShowAddJournal
          }
          onOpenCompanionManager={
            onOpenCompanionManager
          }
        />

        <JournalFilters
          journals={journals}
          companions={companions}
          journalViewTab={
            journalViewTab
          }
          setJournalViewTab={
            setJournalViewTab
          }
          selectedCompanionFilter={
            selectedCompanionFilter
          }
          setSelectedCompanionFilter={
            setSelectedCompanionFilter
          }
          journalDateFilterMode={
            journalDateFilterMode
          }
          setJournalDateFilterMode={
            setJournalDateFilterMode
          }
          journalFilterMonth={
            journalFilterMonth
          }
          setJournalFilterMonth={
            setJournalFilterMonth
          }
          journalFilterStartDate={
            journalFilterStartDate
          }
          setJournalFilterStartDate={
            setJournalFilterStartDate
          }
          journalFilterEndDate={
            journalFilterEndDate
          }
          setJournalFilterEndDate={
            setJournalFilterEndDate
          }
          isCustomDateOpen={
            isCustomDateOpen
          }
          setIsCustomDateOpen={
            setIsCustomDateOpen
          }
          journalSortOrder={
            journalSortOrder
          }
          setJournalSortOrder={
            setJournalSortOrder
          }
          journalSearch={
            journalSearch
          }
          setJournalSearch={
            setJournalSearch
          }
          availableMonths={
            availableMonths
          }
          isAnyFilterActive={
            isAnyFilterActive
          }
          onResetFilters={
            handleResetFilters
          }
        />

        {showAddJournal && (
          <JournalForm
            mode="create"
            userProfile={
              userProfile
            }
            coupleData={
              coupleData
            }
            companions={
              companions
            }
            formData={
              createFormData
            }
            isAuthor
            isLoading={
              addingJournal
            }
            imageUploading={
              journalImageLoading
            }
            autoLocatingGPS={
              autoLocatingGPS
            }
            onFormChange={
              onCreateFormChange
            }
            onSubmit={
              onAddJournalSubmit
            }
            onCancel={() =>
              setShowAddJournal(
                false
              )
            }
            onOpenMapPicker={
              onOpenCreateMapPicker
            }
            onAutoDetectGPS={
              onAutoDetectCreateGPS
            }
            onOpenCamera={
              onOpenCreateCamera
            }
            onFilesSelected={
              onCreateFilesSelected
            }
            onOpenCompanionManager={
              onOpenCompanionManager
            }
          />
        )}

        {journalViewTab ===
          'feed' && (
          <>
            {filteredJournals.length ===
            0 ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-10 text-center shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  <BookOpen className="h-6 w-6" />
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-800">
                  {journals.length ===
                  0
                    ? 'Chưa có kỷ niệm nào'
                    : 'Không tìm thấy kỷ niệm phù hợp'}
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                  {journals.length ===
                  0
                    ? 'Bấm “Viết nhật ký” để lưu lại khoảnh khắc đầu tiên của hai bạn.'
                    : 'Thử thay đổi từ khóa hoặc bộ lọc đang sử dụng.'}
                </p>

                {journals.length >
                  0 &&
                  isAnyFilterActive && (
                    <button
                      type="button"
                      onClick={
                        handleResetFilters
                      }
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Xóa bộ lọc
                    </button>
                  )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJournals.map(
                  (item) =>
                    editingJournalId ===
                    item.id ? (
                      <JournalForm
                        key={
                          item.id
                        }
                        mode="edit"
                        userProfile={
                          userProfile
                        }
                        coupleData={
                          coupleData
                        }
                        companions={
                          companions
                        }
                        formData={
                          editFormData
                        }
                        isAuthor={
                          item.authorUid ===
                          userProfile.uid
                        }
                        isLoading={
                          savingEdit
                        }
                        imageUploading={
                          editImageLoading
                        }
                        autoLocatingGPS={
                          autoLocatingGPS
                        }
                        onFormChange={
                          onEditFormChange
                        }
                        onSubmit={(
                          event
                        ) =>
                          onSaveEditJournalSubmit(
                            item.id,
                            event
                          )
                        }
                        onCancel={
                          onCancelEditJournal
                        }
                        onOpenMapPicker={
                          onOpenEditMapPicker
                        }
                        onAutoDetectGPS={
                          onAutoDetectEditGPS
                        }
                        onOpenCamera={
                          onOpenEditCamera
                        }
                        onFilesSelected={
                          onEditFilesSelected
                        }
                        onOpenCompanionManager={
                          onOpenCompanionManager
                        }
                      />
                    ) : (
                      <JournalCard
                        key={
                          item.id
                        }
                        item={
                          item
                        }
                        userProfile={
                          userProfile
                        }
                        coupleData={
                          coupleData
                        }
                        selectedCompanionFilter={
                          selectedCompanionFilter
                        }
                        commentInput={
                          commentInputs[
                            item.id
                          ] || ''
                        }
                        onCompanionClick={(
                          companionId
                        ) =>
                          setSelectedCompanionFilter(
                            selectedCompanionFilter ===
                              companionId
                              ? null
                              : companionId
                          )
                        }
                        onOpenPost={
                          handleOpenPost
                        }
                        onOpenLightbox={
                          handleOpenPostMedia
                        }
                        onStartEdit={
                          onStartEditJournal
                        }
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
                        onAddComment={
                          onAddComment
                        }
                      />
                    )
                )}
              </div>
            )}
          </>
        )}

        {journalViewTab ===
          'love_map' && (
          <LoveFootprintMap
            coupleId={
              coupleData?.id ||
              userProfile.coupleId ||
              'our_forever_couple_id'
            }
            userProfile={
              userProfile
            }
            coupleData={
              coupleData
            }
            journals={
              journals
            }
            onOpenJournalLightbox={(
              journal,
              index
            ) =>
              handleOpenPostMedia(
                journal,
                index
              )
            }
            onNavigateToJournal={() =>
              setJournalViewTab(
                'feed'
              )
            }
          />
        )}

        {journalViewTab ===
          'places' && (
          <VisitedPlacesTracker
            coupleId={
              coupleData?.id ||
              userProfile.coupleId ||
              'our_forever_couple_id'
            }
            userProfile={
              userProfile
            }
            coupleData={
              coupleData
            }
            journals={
              journals
            }
            onOpenJournalLightbox={(
              journal,
              index
            ) =>
              handleOpenPostMedia(
                journal,
                index
              )
            }
            defaultCollapsed={
              false
            }
          />
        )}
      </section>
    );
  };
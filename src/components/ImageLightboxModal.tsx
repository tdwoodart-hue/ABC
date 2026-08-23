import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Play,
  Reply,
  Send,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

import type {
  CoupleData,
  ImageComment,
  JournalEntry,
  UserProfile,
} from '../types';

import {
  formatDateTimeVN,
  formatDateVN,
} from '../utils/formatDate';

import { isVideoUrl } from '../utils/mediaHelper';
import { CommentVoiceRecorder } from './journal/CommentVoiceRecorder';
import { JournalVoiceMemoPlayer } from './journal/JournalVoiceMemoPlayer';

const SHOW_VIEWER_EXTRAS = false;

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalEntry | null;
  initialIndex?: number;
  currentUser: UserProfile;
  coupleId: string;
  coupleData?: CoupleData | null;
  onSetMainImage: (
    journalId: string,
    imageIndex: number
  ) => Promise<void>;
  onAddImageComment: (
    journalId: string,
    imageIndex: number,
    imageUrl: string,
    content: string,
    voiceMemoUrl?: string,
    voiceMemoDuration?: number
  ) => Promise<void>;
  onDeleteImageComment: (
    journalId: string,
    commentId: string
  ) => Promise<void>;
}

/*
 * Mobile layout goals:
 * - Never overlap iPhone status bar / Dynamic Island.
 * - Row 1: Back + title/meta + Close.
 * - Row 2: Main-image action + comment count.
 * - Media is capped on mobile so comments remain discoverable.
 * - Comment composer stays above the Home Indicator.
 */
export const ImageLightboxModal: React.FC<
  ImageLightboxModalProps
> = ({
  isOpen,
  onClose,
  journal,
  initialIndex = 0,
  currentUser,
  coupleData,
  onSetMainImage,
  onAddImageComment,
}) => {
  const [currentIndex, setCurrentIndex] =
    useState(initialIndex);

  const [commentText, setCommentText] =
    useState('');

  const [isVoiceRecording, setIsVoiceRecording] =
    useState(false);

  const [
    submittingComment,
    setSubmittingComment,
  ] = useState(false);

  const [
    settingMainImage,
    setSettingMainImage,
  ] = useState(false);

  const [toastMessage, setToastMessage] =
    useState<string | null>(null);

  const [sortOrder, setSortOrder] =
    useState<'newest' | 'oldest'>(
      'newest'
    );

  // Touch / Drag swipe state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isDraggingMedia, setIsDraggingMedia] = useState<boolean>(false);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleClose = () => {
    /*
     * /journal/6 represents this detail modal itself.
     * Closing the modal must therefore return directly to /journal.
     */
    if (
      typeof window !== 'undefined' &&
      /^\/journal\/[1-9]\d*\/?$/.test(
        window.location.pathname
      )
    ) {
      window.history.replaceState(
        null,
        '',
        '/journal'
      );

      /*
       * replaceState does not emit popstate by itself.
       * Dispatch it so JournalTab clears requestedPostNumber.
       */
      window.dispatchEvent(
        new PopStateEvent('popstate')
      );
    }

    onClose();
  };

  const imageList = useMemo<string[]>(
    () => {
      if (!journal) return [];

      if (
        journal.images &&
        journal.images.length > 0
      ) {
        return journal.images;
      }

      if (journal.imageUrl) {
        return [journal.imageUrl];
      }

      return [];
    },
    [journal]
  );

  const currentMainIndex =
    journal?.mainImageIndex ?? 0;

  const isCurrentMain =
    currentIndex === currentMainIndex;

  const currentImageUrl =
    imageList[currentIndex] || '';

  const rawComments = useMemo<
    ImageComment[]
  >(() => {
    if (!journal) return [];

    return (
      journal.imageComments || []
    ).filter(
      (comment) =>
        comment.imageIndex ===
          currentIndex ||
        Boolean(
          comment.imageUrl &&
            comment.imageUrl ===
              currentImageUrl
        )
    );
  }, [
    journal,
    currentIndex,
    currentImageUrl,
  ]);

  const sortedComments = useMemo(
    () =>
      [...rawComments].sort(
        (a, b) => {
          const getTime = (
            value: unknown
          ) => {
            if (
              typeof value === 'string'
            ) {
              return new Date(
                value
              ).getTime();
            }

            const maybeTimestamp =
              value as {
                toMillis?: () => number;
              } | null;

            return (
              maybeTimestamp?.toMillis?.() ||
              0
            );
          };

          const timeA = getTime(
            a.createdAt
          );

          const timeB = getTime(
            b.createdAt
          );

          return sortOrder ===
            'newest'
            ? timeB - timeA
            : timeA - timeB;
        }
      ),
    [rawComments, sortOrder]
  );

  const showToast = (
    message: string
  ) => {
    setToastMessage(message);

    window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handlePrev = () => {
    if (imageList.length <= 1) return;

    setCurrentIndex((prev) =>
      prev > 0
        ? prev - 1
        : imageList.length - 1
    );
  };

  const handleNext = () => {
    if (imageList.length <= 1) return;

    setCurrentIndex((prev) =>
      prev <
      imageList.length - 1
        ? prev + 1
        : 0
    );
  };

  // Scroll active thumbnail into view smoothly
  useEffect(() => {
    if (thumbnailRefs.current[currentIndex]) {
      thumbnailRefs.current[currentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (imageList.length <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDraggingMedia(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    // Detect horizontal swipe intent vs vertical scroll
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && isHorizontalSwipeRef.current) {
      const SWIPE_THRESHOLD = 38; // px to trigger next/prev
      if (swipeOffset < -SWIPE_THRESHOLD) {
        handleNext();
      } else if (swipeOffset > SWIPE_THRESHOLD) {
        handlePrev();
      }
    }
    setSwipeOffset(0);
    setIsDraggingMedia(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  // Mouse Drag Handlers for desktop / simulator
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imageList.length <= 1) return;
    if ((e.target as HTMLElement).closest('button, video')) return;
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    isHorizontalSwipeRef.current = true;
    setIsDraggingMedia(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || !isDraggingMedia) return;
    const deltaX = e.clientX - touchStartXRef.current;
    setSwipeOffset(deltaX);
  };

  const handleMouseUp = () => {
    if (touchStartXRef.current !== null && isDraggingMedia) {
      const SWIPE_THRESHOLD = 38;
      if (swipeOffset < -SWIPE_THRESHOLD) {
        handleNext();
      } else if (swipeOffset > SWIPE_THRESHOLD) {
        handlePrev();
      }
    }
    setSwipeOffset(0);
    setIsDraggingMedia(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) return;

    const validIndex = Math.min(
      Math.max(
        0,
        initialIndex
      ),
      Math.max(
        0,
        imageList.length - 1
      )
    );

    setCurrentIndex(validIndex);
    setCommentText('');
  }, [
    isOpen,
    initialIndex,
    imageList.length,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === 'Escape'
      ) {
        handleClose();
      } else if (
        event.key ===
        'ArrowLeft'
      ) {
        handlePrev();
      } else if (
        event.key ===
        'ArrowRight'
      ) {
        handleNext();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    isOpen,
    currentIndex,
    imageList.length,
    handleClose,
  ]);

  if (
    !isOpen ||
    !journal ||
    imageList.length === 0
  ) {
    return null;
  }

  const handleSetMain =
    async () => {
      if (
        settingMainImage ||
        isCurrentMain
      ) {
        return;
      }

      setSettingMainImage(true);

      try {
        await onSetMainImage(
          journal.id,
          currentIndex
        );

        showToast(
          'Đã chọn bức ảnh này làm ảnh chính! ⭐'
        );
      } catch (error) {
        console.error(
          'Lỗi đặt ảnh chính:',
          error
        );
      } finally {
        setSettingMainImage(false);
      }
    };

  const handleSendComment =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      const content =
        commentText.trim();

      if (
        !content ||
        submittingComment
      ) {
        return;
      }

      setSubmittingComment(true);

      try {
        await onAddImageComment(
          journal.id,
          currentIndex,
          currentImageUrl,
          content
        );

        setCommentText('');

        showToast(
          'Đã gửi bình luận cho bức ảnh 💕'
        );
      } catch (error) {
        console.error(
          'Lỗi thêm bình luận ảnh:',
          error
        );
      } finally {
        setSubmittingComment(false);
      }
    };

  const handleVoiceSend = async (voiceData: {
    url: string;
    duration: number;
    textNote?: string;
  }) => {
    try {
      await onAddImageComment(
        journal.id,
        currentIndex,
        currentImageUrl,
        voiceData.textNote || '🎙️ [Lời nhắn thoại cho ảnh]',
        voiceData.url,
        voiceData.duration
      );
      setIsVoiceRecording(false);
      showToast('Đã gửi lời nhắn thoại cho bức ảnh 💕');
    } catch (error) {
      console.error('Lỗi gửi voice comment ảnh:', error);
      alert('Không thể gửi voice comment: Vui lòng thử lại.');
    }
  };

  const isUser1 =
    coupleData?.user1Id ===
      currentUser.uid ||
    coupleData?.user1Uid ===
      currentUser.uid ||
    Boolean(
      currentUser.email
        ?.toLowerCase()
        .includes('duong')
    );

  const user1Uid =
    coupleData?.user1Id ||
    coupleData?.user1Uid ||
    (isUser1
      ? currentUser.uid
      : '');

  const user1Name =
    coupleData?.user1Name ||
    (isUser1
      ? currentUser.displayName
      : 'Dương');

  const user1Avatar =
    coupleData?.user1Avatar ||
    (isUser1
      ? currentUser.avatarUrl
      : null) ||
    'https://api.dicebear.com/7.x/micah/svg?seed=duong_male';

  const user2Uid =
    coupleData?.user2Id ||
    coupleData?.user2Uid ||
    (!isUser1
      ? currentUser.uid
      : '');

  const user2Name =
    coupleData?.user2Name ||
    (!isUser1
      ? currentUser.displayName
      : 'Chúc Gà');

  const user2Avatar =
    coupleData?.user2Avatar ||
    (!isUser1
      ? currentUser.avatarUrl
      : null) ||
    'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female';

  return (
    <div
      id="image-viewer-page"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#F4F6F9] text-slate-900"
      style={{
        paddingTop:
          'max(env(safe-area-inset-top, 0px), 12px)',
        paddingBottom:
          'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      {toastMessage && (
        <div
          className="fixed left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl"
          style={{
            top:
              'max(calc(env(safe-area-inset-top, 0px) + 12px), 22px)',
          }}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>
            {toastMessage}
          </span>
        </div>
      )}

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-3 pb-3 sm:px-4 sm:pb-6">
        {/* =====================================================
            HEADER
            Mobile row 1: Back + title/meta + Close
            ===================================================== */}
        <header className="shrink-0">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-95"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="truncate text-[18px] font-extrabold leading-tight text-slate-950 sm:text-xl">
                {journal.title ||
                  'Chi tiết ảnh kỷ niệm'}
              </h2>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-slate-500">
                <span className="flex shrink-0 items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDateVN(
                    journal.date
                  )}
                </span>

                {journal.location && (
                  <>
                    <span className="text-slate-300">
                      •
                    </span>
                    <span className="max-w-[190px] truncate sm:max-w-sm">
                      {journal.location}
                    </span>
                  </>
                )}
              </div>

              {journal.taggedPeople &&
                journal.taggedPeople
                  .length > 0 && (
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Users className="h-3.5 w-3.5 text-rose-500" />
                      Cùng:
                    </span>

                    {journal.taggedPeople.map(
                      (
                        person,
                        index
                      ) => (
                        <span
                          key={`${person.name}-${index}`}
                          className="inline-flex max-w-[140px] items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                        >
                          <span>
                            {person.emoji ||
                              '👤'}
                          </span>
                          <span className="truncate">
                            {
                              person.name
                            }
                          </span>
                        </span>
                      )
                    )}
                  </div>
                )}
            </div>

            {SHOW_VIEWER_EXTRAS && (
              <button
                type="button"
                onClick={handleClose}
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
                aria-label="Đóng"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {SHOW_VIEWER_EXTRAS && (
            <>
            {/* Mobile/desktop row 2: compact actions */}
            <div className="mt-3 flex items-center gap-2 pl-[50px] sm:pl-[52px]">
              <button
                type="button"
                onClick={handleSetMain}
                disabled={
                  settingMainImage
                }
                className={`flex h-9 items-center gap-1.5 rounded-2xl border px-3 text-xs font-bold shadow-sm transition active:scale-[0.98] ${
                  isCurrentMain
                    ? 'border-amber-200 bg-amber-100 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Star
                  className={`h-4 w-4 ${
                    isCurrentMain
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-amber-500'
                  }`}
                />
                <span>
                  Ảnh chính
                </span>
              </button>
  
              <div className="flex h-9 items-center gap-1.5 rounded-2xl border border-rose-100 bg-rose-50 px-3 text-xs font-bold text-rose-600 shadow-sm">
                <MessageSquare className="h-4 w-4 text-rose-500" />
                <span>
                  Bình luận
                </span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {rawComments.length}
                </span>
              </div>
            </div>
            </>
          )}
        </header>

        {/* =====================================================
            MEDIA
            Important: mobile max height is intentionally smaller
            so the comments section remains visible/discoverable.
            ===================================================== */}
        <section className="mt-3 shrink-0 sm:mt-4">
          <div
            className="relative flex w-full items-center justify-center overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-900 shadow-sm sm:rounded-3xl cursor-grab active:cursor-grabbing select-none touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="w-full flex items-center justify-center will-change-transform"
              style={{
                transform: isDraggingMedia
                  ? `translateX(${swipeOffset}px)`
                  : 'translateX(0px)',
                transition: isDraggingMedia
                  ? 'none'
                  : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {isVideoUrl(
                currentImageUrl
              ) ? (
                <video
                  key={
                    currentImageUrl
                  }
                  src={
                    currentImageUrl
                  }
                  controls
                  playsInline
                  className="block max-h-[56dvh] w-full object-contain sm:max-h-[70vh]"
                />
              ) : (
                <img
                  src={
                    currentImageUrl
                  }
                  alt={`Kỷ niệm ${
                    currentIndex + 1
                  }`}
                  draggable={false}
                  className="block max-h-[56dvh] w-full object-contain sm:max-h-[70vh] pointer-events-none select-none"
                />
              )}
            </div>

            {imageList.length >
              1 && (
              <>
                <button
                  type="button"
                  onClick={
                    handlePrev
                  }
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={
                    handleNext
                  }
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                <div className="absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm pointer-events-none select-none">
                  {currentIndex + 1}{' '}
                  /{' '}
                  {imageList.length}
                </div>
              </>
            )}
          </div>

          {imageList.length >
            1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto px-0.5 py-1.5 [-webkit-overflow-scrolling:touch]">
              {imageList.map(
                (
                  mediaUrl,
                  index
                ) => {
                  const isSelected =
                    index ===
                    currentIndex;

                  const isVideo =
                    isVideoUrl(
                      mediaUrl
                    );

                  const customThumbnail =
                    journal
                      .videoThumbnails?.[
                      mediaUrl
                    ];

                  return (
                    <button
                      key={`${mediaUrl}-${index}`}
                      ref={(el) => {
                        thumbnailRefs.current[index] = el;
                      }}
                      type="button"
                      onClick={() =>
                        setCurrentIndex(
                          index
                        )
                      }
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-900 transition ${
                        isSelected
                          ? 'scale-105 border-rose-500 ring-2 ring-rose-200'
                          : 'border-transparent opacity-65 hover:opacity-100'
                      }`}
                    >
                      {isVideo ? (
                        customThumbnail ? (
                          <img
                            src={
                              customThumbnail
                            }
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={
                              mediaUrl
                            }
                            preload="metadata"
                            className="h-full w-full object-cover opacity-75"
                          />
                        )
                      ) : (
                        <img
                          src={
                            mediaUrl
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}

                      {isVideo && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="h-4 w-4 fill-white text-white" />
                        </span>
                      )}

                      {SHOW_VIEWER_EXTRAS &&
                        index ===
                        currentMainIndex && (
                        <span className="absolute right-1 top-1 rounded-full bg-amber-400 p-0.5">
                          <Star className="h-2.5 w-2.5 fill-slate-900 text-slate-900" />
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* =====================================================
            COMMENTS
            ===================================================== */}
        <section className="mt-4 flex flex-1 flex-col sm:mt-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <MessageSquare className="h-4 w-4" />
              </span>

              <h3 className="text-sm font-extrabold text-slate-900">
                Bình luận (
                {
                  rawComments.length
                }
                )
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setSortOrder(
                  (prev) =>
                    prev ===
                    'newest'
                      ? 'oldest'
                      : 'newest'
                )
              }
              className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm"
            >
              <span>
                {sortOrder ===
                'newest'
                  ? 'Mới nhất'
                  : 'Cũ nhất'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-2.5 pb-2">
            {sortedComments.length ===
            0 ? (
              <div className="rounded-3xl border border-slate-200/60 bg-white px-6 py-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-400">
                  <Heart className="h-6 w-6 fill-rose-100" />
                </div>

                <p className="mt-3 text-sm font-bold text-slate-800">
                  Chưa có bình luận
                  cho ảnh này
                </p>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Hãy gửi lời nhắn
                  hoặc cảm xúc của
                  bạn về khoảnh khắc
                  này.
                </p>
              </div>
            ) : (
              sortedComments.map(
                (comment) => {
                  let authorName =
                    comment.authorName;

                  let avatarUrl =
                    `https://api.dicebear.com/7.x/micah/svg?seed=${
                      comment.authorUid ||
                      'user'
                    }`;

                  if (
                    comment.authorUid ===
                    currentUser.uid
                  ) {
                    authorName =
                      currentUser.displayName ||
                      (isUser1
                        ? user1Name
                        : user2Name);

                    avatarUrl =
                      currentUser.avatarUrl ||
                      (isUser1
                        ? user1Avatar
                        : user2Avatar);
                  } else if (
                    comment.authorUid ===
                    user1Uid
                  ) {
                    authorName =
                      user1Name;

                    avatarUrl =
                      user1Avatar;
                  } else if (
                    comment.authorUid ===
                    user2Uid
                  ) {
                    authorName =
                      user2Name;

                    avatarUrl =
                      user2Avatar;
                  }

                  return (
                    <article
                      key={
                        comment.id
                      }
                      className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:p-4"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-100 bg-rose-50">
                          <img
                            src={
                              avatarUrl
                            }
                            alt={
                              authorName
                            }
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-bold text-slate-900">
                              {
                                authorName
                              }
                            </span>

                            {comment.voiceMemoUrl && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">
                                <Mic className="h-2.5 w-2.5" />
                                <span>Voice</span>
                              </span>
                            )}

                            <span className="text-[11px] font-medium text-slate-400">
                              {formatDateTimeVN(
                                comment.createdAt
                              )}
                            </span>
                          </div>

                          {comment.voiceMemoUrl && (
                            <div className="mt-1.5 max-w-sm">
                              <JournalVoiceMemoPlayer
                                voiceMemoUrl={comment.voiceMemoUrl}
                                duration={comment.voiceMemoDuration}
                                compact={true}
                              />
                            </div>
                          )}

                          {comment.content && (
                            <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">
                              {
                                comment.content
                              }
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setCommentText(
                              `@${authorName}: `
                            )
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`Trả lời ${authorName}`}
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  );
                }
              )
            )}
          </div>

          {/* Composer is the last normal-flow item and only sticks when needed.
              This avoids covering the comments header/content. */}
          <div
            className="sticky bottom-0 z-30 mt-4 bg-gradient-to-t from-[#F4F6F9] via-[#F4F6F9] via-80% to-transparent pt-3"
            style={{
              paddingBottom:
                'max(env(safe-area-inset-bottom, 0px), 8px)',
            }}
          >
            {isVoiceRecording ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-lg sm:rounded-3xl">
                <CommentVoiceRecorder
                  onVoiceCommentSend={handleVoiceSend}
                  onCancel={() => setIsVoiceRecording(false)}
                />
              </div>
            ) : (
              <form
                onSubmit={
                  handleSendComment
                }
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg sm:rounded-3xl"
              >
                <input
                  type="text"
                  value={commentText}
                  onChange={(
                    event
                  ) =>
                    setCommentText(
                      event.target
                        .value
                    )
                  }
                  placeholder="Viết bình luận cho bức ảnh này..."
                  className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-base text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
                />

                <button
                  type="button"
                  onClick={() => setIsVoiceRecording(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Ghi âm lời nhắn"
                  title="Ghi âm bình luận bằng giọng nói"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Thêm ảnh"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <button
                  type="submit"
                  disabled={
                    !commentText.trim() ||
                    submittingComment
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/20 transition hover:bg-rose-600 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Gửi bình luận"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
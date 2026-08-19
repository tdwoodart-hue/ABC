import React, { useState, useEffect, useMemo } from 'react';
import { JournalEntry, UserProfile, ImageComment, CoupleData } from '../types';
import { formatDateTimeVN, formatDateVN } from '../utils/formatDate';
import { checkIsAdmin } from '../lib/firebase';
import { isVideoUrl } from '../utils/imageCompression';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquare,
  Send,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  Heart,
  MoreVertical,
  Reply,
  Image as ImageIcon,
  ChevronDown,
  Camera,
  Users,
  Film,
  Play
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalEntry | null;
  initialIndex?: number;
  currentUser: UserProfile;
  coupleId: string;
  coupleData?: CoupleData | null;
  onSetMainImage: (journalId: string, imageIndex: number) => Promise<void>;
  onAddImageComment: (journalId: string, imageIndex: number, imageUrl: string, content: string) => Promise<void>;
  onDeleteImageComment: (journalId: string, commentId: string) => Promise<void>;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  journal,
  initialIndex = 0,
  currentUser,
  coupleData,
  onSetMainImage,
  onAddImageComment,
  onDeleteImageComment,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [settingMainImage, setSettingMainImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeMenuCommentId, setActiveMenuCommentId] = useState<string | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<ImageComment | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const imageList: string[] = useMemo(() => {
    if (!journal) return [];
    if (journal.images && journal.images.length > 0) {
      return journal.images;
    }
    if (journal.imageUrl) {
      return [journal.imageUrl];
    }
    return [];
  }, [journal]);

  const currentMainIndex = journal?.mainImageIndex ?? 0;
  const isCurrentMain = currentIndex === currentMainIndex;

  // Sync index on open
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.min(Math.max(0, initialIndex), Math.max(0, imageList.length - 1));
      setCurrentIndex(validIndex);
      setCommentText('');
      setActiveMenuCommentId(null);
    }
  }, [isOpen, initialIndex, imageList.length]);

  // Keyboard navigation (Arrow keys, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, imageList.length]);

  if (!isOpen || !journal || imageList.length === 0) return null;

  const currentImageUrl = imageList[currentIndex] || '';

  // Filter image-specific comments
  const rawComments: ImageComment[] = (journal.imageComments || []).filter(
    (c) => c.imageIndex === currentIndex || (c.imageUrl && c.imageUrl === currentImageUrl)
  );

  const sortedComments = [...rawComments].sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : ((a.createdAt as any)?.toMillis?.() || 0);
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : ((b.createdAt as any)?.toMillis?.() || 0);
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(imageList.length - 1);
    }
    setActiveMenuCommentId(null);
  };

  const handleNext = () => {
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setActiveMenuCommentId(null);
  };

  const handleSetMain = async () => {
    if (settingMainImage || isCurrentMain) return;
    setSettingMainImage(true);
    try {
      await onSetMainImage(journal.id, currentIndex);
      showToast('Đã chọn bức ảnh này làm ảnh chính! ⭐');
    } catch (err) {
      console.error('Lỗi đặt ảnh chính:', err);
    } finally {
      setSettingMainImage(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await onAddImageComment(journal.id, currentIndex, currentImageUrl, commentText.trim());
      setCommentText('');
      showToast('Đã gửi bình luận cho bức ảnh 💕');
    } catch (err) {
      console.error('Lỗi thêm bình luận ảnh:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deleteCommentTarget || !journal) return;
    setDeletingComment(true);
    try {
      await onDeleteImageComment(journal.id, deleteCommentTarget.id);
      showToast('Đã xóa bình luận ảnh thành công!');
      setDeleteCommentTarget(null);
    } catch (err) {
      console.error('Lỗi xóa bình luận ảnh:', err);
      showToast('Lỗi khi xóa bình luận: ' + String(err));
    } finally {
      setDeletingComment(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Resolve user avatars & names
  const isU1 = (coupleData?.user1Id === currentUser.uid) || (coupleData?.user1Uid === currentUser.uid) || (currentUser.email?.toLowerCase().includes('duong'));
  const s1Uid = coupleData?.user1Id || coupleData?.user1Uid || (isU1 ? currentUser.uid : '');
  const s1Name = coupleData?.user1Name || (isU1 ? currentUser.displayName : 'Dương');
  const s1Avatar = coupleData?.user1Avatar || (isU1 ? currentUser.avatarUrl : null) || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male';
  const s2Uid = coupleData?.user2Id || coupleData?.user2Uid || (!isU1 ? currentUser.uid : '');
  const s2Name = coupleData?.user2Name || (!isU1 ? currentUser.displayName : 'Chúc Gà');
  const s2Avatar = coupleData?.user2Avatar || (!isU1 ? currentUser.avatarUrl : null) || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female';

  return (
    <div 
      id="image-viewer-page"
      className="fixed inset-0 z-50 bg-[#F4F6F9] overflow-y-auto select-none"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Centered Container */}
      <div className="max-w-2xl mx-auto min-h-screen px-3 sm:px-4 py-3 sm:py-6 flex flex-col">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-2 mb-3 sm:mb-4 shrink-0">
          {/* Left: Back Button + Title + Date */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-700 shadow-2xs border border-slate-200/80 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate leading-tight">
                {journal.title || 'Chi tiết ảnh kỷ niệm'}
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDateVN(journal.date)}</span>
                {journal.location && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="truncate max-w-[150px] sm:max-w-xs">{journal.location}</span>
                  </>
                )}
              </div>
              {journal.taggedPeople && journal.taggedPeople.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                    <Users className="w-3 h-3 text-rose-500" />
                    Cùng:
                  </span>
                  {journal.taggedPeople.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 border border-rose-100 text-rose-700"
                    >
                      <span>{p.emoji || '👤'}</span>
                      <span>{p.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Main Photo Badge/Button */}
            <button
              type="button"
              onClick={handleSetMain}
              disabled={settingMainImage}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                isCurrentMain
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
              title={isCurrentMain ? 'Đây là ảnh chính' : 'Bấm để đặt làm ảnh chính'}
            >
              <Star className={`w-3.5 h-3.5 ${isCurrentMain ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
              <span className="whitespace-nowrap">Ảnh chính</span>
            </button>

            {/* Comments Counter Pill */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-2xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
              <span className="whitespace-nowrap">Bình luận</span>
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {rawComments.length}
              </span>
            </div>

            {/* Close / More Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 shadow-2xs border border-slate-200/80 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Rounded Media Container (Tightly wraps photo/video with rounded-3xl and clean border) */}
        <div className="relative w-full flex justify-center shrink-0">
          <div className="relative max-w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-950 group flex items-center justify-center">
            {isVideoUrl(currentImageUrl) ? (
              <video
                src={currentImageUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[68vh] sm:max-h-[72vh] w-auto max-w-full object-contain rounded-3xl block"
              />
            ) : (
              <img
                src={currentImageUrl}
                alt={`Kỷ niệm ${currentIndex + 1}`}
                className="max-h-[68vh] sm:max-h-[72vh] w-auto max-w-full object-contain rounded-3xl block"
              />
            )}

            {/* Left / Right Floating Navigation Buttons */}
            {imageList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/65 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer shadow-md"
                  title="Tệp trước"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/65 text-white backdrop-blur-xs flex items-center justify-center transition cursor-pointer shadow-md"
                  title="Tệp tiếp theo"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* Media indicator (e.g. 1/3) if multiple items */}
            {imageList.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                {isVideoUrl(currentImageUrl) && <Film className="w-3 h-3 text-rose-400" />}
                <span>{currentIndex + 1} / {imageList.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail Selector Strip (if multiple media) */}
        {imageList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-1 mt-1 no-scrollbar">
            {imageList.map((media, idx) => {
              const isSelected = idx === currentIndex;
              const isVid = isVideoUrl(media);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 transition cursor-pointer bg-slate-900 ${
                    isSelected
                      ? 'border-rose-500 shadow-md ring-2 ring-rose-300 scale-105'
                      : 'border-white opacity-60 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  {isVid ? (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Play className="w-5 h-5 text-rose-400 fill-rose-400" />
                    </div>
                  ) : (
                    <img src={media} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  )}
                  {idx === currentMainIndex && (
                    <div className="absolute top-1 right-1 bg-amber-400 p-0.5 rounded-full shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-slate-900 text-slate-900" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-4 sm:mt-5 flex-1 flex flex-col">
          {/* Comments Header Bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Bình luận ({rawComments.length})
              </h3>
            </div>

            {/* Sort order toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <span>{sortOrder === 'newest' ? 'Mới nhất' : 'Cũ nhất'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Comments List Cards */}
          <div className="space-y-2.5 flex-1">
            {sortedComments.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200/60 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6 fill-rose-100" />
                </div>
                <p className="text-xs font-bold text-slate-700">Chưa có bình luận cho ảnh này</p>
                <p className="text-[11px] text-slate-400">
                  Hãy gửi lời nhắn hoặc cảm xúc của bạn về khoảnh khắc này ở khung bên dưới nhé!
                </p>
              </div>
            ) : (
              sortedComments.map((comment) => {
                let cName = comment.authorName;
                let cAvatar = `https://api.dicebear.com/7.x/micah/svg?seed=${comment.authorUid || 'user'}`;
                let isMe = comment.authorUid === currentUser.uid;

                if (comment.authorUid === currentUser.uid) {
                  cName = currentUser.displayName || (isU1 ? s1Name : s2Name);
                  cAvatar = currentUser.avatarUrl || (isU1 ? s1Avatar : s2Avatar);
                  isMe = true;
                } else if (comment.authorUid === s1Uid) {
                  cName = s1Name;
                  cAvatar = s1Avatar;
                  isMe = isU1;
                } else if (comment.authorUid === s2Uid) {
                  cName = s2Name;
                  cAvatar = s2Avatar;
                  isMe = !isU1;
                } else if (comment.authorName?.toLowerCase().includes('dương') || comment.authorName?.toLowerCase().includes('duong')) {
                  cName = s1Name;
                  cAvatar = s1Avatar;
                  isMe = isU1;
                } else if (comment.authorName?.toLowerCase().includes('chúc') || comment.authorName?.toLowerCase().includes('chuc')) {
                  cName = s2Name;
                  cAvatar = s2Avatar;
                  isMe = !isU1;
                }

                const isMenuOpen = activeMenuCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="p-3.5 sm:p-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      {/* Avatar + Author + Badge + Timestamp */}
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-rose-50 border border-slate-100 shrink-0">
                          <img
                            src={cAvatar}
                            alt={cName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {cName}
                        </span>
                        {isMe && (
                          <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-bold">
                            Bạn
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                          {formatDateTimeVN(comment.createdAt)}
                        </span>
                      </div>

                      {/* Reply Icon */}
                      <div className="flex items-center gap-1 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setCommentText(`@${cName}: `);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
                          title="Trả lời"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comment Content */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words whitespace-pre-line pl-1">
                      {comment.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Comment Input Bar */}
          <form
            onSubmit={handleSendComment}
            className="sticky bottom-3 mt-4 p-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-md flex items-center gap-2"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Viết bình luận cho bức ảnh này..."
              className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />

            <div className="p-2 text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>

            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="w-10 h-10 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-md shadow-rose-500/25 disabled:opacity-40 disabled:pointer-events-none shrink-0"
              title="Gửi bình luận"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

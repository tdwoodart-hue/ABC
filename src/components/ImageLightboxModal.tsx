import React, { useState, useEffect } from 'react';
import { JournalEntry, UserProfile, ImageComment, CoupleData } from '../types';
import { formatDateTimeVN, formatDateVN } from '../utils/formatDate';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Star,
  MessageSquare,
  Send,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
  Heart
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
  const [zoomScale, setZoomScale] = useState(1);
  const [showComments, setShowComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [settingMainImage, setSettingMainImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pan state for dragging zoomed images
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageList: string[] = React.useMemo(() => {
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

  // Sync initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.min(Math.max(0, initialIndex), Math.max(0, imageList.length - 1));
      setCurrentIndex(validIndex);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
      setCommentText('');
    }
  }, [isOpen, initialIndex, imageList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, imageList.length]);

  if (!isOpen || !journal || imageList.length === 0) return null;

  const currentImageUrl = imageList[currentIndex] || '';

  // Filter image-specific comments
  const currentImageComments: ImageComment[] = (journal.imageComments || []).filter(
    (c) => c.imageIndex === currentIndex || (c.imageUrl && c.imageUrl === currentImageUrl)
  );

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setCurrentIndex(imageList.length - 1);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleNext = () => {
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setCurrentIndex(0);
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.3, 3.5));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(prev - 0.3, 1);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomScale > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      showToast('Đã gửi bình luận cho ảnh 💕');
    } catch (err) {
      console.error('Lỗi thêm bình luận ảnh:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await onDeleteImageComment(journal.id, commentId);
      showToast('Đã xóa bình luận');
    } catch (err) {
      console.error('Lỗi xóa bình luận ảnh:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <div 
      id="image-lightbox-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fadeIn select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-xl animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar - Synchronized Light Theme */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-3 sm:p-4 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-sm text-slate-800">
        {/* Left: Memory Title & Date */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              {journal.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                {formatDateVN(journal.date)}
              </span>
              {journal.location && (
                <span className="hidden sm:flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 truncate max-w-xs font-semibold">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  {journal.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Main Photo Action Button */}
          <button
            id="set-main-image-btn"
            type="button"
            onClick={handleSetMain}
            disabled={settingMainImage}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
              isCurrentMain
                ? 'bg-amber-400 text-slate-950 border border-amber-500/40 shadow-sm'
                : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-300'
            }`}
            title={isCurrentMain ? 'Đây là ảnh chính của kỷ niệm' : 'Bấm để đặt làm ảnh chính'}
          >
            <Star className={`w-3.5 h-3.5 ${isCurrentMain ? 'fill-slate-950 text-slate-950' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">
              {isCurrentMain ? 'Ảnh chính ⭐' : 'Đặt làm ảnh chính'}
            </span>
          </button>

          {/* Toggle Comments Button */}
          <button
            id="toggle-comments-btn"
            type="button"
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
              showComments
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200 border border-rose-600'
                : 'bg-white hover:bg-rose-50 text-slate-700 border border-slate-200 hover:border-rose-200'
            }`}
            title="Bình luận riêng cho ảnh"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bình luận</span>
            {currentImageComments.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                showComments ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'
              }`}>
                {currentImageComments.length}
              </span>
            )}
          </button>

          {/* Close Button */}
          <button
            id="close-lightbox-btn"
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-full transition cursor-pointer border border-slate-200"
            title="Đóng xem ảnh (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Image Viewer & Side Comment Drawer */}
      <div className="w-full h-full flex flex-col md:flex-row items-stretch justify-between pt-16 pb-16 md:pb-6 px-2 sm:px-6 relative overflow-hidden">
        
        {/* Central / Left Image Stage */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {/* Main Displayed Image */}
          <div 
            className="relative transition-transform duration-75 flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`,
              cursor: zoomScale > 1 ? 'grab' : 'zoom-in'
            }}
            onClick={() => {
              if (zoomScale === 1) handleZoomIn();
            }}
          >
            <img
              src={currentImageUrl}
              alt={`Photo ${currentIndex + 1}`}
              className="max-h-[75vh] md:max-h-[82vh] max-w-[95vw] md:max-w-[65vw] object-contain rounded-2xl shadow-2xl transition-all duration-200 bg-white/20"
              draggable={false}
            />

            {/* Main Badge Overlay */}
            {isCurrentMain && (
              <div className="absolute top-3 left-3 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none border border-amber-300">
                <Star className="w-3.5 h-3.5 fill-slate-950" />
                <span>ẢNH CHÍNH</span>
              </div>
            )}
          </div>

          {/* Navigation Arrows (Prev / Next) */}
          {imageList.length > 1 && (
            <>
              <button
                id="lightbox-prev-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-white/90 hover:bg-rose-500 text-slate-700 hover:text-white backdrop-blur-md border border-slate-200 transition cursor-pointer shadow-lg z-30"
                title="Ảnh trước (Mũi tên trái)"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                id="lightbox-next-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-white/90 hover:bg-rose-500 text-slate-700 hover:text-white backdrop-blur-md border border-slate-200 transition cursor-pointer shadow-lg z-30"
                title="Ảnh tiếp theo (Mũi tên phải)"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Floating Zoom Control Bar - Light Style */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 text-slate-700 text-xs shadow-lg">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomOut();
              }}
              disabled={zoomScale <= 1}
              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer disabled:opacity-30"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono font-bold text-[11px] px-1 text-slate-800">
              {Math.round(zoomScale * 100)}%
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleZoomIn();
              }}
              disabled={zoomScale >= 3.5}
              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition cursor-pointer disabled:opacity-30"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoomScale > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-xl transition cursor-pointer"
                title="Về kích thước chuẩn"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <div className="h-3 w-px bg-slate-200 mx-1" />

            <span className="font-bold text-slate-600 text-[11px]">
              {currentIndex + 1} / {imageList.length}
            </span>
          </div>
        </div>

        {/* Right / Bottom Comments Drawer - Bright Clean UI */}
        {showComments && (
          <div className="w-full md:w-80 lg:w-96 bg-white/95 backdrop-blur-lg md:rounded-3xl border border-rose-100 flex flex-col shadow-2xl h-80 md:h-[calc(100vh-6rem)] shrink-0 z-40 animate-slideInRight overflow-hidden mt-2 md:mt-0">
            {/* Drawer Header */}
            <div className="p-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2 text-slate-800">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">Bình luận ảnh ({currentIndex + 1}/{imageList.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition md:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50/40">
              {currentImageComments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-2xs">
                    <Heart className="w-6 h-6 fill-rose-100 text-rose-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Chưa có bình luận cho ảnh này</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                    Hãy là người đầu tiên để lại lời nhắn yêu thương cho bức ảnh kỷ niệm này nhé!
                  </p>
                </div>
              ) : (
                currentImageComments.map((comment) => {
                  const isU1 = (coupleData?.user1Id === currentUser.uid) || (coupleData?.user1Uid === currentUser.uid) || (currentUser.email?.toLowerCase().includes('duong'));
                  const s1Uid = coupleData?.user1Id || coupleData?.user1Uid || (isU1 ? currentUser.uid : '');
                  const s1Name = coupleData?.user1Name || (isU1 ? currentUser.displayName : 'Dương');
                  const s1Avatar = coupleData?.user1Avatar || (isU1 ? currentUser.avatarUrl : null) || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male';
                  const s2Uid = coupleData?.user2Id || coupleData?.user2Uid || (!isU1 ? currentUser.uid : '');
                  const s2Name = coupleData?.user2Name || (!isU1 ? currentUser.displayName : 'Chúc Gà');
                  const s2Avatar = coupleData?.user2Avatar || (!isU1 ? currentUser.avatarUrl : null) || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female';

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

                  return (
                  <div 
                    key={comment.id} 
                    className="p-3 bg-white hover:bg-rose-50/30 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 group transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-rose-100 border border-rose-200 overflow-hidden shrink-0">
                          <img
                            src={cAvatar}
                            alt={cName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {cName}
                        </span>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md font-bold">
                            Bạn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDateTimeVN(comment.createdAt)}
                        </span>
                        {(isMe || journal.authorUid === currentUser.uid) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition opacity-80 group-hover:opacity-100 cursor-pointer"
                            title="Xóa bình luận"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 pl-8 leading-relaxed break-words whitespace-pre-line font-normal">
                      {comment.content}
                    </p>
                  </div>
                  );
                })
              )}
            </div>

            {/* Comment Input Form */}
            <form onSubmit={handleSendComment} className="p-3 bg-white border-t border-rose-100 flex items-center gap-2 shadow-xs">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết bình luận cho bức ảnh này..."
                className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition cursor-pointer disabled:opacity-40 shadow-sm"
                title="Gửi bình luận"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip - Light Theme */}
      {imageList.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 max-w-xl w-full px-4">
          <div className="flex items-center justify-center gap-2 overflow-x-auto p-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg">
            {imageList.map((img, idx) => {
              const isMain = idx === currentMainIndex;
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 scale-105 shadow-md shadow-rose-200 ring-2 ring-rose-200'
                      : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  {isMain && (
                    <div className="absolute top-0.5 right-0.5 bg-amber-400 p-0.5 rounded-full shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-slate-950 text-slate-950" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { JournalEntry, UserProfile, CoupleData } from '../../types';
import { MessageCircle, ChevronDown, ChevronUp, Heart } from 'lucide-react';

interface JournalCommentsProps {
  item: JournalEntry;
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  isAuthor: boolean;
  commentInput: string;
  getAuthor: (authorUid?: string, authorNameFallback?: string, authorAvatarFallback?: string) => {
    name: string;
    avatar: string;
    isMe: boolean;
    role: string;
  };
  onCommentInputChange: (journalId: string, value: string) => void;
  onAddComment: (journalId: string, e: React.FormEvent) => void;
}

export const JournalComments: React.FC<JournalCommentsProps> = ({
  item,
  userProfile,
  coupleData,
  isAuthor,
  commentInput,
  getAuthor,
  onCommentInputChange,
  onAddComment,
}) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const commentsCount = item.comments?.length || 0;

  return (
    <div className="pt-3 border-t border-slate-100/90 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <button
          type="button"
          onClick={() => setShowAllComments(!showAllComments)}
          className="flex items-center gap-1.5 text-slate-700 hover:text-rose-600 transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-rose-500" />
          <span>Bình luận & Cập nhật ({commentsCount})</span>
          {commentsCount > 0 && (
            showAllComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {!isAuthor && (
          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-medium">
            Gửi lời nhắn cho nửa kia 💬
          </span>
        )}
      </div>

      {/* Comment list preview */}
      {item.comments && item.comments.length > 0 && (
        <div className={`space-y-2 pr-1 ${showAllComments ? 'max-h-64 overflow-y-auto' : 'max-h-36 overflow-hidden'}`}>
          {item.comments.map((comment) => {
            const cAuthor = getAuthor(comment.authorUid, comment.authorName);
            return (
              <div
                key={comment.id}
                className="flex items-start gap-2.5 text-xs bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100/80"
              >
                <div className="w-6 h-6 rounded-full bg-rose-100 overflow-hidden shrink-0 mt-0.5 border border-white">
                  <img
                    src={cAuthor.avatar}
                    alt={cAuthor.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/micah/svg?seed=fallback';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">{cAuthor.name}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-snug break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Comment Form */}
      <form
        onSubmit={(e) => onAddComment(item.id, e)}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          placeholder={isAuthor ? 'Viết bình luận kỷ niệm...' : 'Gửi lời nhắn cho nửa kia...'}
          value={commentInput || ''}
          onChange={(e) => onCommentInputChange(item.id, e.target.value)}
          className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1.5 focus:ring-rose-400 focus:bg-white transition placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!commentInput?.trim()}
          className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-40 shrink-0 flex items-center gap-1"
        >
          <span>Gửi</span>
          <Heart className="w-3 h-3 fill-white" />
        </button>
      </form>
    </div>
  );
};
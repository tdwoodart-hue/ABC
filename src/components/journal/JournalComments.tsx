import React, { useState } from 'react';
import { JournalEntry, UserProfile, CoupleData } from '../../types';
import { MessageCircle, Heart, Mic } from 'lucide-react';
import { JournalVoiceMemoPlayer } from './JournalVoiceMemoPlayer';
import { CommentVoiceRecorder } from './CommentVoiceRecorder';

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
  onAddVoiceComment?: (journalId: string, voiceData: { url: string; duration: number; textNote?: string }) => Promise<void>;
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
  onAddVoiceComment,
}) => {
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const commentsCount = item.comments?.length || 0;

  const handleVoiceSend = async (voiceData: { url: string; duration: number; textNote?: string }) => {
    if (onAddVoiceComment) {
      await onAddVoiceComment(item.id, voiceData);
    }
    setIsVoiceRecording(false);
  };

  return (
    <div className="pt-3 border-t border-slate-100/90 space-y-2.5">
      {commentsCount > 0 && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-rose-500" />
            <span>Bình luận & Lời nhắn ({commentsCount})</span>
          </div>

          {!isVoiceRecording && onAddVoiceComment && (
            <button
              type="button"
              onClick={() => setIsVoiceRecording(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200/60 transition cursor-pointer"
            >
              <Mic className="w-3 h-3 text-rose-500" />
              <span>Gửi voice</span>
            </button>
          )}
        </div>
      )}

      {/* Scrollable Comment list */}
      {item.comments && item.comments.length > 0 && (
        <div className="max-h-56 overflow-y-auto overscroll-contain space-y-2 pr-1.5 scrollbar-thin">
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
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">{cAuthor.name}</span>
                    {comment.voiceMemoUrl && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.2 rounded-full">
                        <Mic className="w-2.5 h-2.5" />
                        <span>Voice</span>
                      </span>
                    )}
                  </div>

                  {/* If voice memo comment */}
                  {comment.voiceMemoUrl && (
                    <div className="pt-0.5 max-w-sm">
                      <JournalVoiceMemoPlayer
                        voiceMemoUrl={comment.voiceMemoUrl}
                        duration={comment.voiceMemoDuration}
                        compact={true}
                      />
                    </div>
                  )}

                  {comment.content && (
                    <p className="text-slate-600 mt-0.5 leading-snug break-words">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Voice Recorder Mode in Comments */}
      {isVoiceRecording && onAddVoiceComment ? (
        <CommentVoiceRecorder
          onVoiceCommentSend={handleVoiceSend}
          onCancel={() => setIsVoiceRecording(false)}
        />
      ) : (
        /* Quick Comment Form with Text & Voice Trigger */
        <form
          onSubmit={(e) => onAddComment(item.id, e)}
          className="flex items-center gap-1.5 pt-1"
        >
          <input
            type="text"
            placeholder={isAuthor ? 'Viết bình luận kỷ niệm...' : 'Gửi lời nhắn cho nửa kia...'}
            value={commentInput || ''}
            onChange={(e) => onCommentInputChange(item.id, e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1.5 focus:ring-rose-400 focus:bg-white transition placeholder:text-slate-400"
          />

          {onAddVoiceComment && (
            <button
              type="button"
              onClick={() => setIsVoiceRecording(true)}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 rounded-xl transition cursor-pointer shrink-0 shadow-2xs hover:shadow-xs"
              title="Ghi âm bình luận giọng nói"
            >
              <Mic className="w-4 h-4 text-rose-500" />
            </button>
          )}

          <button
            type="submit"
            disabled={!commentInput?.trim()}
            className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-40 shrink-0 flex items-center gap-1"
          >
            <span>Gửi</span>
            <Heart className="w-3 h-3 fill-white" />
          </button>
        </form>
      )}
    </div>
  );
};
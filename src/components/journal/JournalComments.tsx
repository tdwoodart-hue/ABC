import React, { useState } from 'react';
import { JournalEntry, UserProfile, CoupleData } from '../../types';
import { MessageCircle, Mic, Send } from 'lucide-react';
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
    <div className="space-y-2.5 border-t border-slate-100 pt-3">
      {commentsCount > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{commentsCount} bình luận</span>
        </div>
      )}

      {item.comments && item.comments.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {item.comments.map((comment) => {
            const cAuthor = getAuthor(comment.authorUid, comment.authorName);

            return (
              <div key={comment.id} className="flex items-start gap-2.5">
                <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <img
                    src={cAuthor.avatar}
                    alt={cAuthor.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src =
                        'https://api.dicebear.com/7.x/micah/svg?seed=fallback';
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {cAuthor.name}
                    </span>
                    {comment.voiceMemoUrl && (
                      <Mic className="h-3 w-3 text-rose-400" />
                    )}
                  </div>

                  {comment.voiceMemoUrl && (
                    <div className="mt-1 max-w-sm">
                      <JournalVoiceMemoPlayer
                        voiceMemoUrl={comment.voiceMemoUrl}
                        duration={comment.voiceMemoDuration}
                        compact={true}
                      />
                    </div>
                  )}

                  {comment.content && (
                    <p className="mt-0.5 break-words text-xs leading-5 text-slate-600">
                      {comment.content}
                    </p>
                  )}

                  {comment.attachmentImageUrl && (
                    <img
                      src={comment.attachmentImageUrl}
                      alt=""
                      className="mt-1.5 max-h-40 max-w-full cursor-pointer rounded-xl object-cover"
                      onClick={() => {
                        if (typeof window !== 'undefined' && comment.attachmentImageUrl) {
                          window.open(comment.attachmentImageUrl, '_blank');
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isVoiceRecording && onAddVoiceComment ? (
        <CommentVoiceRecorder
          onVoiceCommentSend={handleVoiceSend}
          onCancel={() => setIsVoiceRecording(false)}
        />
      ) : (
        <form
          onSubmit={(event) => onAddComment(item.id, event)}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            placeholder="Bình luận..."
            value={commentInput || ''}
            onChange={(event) => onCommentInputChange(item.id, event.target.value)}
            onFocus={(event) => {
              const element = event.currentTarget;
              window.setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 250);
            }}
            className="app-control min-w-0 flex-1 px-3 text-sm placeholder:text-slate-400"
          />

          {onAddVoiceComment && (
            <button
              type="button"
              onClick={() => setIsVoiceRecording(true)}
              className="app-icon-button h-11 w-11 border border-[var(--app-border)] bg-white"
              aria-label="Ghi âm"
              title="Ghi âm"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={!commentInput?.trim()}
            className="app-icon-button app-icon-button-brand h-11 w-11 border border-rose-200 bg-rose-50 disabled:opacity-35"
            aria-label="Gửi bình luận"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
};

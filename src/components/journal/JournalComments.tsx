import React from 'react';
import type { JournalEntry, UserProfile, CoupleData } from '../../types';
import { ChevronDown, Loader2, MessageCircle, Mic, Send } from 'lucide-react';
import { JournalVoiceMemoPlayer } from './JournalVoiceMemoPlayer';
import { CommentVoiceRecorder } from './CommentVoiceRecorder';

interface JournalCommentsProps {
  item: JournalEntry; userProfile: UserProfile; coupleData: CoupleData | null; isAuthor: boolean; commentInput: string;
  getAuthor: (uid?: string, name?: string, avatar?: string) => { name: string; avatar: string; isMe: boolean; role: string };
  onCommentInputChange: (id: string, value: string) => void;
  onAddComment: (id: string, event: React.FormEvent) => void;
  onAddVoiceComment?: (id: string, voice: { url: string; duration: number; textNote?: string }) => Promise<void>;
}

export const JournalComments: React.FC<JournalCommentsProps> = ({ item, commentInput, getAuthor, onCommentInputChange, onAddComment, onAddVoiceComment }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const contentId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const comments = item.comments || [];
  const visible = showAll ? comments : comments.slice(-3);
  const open = () => { setExpanded(true); window.requestAnimationFrame(() => inputRef.current?.focus()); };

  return <div className="journal-comments">
    <div className="journal-comments-bar"><button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}><MessageCircle size={17} /><span>{comments.length ? `${comments.length} bình luận` : 'Bình luận'}</span><ChevronDown size={14} className={expanded ? 'is-open' : ''} /></button><button type="button" onClick={open}>Viết bình luận</button></div>
    {expanded && <div id={contentId} className="journal-comment-panel journal-panel">
      {comments.length > 3 && !showAll && <button type="button" className="journal-more-comments" onClick={() => setShowAll(true)}>Xem {comments.length - 3} bình luận trước</button>}
      <div className="journal-comment-list">
        {visible.map(comment => {
          const author = getAuthor(comment.authorUid, comment.authorName);
          return <div key={comment.id} className="journal-comment-row"><img src={author.avatar} alt="" loading="lazy" /><div><strong>{author.name}</strong>
            {comment.voiceMemoUrl && <JournalVoiceMemoPlayer voiceMemoUrl={comment.voiceMemoUrl} duration={comment.voiceMemoDuration} compact />}
            {comment.content && <p>{comment.content}</p>}
            {comment.attachmentImageUrl && <a href={comment.attachmentImageUrl} target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh trong bình luận"><img src={comment.attachmentImageUrl} alt="Ảnh đính kèm" loading="lazy" /></a>}
          </div></div>;
        })}
      </div>
      {recording && onAddVoiceComment ? <CommentVoiceRecorder onVoiceCommentSend={async voice => { await onAddVoiceComment(item.id, voice); setRecording(false); }} onCancel={() => setRecording(false)} /> : <form className="journal-comment-form" onSubmit={async event => {
        event.preventDefault();
        if (sending || !commentInput.trim()) return;
        setSending(true); setError('');
        try { await onAddComment(item.id, event); } catch { setError('Chưa gửi được bình luận. Thử lại nhé.'); } finally { setSending(false); }
      }}>
        <input ref={inputRef} aria-label={`Bình luận cho ${item.title || 'bài viết'}`} placeholder="Viết vài lời cho nhau…" value={commentInput || ''} onChange={event => onCommentInputChange(item.id, event.target.value)} disabled={sending} />
        {onAddVoiceComment && <button type="button" className="journal-comment-voice" onClick={() => setRecording(true)} aria-label="Ghi âm bình luận"><Mic size={18} /></button>}
        <button type="submit" className="journal-comment-send" aria-label="Gửi bình luận" disabled={sending || !commentInput.trim()}>{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
      </form>}
      {error && <p className="journal-comment-error" role="alert">{error}</p>}
    </div>}
  </div>;
};

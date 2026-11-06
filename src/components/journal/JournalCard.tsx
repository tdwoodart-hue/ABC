import React, { useEffect, useRef, useState } from 'react';
import { JournalEntry, UserProfile, CoupleData } from '../../types';
import { formatDateShortVN } from '../../utils/formatDate';
import { JournalMusicPlayer } from '../JournalMusicPlayer';
import { JournalVoiceMemoPlayer } from './JournalVoiceMemoPlayer';
import { JournalMediaGallery } from './JournalMediaGallery';
import { JournalComments } from './JournalComments';
import {
  MapPin,
  ExternalLink,
  Users,
  Edit3,
  Eye,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

export interface JournalCardProps {
  item: JournalEntry;
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  selectedCompanionFilter: string | null;
  commentInput: string;
  onCompanionClick: (companionId: string) => void;
  onOpenPost: (journal: JournalEntry) => void;
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
  onStartEdit: (journal: JournalEntry) => void;
  onRequestDelete: (journal: JournalEntry) => void;
  onApproveDelete: (journalId: string) => void;
  onCancelDeleteRequest: (journalId: string) => void;
  onCommentInputChange: (journalId: string, value: string) => void;
  onAddComment: (journalId: string, e: React.FormEvent) => void;
  onAddVoiceComment?: (journalId: string, voiceData: { url: string; duration: number; textNote?: string }) => Promise<void>;
  singlePostView?: boolean;
}

export const JournalCard: React.FC<JournalCardProps> = ({
  item,
  userProfile,
  coupleData,
  selectedCompanionFilter,
  commentInput,
  onCompanionClick,
  onOpenPost,
  onOpenLightbox,
  onStartEdit,
  onRequestDelete,
  onApproveDelete,
  onCancelDeleteRequest,
  onCommentInputChange,
  onAddComment,
  onAddVoiceComment,
  singlePostView = false,
}) => {
  const isU1 =
    coupleData?.user1Id === userProfile.uid ||
    coupleData?.user1Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const s1Uid =
    coupleData?.user1Id ||
    coupleData?.user1Uid ||
    (isU1 ? userProfile.uid : '');

  const s1Name =
    coupleData?.user1Name ||
    (isU1 ? userProfile.displayName : 'Dương');

  const s1Avatar =
    (isU1 ? userProfile.avatarUrl : coupleData?.user1Avatar) ||
    coupleData?.user1Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile';

  const s2Uid =
    coupleData?.user2Id ||
    coupleData?.user2Uid ||
    (!isU1 ? userProfile.uid : '');

  const s2Name =
    coupleData?.user2Name ||
    (!isU1 ? userProfile.displayName : 'Chúc Gà');

  const s2Avatar =
    (!isU1 ? userProfile.avatarUrl : coupleData?.user2Avatar) ||
    coupleData?.user2Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile';

  const getAuthor = (
    authorUid?: string,
    authorNameFallback?: string,
    authorAvatarFallback?: string
  ) => {
    if (authorUid && authorUid === userProfile.uid) {
      return {
        name: userProfile.displayName || (isU1 ? s1Name : s2Name),
        avatar: userProfile.avatarUrl || (isU1 ? s1Avatar : s2Avatar),
        isMe: true,
        role: isU1
          ? coupleData?.user1Role || 'Anh'
          : coupleData?.user2Role || 'Em',
      };
    }

    if (authorUid && authorUid === s1Uid) {
      return {
        name: s1Name,
        avatar: s1Avatar,
        isMe: isU1,
        role: coupleData?.user1Role || 'Anh',
      };
    }

    if (authorUid && authorUid === s2Uid) {
      return {
        name: s2Name,
        avatar: s2Avatar,
        isMe: !isU1,
        role: coupleData?.user2Role || 'Em',
      };
    }

    const norm = (authorNameFallback || '').toLowerCase().trim();

    if (
      norm.includes('dương') ||
      norm.includes('duong') ||
      (isU1 &&
        norm === userProfile.displayName.toLowerCase().trim())
    ) {
      return {
        name: s1Name,
        avatar: s1Avatar,
        isMe: isU1,
        role: coupleData?.user1Role || 'Anh',
      };
    }

    if (
      norm.includes('chúc') ||
      norm.includes('chuc') ||
      (!isU1 &&
        norm === userProfile.displayName.toLowerCase().trim())
    ) {
      return {
        name: s2Name,
        avatar: s2Avatar,
        isMe: !isU1,
        role: coupleData?.user2Role || 'Em',
      };
    }

    return {
      name: authorNameFallback || 'Thành viên',
      avatar:
        authorAvatarFallback ||
        (isU1 ? s1Avatar : s2Avatar),
      isMe: false,
      role: '',
    };
  };

  const author = getAuthor(item.authorUid, item.authorName);

  const mediaList =
    item.images && item.images.length > 0
      ? item.images
      : item.imageUrl
        ? [item.imageUrl]
        : [];

  const isAuthor = item.authorUid === userProfile.uid;
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!actionsOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionsOpen]);

  return (
    <article
      id={`journal-card-${item.id}`}
      className="app-card overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
            <img
              src={author.avatar}
              alt={author.name}
              className="h-full w-full object-cover"
              onError={(event) => {
                (event.target as HTMLImageElement).src =
                  'https://api.dicebear.com/7.x/micah/svg?seed=fallback';
              }}
            />
          </div>

          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">
              {author.name}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>{formatDateShortVN(item.date)}</span>
              {item.updatedAt && <span>· đã sửa</span>}
            </div>
          </div>
        </div>

        <div ref={actionsRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setActionsOpen((value) => !value)}
            className="app-icon-button h-9 w-9"
            aria-label="Tùy chọn bài viết"
            aria-expanded={actionsOpen}
            title="Tùy chọn"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>

          {actionsOpen && (
            <div className="absolute right-0 top-10 z-30 min-w-[148px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
              {!singlePostView && (
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    onOpenPost(item);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Xem
                </button>
              )}

              {isAuthor && (
                <button
                  id={`btn-edit-journal-${item.id}`}
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    onStartEdit(item);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Sửa
                </button>
              )}

              {!item.deleteRequest && (
                <button
                  id={`btn-delete-req-${item.id}`}
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    onRequestDelete(item);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
        {item.title && item.title.trim() && (
          <h3 className="text-base font-semibold leading-snug text-slate-900">
            {item.title}
          </h3>
        )}

        {(((item.taggedPeople?.length || 0) > 0) || item.location) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(item.taggedPeople?.length || 0) > 0 && (
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            )}

            {item.taggedPeople?.map((person, index) => {
              const isSelected = selectedCompanionFilter === person.id;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onCompanionClick(person.id)}
                  className={`app-chip ${isSelected ? 'app-chip-active' : ''}`}
                  title={`Lọc theo ${person.name}`}
                >
                  <span>{person.emoji || '👤'}</span>
                  <span>{person.name}</span>
                </button>
              );
            })}

            {item.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="max-w-[180px] truncate" title={item.location}>
                  {item.location}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    item.locationAddress || item.location
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-icon-button h-7 w-7"
                  aria-label="Mở bản đồ"
                  title="Mở bản đồ"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            )}
          </div>
        )}

        {item.content && (
          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
            {item.content}
          </p>
        )}

        {item.musicUrl && (
          <JournalMusicPlayer
            musicUrl={item.musicUrl}
            musicTitle={item.musicTitle}
          />
        )}

        {item.voiceMemoUrl && (
          <JournalVoiceMemoPlayer
            voiceMemoUrl={item.voiceMemoUrl}
            duration={item.voiceMemoDuration}
            title={item.voiceMemoTitle}
            recordedByName={item.voiceMemoRecordedByName}
          />
        )}

        <JournalMediaGallery
          item={item}
          mediaList={mediaList}
          onOpenLightbox={onOpenLightbox}
        />

        {item.deleteRequest && (
          <div className="pt-1">
            {item.deleteRequest.requestedByUid === userProfile.uid ? (
              <div className="app-alert app-alert-warn flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Đang chờ xác nhận xóa.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelDeleteRequest(item.id)}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <div className="app-alert app-alert-danger space-y-2.5">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{item.deleteRequest.requestedByName} muốn xóa bài này.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApproveDelete(item.id)}
                    className="app-button app-button-primary inline-flex min-h-9 items-center gap-1 px-3 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancelDeleteRequest(item.id)}
                    className="app-button app-button-secondary min-h-9 px-3 py-1.5"
                  >
                    Giữ lại
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <JournalComments
          item={item}
          userProfile={userProfile}
          coupleData={coupleData}
          isAuthor={isAuthor}
          commentInput={commentInput}
          getAuthor={getAuthor}
          onCommentInputChange={onCommentInputChange}
          onAddComment={onAddComment}
          onAddVoiceComment={onAddVoiceComment}
        />
      </div>
    </article>
  );
};
import React from 'react';
import { JournalEntry, UserProfile, CoupleData } from '../../types';
import { formatDateShortVN } from '../../utils/formatDate';
import { JournalMusicPlayer } from '../JournalMusicPlayer';
import { JournalMediaGallery } from './JournalMediaGallery';
import { JournalComments } from './JournalComments';
import {
  Calendar,
  MapPin,
  ExternalLink,
  Users,
  Edit3,
  Eye,
  Trash2,
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

  return (
    <article
      id={`journal-card-${item.id}`}
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-rose-100 bg-white p-0.5 shadow-2xs">
            <img
              src={author.avatar}
              alt={author.name}
              className="h-full w-full rounded-full object-cover"
              onError={(event) => {
                (event.target as HTMLImageElement).src =
                  'https://api.dicebear.com/7.x/micah/svg?seed=fallback';
              }}
            />
          </div>

          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-800">
              {author.name}
            </span>

            <div className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-400">
              <Calendar className="h-3 w-3 shrink-0 text-rose-400" />
              <span>{formatDateShortVN(item.date)}</span>

              {item.updatedAt && (
                <span className="text-[10px] italic text-rose-400/90">
                  (đã sửa)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!singlePostView && (
            <button
              type="button"
              onClick={() => onOpenPost(item)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              title="Mở bài viết"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xem</span>
            </button>
          )}

          {isAuthor && (
            <button
              id={`btn-edit-journal-${item.id}`}
              type="button"
              onClick={() => onStartEdit(item)}
              className="flex items-center gap-1 rounded-xl border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50/80"
              title="Sửa bài viết và chi tiêu"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sửa</span>
            </button>
          )}

          {!item.deleteRequest && (
            <button
              id={`btn-delete-req-${item.id}`}
              type="button"
              onClick={() => onRequestDelete(item)}
              className="rounded-xl p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
              title="Yêu cầu xóa nhật ký"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4 sm:p-5">
        <h3 className="text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
          {item.title}
        </h3>

        {item.taggedPeople && item.taggedPeople.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Users className="h-3.5 w-3.5 text-rose-500" />
              Cùng với:
            </span>

            {item.taggedPeople.map((person, index) => {
              const isSelected =
                selectedCompanionFilter === person.id;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onCompanionClick(person.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'border border-rose-100 bg-rose-50/80 text-rose-700 hover:bg-rose-100'
                  }`}
                  title={`Lọc bài viết có ${person.name}`}
                >
                  <span>{person.emoji || '👤'}</span>
                  <span>{person.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {item.location && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-1.5 text-xs font-medium text-rose-800">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />

              <span
                className="truncate font-bold"
                title={item.location}
              >
                {item.location}
              </span>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                item.locationAddress || item.location
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
              title="Mở chỉ đường Google Maps"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span>Bản đồ</span>
            </a>
          </div>
        )}

        {item.content && (
          <p className="whitespace-pre-line rounded-2xl border border-slate-100/80 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-slate-700 sm:p-4 sm:text-sm">
            {item.content}
          </p>
        )}

        {item.musicUrl && (
          <div className="pt-0.5">
            <JournalMusicPlayer
              musicUrl={item.musicUrl}
              musicTitle={item.musicTitle}
            />
          </div>
        )}

        <JournalMediaGallery
          item={item}
          mediaList={mediaList}
          onOpenLightbox={onOpenLightbox}
        />

        {item.deleteRequest && (
          <div className="pt-2">
            {item.deleteRequest.requestedByUid ===
            userProfile.uid ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Đã gửi yêu cầu xóa. Đang chờ đối phương
                    chấp thuận...
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onCancelDeleteRequest(item.id)
                  }
                  className="shrink-0 rounded-xl border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  Hủy yêu cầu
                </button>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />

                  <span>
                    {item.deleteRequest.requestedByName} muốn xóa
                    bài nhật ký này!
                  </span>
                </div>

                <p className="text-[11px] text-rose-600">
                  Bài viết chỉ bị xóa vĩnh viễn khi bạn đồng ý.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onApproveDelete(item.id)}
                    className="flex items-center gap-1 rounded-xl bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-600"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Chấp nhận xóa
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onCancelDeleteRequest(item.id)
                    }
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <X className="h-3.5 w-3.5" />
                    Từ chối
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
        />
      </div>
    </article>
  );
};
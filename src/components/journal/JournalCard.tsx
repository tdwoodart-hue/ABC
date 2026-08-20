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
  onOpenLightbox: (journal: JournalEntry, imageIndex: number) => void;
  onStartEdit: (journal: JournalEntry) => void;
  onRequestDelete: (journal: JournalEntry) => void;
  onApproveDelete: (journalId: string) => void;
  onCancelDeleteRequest: (journalId: string) => void;
  onCommentInputChange: (journalId: string, value: string) => void;
  onAddComment: (journalId: string, e: React.FormEvent) => void;
}

export const JournalCard: React.FC<JournalCardProps> = ({
  item,
  userProfile,
  coupleData,
  selectedCompanionFilter,
  commentInput,
  onCompanionClick,
  onOpenLightbox,
  onStartEdit,
  onRequestDelete,
  onApproveDelete,
  onCancelDeleteRequest,
  onCommentInputChange,
  onAddComment,
}) => {
  // Author resolution logic
  const isU1 =
    coupleData?.user1Id === userProfile.uid ||
    coupleData?.user1Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const s1Uid = coupleData?.user1Id || coupleData?.user1Uid || (isU1 ? userProfile.uid : '');
  const s1Name = coupleData?.user1Name || (isU1 ? userProfile.displayName : 'Dương');
  const s1Avatar =
    (isU1 ? userProfile.avatarUrl : coupleData?.user1Avatar) ||
    coupleData?.user1Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile';

  const s2Uid = coupleData?.user2Id || coupleData?.user2Uid || (!isU1 ? userProfile.uid : '');
  const s2Name = coupleData?.user2Name || (!isU1 ? userProfile.displayName : 'Chúc Gà');
  const s2Avatar =
    (!isU1 ? userProfile.avatarUrl : coupleData?.user2Avatar) ||
    coupleData?.user2Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile';

  const getAuthor = (authorUid?: string, authorNameFallback?: string, authorAvatarFallback?: string) => {
    if (authorUid && authorUid === userProfile.uid) {
      return {
        name: userProfile.displayName || (isU1 ? s1Name : s2Name),
        avatar: userProfile.avatarUrl || (isU1 ? s1Avatar : s2Avatar),
        isMe: true,
        role: isU1 ? coupleData?.user1Role || 'Anh' : coupleData?.user2Role || 'Em',
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
    if (norm.includes('dương') || norm.includes('duong') || (isU1 && norm === userProfile.displayName.toLowerCase().trim())) {
      return { name: s1Name, avatar: s1Avatar, isMe: isU1, role: coupleData?.user1Role || 'Anh' };
    }
    if (norm.includes('chúc') || norm.includes('chuc') || (!isU1 && norm === userProfile.displayName.toLowerCase().trim())) {
      return { name: s2Name, avatar: s2Avatar, isMe: !isU1, role: coupleData?.user2Role || 'Em' };
    }

    return {
      name: authorNameFallback || 'Thành viên',
      avatar: authorAvatarFallback || (isU1 ? s1Avatar : s2Avatar),
      isMe: false,
      role: '',
    };
  };

  const author = getAuthor(item.authorUid, item.authorName);
  const mediaList = item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  const isAuthor = item.authorUid === userProfile.uid;

  return (
    <article
      id={`journal-card-${item.id}`}
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group"
    >
      {/* 1. Header: Author Info, Date, Actions */}
      <div className="p-4 sm:p-5 pb-3 sm:pb-3 flex items-center justify-between gap-3 border-b border-slate-100/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full border border-rose-100 p-0.5 overflow-hidden shadow-2xs bg-white">
              <img
                src={author.avatar}
                alt={author.name}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/micah/svg?seed=fallback';
                }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-800 text-sm truncate">
                {author.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
              <Calendar className="w-3 h-3 text-rose-400 shrink-0" />
              <span>{formatDateShortVN(item.date)}</span>
              {item.updatedAt && (
                <span className="text-rose-400/90 italic text-[10px]">
                  (đã sửa)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`btn-edit-journal-${item.id}`}
            type="button"
            onClick={() => onStartEdit(item)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 rounded-xl transition cursor-pointer border border-rose-100 whitespace-nowrap"
            title={isAuthor ? 'Sửa bài viết và chi tiêu' : 'Xem chi tiết'}
          >
            {isAuthor ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sửa</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xem chi tiết</span>
                <span className="sm:hidden">Xem</span>
              </>
            )}
          </button>

          {!item.deleteRequest && (
            <button
              id={`btn-delete-req-${item.id}`}
              type="button"
              onClick={() => onRequestDelete(item)}
              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition cursor-pointer"
              title="Yêu cầu xóa nhật ký"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Body: Title, Location, Tags, Text Content */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
          {item.title}
        </h3>

        {/* Tagged Companions / Special Friends */}
        {item.taggedPeople && item.taggedPeople.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-rose-500" />
              Cùng với:
            </span>
            {item.taggedPeople.map((person, idx) => {
              const isSelected = selectedCompanionFilter === person.id;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onCompanionClick(person.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'bg-rose-50/80 border border-rose-100 text-rose-700 hover:bg-rose-100'
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

        {/* Location Badge */}
        {item.location && (
          <div className="flex items-center justify-between gap-2 text-xs text-rose-800 bg-rose-50/60 border border-rose-100 px-3 py-1.5 rounded-xl font-medium">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-bold truncate" title={item.location}>
                {item.location}
              </span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                item.locationAddress || item.location
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-rose-600 font-semibold hover:text-rose-800 flex items-center gap-0.5 shrink-0 whitespace-nowrap ml-1.5 hover:underline"
              title="Mở chỉ đường Google Maps"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span>Bản đồ</span>
            </a>
          </div>
        )}

        {/* Text Caption / Story */}
        {item.content && (
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 sm:p-4 rounded-2xl border border-slate-100/80">
            {item.content}
          </p>
        )}

        {/* Embedded Music Player */}
        {item.musicUrl && (
          <div className="pt-0.5">
            <JournalMusicPlayer
              musicUrl={item.musicUrl}
              musicTitle={item.musicTitle}
            />
          </div>
        )}

        {/* 3. Media Presentation (Photos & Videos) */}
        <JournalMediaGallery
          item={item}
          mediaList={mediaList}
          onOpenLightbox={onOpenLightbox}
        />

        {/* 4. Delete Request Warning Banner if Pending */}
        {item.deleteRequest && (
          <div className="pt-2">
            {item.deleteRequest.requestedByUid === userProfile.uid ? (
              <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Đã gửi yêu cầu xóa. Đang chờ đối phương chấp thuận...</span>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelDeleteRequest(item.id)}
                  className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-xl font-semibold transition shrink-0 cursor-pointer text-[11px]"
                >
                  Hủy yêu cầu
                </button>
              </div>
            ) : (
              <div className="space-y-2 bg-rose-50/90 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-900">
                <div className="flex items-center gap-2 font-bold text-rose-700">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{item.deleteRequest.requestedByName} muốn xóa bài nhật ký này!</span>
                </div>
                <p className="text-[11px] text-rose-600">
                  Bài viết chỉ bị xóa vĩnh viễn khi bạn đồng ý.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onApproveDelete(item.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Chấp nhận xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancelDeleteRequest(item.id)}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition cursor-pointer text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Comments & Partner Updates */}
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
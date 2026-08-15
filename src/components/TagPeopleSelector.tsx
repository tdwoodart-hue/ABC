import React, { useState } from 'react';
import { UserProfile, CoupleData, Companion, TaggedPerson } from '../types';
import { Users, Plus, X, PawPrint, Check, Sparkles } from 'lucide-react';

interface TagPeopleSelectorProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  companions: Companion[];
  selectedTags: TaggedPerson[];
  onChange: (tags: TaggedPerson[]) => void;
  onOpenCompanionManager: () => void;
}

export const TagPeopleSelector: React.FC<TagPeopleSelectorProps> = ({
  userProfile,
  coupleData,
  companions,
  selectedTags,
  onChange,
  onOpenCompanionManager
}) => {
  // Determine names
  const currentUserIsUser1 =
    coupleData?.user1Uid === userProfile.uid ||
    coupleData?.user1Id === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const myUid = userProfile.uid;
  const myName = userProfile.displayName || (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');
  const partnerUid = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Uid || coupleData.user2Id
      : coupleData.user1Uid || coupleData.user1Id
    : 'partner';

  let rawPartnerName = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Name || 'Chúc Gà'
      : coupleData.user1Name || 'Dương'
    : currentUserIsUser1
    ? 'Chúc Gà'
    : 'Dương';

  if (rawPartnerName.trim() === myName.trim()) {
    rawPartnerName = currentUserIsUser1 ? 'Chúc Gà' : 'Dương';
  }
  const partnerName = rawPartnerName;

  // Couple user tags options
  const defaultUserTags: TaggedPerson[] = [
    {
      id: myUid,
      name: myName,
      type: 'user',
      emoji: currentUserIsUser1 ? '👨' : '👩',
      avatarUrl: userProfile.photoURL
    },
    {
      id: partnerUid || 'partner',
      name: partnerName,
      type: 'user',
      emoji: currentUserIsUser1 ? '👩' : '👨'
    }
  ];

  const isSelected = (id: string) => selectedTags.some(t => t.id === id);

  const toggleTag = (tag: TaggedPerson) => {
    if (isSelected(tag.id)) {
      onChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-rose-500" />
          <span>Gắn thẻ người / thú cưng tham gia kỷ niệm này:</span>
        </label>
        <button
          type="button"
          onClick={onOpenCompanionManager}
          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
        >
          <PawPrint className="w-3.5 h-3.5" />
          <span>Quản lý thú cưng & bạn bè</span>
        </button>
      </div>

      {/* Chips Selection List */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {/* Me */}
        {defaultUserTags.map((userTag) => {
          const active = isSelected(userTag.id);
          return (
            <button
              key={userTag.id}
              type="button"
              onClick={() => toggleTag(userTag)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{userTag.emoji || '👤'}</span>
              <span>{userTag.name}</span>
              {active && <Check className="w-3 h-3 text-white" />}
            </button>
          );
        })}

        {/* Companions (Pets, friends...) */}
        {companions.map((comp) => {
          const active = isSelected(comp.id);
          const companionTag: TaggedPerson = {
            id: comp.id,
            name: comp.name,
            type: comp.type || 'pet',
            emoji: comp.emoji || '🐾',
            avatarUrl: comp.avatarUrl
          };

          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => toggleTag(companionTag)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                active
                  ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{comp.emoji || '🐾'}</span>
              <span>{comp.name}</span>
              {active && <Check className="w-3 h-3 text-white" />}
            </button>
          );
        })}

        {/* Quick Add Companion Button */}
        <button
          type="button"
          onClick={onOpenCompanionManager}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm thú cưng/bạn...</span>
        </button>
      </div>

      {/* Selected tags preview count */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Đã gắn thẻ ({selectedTags.length}):</span>
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
            >
              <span>{tag.emoji || '👤'}</span>
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="text-slate-400 hover:text-rose-500 transition cursor-pointer ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

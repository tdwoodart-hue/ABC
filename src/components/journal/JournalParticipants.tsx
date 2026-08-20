import React from 'react';
import { UserProfile, CoupleData, Companion, TaggedPerson } from '../../types';
import { TagPeopleSelector } from '../TagPeopleSelector';

interface JournalParticipantsProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  companions: Companion[];
  taggedPeople: TaggedPerson[];
  onChange: (tags: TaggedPerson[]) => void;
  onOpenCompanionManager: () => void;
}

export const JournalParticipants: React.FC<JournalParticipantsProps> = ({
  userProfile,
  coupleData,
  companions,
  taggedPeople,
  onChange,
  onOpenCompanionManager,
}) => {
  return (
    <div className="pt-2">
      <TagPeopleSelector
        userProfile={userProfile}
        coupleData={coupleData}
        companions={companions}
        selectedTags={taggedPeople}
        onChange={onChange}
        onOpenCompanionManager={onOpenCompanionManager}
      />
    </div>
  );
};

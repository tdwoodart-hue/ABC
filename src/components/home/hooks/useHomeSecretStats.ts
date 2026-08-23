import React from 'react';

import { JournalEntry } from '../../../types';
import { isVideoUrl } from '../../../utils/mediaHelper';

export const useHomeSecretStats = (
  journals: JournalEntry[],
  daysTogether: number
) => {
  const secretStats = React.useMemo(() => {
    const normalize = (value?: string) =>
      (value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const getMediaList = (journal: JournalEntry) =>
      journal.images && journal.images.length > 0
        ? journal.images
        : journal.imageUrl
          ? [journal.imageUrl]
          : [];

    const locationCounts = new Map<
      string,
      { label: string; count: number }
    >();

    const authorCounts = new Map<
      string,
      { label: string; count: number }
    >();

    const commenterCounts = new Map<
      string,
      { label: string; count: number }
    >();

    const monthPhotoCounts = new Map<string, number>();

    let totalPhotos = 0;
    let totalVideos = 0;
    let totalComments = 0;
    let travelCount = 0;

    const travelKeywords = [
      'du lich',
      'chuyen di',
      'di choi xa',
      'roadtrip',
      'camping',
      'cam trai',
      'bien',
      'nui',
      'resort',
      'hotel',
      'khach san',
      'san bay',
      'may bay',
      'tham quan',
    ];

    journals.forEach((journal) => {
      const mediaList = getMediaList(journal);

      const photoCount = mediaList.filter(
        (url) => !isVideoUrl(url)
      ).length;

      const videoCount = mediaList.length - photoCount;

      totalPhotos += photoCount;
      totalVideos += videoCount;

      const monthKey =
        journal.date && journal.date.length >= 7
          ? journal.date.slice(0, 7)
          : journal.createdAt
            ? journal.createdAt.slice(0, 7)
            : '';

      if (monthKey && photoCount > 0) {
        monthPhotoCounts.set(
          monthKey,
          (monthPhotoCounts.get(monthKey) || 0) + photoCount
        );
      }

      const rawLocation =
        journal.location?.trim() ||
        journal.locationAddress?.trim() ||
        '';

      if (rawLocation) {
        const locationKey = normalize(rawLocation);
        const current =
          locationCounts.get(locationKey);

        locationCounts.set(locationKey, {
          label: current?.label || rawLocation,
          count: (current?.count || 0) + 1,
        });
      }

      const authorKey =
        journal.authorUid ||
        normalize(journal.authorName);

      if (authorKey) {
        const current =
          authorCounts.get(authorKey);

        authorCounts.set(authorKey, {
          label:
            current?.label ||
            journal.authorName ||
            'Không rõ',
          count: (current?.count || 0) + 1,
        });
      }

      const allComments = [
        ...(journal.comments || []),
        ...(journal.imageComments || []),
      ];

      totalComments += allComments.length;

      allComments.forEach((comment) => {
        const commenterKey =
          comment.authorUid ||
          normalize(comment.authorName);

        if (!commenterKey) return;

        const current =
          commenterCounts.get(commenterKey);

        commenterCounts.set(commenterKey, {
          label:
            current?.label ||
            comment.authorName ||
            'Không rõ',
          count: (current?.count || 0) + 1,
        });
      });

      const context = normalize(
        [
          journal.title,
          journal.content,
          journal.location,
          journal.locationAddress,
        ]
          .filter(Boolean)
          .join(' ')
      );

      if (
        travelKeywords.some((keyword) =>
          context.includes(keyword)
        )
      ) {
        travelCount += 1;
      }
    });

    const topOf = (
      map: Map<string, { label: string; count: number }>
    ) =>
      [...map.values()].sort(
        (a, b) => b.count - a.count
      )[0] || null;

    const busiestPhotoMonth =
      [...monthPhotoCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0] || null;

    const formatMonth = (monthKey?: string) => {
      if (!monthKey) return 'Chưa đủ dữ liệu';

      const [year, month] = monthKey.split('-');

      return `Tháng ${Number(month)}/${year}`;
    };

    return {
      daysTogether,
      journalCount: journals.length,
      locationCount: locationCounts.size,
      totalPhotos,
      totalVideos,
      totalComments,
      travelCount,
      topLocation: topOf(locationCounts),
      topAuthor: topOf(authorCounts),
      topCommenter: topOf(commenterCounts),
      busiestPhotoMonth: busiestPhotoMonth
        ? {
            label: formatMonth(busiestPhotoMonth[0]),
            count: busiestPhotoMonth[1],
          }
        : null,
    };
  }, [journals, daysTogether]);

  return secretStats;
};
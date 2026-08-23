import React from 'react';

import { JournalEntry } from '../../../types';
import { isVideoUrl } from '../../../utils/mediaHelper';

export const useMemoryOfTheDay = (journals: JournalEntry[]) => {
  const memoryOfTheDay = React.useMemo(() => {
    if (!journals || journals.length === 0) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthDay =
      `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayKey =
      `${currentYear}-${monthDay}`;

    const getDateKey = (journal: JournalEntry) => {
      if (journal.date && journal.date.length >= 10) {
        return journal.date.slice(0, 10);
      }

      if (journal.createdAt) {
        const parsed = new Date(journal.createdAt);
        if (!Number.isNaN(parsed.getTime())) {
          const year = parsed.getFullYear();
          const month = String(parsed.getMonth() + 1).padStart(2, '0');
          const day = String(parsed.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }

      return '';
    };

    const onThisDayCandidates = journals
      .filter((journal) => {
        const dateKey = getDateKey(journal);
        if (!dateKey || dateKey.length < 10) return false;

        const journalYear = Number(dateKey.slice(0, 4));

        return (
          dateKey.slice(5, 10) === monthDay &&
          journalYear < currentYear
        );
      })
      .sort((a, b) =>
        getDateKey(b).localeCompare(getDateKey(a))
      );

    if (onThisDayCandidates.length > 0) {
      const journal = onThisDayCandidates[0];
      const dateKey = getDateKey(journal);
      const journalYear = Number(dateKey.slice(0, 4));

      return {
        journal,
        kind: 'on_this_day' as const,
        yearsAgo: Math.max(1, currentYear - journalYear),
      };
    }

    const oldJournals = journals.filter((journal) => {
      const dateKey = getDateKey(journal);
      return Boolean(dateKey && dateKey < todayKey);
    });

    if (oldJournals.length === 0) return null;

    // Stable pseudo-random choice for the whole day.
    // It only changes tomorrow or when the journal list changes.
    const seedText = `${todayKey}:${oldJournals.length}`;
    let seed = 0;

    for (let index = 0; index < seedText.length; index += 1) {
      seed = ((seed << 5) - seed + seedText.charCodeAt(index)) | 0;
    }

    const selectedIndex =
      Math.abs(seed) % oldJournals.length;

    return {
      journal: oldJournals[selectedIndex],
      kind: 'random' as const,
      yearsAgo: 0,
    };
  }, [journals]);

  const memoryPreview = React.useMemo(() => {
    const journal = memoryOfTheDay?.journal;
    if (!journal) return '';

    const mediaList =
      journal.images && journal.images.length > 0
        ? journal.images
        : journal.imageUrl
          ? [journal.imageUrl]
          : [];

    if (mediaList.length === 0) return '';

    const preferredIndex = Math.min(
      Math.max(journal.mainImageIndex ?? 0, 0),
      mediaList.length - 1
    );

    const preferredMedia = mediaList[preferredIndex];

    if (isVideoUrl(preferredMedia)) {
      const thumbnail =
        journal.videoThumbnails?.[preferredMedia];

      if (thumbnail) return thumbnail;

      const fallbackImage = mediaList.find(
        (url) => !isVideoUrl(url)
      );

      return fallbackImage || '';
    }

    return preferredMedia;
  }, [memoryOfTheDay]);

  const memoryCaption = React.useMemo(() => {
    const journal = memoryOfTheDay?.journal;
    if (!journal) return '';

    const rawContext = [
      journal.title,
      journal.content,
      journal.location,
      journal.locationAddress,
      ...(journal.taggedPeople || []).map((person) => person.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const stablePick = (phrases: string[]) => {
      const key =
        journal.id ||
        journal.title ||
        journal.date ||
        'memory';

      const hash = key
        .split('')
        .reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0
        );

      return phrases[Math.abs(hash) % phrases.length];
    };

    const locationLabel =
      journal.location?.trim() ||
      journal.locationAddress?.trim() ||
      '';

    const includesAny = (keywords: string[]) =>
      keywords.some((keyword) =>
        rawContext.includes(keyword)
      );

    /*
     * Context-first memory copy.
     * We intentionally prioritize what happened over how long ago it was.
     */

    // Ăn uống / nhà hàng / món ăn
    if (
      includesAny([
        'di an',
        'an com',
        'bua an',
        'bua com',
        'lau',
        'nuong',
        'buffet',
        'dokki',
        'sushi',
        'pizza',
        'pho',
        'bun',
        'banh',
        'ga ran',
        'tokbokki',
        'do an',
        'nha hang',
        'quan an',
        'an vat',
      ])
    ) {
      if (locationLabel) {
        return stablePick([
          `Nào đi ăn lại ở ${locationLabel} nha`,
          `Hôm nào quay lại ${locationLabel} ăn tiếp nhỉ`,
          `${locationLabel} hôm đó ngon ghê, đi lại không?`,
          `Nhìn lại là muốn ghé ${locationLabel} lần nữa`,
        ]);
      }

      return stablePick([
        'Bữa này nhìn lại vẫn thấy thèm',
        'Hôm nào làm lại một kèo ăn như này nha',
        'Bữa này vui ghê, làm lại không?',
        'Nhìn món này là lại muốn đi ăn rồi',
      ]);
    }

    // Cafe / trà / đồ uống
    if (
      includesAny([
        'cafe',
        'ca phe',
        'coffee',
        'tra sua',
        'tra chanh',
        'matcha',
        'quan nuoc',
        'di uong',
      ])
    ) {
      if (locationLabel) {
        return stablePick([
          `Hôm nào lại ngồi ở ${locationLabel} nha`,
          `${locationLabel} hôm đó chill phết nhỉ`,
          `Lại làm một buổi ở ${locationLabel} không?`,
        ]);
      }

      return stablePick([
        'Hôm nào lại đi cà phê như hôm đó nha',
        'Buổi này nhìn lại thấy chill ghê',
        'Lại làm một buổi ngồi nói chuyện linh tinh nha',
      ]);
    }

    // Du lịch / đi xa / biển / núi
    if (
      includesAny([
        'du lich',
        'chuyen di',
        'di choi xa',
        'bien',
        'nui',
        'resort',
        'hotel',
        'khach san',
        'camping',
        'cam trai',
        'san bay',
        'may bay',
        'roadtrip',
      ])
    ) {
      if (locationLabel) {
        return stablePick([
          `Đi lại ${locationLabel} lần nữa chắc vẫn vui`,
          `${locationLabel} đáng để quay lại thật`,
          `Bao giờ mình quay lại ${locationLabel} nhỉ`,
          `Chuyến này ở ${locationLabel} nhớ ghê`,
        ]);
      }

      return stablePick([
        'Chuyến này đi lại lần nữa chắc vẫn vui',
        'Bao giờ mình lại xách đồ đi như hôm đó nhỉ',
        'Nhìn lại là lại muốn đi đâu đó cùng nhau',
      ]);
    }

    // Đi chơi / check-in / dạo phố / công viên / trung tâm thương mại
    if (
      includesAny([
        'di choi',
        'check in',
        'checkin',
        'di dao',
        'dao pho',
        'cong vien',
        'vincom',
        'lotte',
        'aeon',
        'pho di bo',
        'bao tang',
        'khu di tich',
        'tham quan',
        'di xem',
      ])
    ) {
      if (locationLabel) {
        return stablePick([
          `Đi chơi ở ${locationLabel} thích nhỉ`,
          `Hôm nào quay lại ${locationLabel} nha`,
          `${locationLabel} hôm đó vui ghê`,
          `Chỗ ${locationLabel} này đáng đi lại đó`,
        ]);
      }

      return stablePick([
        'Hôm đó đi chơi vui ghê nhỉ',
        'Lại có một buổi đi lang thang như này nha',
        'Nhìn lại thấy hôm đó vui thật',
      ]);
    }

    // Sinh nhật / tiệc / dịp đặc biệt
    if (
      includesAny([
        'sinh nhat',
        'birthday',
        'sinh nhật',
        'thoi nen',
        'banh sinh nhat',
        'tiẹc',
        'tiec',
      ])
    ) {
      return stablePick([
        'Sinh nhật hôm đó vui ghê',
        'Nhìn lại hôm này vẫn thấy ấm áp',
        'Một ngày đáng nhớ thật',
        'Hôm đó cười nhiều ghê nhỉ',
      ]);
    }

    // Kỷ niệm yêu nhau / anniversary
    if (
      includesAny([
        'ky niem',
        'anniversary',
        'ngay yeu',
        'ngay quen nhau',
        'love day',
      ])
    ) {
      return stablePick([
        'Thêm một cột mốc của hai đứa nè',
        'Ngày này nhìn lại vẫn thấy đặc biệt',
        'Hôm đó đúng là một ngày đáng giữ lại',
      ]);
    }

    // Mua sắm / đi lượn
    if (
      includesAny([
        'mua sam',
        'shopping',
        'di mua',
        'di luon',
        'di luon',
        'mall',
        'sieu thi',
      ])
    ) {
      if (locationLabel) {
        return stablePick([
          `Hôm nào lại lượn ${locationLabel} nha`,
          `${locationLabel} hôm đó đi linh tinh mà vui ghê`,
        ]);
      }

      return stablePick([
        'Hôm nào lại đi lượn linh tinh như này nha',
        'Đi mua mấy thứ linh tinh mà cũng thành kỷ niệm',
      ]);
    }

    // Ở nhà / nấu ăn / đời thường
    if (
      includesAny([
        'o nha',
        'nau an',
        'nau com',
        'bep',
        'xem phim',
        'ngu',
        'phong',
        'nha minh',
      ])
    ) {
      return stablePick([
        'Mấy khoảnh khắc bình thường thế này lại đáng nhớ nhất',
        'Ở nhà thôi mà nhìn lại thấy vui ghê',
        'Ngày bình thường nhưng lại thành kỷ niệm rồi',
      ]);
    }

    // Ảnh chụp / selfie
    if (
      includesAny([
        'selfie',
        'chup anh',
        'chup hinh',
        'song ao',
        'photo',
        'anh dep',
      ])
    ) {
      return stablePick([
        'Tấm này nhìn lại vẫn thấy đáng yêu ghê',
        'Hôm đó chụp được tấm này cũng đáng công nhỉ',
        'Tấm này giữ lại đúng là không phí',
      ]);
    }

    // Thú cưng
    if (
      includesAny([
        'meo',
        'cho',
        'pet',
        'thu cung',
        'boss',
      ])
    ) {
      return stablePick([
        'Nhìn cái mặt này là lại buồn cười',
        'Khoảnh khắc với boss này đáng giữ thật',
        'Tấm này xem lại vẫn cưng ghê',
      ]);
    }

    // Fallback: location-aware before time-aware
    if (locationLabel) {
      return stablePick([
        `${locationLabel} hôm đó vui nhỉ`,
        `Hôm nào quay lại ${locationLabel} nha`,
        `Lại có dịp ghé ${locationLabel} thì hay`,
      ]);
    }

    // Last fallback = time, but only when no useful context exists.
    const rawDate =
      journal.date ||
      journal.createdAt ||
      '';

    const memoryDate = new Date(rawDate);

    if (Number.isNaN(memoryDate.getTime())) {
      return stablePick([
        'Tự nhiên hôm nay kỷ niệm này ghé lại',
        'Một khoảnh khắc cũ tự nhiên xuất hiện lại nè',
        'Xem lại cái này một chút không?',
      ]);
    }

    const now = new Date();

    const startOfMemory = new Date(
      memoryDate.getFullYear(),
      memoryDate.getMonth(),
      memoryDate.getDate()
    );

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const diffDays = Math.max(
      0,
      Math.floor(
        (startOfToday.getTime() - startOfMemory.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    if (memoryOfTheDay?.kind === 'on_this_day') {
      const years = memoryOfTheDay.yearsAgo;

      return stablePick([
        `Đúng ngày này ${years} năm trước đó`,
        `${years} năm rồi mà nhìn vẫn thấy gần ghê`,
        `Một vòng nữa lại tới đúng ngày này rồi`,
      ]);
    }

    if (diffDays <= 1) {
      return diffDays === 0
        ? 'Mới hôm nay thôi mà đã thành kỷ niệm rồi'
        : 'Mới hôm qua thôi á';
    }

    if (diffDays <= 6) {
      return `Đã ${diffDays} ngày kể từ hôm đó rồi á`;
    }

    if (diffDays < 30) {
      return stablePick([
        `Đã ${diffDays} ngày trôi qua rồi đó`,
        'Cũng được một thời gian rồi nhỉ',
      ]);
    }

    return stablePick([
      'Tự nhiên hôm nay muốn xem lại khoảnh khắc này',
      'Một kỷ niệm cũ tự nhiên quay lại nè',
      'Xem lại cái này thấy cũng vui ghê',
    ]);
  }, [memoryOfTheDay]);

  const memoryTone = React.useMemo(() => {
    const key =
      memoryOfTheDay?.journal?.id ||
      memoryOfTheDay?.journal?.title ||
      memoryOfTheDay?.journal?.date ||
      'memory';

    const hash = key
      .split('')
      .reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
      );

    const tones = [
      {
        chip:
          'border-rose-100 bg-rose-50/90 text-rose-600',
        glow:
          'from-rose-50/70 to-pink-50/40',
        panelGradient:
          'bg-gradient-to-r from-rose-950 via-fuchsia-950/90 to-rose-950/20',
        imageOverlay:
          'bg-gradient-to-r from-rose-950/95 via-fuchsia-950/35 to-transparent',
        panelFallback:
          'bg-gradient-to-br from-rose-950 via-fuchsia-950 to-pink-950',
      },
      {
        chip:
          'border-amber-100 bg-amber-50/90 text-amber-700',
        glow:
          'from-amber-50/60 to-orange-50/30',
        panelGradient:
          'bg-gradient-to-r from-amber-950 via-orange-950/90 to-amber-950/20',
        imageOverlay:
          'bg-gradient-to-r from-amber-950/95 via-orange-950/35 to-transparent',
        panelFallback:
          'bg-gradient-to-br from-amber-950 via-orange-950 to-red-950',
      },
      {
        chip:
          'border-sky-100 bg-sky-50/90 text-sky-700',
        glow:
          'from-sky-50/60 to-cyan-50/30',
        panelGradient:
          'bg-gradient-to-r from-sky-950 via-blue-950/90 to-sky-950/20',
        imageOverlay:
          'bg-gradient-to-r from-sky-950/95 via-blue-950/35 to-transparent',
        panelFallback:
          'bg-gradient-to-br from-sky-950 via-blue-950 to-cyan-950',
      },
      {
        chip:
          'border-violet-100 bg-violet-50/90 text-violet-700',
        glow:
          'from-violet-50/60 to-fuchsia-50/30',
        panelGradient:
          'bg-gradient-to-r from-violet-950 via-fuchsia-950/90 to-violet-950/20',
        imageOverlay:
          'bg-gradient-to-r from-violet-950/95 via-fuchsia-950/35 to-transparent',
        panelFallback:
          'bg-gradient-to-br from-violet-950 via-fuchsia-950 to-indigo-950',
      },
      {
        chip:
          'border-emerald-100 bg-emerald-50/90 text-emerald-700',
        glow:
          'from-emerald-50/60 to-teal-50/30',
        panelGradient:
          'bg-gradient-to-r from-emerald-950 via-teal-950/90 to-emerald-950/20',
        imageOverlay:
          'bg-gradient-to-r from-emerald-950/95 via-teal-950/35 to-transparent',
        panelFallback:
          'bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950',
      },
    ];

    return tones[Math.abs(hash) % tones.length];
  }, [memoryOfTheDay]);

  return {
    memoryOfTheDay,
    memoryPreview,
    memoryCaption,
    memoryTone,
  };
};
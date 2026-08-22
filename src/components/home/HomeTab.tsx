import React from 'react';
import {
  Calendar,
  ChevronRight,
  MapPin,
  Sparkles,
  Trophy,
  X,
  BookOpen,
  Images,
  MessageCircle,
  Plane,
  MapPinned,
  Crown,
  CalendarDays,
} from 'lucide-react';

import { CoupleData, JournalEntry, UserProfile, WakeUpLog } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { WakeUpChallengeCard } from '../WakeUpChallengeCard';
import { isVideoUrl } from '../../utils/mediaHelper';

interface HomeTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  wakeUpLogs: WakeUpLog[];
  journals: JournalEntry[];
  onNavigate: (tab: 'achievements' | 'finance') => void;
  onOpenJournal: (journal: JournalEntry) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  userProfile,
  coupleData,
  wakeUpLogs,
  journals,
  onNavigate,
  onOpenJournal,
}) => {
  const [showSecretStats, setShowSecretStats] = React.useState(false);
  const secretPressTimerRef = React.useRef<number | null>(null);
  const secretPressTriggeredRef = React.useRef(false);

  const isU1 =
    coupleData?.user1Id === userProfile.uid ||
    coupleData?.user1Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const isU2 =
    coupleData?.user2Id === userProfile.uid ||
    coupleData?.user2Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('chucga');

  const u1Name = isU1
    ? userProfile.displayName || coupleData?.user1Name || 'Dương'
    : coupleData?.user1Name || 'Dương';

  const u2Name = isU2
    ? userProfile.displayName || coupleData?.user2Name || 'Chúc Gà'
    : coupleData?.user2Name || 'Chúc Gà';

  const u1Avatar =
    (isU1 ? userProfile.avatarUrl : coupleData?.user1Avatar) ||
    coupleData?.user1Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile';

  const u2Avatar =
    (isU2 ? userProfile.avatarUrl : coupleData?.user2Avatar) ||
    coupleData?.user2Avatar ||
    'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile';

  const getDaysTogether = (): number => {
    if (!coupleData?.anniversaryDate) return 1;

    const start = new Date(coupleData.anniversaryDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays + 1;
  };

  const todayLocalDate = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  })();

  const todayLog =
    wakeUpLogs.find(
      (log) => log.date === todayLocalDate
    ) || null;

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
      daysTogether: getDaysTogether(),
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
  }, [journals, coupleData?.anniversaryDate]);

  const clearSecretPressTimer = () => {
    if (secretPressTimerRef.current !== null) {
      window.clearTimeout(secretPressTimerRef.current);
      secretPressTimerRef.current = null;
    }
  };

  const handleSecretPressStart = () => {
    clearSecretPressTimer();
    secretPressTriggeredRef.current = false;

    secretPressTimerRef.current = window.setTimeout(() => {
      secretPressTriggeredRef.current = true;
      setShowSecretStats(true);

      if (
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        navigator.vibrate?.(35);
      }
    }, 800);
  };

  const handleSecretPressEnd = () => {
    clearSecretPressTimer();
  };

  React.useEffect(() => {
    if (!showSecretStats) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSecretStats(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [showSecretStats]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
        {/* Partners Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Partner 1 Card */}
          <div className="p-4 rounded-2xl border border-rose-100/80 bg-rose-50/40 hover:bg-rose-50/70 transition flex items-center gap-3.5 relative overflow-hidden group">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-rose-300 p-0.5 overflow-hidden block shadow-xs bg-white">
                <img
                  src={u1Avatar}
                  alt={u1Name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base sm:text-lg truncate">
                  {u1Name}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isU1
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isU1 ? 'Bạn' : 'Nửa kia'}
                </span>
              </div>
            </div>
          </div>

          {/* Partner 2 Card */}
          <div className="p-4 rounded-2xl border border-rose-100/80 bg-rose-50/40 hover:bg-rose-50/70 transition flex items-center gap-3.5 relative overflow-hidden group">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-rose-300 p-0.5 overflow-hidden block shadow-xs bg-white">
                <img
                  src={u2Avatar}
                  alt={u2Name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-base sm:text-lg truncate">
                  {u2Name}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isU2
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isU2 ? 'Bạn' : 'Nửa kia'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Days Together Counter */}
        <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl p-6 border border-rose-100/80 text-center">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-1">
            Số Ngày Bên Nhau
          </span>

          <div
            className="text-5xl font-black text-rose-600 tracking-tight my-2 select-none touch-manipulation"
            onPointerDown={handleSecretPressStart}
            onPointerUp={handleSecretPressEnd}
            onPointerCancel={handleSecretPressEnd}
            onPointerLeave={handleSecretPressEnd}
            onContextMenu={(event) => event.preventDefault()}
            role="button"
            tabIndex={0}
            aria-label={`${getDaysTogether()} ngày bên nhau`}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault();
                setShowSecretStats(true);
              }
            }}
          >
            {getDaysTogether()}{' '}
            <span className="text-xl font-bold text-rose-400">
              ngày
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-100/80 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-rose-400" />
            <span>Ngày bắt đầu:</span>
            <span className="font-bold text-slate-700">
              {formatDateVN(coupleData?.anniversaryDate)}
            </span>
          </div>
        </div>

        {/* On This Day / Random Memory */}
        {memoryOfTheDay && (
          <button
            type="button"
            onClick={() => onOpenJournal(memoryOfTheDay.journal)}
            className="group relative block w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            {memoryPreview ? (
              <>
                <img
                  src={memoryPreview}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
                />

                <div className={`absolute inset-0 ${memoryTone.panelGradient}`} />

                <div className="absolute bottom-0 right-0 top-0 w-[46%] sm:w-[48%]">
                  <img
                    src={memoryPreview}
                    alt={memoryOfTheDay.journal.title || 'Kỷ niệm'}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />

                  <div className={`absolute inset-0 ${memoryTone.imageOverlay}`} />
                </div>
              </>
            ) : (
              <div className={`absolute inset-0 ${memoryTone.panelFallback}`} />
            )}

            <div className="relative z-[2] flex min-h-[190px] items-end p-5 sm:min-h-[215px] sm:p-6">
              <div className="max-w-[72%] sm:max-w-[64%]">
                <div
                  className={`mb-3 inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-bold leading-snug backdrop-blur-md ${memoryTone.chip}`}
                >
                  <span className="truncate">
                    {memoryCaption}
                  </span>
                </div>

                <h3 className="line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">
                  {memoryOfTheDay.journal.title || 'Một kỷ niệm cũ'}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-white/70">
                  <span>
                    {formatDateVN(memoryOfTheDay.journal.date)}
                  </span>
                </div>

                {memoryOfTheDay.journal.location && (
                  <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-white/70">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-300" />

                    <span className="truncate">
                      {memoryOfTheDay.journal.location}
                    </span>
                  </div>
                )}

                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white">
                  <span>Xem lại kỷ niệm</span>

                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Achievements Quick Teaser */}
        <div
          onClick={() => onNavigate('achievements')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-rose-500" />
            </div>

            <div className="text-left min-w-0">
              <span className="text-sm font-bold text-slate-800 block truncate">
                Thành Tích & Điểm Thưởng
              </span>
              <p className="text-xs text-slate-500 truncate">
                Huy hiệu, cấp độ tình yêu & kỷ niệm
              </p>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition shrink-0" />
        </div>

        {/* Early Bird Wake-Up Challenge Home Card */}
        <WakeUpChallengeCard
          compact={true}
          userProfile={userProfile}
          coupleData={coupleData}
          todayLog={todayLog}
          allLogs={wakeUpLogs}
          onNavigateToFinance={() => onNavigate('finance')}
        />
      </div>

      {showSecretStats && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSecretStats(false);
            }
          }}
        >
          <div className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] border border-white/70 bg-white shadow-2xl sm:rounded-[32px]">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">
                  Bí mật nhỏ của Us
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {secretStats.daysTogether.toLocaleString('vi-VN')} ngày bên nhau
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Không có nút thống kê đâu, chỉ ai biết mới mở được.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSecretStats(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Đóng thống kê bí mật"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[
                  {
                    label: 'Địa điểm',
                    value: secretStats.locationCount,
                    icon: MapPinned,
                  },
                  {
                    label: 'Nhật ký',
                    value: secretStats.journalCount,
                    icon: BookOpen,
                  },
                  {
                    label: 'Ảnh',
                    value: secretStats.totalPhotos,
                    icon: Images,
                  },
                  {
                    label: 'Bình luận',
                    value: secretStats.totalComments,
                    icon: MessageCircle,
                  },
                  {
                    label: 'Chuyến đi',
                    value: secretStats.travelCount,
                    icon: Plane,
                  },
                  {
                    label: 'Video',
                    value: secretStats.totalVideos,
                    icon: CalendarDays,
                  },
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5"
                    >
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-rose-500 shadow-xs">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="text-2xl font-black tracking-tight text-slate-900">
                        {stat.value.toLocaleString('vi-VN')}
                      </div>

                      <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="mb-2.5 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Mấy điều hai đứa không để ý
                  </h3>
                </div>

                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Tháng chụp ảnh nhiều nhất
                    </span>

                    <span className="text-right text-xs font-bold text-slate-900">
                      {secretStats.busiestPhotoMonth
                        ? `${secretStats.busiestPhotoMonth.label} · ${secretStats.busiestPhotoMonth.count} ảnh`
                        : 'Chưa đủ dữ liệu'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Nơi quay lại nhiều nhất
                    </span>

                    <span className="max-w-[58%] truncate text-right text-xs font-bold text-slate-900">
                      {secretStats.topLocation
                        ? `${secretStats.topLocation.label} · ${secretStats.topLocation.count} lần`
                        : 'Chưa có địa điểm'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Người đăng nhật ký nhiều hơn
                    </span>

                    <span className="text-right text-xs font-bold text-slate-900">
                      {secretStats.topAuthor
                        ? `${secretStats.topAuthor.label} · ${secretStats.topAuthor.count} bài`
                        : 'Chưa đủ dữ liệu'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Người hay bình luận hơn
                    </span>

                    <span className="text-right text-xs font-bold text-slate-900">
                      {secretStats.topCommenter
                        ? `${secretStats.topCommenter.label} · ${secretStats.topCommenter.count} bình luận`
                        : 'Chưa có bình luận'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-center text-[10px] font-medium text-slate-300">
                Psst… giữ số ngày yêu nhau để quay lại đây.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
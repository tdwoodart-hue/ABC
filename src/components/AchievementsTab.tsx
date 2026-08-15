import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserProfile, 
  CoupleData, 
  JournalEntry, 
  VisitedPlace, 
  VisitedProvinceRecord, 
  FinanceTransaction, 
  SavingsGoal, 
  NutritionMeal, 
  NutritionRecipe, 
  CoupleAchievement,
  LoveActionRecord,
  TierMilestone
} from '../types';
import { formatDateVN, formatDateShortVN } from '../utils/formatDate';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from '../lib/firebase';
import { 
  Trophy, 
  Award, 
  Heart, 
  Calendar, 
  BookOpen, 
  MapPin, 
  Apple, 
  Wallet, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Star, 
  ChevronRight, 
  Search, 
  CheckCircle2, 
  Lock, 
  Compass, 
  Gift,
  Coffee,
  Utensils,
  Sparkles,
  Flame,
  MessageCircleHeart,
  Car,
  Smile,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface AchievementsTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals?: JournalEntry[];
}

// Preset Quick Love Actions for Daily Point Earning
const PRESET_ACTIONS = [
  { title: 'Nấu bữa ăn ngon cho người ấy', points: 50, category: 'food' as const, icon: '🍳', desc: 'Tự tay chuẩn bị hoặc nấu món người ấy thích' },
  { title: 'Mua cà phê / trà sữa tặng người ấy', points: 30, category: 'sweet' as const, icon: '☕', desc: 'Món nước khoái khẩu nạp năng lượng' },
  { title: 'Gửi tin nhắn / lời chúc ngọt ngào', points: 20, category: 'sweet' as const, icon: '💌', desc: 'Bắt đầu ngày mới hoặc chúc ngủ ngon ấm áp' },
  { title: 'Tặng quà / hoa bất ngờ', points: 80, category: 'gift' as const, icon: '🎁', desc: 'Một món quà nhỏ không cần nhân dịp gì cả' },
  { title: 'Massage / Chăm sóc khi mệt mỏi hoặc ốm', points: 60, category: 'care' as const, icon: '💆', desc: 'Xoa bóp, nấu cháo, mua thuốc chăm sóc chu đáo' },
  { title: 'Rửa bát / Dọn dẹp phòng giúp người ấy', points: 40, category: 'help' as const, icon: '🧹', desc: 'Chủ động đỡ đần việc nhà cùng nhau' },
  { title: 'Đón đưa người ấy đi làm / đi học / đi chơi', points: 40, category: 'help' as const, icon: '🛵', desc: 'Lái xe cẩn thận đồng hành trên mọi nẻo đường' },
  { title: 'Lên lịch hẹn hò / xem phim lãng mạn', points: 50, category: 'date' as const, icon: '🎬', desc: 'Chủ động chọn quán ăn, đặt vé phim hẹn hò' },
  { title: 'Lắng nghe & an ủi khi người ấy có chuyện buồn', points: 50, category: 'care' as const, icon: '🫂', desc: 'Ở bên sẻ chia và làm chỗ dựa vững chắc' },
];

const PRESET_ICONS = ['🏆', '💖', '💍', '✈️', '🏠', '🐱', '🍳', '🎁', '🚗', '☕', '🎬', '🌟', '🥂', '🌹', '⛺', '🏖️', '💌', '🍰'];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const AchievementsTab: React.FC<AchievementsTabProps> = ({
  userProfile,
  coupleData,
  journals = []
}) => {
  const coupleId = userProfile.coupleId || 'default-couple';
  
  // Navigation sub-tab inside Achievements
  const [subTab, setSubTab] = useState<'tiers' | 'actions' | 'custom'>('tiers');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore real-time collections
  const [customAchievements, setCustomAchievements] = useState<CoupleAchievement[]>([]);
  const [loveActions, setLoveActions] = useState<LoveActionRecord[]>([]);
  const [visitedProvinces, setVisitedProvinces] = useState<VisitedProvinceRecord[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [recipes, setRecipes] = useState<NutritionRecipe[]>([]);

  // Modals
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<CoupleAchievement | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form states for creating custom milestone
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCategory, setCustomCategory] = useState<'love' | 'journal' | 'travel' | 'health' | 'finance' | 'custom'>('custom');
  const [customIcon, setCustomIcon] = useState('🏆');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customPoints, setCustomPoints] = useState(100);
  const [customImage, setCustomImage] = useState('');
  const [customReward, setCustomReward] = useState('');
  const [isUnlockedImmediate, setIsUnlockedImmediate] = useState(true);
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // Form states for logging love action
  const [actionPresetIdx, setActionPresetIdx] = useState<number>(0);
  const [isCustomAction, setIsCustomAction] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [actionPoints, setActionPoints] = useState(50);
  const [actionCategory, setActionCategory] = useState<any>('food');
  const [actionIcon, setActionIcon] = useState('🍳');
  const [actionPerformer, setActionPerformer] = useState<'me' | 'partner'>('me');
  const [actionNote, setActionNote] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Partner Identification
  const currentUserIsUser1 = (coupleData?.user1Uid === userProfile.uid) || (coupleData?.user1Id === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
  const myName = userProfile.displayName || (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');
  const myGender = userProfile.gender || (currentUserIsUser1 ? (coupleData?.user1Gender || 'male') : (coupleData?.user2Gender || 'female'));
  const myAvatar = userProfile.avatarUrl || (myGender === 'female' ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female' : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male');

  let rawPartnerName = coupleData 
    ? (currentUserIsUser1 ? (coupleData.user2Name || 'Chúc Gà') : (coupleData.user1Name || 'Dương')) 
    : (currentUserIsUser1 ? 'Chúc Gà' : 'Dương');
  if (rawPartnerName.trim() === myName.trim()) {
    rawPartnerName = currentUserIsUser1 ? 'Chúc Gà' : 'Dương';
  }
  const partnerName = rawPartnerName;
  const partnerUid = coupleData 
    ? (currentUserIsUser1 ? coupleData.user2Uid : coupleData.user1Uid) 
    : '';
  const partnerAvatar = coupleData 
    ? (currentUserIsUser1 
        ? (coupleData.user2Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female') 
        : (coupleData.user1Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male')) 
    : (currentUserIsUser1 ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female' : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male');

  // Load Custom Achievements
  useEffect(() => {
    if (!coupleId) return;
    const q = query(
      collection(db, `couples/${coupleId}/achievements`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: CoupleAchievement[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setCustomAchievements(items);
    }, (err) => {
      console.warn('Load achievements error:', err);
    });

    return () => unsubscribe();
  }, [coupleId]);

  // Load Love Actions Log
  useEffect(() => {
    if (!coupleId) return;
    const q = query(
      collection(db, `couples/${coupleId}/love_actions`),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: LoveActionRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setLoveActions(items);
    }, (err) => {
      console.warn('Load love actions error:', err);
    });

    return () => unsubscribe();
  }, [coupleId]);

  // Load Visited Provinces & Places
  useEffect(() => {
    if (!coupleId) return;
    const qProv = query(collection(db, `couples/${coupleId}/visited_provinces`));
    const unsubProv = onSnapshot(qProv, (snapshot) => {
      const list: VisitedProvinceRecord[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setVisitedProvinces(list);
    }, (err) => console.warn(err));

    const qPlaces = query(collection(db, `couples/${coupleId}/visited_places`));
    const unsubPlaces = onSnapshot(qPlaces, (snapshot) => {
      const list: VisitedPlace[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setVisitedPlaces(list);
    }, (err) => console.warn(err));

    return () => {
      unsubProv();
      unsubPlaces();
    };
  }, [coupleId]);

  // Load Finances & Savings
  useEffect(() => {
    if (!coupleId) return;
    const qTx = query(collection(db, 'couples', coupleId, 'finances'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const list: FinanceTransaction[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setTransactions(list);
    }, (err) => console.warn(err));

    const qGoals = query(collection(db, 'couples', coupleId, 'savingsGoals'));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const list: SavingsGoal[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setSavingsGoals(list);
    }, (err) => console.warn(err));

    return () => {
      unsubTx();
      unsubGoals();
    };
  }, [coupleId]);

  // Load Meals & Recipes
  useEffect(() => {
    if (!coupleId) return;
    const qMeals = query(collection(db, `couples/${coupleId}/meals`));
    const unsubMeals = onSnapshot(qMeals, (snapshot) => {
      const list: NutritionMeal[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setMeals(list);
    }, (err) => console.warn(err));

    const qRec = query(collection(db, `couples/${coupleId}/recipes`));
    const unsubRec = onSnapshot(qRec, (snapshot) => {
      const list: NutritionRecipe[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setRecipes(list);
    }, (err) => console.warn(err));

    return () => {
      unsubMeals();
      unsubRec();
    };
  }, [coupleId]);

  // Calculate Days in Love
  const daysInLove = useMemo(() => {
    if (!coupleData?.anniversaryDate) return 1;
    const start = new Date(coupleData.anniversaryDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [coupleData?.anniversaryDate]);

  // Total Photos & Comments
  const totalPhotos = useMemo(() => {
    return journals.reduce((sum, j) => sum + (j.images ? j.images.length : (j.imageUrl ? 1 : 0)), 0);
  }, [journals]);

  const completedSavingsGoals = useMemo(() => {
    return savingsGoals.filter(g => g.currentAmount >= g.targetAmount).length;
  }, [savingsGoals]);

  // Multi-tier Level Aggregator Function
  const calculateTierProgress = (val: number, tiers: TierMilestone[]) => {
    let currentLevel = 0;
    let earnedPoints = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (val >= tiers[i].target) {
        currentLevel = tiers[i].level;
        earnedPoints += tiers[i].points;
      }
    }
    const nextTier = tiers.find(t => t.level === currentLevel + 1);
    const prevTarget = currentLevel > 0 ? (tiers.find(t => t.level === currentLevel)?.target || 0) : 0;
    
    let progressPercent = 100;
    if (nextTier) {
      const span = nextTier.target - prevTarget;
      const done = Math.max(0, val - prevTarget);
      progressPercent = Math.min(100, Math.round((done / span) * 100));
    }

    return {
      currentLevel,
      maxLevel: tiers.length,
      earnedPoints,
      nextTier,
      progressPercent,
      isFullyCompleted: currentLevel >= tiers.length
    };
  };

  // MULTI-TIER CONSOLIDATED ACHIEVEMENTS
  const tieredAchievements = useMemo<CoupleAchievement[]>(() => {
    // 1. Time / Days in Love
    const loveTiers: TierMilestone[] = [
      { level: 1, target: 7, title: 'Tuần Lễ Đầu Tiên (7 Ngày)', points: 50, rewardText: 'Cùng nhau uống trà sữa hoặc cà phê mừng tuần đầu.' },
      { level: 2, target: 30, title: 'Tròn 1 Tháng (30 Ngày)', points: 100, rewardText: 'Hẹn hò ăn tối lãng mạn mừng 1 tháng bên nhau.' },
      { level: 3, target: 100, title: '100 Ngày Hạnh Phúc', points: 200, rewardText: 'Một món quà nhỏ bất ngờ tặng người ấy.' },
      { level: 4, target: 180, title: 'Nửa Năm Gắn Bó (180 Ngày)', points: 300, rewardText: 'Chuyến dã ngoại cuối tuần đổi gió lãng mạn.' },
      { level: 5, target: 365, title: '1 Năm Kỷ Niệm Vàng (365 Ngày)', points: 500, rewardText: 'Bữa tiệc ấm áp kỷ niệm 1 năm trọn vẹn yêu thương.' },
      { level: 6, target: 500, title: '500 Ngày Bền Chặt', points: 750, rewardText: 'Du lịch xa cùng nhau check-in vùng đất mới.' },
      { level: 7, target: 730, title: '2 Năm Son Sắt (730 Ngày)', points: 1000, rewardText: 'Nhẫn đôi kỷ niệm hoặc kế hoạch lớn cho tương lai.' },
      { level: 8, target: 1000, title: '1000 Ngày Kim Cương', points: 1500, rewardText: 'Danh hiệu Tình Yêu Vĩnh Cửu 💎.' },
    ];
    const loveCalc = calculateTierProgress(daysInLove, loveTiers);

    // 2. Journal Entries
    const journalTiers: TierMilestone[] = [
      { level: 1, target: 1, title: 'Trang Nhật Ký Đầu Tiên', points: 30, rewardText: 'Mảnh ghép đầu tiên của cuốn sổ ký ức.' },
      { level: 2, target: 5, title: 'Ký Ức Đong Đầy (5 Bài)', points: 80, rewardText: 'Cùng ngồi đọc lại những kỷ niệm ngọt ngào.' },
      { level: 3, target: 15, title: 'Nhà Văn Tình Yêu (15 Bài)', points: 150, rewardText: 'In một tấm ảnh kỷ niệm dán vào sổ tay.' },
      { level: 4, target: 30, title: 'Cuốn Sách Hạnh Phúc (30 Bài)', points: 300, rewardText: 'Tặng người ấy một món quà tri ân cảm xúc.' },
      { level: 5, target: 50, title: 'Biên Niên Sử Đôi Mình (50 Bài)', points: 500, rewardText: 'Album nhật ký đồ sộ và đáng tự hào!' },
    ];
    const journalCalc = calculateTierProgress(journals.length, journalTiers);

    // 3. Photo Gallery
    const photoTiers: TierMilestone[] = [
      { level: 1, target: 5, title: 'Bắt Đầu Lưu Ảnh (5 Bức)', points: 30, rewardText: 'Khoảnh khắc đáng yêu đầu tiên được lưu giữ.' },
      { level: 2, target: 20, title: 'Kho Ảnh Ngọt Ngào (20 Bức)', points: 100, rewardText: 'Đặt ảnh đôi làm hình nền điện thoại.' },
      { level: 3, target: 50, title: 'Bộ Sưu Tập Nụ Cười (50 Bức)', points: 250, rewardText: 'Tạo một album ảnh in để bàn cực xinh.' },
      { level: 4, target: 100, title: 'Bảo Tàng Ảnh Đôi (100+ Bức)', points: 500, rewardText: 'Khung ảnh kỷ niệm trang trí phòng!' },
    ];
    const photoCalc = calculateTierProgress(totalPhotos, photoTiers);

    // 4. Travel Provinces
    const travelTiers: TierMilestone[] = [
      { level: 1, target: 1, title: 'Dấu Chân Đầu Tiên (1 Tỉnh/TP)', points: 50, rewardText: 'Bắt đầu hành trình nắm tay nhau đi khắp nơi.' },
      { level: 2, target: 3, title: 'Đôi Bạn Du Lịch (3 Tỉnh/TP)', points: 120, rewardText: 'Thưởng thức món đặc sản vùng miền mới lạ.' },
      { level: 3, target: 5, title: 'Phượt Thủ Tình Yêu (5 Tỉnh/TP)', points: 250, rewardText: 'Sưu tập quà lưu niệm từ các chuyến đi.' },
      { level: 4, target: 10, title: 'Khám Phá Việt Nam (10 Tỉnh/TP)', points: 500, rewardText: 'Bản đồ đôi mình sáng rực khắp 3 miền!' },
      { level: 5, target: 20, title: 'Hành Trình Xuyên Việt (20 Tỉnh/TP)', points: 1000, rewardText: 'Cặp đôi vi vu xuất sắc nhất!' },
    ];
    const travelCalc = calculateTierProgress(visitedProvinces.length, travelTiers);

    // 5. Visited Places Check-in
    const placeTiers: TierMilestone[] = [
      { level: 1, target: 3, title: 'Điểm Hẹn Đầu Tiên (3 Điểm)', points: 30, rewardText: 'Ghi dấu những quán quen thân thuộc.' },
      { level: 2, target: 10, title: 'Quán Quen Của Hai Đứa (10 Điểm)', points: 100, rewardText: 'Review quán ăn ngon nhất hai đứa từng ghé.' },
      { level: 3, target: 25, title: 'Chuyên Gia Check-in (25 Điểm)', points: 250, rewardText: 'Một buổi tối hẹn hò tại địa điểm yêu thích nhất.' },
      { level: 4, target: 50, title: 'Bản Đồ Quán Xá (50 Điểm)', points: 500, rewardText: 'Bản đồ check-in đầy ắp kỷ niệm!' },
    ];
    const placeCalc = calculateTierProgress(visitedPlaces.length, placeTiers);

    // 6. Healthy Meals & Home Cooking
    const mealTiers: TierMilestone[] = [
      { level: 1, target: 1, title: 'Bữa Cơm Yêu Thương (1 Bữa)', points: 30, rewardText: 'Ăn ngon, sống khỏe và luôn ấm áp.' },
      { level: 2, target: 10, title: 'Thực Đơn Hạnh Phúc (10 Bữa)', points: 100, rewardText: 'Tặng người ấy một ly nước ép mát lành.' },
      { level: 3, target: 30, title: 'Bếp Ấm Đôi Mình (30 Bữa)', points: 250, rewardText: 'Một buổi tối cùng nhau vào bếp nấu lẩu hoặc nướng.' },
      { level: 4, target: 60, title: 'Vua Đầu Bếp Gia Đình (60 Bữa)', points: 500, rewardText: 'Tự tay nấu mâm cơm thịnh soạn chiêu đãi người ấy.' },
    ];
    const mealCalc = calculateTierProgress(meals.length, mealTiers);

    // 7. Finance & Savings Goals
    const financeTiers: TierMilestone[] = [
      { level: 1, target: 1, title: 'Tài Chính Minh Bạch (1 Giao dịch)', points: 30, rewardText: 'Khởi đầu thói quen quản lý chi tiêu chung.' },
      { level: 2, target: 10, title: 'Ghi Chép Chu Đáo (10 Giao dịch)', points: 80, rewardText: 'Tổng kết chi tiêu hợp lý cuối tháng.' },
      { level: 3, target: 30, title: 'Chuyên Gia Quản Lý (30 Giao dịch)', points: 150, rewardText: 'Khen ngợi sự chu đáo của người ấy.' },
      { level: 4, target: 100, title: 'Sổ Sách Vững Vàng (100 Giao dịch)', points: 300, rewardText: 'Tài chính ổn định cho tương lai bền lâu.' },
    ];
    const financeCalc = calculateTierProgress(transactions.length, financeTiers);

    return [
      {
        id: 'tier_love_time',
        title: 'Hành Trình Yêu Thương',
        description: 'Cột mốc thời gian đồng hành và gắn bó bên nhau theo từng ngày.',
        category: 'love',
        icon: '💖',
        currentLevel: loveCalc.currentLevel,
        maxLevel: loveCalc.maxLevel,
        points: loveCalc.earnedPoints,
        tiers: loveTiers,
        currentValue: daysInLove,
        targetValue: loveCalc.nextTier ? loveCalc.nextTier.target : loveTiers[loveTiers.length - 1].target,
        unit: 'ngày',
        isUnlocked: loveCalc.currentLevel > 0,
      },
      {
        id: 'tier_journal_entries',
        title: 'Cuốn Nhật Ký Tình Yêu',
        description: 'Lưu giữ những mẩu chuyện, cảm xúc và buổi hẹn hò ý nghĩa.',
        category: 'journal',
        icon: '📖',
        currentLevel: journalCalc.currentLevel,
        maxLevel: journalCalc.maxLevel,
        points: journalCalc.earnedPoints,
        tiers: journalTiers,
        currentValue: journals.length,
        targetValue: journalCalc.nextTier ? journalCalc.nextTier.target : journalTiers[journalTiers.length - 1].target,
        unit: 'bài viết',
        isUnlocked: journalCalc.currentLevel > 0,
      },
      {
        id: 'tier_photos_gallery',
        title: 'Kho Ảnh Hạnh Phúc',
        description: 'Lưu giữ những khoảnh khắc nụ cười và bức ảnh kỷ niệm ngọt ngào.',
        category: 'journal',
        icon: '📷',
        currentLevel: photoCalc.currentLevel,
        maxLevel: photoCalc.maxLevel,
        points: photoCalc.earnedPoints,
        tiers: photoTiers,
        currentValue: totalPhotos,
        targetValue: photoCalc.nextTier ? photoCalc.nextTier.target : photoTiers[photoTiers.length - 1].target,
        unit: 'bức ảnh',
        isUnlocked: photoCalc.currentLevel > 0,
      },
      {
        id: 'tier_travel_provinces',
        title: 'Dấu Chân Đôi Lứa',
        description: 'Cùng nhau đặt chân tới các tỉnh thành trên bản đồ Việt Nam.',
        category: 'travel',
        icon: '🗺️',
        currentLevel: travelCalc.currentLevel,
        maxLevel: travelCalc.maxLevel,
        points: travelCalc.earnedPoints,
        tiers: travelTiers,
        currentValue: visitedProvinces.length,
        targetValue: travelCalc.nextTier ? travelCalc.nextTier.target : travelTiers[travelTiers.length - 1].target,
        unit: 'tỉnh/thành',
        isUnlocked: travelCalc.currentLevel > 0,
      },
      {
        id: 'tier_places_checkin',
        title: 'Điểm Hẹn & Check-in',
        description: 'Khám phá các quán ăn, quán cà phê và điểm hẹn hò thú vị.',
        category: 'travel',
        icon: '📍',
        currentLevel: placeCalc.currentLevel,
        maxLevel: placeCalc.maxLevel,
        points: placeCalc.earnedPoints,
        tiers: placeTiers,
        currentValue: visitedPlaces.length,
        targetValue: placeCalc.nextTier ? placeCalc.nextTier.target : placeTiers[placeTiers.length - 1].target,
        unit: 'địa điểm',
        isUnlocked: placeCalc.currentLevel > 0,
      },
      {
        id: 'tier_healthy_cooking',
        title: 'Bếp Ấm Đôi Mình',
        description: 'Ghi nhật ký dinh dưỡng và cùng nhau nấu những bữa ăn ngon.',
        category: 'health',
        icon: '🍲',
        currentLevel: mealCalc.currentLevel,
        maxLevel: mealCalc.maxLevel,
        points: mealCalc.earnedPoints,
        tiers: mealTiers,
        currentValue: meals.length,
        targetValue: mealCalc.nextTier ? mealCalc.nextTier.target : mealTiers[mealTiers.length - 1].target,
        unit: 'bữa ăn',
        isUnlocked: mealCalc.currentLevel > 0,
      },
      {
        id: 'tier_finance_savings',
        title: 'Tài Chính Vững Vàng',
        description: 'Ghi chép chi tiêu minh bạch và tích lũy các mục tiêu tương lai.',
        category: 'finance',
        icon: '💰',
        currentLevel: financeCalc.currentLevel,
        maxLevel: financeCalc.maxLevel,
        points: financeCalc.earnedPoints,
        tiers: financeTiers,
        currentValue: transactions.length,
        targetValue: financeCalc.nextTier ? financeCalc.nextTier.target : financeTiers[financeTiers.length - 1].target,
        unit: 'giao dịch',
        isUnlocked: financeCalc.currentLevel > 0,
      },
    ];
  }, [daysInLove, journals.length, totalPhotos, visitedProvinces.length, visitedPlaces.length, meals.length, transactions.length]);

  // Points Calculation
  const pointsFromTiers = useMemo(() => {
    return tieredAchievements.reduce((sum, a) => sum + (a.points || 0), 0);
  }, [tieredAchievements]);

  const pointsFromCustom = useMemo(() => {
    return customAchievements
      .filter(a => a.isUnlocked)
      .reduce((sum, a) => sum + (a.points || 100), 0);
  }, [customAchievements]);

  const pointsFromActions = useMemo(() => {
    return loveActions.reduce((sum, act) => sum + (act.points || 0), 0);
  }, [loveActions]);

  const totalLovePoints = pointsFromTiers + pointsFromCustom + pointsFromActions;

  // Personal Points Contribution
  const myActionPoints = useMemo(() => {
    return loveActions
      .filter(act => act.performedByUid === userProfile.uid)
      .reduce((sum, act) => sum + (act.points || 0), 0);
  }, [loveActions, userProfile.uid]);

  const partnerActionPoints = useMemo(() => {
    return loveActions
      .filter(act => act.performedByUid !== userProfile.uid)
      .reduce((sum, act) => sum + (act.points || 0), 0);
  }, [loveActions, userProfile.uid]);

  // Level Progression Breakdown
  const coupleLevel = useMemo(() => {
    if (totalLovePoints >= 5000) return { level: 6, title: 'Tình Yêu Kim Cương', badge: '💎', min: 5000, next: 8000, nextTitle: 'Đỉnh Cao Vĩnh Cửu' };
    if (totalLovePoints >= 3000) return { level: 5, title: 'Tình Yêu Vàng Son', badge: '👑', min: 3000, next: 5000, nextTitle: 'Tình Yêu Kim Cương' };
    if (totalLovePoints >= 1500) return { level: 4, title: 'Tri Kỷ Đồng Điệu', badge: '🌟', min: 1500, next: 3000, nextTitle: 'Tình Yêu Vàng Son' };
    if (totalLovePoints >= 700) return { level: 3, title: 'Gắn Kết Bền Chặt', badge: '💖', min: 700, next: 1500, nextTitle: 'Tri Kỷ Đồng Điệu' };
    if (totalLovePoints >= 250) return { level: 2, title: 'Giai Điệu Ngọt Ngào', badge: '🌸', min: 250, next: 700, nextTitle: 'Gắn Kết Bền Chặt' };
    return { level: 1, title: 'Mầm Xanh Mới Nở', badge: '🌱', min: 0, next: 250, nextTitle: 'Giai Điệu Ngọt Ngào' };
  }, [totalLovePoints]);

  const levelProgress = useMemo(() => {
    const span = coupleLevel.next - coupleLevel.min;
    const current = totalLovePoints - coupleLevel.min;
    return Math.min(100, Math.max(0, Math.round((current / span) * 100)));
  }, [totalLovePoints, coupleLevel]);

  // Handle logging a love action
  const handleLogAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = isCustomAction ? actionTitle.trim() : PRESET_ACTIONS[actionPresetIdx].title;
    const finalPoints = isCustomAction ? Number(actionPoints) : PRESET_ACTIONS[actionPresetIdx].points;
    const finalCategory = isCustomAction ? actionCategory : PRESET_ACTIONS[actionPresetIdx].category;
    const finalIcon = isCustomAction ? actionIcon : PRESET_ACTIONS[actionPresetIdx].icon;

    if (!finalTitle) return;

    setSubmittingAction(true);
    try {
      const isMe = actionPerformer === 'me';
      const performerUid = isMe ? userProfile.uid : (partnerUid || 'partner-uid');
      const performerName = isMe ? myName : partnerName;

      const record: Omit<LoveActionRecord, 'id'> = {
        title: finalTitle,
        points: finalPoints,
        category: finalCategory,
        icon: finalIcon,
        performedByUid: performerUid,
        performedByName: performerName,
        note: actionNote.trim() || undefined,
        date: actionDate,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, `couples/${coupleId}/love_actions`), record);

      // Reset
      setActionNote('');
      setIsCustomAction(false);
      setShowAddActionModal(false);
    } catch (err) {
      console.error('Lỗi khi ghi nhận hành động yêu thương:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle create custom milestone
  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    setSubmittingCustom(true);
    try {
      const newAch: Omit<CoupleAchievement, 'id'> = {
        title: customTitle.trim(),
        description: customDescription.trim() || 'Cột mốc đặc biệt ghi dấu kỷ niệm của hai đứa.',
        category: customCategory,
        icon: customIcon || '🏆',
        points: Number(customPoints) || 100,
        isUnlocked: isUnlockedImmediate,
        unlockedAt: isUnlockedImmediate ? customDate : undefined,
        customImage: customImage || undefined,
        rewardText: customReward.trim() || undefined,
        addedByUid: userProfile.uid,
        addedByName: myName,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, `couples/${coupleId}/achievements`), newAch);

      // Reset
      setCustomTitle('');
      setCustomDescription('');
      setCustomCategory('custom');
      setCustomIcon('🏆');
      setCustomPoints(100);
      setCustomImage('');
      setCustomReward('');
      setIsUnlockedImmediate(true);
      setShowAddCustomModal(false);
    } catch (err) {
      console.error('Lỗi khi thêm mốc kỷ niệm:', err);
    } finally {
      setSubmittingCustom(false);
    }
  };

  // Delete love action
  const handleDeleteAction = async (actionId: string) => {
    if (!actionId) return;
    if (!window.confirm('Bạn có chắc muốn xóa hành động ghi điểm này không?')) return;
    try {
      await deleteDoc(doc(db, `couples/${coupleId}/love_actions`, actionId));
    } catch (err) {
      console.error('Lỗi xóa hành động:', err);
    }
  };

  // Delete custom achievement
  const handleDeleteCustom = async (achId: string) => {
    if (!achId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa mốc kỷ niệm này?')) return;
    try {
      await deleteDoc(doc(db, `couples/${coupleId}/achievements`, achId));
      if (selectedAchievement?.id === achId) setSelectedAchievement(null);
    } catch (err) {
      console.error('Lỗi xóa mốc:', err);
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      setCustomImage(b64);
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
    }
  };

  // Copy certificate text
  const handleCopyCertificate = () => {
    const text = `🏆 BẢNG THÀNH TÍCH TÌNH YÊU 💕\n` +
      `Cặp đôi: ${myName} & ${partnerName}\n` +
      `Tổng điểm Yêu Thương: ${totalLovePoints.toLocaleString()} PTS\n` +
      `Cấp độ: Cấp ${coupleLevel.level} - ${coupleLevel.title} ${coupleLevel.badge}\n` +
      `Hành trình: ${daysInLove} ngày bên nhau\n` +
      `Kỷ niệm đã lưu: ${journals.length} bài viết | ${totalPhotos} bức ảnh\n` +
      `Hành động yêu thương: ${loveActions.length} lần ghi điểm chăm sóc\n` +
      `Cùng nhau tiếp tục vun đắp tình cảm mỗi ngày nhé! ✨`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-rose-100/80 pb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
          Thành Tích & Điểm Yêu Thương
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCertificateModal(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-rose-500" />
            <span>Chứng Nhận</span>
          </button>
          
          <button
            onClick={() => setShowAddActionModal(true)}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ghi Điểm</span>
          </button>
        </div>
      </div>

      {/* Main Scorecard & Couple Level Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Level Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-xl shrink-0">
              {coupleLevel.badge}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                  Cấp {coupleLevel.level}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">{coupleLevel.title}</h2>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg sm:text-2xl font-black text-rose-600 flex items-center justify-end gap-1">
              <span>{totalLovePoints.toLocaleString()}</span>
              <span className="text-xs font-bold text-slate-400">PTS</span>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-500">
            <span>Tiến độ cấp độ: {levelProgress}%</span>
            <span>{totalLovePoints.toLocaleString()} / {coupleLevel.next.toLocaleString()} PTS</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(3, levelProgress)}%` }}
            />
          </div>
        </div>

        {/* Breakdown Contributions (Dương vs Chúc Gà) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Thành tích cột mốc</span>
            </div>
            <span className="font-bold text-slate-800">+{pointsFromTiers.toLocaleString()}</span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={myAvatar} alt="" className="w-4 h-4 rounded-full border" />
              <span className="text-slate-600 font-medium">{myName}</span>
            </div>
            <span className="font-bold text-rose-600">+{myActionPoints.toLocaleString()}</span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={partnerAvatar} alt="" className="w-4 h-4 rounded-full border" />
              <span className="text-slate-600 font-medium">{partnerName}</span>
            </div>
            <span className="font-bold text-rose-600">+{partnerActionPoints.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSubTab('tiers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            subTab === 'tiers'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Thành Tích ({tieredAchievements.length})</span>
        </button>

        <button
          onClick={() => setSubTab('actions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            subTab === 'actions'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hành Động Yêu Thương ({loveActions.length})</span>
        </button>

        <button
          onClick={() => setSubTab('custom')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            subTab === 'custom'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Kỷ Niệm Riêng ({customAchievements.length})</span>
        </button>
      </div>

      {/* TAB 1: MULTI-TIER ACHIEVEMENTS (GỘP CỘT MỐC) */}
      {subTab === 'tiers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {tieredAchievements.map((ach) => {
            const currentTierObj = ach.tiers?.find(t => t.level === ach.currentLevel);
            const nextTierObj = ach.tiers?.find(t => t.level === (ach.currentLevel || 0) + 1);
            const isMax = (ach.currentLevel || 0) >= (ach.maxLevel || 1);

            return (
              <div
                key={ach.id}
                onClick={() => setSelectedAchievement(ach)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Header with Icon, Title, and Level Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                      {ach.icon}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-xs font-bold">
                        <span>Lv. {ach.currentLevel} / {ach.maxLevel}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        +{ach.points?.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition">
                    {ach.title}
                  </h3>

                  {/* Current Milestone Title */}
                  <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                    <div className="font-semibold text-slate-700 truncate">
                      {currentTierObj ? `✓ ${currentTierObj.title}` : '🌱 Đang phấn đấu Lv. 1'}
                    </div>
                    {nextTierObj && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Tiếp theo: <span className="text-rose-600 font-medium">{nextTierObj.title}</span> ({nextTierObj.target} {ach.unit})
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-3 mt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>{ach.currentValue} / {ach.targetValue} {ach.unit}</span>
                    <span>{isMax ? '100%' : `${Math.min(100, Math.round(((ach.currentValue || 0) / (ach.targetValue || 1)) * 100))}%`}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{
                        width: `${isMax ? 100 : Math.min(100, Math.round(((ach.currentValue || 0) / (ach.targetValue || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: LOVE ACTIONS (HÀNH ĐỘNG GHI ĐIỂM YÊU THƯƠNG) */}
      {subTab === 'actions' && (
        <div className="space-y-4">
          {/* Quick Action Buttons Grid */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-500" />
                Gợi ý ghi điểm nhanh
              </h3>
              <button
                onClick={() => { setIsCustomAction(true); setShowAddActionModal(true); }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                + Tùy chỉnh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_ACTIONS.slice(0, 6).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActionPresetIdx(idx);
                    setIsCustomAction(false);
                    setShowAddActionModal(true);
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-rose-50/60 border border-slate-200/80 hover:border-rose-300 rounded-xl text-left transition cursor-pointer flex flex-col justify-between gap-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                      +{preset.points} PTS
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 group-hover:text-rose-600 line-clamp-1">
                    {preset.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Love Actions History */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 px-1">
              Lịch sử ghi điểm ({loveActions.length})
            </h3>

            {loveActions.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 text-center space-y-1.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg">
                  💖
                </div>
                <h4 className="text-xs font-bold text-slate-700">Chưa có hành động nào</h4>
                <p className="text-[11px] text-slate-400">
                  Chọn các gợi ý ở trên để ghi nhận và cộng điểm chăm sóc cho nhau
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {loveActions.map((act) => {
                  const isMe = act.performedByUid === userProfile.uid;
                  return (
                    <div
                      key={act.id}
                      className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shrink-0">
                          {act.icon || '💖'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {act.title}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              bởi {act.performedByName || (isMe ? myName : partnerName)}
                            </span>
                          </div>
                          {act.note && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              "{act.note}"
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDateShortVN(act.date)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200/70">
                          +{act.points} PTS
                        </span>
                        <button
                          onClick={() => handleDeleteAction(act.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded transition cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM MILESTONES (KỶ NIỆM RIÊNG) */}
      {subTab === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">
              Kỷ niệm của hai bạn ({customAchievements.length})
            </span>
            <button
              onClick={() => setShowAddCustomModal(true)}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm Kỷ Niệm</span>
            </button>
          </div>

          {customAchievements.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 text-center space-y-2 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg">
                🌟
              </div>
              <h4 className="text-xs font-bold text-slate-700">Chưa có cột mốc riêng nào</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Tạo các mốc kỷ niệm đặc biệt của riêng hai bạn
              </p>
              <button
                onClick={() => setShowAddCustomModal(true)}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                + Tạo Mốc Kỷ Niệm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customAchievements.map((ach) => (
                <div
                  key={ach.id}
                  onClick={() => setSelectedAchievement(ach)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-rose-300 transition shadow-xs cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-xl shrink-0">
                      {ach.icon || '🏆'}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã mở khóa
                      </span>
                      <span className="text-[10px] font-bold text-rose-600">
                        +{ach.points || 100} PTS
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-rose-600 transition">
                      {ach.title}
                    </h4>
                    {ach.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {ach.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{ach.unlockedAt ? formatDateShortVN(ach.unlockedAt) : 'Kỷ niệm'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustom(ach.id);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW MULTI-TIER ACHIEVEMENT DETAILS */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-2xl shrink-0">
                  {selectedAchievement.icon}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-800">{selectedAchievement.title}</h3>
                    {selectedAchievement.currentLevel !== undefined && (
                      <span className="px-2 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                        Lv. {selectedAchievement.currentLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAchievement.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAchievement(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Tiered Milestone List */}
            {selectedAchievement.tiers && selectedAchievement.tiers.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-600 font-bold px-1">
                  <span>Các Cột Mốc Cấp Độ:</span>
                  <span>Hiện tại: {selectedAchievement.currentValue} {selectedAchievement.unit}</span>
                </div>

                <div className="space-y-2">
                  {selectedAchievement.tiers.map((t) => {
                    const isPassed = (selectedAchievement.currentValue || 0) >= t.target;
                    return (
                      <div
                        key={t.level}
                        className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 text-xs ${
                          isPassed
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isPassed ? '✓' : t.level}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{t.title}</span>
                              <span className="text-[10px] text-rose-600 font-bold">+{t.points} PTS</span>
                            </div>
                            {t.rewardText && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Gợi ý thưởng: {t.rewardText}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isPassed ? 'Đã đạt' : `Cần ${t.target} ${selectedAchievement.unit}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Custom Milestone Details */
              <div className="space-y-3 text-xs text-slate-600">
                {selectedAchievement.customImage && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48">
                    <img src={selectedAchievement.customImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Điểm thưởng:</span>
                    <span className="font-bold text-rose-600">+{selectedAchievement.points || 100} PTS</span>
                  </div>
                  {selectedAchievement.unlockedAt && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Ngày hoàn thành:</span>
                      <span className="font-bold text-slate-800">{formatDateVN(selectedAchievement.unlockedAt)}</span>
                    </div>
                  )}
                  {selectedAchievement.rewardText && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Phần thưởng:</span>
                      <span className="font-bold text-slate-800">{selectedAchievement.rewardText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAchievement(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG LOVE ACTION (+ POINTS) */}
      {showAddActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Ghi Điểm Hành Động Yêu Thương</h3>
                  <p className="text-[11px] text-slate-400">Tích lũy điểm chăm sóc và tình cảm mỗi ngày</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddActionModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogAction} className="space-y-3 text-xs">
              {/* Who performed the action */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ai là người đã thực hiện? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionPerformer('me')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition ${
                      actionPerformer === 'me'
                        ? 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <img src={myAvatar} alt="" className="w-5 h-5 rounded-full border" />
                    <span>{myName} (Tôi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionPerformer('partner')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition ${
                      actionPerformer === 'partner'
                        ? 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <img src={partnerAvatar} alt="" className="w-5 h-5 rounded-full border" />
                    <span>{partnerName}</span>
                  </button>
                </div>
              </div>

              {/* Preset selection or custom action */}
              {!isCustomAction ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chọn hành động mẫu
                  </label>
                  <select
                    value={actionPresetIdx}
                    onChange={(e) => setActionPresetIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  >
                    {PRESET_ACTIONS.map((p, idx) => (
                      <option key={idx} value={idx}>
                        {p.icon} {p.title} (+{p.points} PTS)
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setIsCustomAction(true)}
                      className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      + Hoặc tự nhập hành động khác
                    </button>
                  </div>
                </div>
              ) : (
                /* Custom Action Input */
                <div className="space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên hành động / Việc tốt
                    </label>
                    <input
                      type="text"
                      required
                      value={actionTitle}
                      onChange={(e) => setActionTitle(e.target.value)}
                      placeholder="Ví dụ: Nấu chè cho người ấy, Sửa quạt..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Điểm thưởng (PTS)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        value={actionPoints}
                        onChange={(e) => setActionPoints(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Biểu tượng
                      </label>
                      <input
                        type="text"
                        value={actionIcon}
                        onChange={(e) => setActionIcon(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-center text-base"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Note / Sweet words */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lời nhắn / Cảm xúc (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Ví dụ: Nấu canh chua rất ngon, cảm ơn em iu..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày thực hiện
                </label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddActionModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {submittingAction ? 'Đang lưu...' : '+ Cộng Điểm Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD CUSTOM MILESTONE */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Thêm Kỷ Niệm / Cột Mốc Riêng</h3>
                  <p className="text-[11px] text-slate-400">Ghi dấu mốc kỷ niệm đặc biệt của riêng hai bạn</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên cột mốc / Kỷ niệm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ví dụ: Lần đầu đi Đà Lạt, Nuôi chung 1 bé mèo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biểu tượng</label>
                  <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setCustomIcon(emoji)}
                        className={`text-sm p-1 rounded-lg shrink-0 ${
                          customIcon === emoji ? 'bg-rose-100 ring-1 ring-rose-400' : 'hover:bg-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Điểm thưởng (PTS)</label>
                  <input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Chi tiết kỷ niệm đáng nhớ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày đạt mốc</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ảnh kỷ niệm (Tùy chọn)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {submittingCustom ? 'Đang lưu...' : '+ Thêm Mốc Kỷ Niệm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LOVE CERTIFICATE */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center text-2xl border border-rose-100">
                {coupleLevel.badge}
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Chứng Nhận Tình Yêu Đôi Lứa
              </h3>
              <p className="text-xs text-slate-400">
                Vinh danh chặng đường hạnh phúc của hai bạn
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Cặp đôi:</span>
                <span className="font-bold text-slate-800">{myName} & {partnerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Hành trình:</span>
                <span className="font-bold text-rose-600">{daysInLove} ngày gắn kết</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Tổng điểm tích lũy:</span>
                <span className="font-bold text-rose-600">{totalLovePoints.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Danh hiệu hiện tại:</span>
                <span className="font-bold text-slate-800">Cấp {coupleLevel.level} • {coupleLevel.title} {coupleLevel.badge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Hành động yêu thương:</span>
                <span className="font-bold text-slate-800">{loveActions.length} lần ghi nhận</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleCopyCertificate}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Award className="w-3.5 h-3.5 text-rose-500" />}
                <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép tóm tắt'}</span>
              </button>

              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

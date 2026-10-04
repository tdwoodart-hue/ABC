import React, { useEffect, useMemo, useState } from 'react';
import {
  UserProfile,
  CoupleData,
  JournalEntry,
  FinanceTransaction,
  SavingsGoal,
  WakeUpLog,
  FundConfig,
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
  updateDoc,
} from '../lib/firebase';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PiggyBank,
  Calendar,
  Target,
  Receipt,
  X,
  Users,
  Scale,
  Edit3,
  ShoppingBag,
  Sparkles,
  Gift,
  Plane,
  Coffee,
  Heart,
  Smartphone,
  Home,
  CheckCircle2,
  LockKeyhole,
  ArrowUpDown,
  ListFilter,
  CircleDollarSign,
  ChevronRight,
  BadgeDollarSign,
  Clock3,
  Trophy,
} from 'lucide-react';
import { EditTransactionModal } from './EditTransactionModal';
import { WakeUpChallengeCard } from './WakeUpChallengeCard';
import { FundQRCodeCard } from './FundQRCodeCard';

interface FinanceTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals: JournalEntry[];
}

type FinanceView = 'overview' | 'ideas' | 'goals' | 'history';

type PurchaseCategory =
  | 'couple'
  | 'gift'
  | 'tech'
  | 'date'
  | 'travel'
  | 'home'
  | 'custom';

interface PurchaseSuggestion {
  id: string;
  title: string;
  estimatedPrice: number;
  category: PurchaseCategory;
  emoji?: string;
  source: 'default' | 'wishlist';
  addedByUid?: string;
  addedByName?: string;
  createdAt?: string;
}

const FINANCE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống' },
  { id: 'dating', name: 'Hẹn hò' },
  { id: 'shopping', name: 'Mua sắm' },
  { id: 'travel', name: 'Du lịch' },
  { id: 'bills', name: 'Hóa đơn / Tiện ích' },
  { id: 'health', name: 'Sức khỏe & Làm đẹp' },
  { id: 'entertainment', name: 'Giải trí' },
  { id: 'transport', name: 'Di chuyển / Xăng xe' },
  { id: 'gift', name: 'Quà tặng' },
  { id: 'fund', name: 'Đóng quỹ chung' },
  { id: 'wakeup', name: 'Phạt dậy muộn (5.000đ)' },
  { id: 'other', name: 'Khác' },
];

const DEFAULT_PURCHASE_SUGGESTIONS: PurchaseSuggestion[] = [
  { id: 'default_01', title: 'In một bộ ảnh kỷ niệm', estimatedPrice: 30000, category: 'couple', emoji: '📸', source: 'default' },
  { id: 'default_02', title: 'Móc khóa đôi', estimatedPrice: 60000, category: 'couple', emoji: '🔑', source: 'default' },
  { id: 'default_03', title: 'Một buổi cafe cùng nhau', estimatedPrice: 100000, category: 'date', emoji: '☕', source: 'default' },
  { id: 'default_04', title: 'Cốc đôi', estimatedPrice: 150000, category: 'couple', emoji: '🥤', source: 'default' },
  { id: 'default_05', title: 'Vòng tay đôi', estimatedPrice: 250000, category: 'gift', emoji: '🧿', source: 'default' },
  { id: 'default_06', title: 'Khung ảnh kỷ niệm', estimatedPrice: 350000, category: 'gift', emoji: '🖼️', source: 'default' },
  { id: 'default_07', title: 'Áo đôi basic', estimatedPrice: 500000, category: 'couple', emoji: '👕', source: 'default' },
  { id: 'default_08', title: 'Một buổi date ăn uống', estimatedPrice: 700000, category: 'date', emoji: '🍽️', source: 'default' },
  { id: 'default_09', title: 'Tai nghe / phụ kiện công nghệ nhỏ', estimatedPrice: 1000000, category: 'tech', emoji: '🎧', source: 'default' },
  { id: 'default_10', title: 'Staycation 1 đêm', estimatedPrice: 1500000, category: 'travel', emoji: '🏨', source: 'default' },
  { id: 'default_11', title: 'Máy ảnh Instax', estimatedPrice: 2800000, category: 'tech', emoji: '📷', source: 'default' },
  { id: 'default_12', title: 'Chuyến đi 2N1Đ', estimatedPrice: 3000000, category: 'travel', emoji: '🧳', source: 'default' },
  { id: 'default_13', title: 'AirPods / tai nghe cao cấp', estimatedPrice: 3500000, category: 'tech', emoji: '🎵', source: 'default' },
  { id: 'default_14', title: 'Chuyến đi Đà Lạt 3N2Đ', estimatedPrice: 5000000, category: 'travel', emoji: '🌲', source: 'default' },
  { id: 'default_15', title: 'Một món đồ gia dụng lớn', estimatedPrice: 8000000, category: 'home', emoji: '🏠', source: 'default' },
];

const PURCHASE_CATEGORY_LABEL: Record<PurchaseCategory, string> = {
  couple: 'Đồ đôi',
  gift: 'Quà tặng',
  tech: 'Công nghệ',
  date: 'Hẹn hò',
  travel: 'Du lịch',
  home: 'Gia dụng',
  custom: 'Wishlist',
};

const categoryIcon = (category: PurchaseCategory) => {
  if (category === 'couple') return Heart;
  if (category === 'gift') return Gift;
  if (category === 'tech') return Smartphone;
  if (category === 'date') return Coffee;
  if (category === 'travel') return Plane;
  if (category === 'home') return Home;
  return ShoppingBag;
};

const getLocalDateKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const FinanceTab: React.FC<FinanceTabProps> = ({
  userProfile,
  coupleData,
  journals,
}) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [wakeUpLogs, setWakeUpLogs] = useState<WakeUpLog[]>([]);
  const [fundConfig, setFundConfig] = useState<FundConfig | null>(null);
  const [wishlistItems, setWishlistItems] = useState<PurchaseSuggestion[]>([]);

  const [activeView, setActiveView] = useState<FinanceView>('overview');

  // Form states - Add Transaction
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState(FINANCE_CATEGORIES[0].name);
  const [txDate, setTxDate] = useState(getLocalDateKey());
  const [txPayerUid, setTxPayerUid] = useState<string>(userProfile.uid);
  const [submittingTx, setSubmittingTx] = useState(false);

  // Form states - Add Savings Goal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Modal - Deposit to Goal
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPayerUid, setDepositPayerUid] = useState<string>(userProfile.uid);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Filters
  const [selectedPayer, setSelectedPayer] = useState<'all' | 'me' | 'partner'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);

  // Purchase ideas
  const [ideaCategory, setIdeaCategory] = useState<'all' | PurchaseCategory>('all');
  const [ideaSort, setIdeaSort] = useState<'asc' | 'desc'>('asc');
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistPrice, setWishlistPrice] = useState('');
  const [wishlistCategory, setWishlistCategory] = useState<PurchaseCategory>('custom');
  const [savingWishlist, setSavingWishlist] = useState(false);

  // Identify Couple Partners
  const currentUserIsUser1 =
    coupleData?.user1Uid === userProfile.uid ||
    coupleData?.user1Id === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const myUid = userProfile.uid;
  const myName =
    userProfile.displayName || (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');
  const myGender =
    userProfile.gender ||
    (currentUserIsUser1
      ? coupleData?.user1Gender || 'male'
      : coupleData?.user2Gender || 'female');

  const myAvatar =
    userProfile.avatarUrl ||
    (myGender === 'female'
      ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female'
      : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male');

  const partnerUid = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Uid || coupleData.user2Id
      : coupleData.user1Uid || coupleData.user1Id
    : null;

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

  const partnerAvatar = coupleData
    ? currentUserIsUser1
      ? coupleData.user2Avatar ||
        'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female'
      : coupleData.user1Avatar ||
        'https://api.dicebear.com/7.x/micah/svg?seed=duong_male'
    : currentUserIsUser1
      ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female'
      : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male';

  // Real-time Firestore sync
  useEffect(() => {
    if (!userProfile.coupleId) return;

    const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
    const txQuery = query(txRef, orderBy('createdAt', 'desc'));
    const unsubscribeTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const txs: FinanceTransaction[] = [];
        snapshot.forEach((snapshotDoc) => {
          txs.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as FinanceTransaction);
        });
        setTransactions(txs);
      },
      (err) => console.error('Lỗi tải giao dịch tài chính:', err)
    );

    const goalsRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'savingsGoals'
    );
    const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
    const unsubscribeGoals = onSnapshot(
      goalsQuery,
      (snapshot) => {
        const goals: SavingsGoal[] = [];
        snapshot.forEach((snapshotDoc) => {
          goals.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as SavingsGoal);
        });
        setSavingsGoals(goals);
      },
      (err) => console.error('Lỗi tải mục tiêu tiết kiệm:', err)
    );

    const wakeUpRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'wakeUpLogs'
    );
    const wakeUpQuery = query(wakeUpRef, orderBy('createdAt', 'desc'));
    const unsubscribeWakeUp = onSnapshot(
      wakeUpQuery,
      (snapshot) => {
        const logs: WakeUpLog[] = [];
        snapshot.forEach((snapshotDoc) => {
          logs.push({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as WakeUpLog);
        });
        setWakeUpLogs(logs);
      },
      (err) => console.error('Lỗi tải nhật ký dậy sớm:', err)
    );

    const fundConfigRef = doc(
      db,
      'couples',
      userProfile.coupleId,
      'settings',
      'fundConfig'
    );
    const unsubscribeFundConfig = onSnapshot(
      fundConfigRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setFundConfig(docSnap.data() as FundConfig);
        } else {
          setFundConfig({
            fundPurpose:
              'Tiền quỹ được sử dụng cho mục đích chung của hai đứa: Mua áo đôi, hẹn hò cuối tuần, du lịch, quà kỷ niệm, đồ đôi & sinh hoạt chung...',
          });
        }
      },
      (err) => console.error('Lỗi tải cấu hình quỹ:', err)
    );

    const wishlistRef = collection(
      db,
      'couples',
      userProfile.coupleId,
      'purchaseSuggestions'
    );
    const wishlistQuery = query(wishlistRef, orderBy('createdAt', 'desc'));
    const unsubscribeWishlist = onSnapshot(
      wishlistQuery,
      (snapshot) => {
        const items: PurchaseSuggestion[] = [];
        snapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          items.push({
            id: snapshotDoc.id,
            title: data.title || 'Wishlist',
            estimatedPrice: Number(data.estimatedPrice || 0),
            category: (data.category || 'custom') as PurchaseCategory,
            emoji: data.emoji || '✨',
            source: 'wishlist',
            addedByUid: data.addedByUid,
            addedByName: data.addedByName,
            createdAt: data.createdAt,
          });
        });
        setWishlistItems(items);
      },
      (err) => console.error('Lỗi tải wishlist tài chính:', err)
    );

    return () => {
      unsubscribeTx();
      unsubscribeGoals();
      unsubscribeWakeUp();
      unsubscribeFundConfig();
      unsubscribeWishlist();
    };
  }, [userProfile.coupleId, coupleData]);

  const handleQuickAddFundContribution = () => {
    setTxPayerUid(myUid);
    setTxType('income');
    setTxCategory('Đóng quỹ chung');
    setTxTitle('Đóng quỹ tình yêu');
    setTxAmount('');
    setShowAddTransaction(true);
  };

  const openExpenseFromSuggestion = (item: PurchaseSuggestion) => {
    setTxPayerUid(myUid);
    setTxType('expense');
    setTxCategory(
      item.category === 'travel'
        ? 'Du lịch'
        : item.category === 'date'
          ? 'Hẹn hò'
          : item.category === 'gift'
            ? 'Quà tặng'
            : 'Mua sắm'
    );
    setTxTitle(item.title);
    setTxAmount(String(item.estimatedPrice));
    setTxDate(getLocalDateKey());
    setShowAddTransaction(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !txTitle.trim() || !txAmount) return;

    const parsedAmount = parseFloat(txAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const isMe = txPayerUid === myUid;
    const payerName = isMe ? myName : partnerName;

    setSubmittingTx(true);
    try {
      const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
      await addDoc(txRef, {
        title: txTitle.trim(),
        amount: parsedAmount,
        type: txType,
        category: txType === 'income' ? 'Đóng quỹ chung' : txCategory,
        paidByUid: txPayerUid,
        paidByName: payerName,
        date: txDate,
        createdAt: new Date().toISOString(),
      });

      setTxTitle('');
      setTxAmount('');
      setShowAddTransaction(false);
    } catch (err) {
      console.error('Lỗi thêm giao dịch:', err);
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!userProfile.coupleId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;

    try {
      await deleteDoc(
        doc(db, 'couples', userProfile.coupleId, 'finances', id)
      );
    } catch (err) {
      console.error('Lỗi xóa giao dịch:', err);
    }
  };

  const handleAddSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !goalTitle.trim() || !goalTargetAmount) return;

    const parsedTarget = parseFloat(goalTargetAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedTarget) || parsedTarget <= 0) return;

    setSubmittingGoal(true);
    try {
      const goalsRef = collection(
        db,
        'couples',
        userProfile.coupleId,
        'savingsGoals'
      );
      await addDoc(goalsRef, {
        title: goalTitle.trim(),
        targetAmount: parsedTarget,
        currentAmount: 0,
        targetDate: goalTargetDate || null,
        createdAt: new Date().toISOString(),
      });

      setGoalTitle('');
      setGoalTargetAmount('');
      setGoalTargetDate('');
      setShowAddGoal(false);
      setActiveView('goals');
    } catch (err) {
      console.error('Lỗi thêm hũ tiết kiệm:', err);
    } finally {
      setSubmittingGoal(false);
    }
  };

  const createGoalFromSuggestion = (item: PurchaseSuggestion) => {
    setGoalTitle(item.title);
    setGoalTargetAmount(String(item.estimatedPrice));
    setGoalTargetDate('');
    setShowAddGoal(true);
  };

  const handleDepositToGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !depositGoalId || !depositAmount) return;

    const parsedDeposit = parseFloat(depositAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedDeposit) || parsedDeposit <= 0) return;

    const targetGoal = savingsGoals.find((g) => g.id === depositGoalId);
    if (!targetGoal) return;

    const isMe = depositPayerUid === myUid;
    const payerName = isMe ? myName : partnerName;

    setSubmittingDeposit(true);
    try {
      const goalRef = doc(
        db,
        'couples',
        userProfile.coupleId,
        'savingsGoals',
        depositGoalId
      );
      await updateDoc(goalRef, {
        currentAmount: targetGoal.currentAmount + parsedDeposit,
      });

      const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
      await addDoc(txRef, {
        title: `Đóng góp: ${targetGoal.title}`,
        amount: parsedDeposit,
        type: 'income',
        category: 'Đóng quỹ chung',
        paidByUid: depositPayerUid,
        paidByName: payerName,
        date: getLocalDateKey(),
        createdAt: new Date().toISOString(),
      });

      setDepositGoalId(null);
      setDepositAmount('');
    } catch (err) {
      console.error('Lỗi đóng góp hũ tiết kiệm:', err);
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleDeleteSavingsGoal = async (id: string) => {
    if (!userProfile.coupleId) return;
    if (!window.confirm('Bạn có chắc muốn xóa hũ tiết kiệm này?')) return;

    try {
      await deleteDoc(
        doc(db, 'couples', userProfile.coupleId, 'savingsGoals', id)
      );
    } catch (err) {
      console.error('Lỗi xóa hũ tiết kiệm:', err);
    }
  };

  const handleAddWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !wishlistTitle.trim() || !wishlistPrice) return;

    const parsed = parseFloat(wishlistPrice.replace(/[^0-9]/g, ''));
    if (isNaN(parsed) || parsed <= 0) return;

    setSavingWishlist(true);
    try {
      const ref = collection(
        db,
        'couples',
        userProfile.coupleId,
        'purchaseSuggestions'
      );
      await addDoc(ref, {
        title: wishlistTitle.trim(),
        estimatedPrice: parsed,
        category: wishlistCategory,
        emoji: '✨',
        addedByUid: myUid,
        addedByName: myName,
        createdAt: new Date().toISOString(),
      });

      setWishlistTitle('');
      setWishlistPrice('');
      setWishlistCategory('custom');
      setShowAddWishlist(false);
    } catch (err) {
      console.error('Lỗi thêm wishlist:', err);
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleDeleteWishlist = async (id: string) => {
    if (!userProfile.coupleId) return;

    try {
      await deleteDoc(
        doc(
          db,
          'couples',
          userProfile.coupleId,
          'purchaseSuggestions',
          id
        )
      );
    } catch (err) {
      console.error('Lỗi xóa wishlist:', err);
    }
  };

  // --- STATS ---
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const myIncome = transactions
    .filter((t) => t.type === 'income' && t.paidByUid === myUid)
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerIncome = transactions
    .filter(
      (t) =>
        t.type === 'income' &&
        (partnerUid ? t.paidByUid === partnerUid : t.paidByUid !== myUid)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDirectExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const myDirectExpense = transactions
    .filter((t) => t.type === 'expense' && t.paidByUid === myUid)
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerDirectExpense = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        (partnerUid ? t.paidByUid === partnerUid : t.paidByUid !== myUid)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const journalExpensesList = journals.flatMap((j) =>
    (j.expenses || []).map((e) => ({
      ...e,
      journalTitle: j.title,
      journalDate: j.date,
      authorUid: j.authorUid,
      authorName: j.authorName,
    }))
  );

  const myJournalExpense = journalExpensesList
    .filter((e) => e.authorUid === myUid)
    .reduce((sum, e) => sum + e.amount, 0);

  const partnerJournalExpense = journalExpensesList
    .filter((e) =>
      partnerUid ? e.authorUid === partnerUid : e.authorUid !== myUid
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const myGrandTotalPaid = myDirectExpense + myJournalExpense;
  const partnerGrandTotalPaid = partnerDirectExpense + partnerJournalExpense;
  const grandTotalExpense =
    totalDirectExpense + myJournalExpense + partnerJournalExpense;

  const expenseDiff = myGrandTotalPaid - partnerGrandTotalPaid;
  const netBalance = Math.max(0, totalIncome - grandTotalExpense);

  const filteredTransactions = transactions.filter((t) => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedPayer === 'me' && t.paidByUid !== myUid) return false;
    if (
      selectedPayer === 'partner' &&
      (partnerUid ? t.paidByUid !== partnerUid : t.paidByUid === myUid)
    ) {
      return false;
    }
    return true;
  });

  const todayWakeUpLog =
    wakeUpLogs.find((l) => l.date === getLocalDateKey()) || null;

  const reservedInGoals = savingsGoals.reduce(
    (sum, goal) => sum + Math.max(0, goal.currentAmount || 0),
    0
  );

  // Keep compatibility with current data model:
  // goals are tracked separately, therefore this value is informational.
  const availableAfterGoals = Math.max(0, netBalance - reservedInGoals);

  const recent30DaysIncome = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    return transactions
      .filter((t) => {
        if (t.type !== 'income') return false;
        const date = new Date(`${t.date}T12:00:00`);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const weeklySavingPace = recent30DaysIncome > 0
    ? Math.round(recent30DaysIncome / 30 * 7)
    : 0;

  const purchaseIdeas = useMemo(() => {
    const merged = [...DEFAULT_PURCHASE_SUGGESTIONS, ...wishlistItems];

    return merged
      .filter((item) => ideaCategory === 'all' || item.category === ideaCategory)
      .sort((a, b) =>
        ideaSort === 'asc'
          ? a.estimatedPrice - b.estimatedPrice
          : b.estimatedPrice - a.estimatedPrice
      );
  }, [wishlistItems, ideaCategory, ideaSort]);

  const affordableCount = purchaseIdeas.filter(
    (item) => item.estimatedPrice <= netBalance
  ).length;

  const getSuggestionStatus = (price: number) => {
    if (netBalance >= price) {
      return {
        key: 'ready' as const,
        label: 'Mua được ngay',
        amount: 0,
      };
    }

    const missing = Math.max(0, price - netBalance);
    if (netBalance > 0 && missing <= Math.max(netBalance * 0.75, 500000)) {
      return {
        key: 'near' as const,
        label: `Thiếu ${missing.toLocaleString('vi-VN')}đ`,
        amount: missing,
      };
    }

    return {
      key: 'goal' as const,
      label: `Cần thêm ${missing.toLocaleString('vi-VN')}đ`,
      amount: missing,
    };
  };

  const estimateWeeks = (missing: number) => {
    if (missing <= 0 || weeklySavingPace <= 0) return null;
    return Math.max(1, Math.ceil(missing / weeklySavingPace));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="app-page-title">Tài chính</h1>

        <button
          type="button"
          onClick={() => {
            setTxPayerUid(myUid);
            setTxTitle('');
            setTxAmount('');
            setTxType('expense');
            setShowAddTransaction(true);
          }}
          className="app-button app-button-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Ghi
        </button>
      </div>

      <section className="app-card p-5">
        <p className="app-caption">Số dư quỹ</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {netBalance.toLocaleString('vi-VN')}
          <span className="ml-1 text-sm font-semibold text-slate-400">đ</span>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleQuickAddFundContribution}
            className="app-button app-button-primary inline-flex items-center justify-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Nạp
          </button>
          <button
            type="button"
            onClick={() => setActiveView('goals')}
            className="app-button app-button-secondary inline-flex items-center justify-center gap-1"
          >
            <Target className="h-3.5 w-3.5" />
            Hũ
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className="app-button app-button-secondary inline-flex items-center justify-center gap-1"
          >
            <Receipt className="h-3.5 w-3.5" />
            Lịch sử
          </button>
        </div>
      </section>

      <div className="app-subtabs">
        {[
          { id: 'overview' as FinanceView, label: 'Tổng quan' },
          { id: 'ideas' as FinanceView, label: 'Mua gì?' },
          { id: 'goals' as FinanceView, label: 'Hũ' },
          { id: 'history' as FinanceView, label: 'Lịch sử' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`app-subtab flex-1 min-w-0 truncate ${
              activeView === tab.id ? 'app-subtab-active' : ''
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'overview' && (
        <div className="space-y-3">
          <section className="app-card grid grid-cols-3 divide-x divide-slate-100 p-3">
            {[
              ['Đã nạp', totalIncome, 'text-emerald-600'],
              ['Đã chi', grandTotalExpense, 'text-rose-600'],
              ['Trong hũ', reservedInGoals, 'text-amber-600'],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="min-w-0 px-2 text-center">
                <p className="text-[10px] font-semibold text-slate-400">
                  {label as string}
                </p>
                <p className={`mt-1 truncate text-sm font-bold tabular-nums ${tone as string}`}>
                  {(value as number).toLocaleString('vi-VN')}đ
                </p>
              </div>
            ))}
          </section>

          <section className="app-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="app-section-title">Hai đứa</h2>
              <span className="app-caption">
                {weeklySavingPace.toLocaleString('vi-VN')}đ/tuần
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 divide-x divide-slate-100">
              {[
                {
                  name: myName,
                  avatar: myAvatar,
                  income: myIncome,
                  spent: myGrandTotalPaid,
                },
                {
                  name: partnerName,
                  avatar: partnerAvatar,
                  income: partnerIncome,
                  spent: partnerGrandTotalPaid,
                },
              ].map((person, index) => (
                <div
                  key={person.name}
                  className={`min-w-0 ${index === 0 ? 'pr-3' : 'pl-3'}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={person.avatar}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full bg-slate-100 object-cover"
                    />
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {person.name}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-slate-400">Nạp</span>
                    <span className="font-semibold text-emerald-600">
                      +{person.income.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-slate-400">Chi</span>
                    <span className="font-semibold text-rose-600">
                      -{person.spent.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
              <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {expenseDiff === 0
                  ? 'Chi tiêu đang cân bằng.'
                  : expenseDiff > 0
                    ? `${myName} chi nhiều hơn ${partnerName} ${Math.abs(expenseDiff).toLocaleString('vi-VN')}đ.`
                    : `${partnerName} chi nhiều hơn ${myName} ${Math.abs(expenseDiff).toLocaleString('vi-VN')}đ.`}
              </span>
            </div>
          </section>

          <WakeUpChallengeCard
            userProfile={userProfile}
            coupleData={coupleData}
            todayLog={todayWakeUpLog}
            allLogs={wakeUpLogs}
            compact
          />

          <FundQRCodeCard
            userProfile={userProfile}
            coupleData={coupleData}
            fundConfig={fundConfig}
            onOpenAddIncome={handleQuickAddFundContribution}
          />
        </div>
      )}

      {activeView === 'ideas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="app-section-title">Mua gì?</h2>
            <button
              type="button"
              onClick={() => setShowAddWishlist(true)}
              className="app-icon-button app-icon-button-brand h-9 w-9 border border-rose-100 bg-rose-50"
              aria-label="Thêm wishlist"
              title="Thêm"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setIdeaCategory('all')}
              className={`app-chip shrink-0 ${ideaCategory === 'all' ? 'app-chip-active' : ''}`}
            >
              Tất cả
            </button>

            {(Object.keys(PURCHASE_CATEGORY_LABEL) as PurchaseCategory[]).map(
              (category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setIdeaCategory(category)}
                  className={`app-chip shrink-0 ${
                    ideaCategory === category ? 'app-chip-active' : ''
                  }`}
                >
                  {PURCHASE_CATEGORY_LABEL[category]}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setIdeaSort((value) => (value === 'asc' ? 'desc' : 'asc'))}
              className="app-chip ml-auto shrink-0"
            >
              <ArrowUpDown className="h-3 w-3" />
              {ideaSort === 'asc' ? 'Rẻ trước' : 'Đắt trước'}
            </button>
          </div>

          <div className="space-y-2">
            {purchaseIdeas.map((item) => {
              const status = getSuggestionStatus(item.estimatedPrice);
              const weeks = estimateWeeks(status.amount);
              const Icon = categoryIcon(item.category);
              const progress =
                item.estimatedPrice > 0
                  ? Math.min(100, Math.round((netBalance / item.estimatedPrice) * 100))
                  : 0;

              return (
                <article key={item.id} className="app-card p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg">
                      {item.emoji || <Icon className="h-4 w-4 text-slate-500" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            {PURCHASE_CATEGORY_LABEL[item.category]}
                            {item.source === 'wishlist'
                              ? ` · ${item.addedByName || 'Wishlist'}`
                              : ''}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums text-slate-900">
                            {item.estimatedPrice.toLocaleString('vi-VN')}đ
                          </p>
                          <p
                            className={`mt-0.5 text-[10px] font-semibold ${
                              status.key === 'ready'
                                ? 'text-emerald-600'
                                : status.key === 'near'
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                            }`}
                          >
                            {status.label}
                          </p>
                        </div>
                      </div>

                      {status.key !== 'ready' && (
                        <div className="mt-2.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-amber-400"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {weeks && (
                            <p className="mt-1 text-[10px] text-slate-400">
                              ~{weeks} tuần
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-1.5">
                        {status.key === 'ready' ? (
                          <button
                            type="button"
                            onClick={() => openExpenseFromSuggestion(item)}
                            className="app-button min-h-9 border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700"
                          >
                            Mua
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => createGoalFromSuggestion(item)}
                            className="app-button min-h-9 border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700"
                          >
                            Tạo hũ
                          </button>
                        )}

                        {item.source === 'wishlist' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWishlist(item.id)}
                            className="app-icon-button h-9 w-9 hover:bg-rose-50 hover:text-rose-500"
                            aria-label="Xóa wishlist"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeView === 'goals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="app-section-title">Hũ tiết kiệm</h2>
              <p className="app-caption mt-0.5">
                {savingsGoals.length} hũ · {reservedInGoals.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGoal(true)}
              className="app-icon-button h-9 w-9 border border-amber-200 bg-amber-50 text-amber-700"
              aria-label="Tạo hũ"
              title="Tạo hũ"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="app-card px-5 py-9 text-center">
              <PiggyBank className="mx-auto h-5 w-5 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Chưa có hũ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {savingsGoals.map((goal) => {
                const percent = Math.min(
                  100,
                  Math.round((goal.currentAmount / goal.targetAmount) * 100)
                );
                const missing = Math.max(0, goal.targetAmount - goal.currentAmount);
                const weeks = estimateWeeks(missing);

                return (
                  <article key={goal.id} className="app-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {goal.title}
                        </h3>
                        {goal.targetDate && (
                          <p className="app-caption mt-1">
                            {formatDateVN(goal.targetDate)}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavingsGoal(goal.id)}
                        className="app-icon-button h-8 w-8 hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Xóa hũ"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <span className="text-base font-bold tabular-nums text-amber-700">
                        {goal.currentAmount.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-[10px] text-slate-400">
                        / {goal.targetAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-amber-700">{percent}%</span>
                      {weeks && missing > 0 && (
                        <span className="text-slate-400">~{weeks} tuần</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDepositPayerUid(myUid);
                        setDepositGoalId(goal.id);
                      }}
                      className="app-button app-button-secondary mt-3 w-full min-h-9 py-1.5"
                    >
                      Nạp thêm
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'history' && (
        <div className="space-y-3">
          <section className="app-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="app-section-title">Giao dịch</h2>
                <p className="app-caption mt-0.5">
                  {filteredTransactions.length} giao dịch
                </p>
              </div>

              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="app-control h-9 max-w-[150px] px-2 text-[11px]"
              >
                <option value="all">Tất cả</option>
                {FINANCE_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-4 pt-3">
              <div className="app-subtabs">
                {[
                  { id: 'all' as const, label: 'Tất cả' },
                  { id: 'me' as const, label: myName },
                  { id: 'partner' as const, label: partnerName },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPayer(item.id)}
                    className={`app-subtab flex-1 min-w-0 truncate ${
                      selectedPayer === item.id ? 'app-subtab-active' : ''
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                Chưa có giao dịch
              </p>
            ) : (
              <div className="divide-y divide-slate-100 px-4 py-2">
                {filteredTransactions.map((tx) => {
                  const isPayerMe = tx.paidByUid === myUid;
                  const payerDisplayName = isPayerMe
                    ? myName
                    : tx.paidByName || partnerName;

                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          tx.type === 'income'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <Receipt className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {tx.title}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                          {payerDisplayName} · {formatDateShortVN(tx.date)} · {tx.category}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-xs font-bold tabular-nums ${
                            tx.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')}đ
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingTx(tx)}
                          className="mt-1 text-[10px] font-semibold text-slate-400 hover:text-rose-600"
                        >
                          Sửa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {journalExpensesList.length > 0 && (
            <section className="app-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="app-section-title">Từ Nhật ký</h2>
                <span className="text-xs font-semibold text-rose-600">
                  {journalExpensesList
                    .reduce((sum, expense) => sum + expense.amount, 0)
                    .toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="mt-2 divide-y divide-slate-100">
                {journalExpensesList.map((expense, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 py-2 text-[11px]"
                  >
                    <span className="min-w-0 truncate text-slate-600">
                      {expense.title} · {expense.authorName || partnerName}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-700">
                      {expense.amount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showAddTransaction && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="app-modal-backdrop"
            onClick={() => setShowAddTransaction(false)}
            aria-label="Đóng"
          />

          <form
            onSubmit={handleAddTransaction}
            className="app-sheet relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px]"
          >
            <div className="app-sheet-header">
              <h3 className="app-section-title">Thu / chi</h3>
              <button
                type="button"
                onClick={() => setShowAddTransaction(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <div className="app-subtabs">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`app-subtab flex-1 ${
                    txType === 'expense' ? 'app-subtab-active' : ''
                  }`}
                >
                  Chi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('income');
                    setTxCategory('Đóng quỹ chung');
                  }}
                  className={`app-subtab flex-1 ${
                    txType === 'income' ? 'app-subtab-active' : ''
                  }`}
                >
                  Nạp quỹ
                </button>
              </div>

              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                value={
                  txAmount
                    ? Number(txAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN')
                    : ''
                }
                onChange={(event) =>
                  setTxAmount(event.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Số tiền"
                className="app-control h-12 w-full px-3 text-lg font-bold tabular-nums"
              />

              <input
                type="text"
                required
                value={txTitle}
                onChange={(event) => setTxTitle(event.target.value)}
                placeholder={txType === 'income' ? 'Nội dung nạp quỹ' : 'Ăn tối, xem phim...'}
                className="app-control h-11 w-full px-3 text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                {[
                  { uid: myUid, name: myName, avatar: myAvatar },
                  {
                    uid: partnerUid || 'partner',
                    name: partnerName,
                    avatar: partnerAvatar,
                  },
                ].map((person) => {
                  const active = txPayerUid === person.uid;
                  return (
                    <button
                      key={person.uid}
                      type="button"
                      onClick={() => setTxPayerUid(person.uid)}
                      className={`app-button flex min-w-0 items-center justify-center gap-2 border px-2 ${
                        active
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-[var(--app-border)] bg-white text-slate-600'
                      }`}
                    >
                      <img
                        src={person.avatar}
                        alt=""
                        className="h-5 w-5 shrink-0 rounded-full object-cover"
                      />
                      <span className="truncate">{person.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {txType === 'expense' && (
                  <select
                    value={txCategory}
                    onChange={(event) => setTxCategory(event.target.value)}
                    className="app-control h-11 min-w-0 px-3 text-xs"
                    aria-label="Danh mục"
                  >
                    {FINANCE_CATEGORIES.filter((category) => category.id !== 'fund').map(
                      (category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                )}

                <input
                  type="date"
                  value={txDate}
                  onChange={(event) => setTxDate(event.target.value)}
                  className={`app-control h-11 min-w-0 px-3 text-xs ${
                    txType === 'income' ? 'col-span-2' : ''
                  }`}
                  aria-label="Ngày"
                />
              </div>
            </div>

            <div
              className="app-sheet-footer"
              style={{
                paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddTransaction(false)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingTx || !txTitle.trim() || !txAmount}
                className="app-button app-button-primary flex-[1.2] disabled:opacity-40"
              >
                {submittingTx ? 'Đang lưu' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddGoal && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="app-modal-backdrop"
            onClick={() => setShowAddGoal(false)}
            aria-label="Đóng"
          />

          <form
            onSubmit={handleAddSavingsGoal}
            className="app-sheet relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px]"
          >
            <div className="app-sheet-header">
              <h3 className="app-section-title">Tạo hũ</h3>
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                placeholder="Mục tiêu"
                className="app-control h-11 w-full px-3 text-sm"
              />

              <input
                type="text"
                inputMode="numeric"
                required
                value={
                  goalTargetAmount
                    ? Number(goalTargetAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN')
                    : ''
                }
                onChange={(event) =>
                  setGoalTargetAmount(event.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Số tiền"
                className="app-control h-12 w-full px-3 text-lg font-bold tabular-nums"
              />

              <input
                type="date"
                value={goalTargetDate}
                onChange={(event) => setGoalTargetDate(event.target.value)}
                className="app-control h-11 w-full px-3 text-sm"
                aria-label="Hạn hoàn thành"
              />
            </div>

            <div className="app-sheet-footer">
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingGoal || !goalTitle.trim() || !goalTargetAmount}
                className="app-button flex-[1.2] border border-amber-500 bg-amber-500 text-white disabled:opacity-40"
              >
                {submittingGoal ? 'Đang tạo' : 'Tạo hũ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddWishlist && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="app-modal-backdrop"
            onClick={() => setShowAddWishlist(false)}
            aria-label="Đóng"
          />

          <form
            onSubmit={handleAddWishlist}
            className="app-sheet relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px]"
          >
            <div className="app-sheet-header">
              <h3 className="app-section-title">Wishlist</h3>
              <button
                type="button"
                onClick={() => setShowAddWishlist(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <input
                type="text"
                required
                value={wishlistTitle}
                onChange={(event) => setWishlistTitle(event.target.value)}
                placeholder="Muốn mua gì?"
                className="app-control h-11 w-full px-3 text-sm"
              />

              <input
                type="text"
                inputMode="numeric"
                required
                value={
                  wishlistPrice
                    ? Number(wishlistPrice.replace(/[^0-9]/g, '')).toLocaleString('vi-VN')
                    : ''
                }
                onChange={(event) =>
                  setWishlistPrice(event.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Giá dự kiến"
                className="app-control h-12 w-full px-3 text-lg font-bold tabular-nums"
              />

              <select
                value={wishlistCategory}
                onChange={(event) =>
                  setWishlistCategory(event.target.value as PurchaseCategory)
                }
                className="app-control h-11 w-full px-3 text-sm"
                aria-label="Nhóm"
              >
                {(Object.keys(PURCHASE_CATEGORY_LABEL) as PurchaseCategory[]).map(
                  (category) => (
                    <option key={category} value={category}>
                      {PURCHASE_CATEGORY_LABEL[category]}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="app-sheet-footer">
              <button
                type="button"
                onClick={() => setShowAddWishlist(false)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingWishlist || !wishlistTitle.trim() || !wishlistPrice}
                className="app-button app-button-primary flex-[1.2] disabled:opacity-40"
              >
                {savingWishlist ? 'Đang lưu' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {depositGoalId && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="app-modal-backdrop"
            onClick={() => setDepositGoalId(null)}
            aria-label="Đóng"
          />

          <form
            onSubmit={handleDepositToGoal}
            className="app-sheet relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px]"
          >
            <div className="app-sheet-header">
              <h3 className="app-section-title">Nạp vào hũ</h3>
              <button
                type="button"
                onClick={() => setDepositGoalId(null)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { uid: myUid, name: myName, avatar: myAvatar },
                  {
                    uid: partnerUid || 'partner',
                    name: partnerName,
                    avatar: partnerAvatar,
                  },
                ].map((person) => {
                  const active = depositPayerUid === person.uid;
                  return (
                    <button
                      key={person.uid}
                      type="button"
                      onClick={() => setDepositPayerUid(person.uid)}
                      className={`app-button flex min-w-0 items-center justify-center gap-2 border px-2 ${
                        active
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-[var(--app-border)] bg-white text-slate-600'
                      }`}
                    >
                      <img
                        src={person.avatar}
                        alt=""
                        className="h-5 w-5 shrink-0 rounded-full object-cover"
                      />
                      <span className="truncate">{person.name}</span>
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                inputMode="numeric"
                required
                value={
                  depositAmount
                    ? Number(depositAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN')
                    : ''
                }
                onChange={(event) =>
                  setDepositAmount(event.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder="Số tiền"
                className="app-control h-12 w-full px-3 text-lg font-bold tabular-nums"
              />
            </div>

            <div className="app-sheet-footer">
              <button
                type="button"
                onClick={() => setDepositGoalId(null)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingDeposit || !depositAmount}
                className="app-button flex-[1.2] border border-amber-500 bg-amber-500 text-white disabled:opacity-40"
              >
                {submittingDeposit ? 'Đang nạp' : 'Nạp'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingTx && userProfile.coupleId && (
        <EditTransactionModal
          isOpen={!!editingTx}
          onClose={() => setEditingTx(null)}
          coupleId={userProfile.coupleId}
          transaction={editingTx}
          partner1={{
            uid: currentUserIsUser1 ? myUid : partnerUid || 'partner1',
            name: currentUserIsUser1 ? myName : partnerName,
          }}
          partner2={{
            uid: currentUserIsUser1 ? partnerUid || 'partner2' : myUid,
            name: currentUserIsUser1 ? partnerName : myName,
          }}
          onDelete={(id) => handleDeleteTransaction(id)}
        />
      )}
    </div>
  );
};
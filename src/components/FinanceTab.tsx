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
    <div className="space-y-4 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-500 shrink-0" />
            <span>Tài Chính</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Quỹ chung · mục tiêu · wishlist của hai đứa
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTxPayerUid(myUid);
            setTxTitle('');
            setTxAmount('');
            setTxType('expense');
            setShowAddTransaction(true);
          }}
          className="h-9 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Ghi thu / chi
        </button>
      </div>

      {/* Main fund hero */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Dư quỹ theo sổ hiện tại
            </p>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mt-1">
              {netBalance.toLocaleString('vi-VN')}
              <span className="text-base ml-1 text-slate-400 font-bold">đ</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {affordableCount > 0
                ? `Đang đủ cho ${affordableCount} gợi ý trong danh sách “Mua gì?”`
                : 'Đóng thêm quỹ để mở khóa các gợi ý mua sắm'}
            </p>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <CircleDollarSign className="w-5 h-5 text-rose-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={handleQuickAddFundContribution}
            className="py-2 rounded-xl bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Nạp quỹ
          </button>
          <button
            type="button"
            onClick={() => setActiveView('ideas')}
            className="py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
            Mua gì?
          </button>
          <button
            type="button"
            onClick={() => setActiveView('goals')}
            className="py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1"
          >
            <Target className="w-3.5 h-3.5 text-amber-500" />
            Hũ
          </button>
        </div>
      </div>

      {/* Finance sub navigation */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
        {[
          { id: 'overview' as FinanceView, label: 'Tổng quan' },
          { id: 'ideas' as FinanceView, label: 'Mua gì?' },
          { id: 'goals' as FinanceView, label: 'Mục tiêu' },
          { id: 'history' as FinanceView, label: 'Lịch sử' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition cursor-pointer ${
              activeView === tab.id
                ? 'bg-white text-rose-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
              <TrendingUp className="w-4 h-4 text-emerald-500 mb-2" />
              <p className="text-[10px] text-slate-400">Tổng nạp</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {totalIncome.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
              <TrendingDown className="w-4 h-4 text-rose-500 mb-2" />
              <p className="text-[10px] text-slate-400">Tổng chi</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {grandTotalExpense.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
              <PiggyBank className="w-4 h-4 text-amber-500 mb-2" />
              <p className="text-[10px] text-slate-400">Đang ở hũ</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {reservedInGoals.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>

          {/* Couple reconciliation */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-800">
                Hai đứa đã đóng & chi bao nhiêu?
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <img src={myAvatar} alt="" className="w-7 h-7 rounded-full object-cover bg-white border border-slate-200" />
                  <span className="text-xs font-bold text-slate-800 truncate">{myName}</span>
                </div>
                <div className="text-[10px] text-slate-400">Đã nạp</div>
                <div className="text-xs font-bold text-emerald-600">+{myIncome.toLocaleString('vi-VN')}đ</div>
                <div className="text-[10px] text-slate-400 mt-1.5">Đã chi</div>
                <div className="text-xs font-bold text-rose-600">-{myGrandTotalPaid.toLocaleString('vi-VN')}đ</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <img src={partnerAvatar} alt="" className="w-7 h-7 rounded-full object-cover bg-white border border-slate-200" />
                  <span className="text-xs font-bold text-slate-800 truncate">{partnerName}</span>
                </div>
                <div className="text-[10px] text-slate-400">Đã nạp</div>
                <div className="text-xs font-bold text-emerald-600">+{partnerIncome.toLocaleString('vi-VN')}đ</div>
                <div className="text-[10px] text-slate-400 mt-1.5">Đã chi</div>
                <div className="text-xs font-bold text-rose-600">-{partnerGrandTotalPaid.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex gap-2">
              <Scale className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                {expenseDiff === 0
                  ? 'Hai bạn đang chi trả cân bằng.'
                  : expenseDiff > 0
                    ? `${myName} đang chi nhiều hơn ${partnerName} ${Math.abs(expenseDiff).toLocaleString('vi-VN')}đ.`
                    : `${partnerName} đang chi nhiều hơn ${myName} ${Math.abs(expenseDiff).toLocaleString('vi-VN')}đ.`}
              </span>
            </div>
          </div>

          {/* Saving pace */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800">Nhịp đóng quỹ 30 ngày gần đây</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dùng để ước tính bao lâu thì đủ mua món tiếp theo
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-emerald-600">
                {weeklySavingPace.toLocaleString('vi-VN')}đ
              </p>
              <p className="text-[10px] text-slate-400">/ tuần</p>
            </div>
          </div>

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

      {/* PURCHASE IDEAS */}
      {activeView === 'ideas' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  Quỹ này mua được gì?
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gợi ý từ thấp → cao dựa trên số dư {netBalance.toLocaleString('vi-VN')}đ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWishlist(true)}
                className="h-8 px-2.5 bg-rose-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" />
                Wishlist
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setIdeaCategory('all')}
              className={`h-8 px-3 rounded-xl text-[10px] font-bold whitespace-nowrap ${
                ideaCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Tất cả
            </button>

            {(Object.keys(PURCHASE_CATEGORY_LABEL) as PurchaseCategory[]).map(
              (category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setIdeaCategory(category)}
                  className={`h-8 px-3 rounded-xl text-[10px] font-bold whitespace-nowrap ${
                    ideaCategory === category
                      ? 'bg-rose-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {PURCHASE_CATEGORY_LABEL[category]}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setIdeaSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
              className="h-8 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 ml-auto flex items-center gap-1 text-[10px] font-bold whitespace-nowrap"
            >
              <ArrowUpDown className="w-3 h-3" />
              {ideaSort === 'asc' ? 'Rẻ → đắt' : 'Đắt → rẻ'}
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
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shrink-0">
                      {item.emoji || <Icon className="w-4 h-4 text-slate-500" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {PURCHASE_CATEGORY_LABEL[item.category]}
                            </span>
                            {item.source === 'wishlist' && (
                              <span className="text-[9px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md font-bold">
                                Wishlist · {item.addedByName || 'Hai đứa'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-900">
                            {item.estimatedPrice.toLocaleString('vi-VN')}đ
                          </p>
                          <p
                            className={`text-[9px] font-bold mt-0.5 ${
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
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-400 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {weeks && (
                            <p className="text-[9px] text-slate-400 mt-1">
                              Với nhịp đóng quỹ gần đây: khoảng {weeks} tuần nữa đủ.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-3">
                        {status.key === 'ready' ? (
                          <button
                            type="button"
                            onClick={() => openExpenseFromSuggestion(item)}
                            className="h-8 px-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Ghi mua
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => createGoalFromSuggestion(item)}
                            className="h-8 px-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-bold flex items-center gap-1"
                          >
                            <Target className="w-3 h-3" />
                            Biến thành hũ
                          </button>
                        )}

                        {item.source === 'wishlist' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWishlist(item.id)}
                            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                            title="Xóa khỏi wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="ml-auto text-[9px] text-slate-400 flex items-center gap-1">
                          {status.key === 'ready' ? (
                            <>
                              <BadgeDollarSign className="w-3 h-3 text-emerald-500" />
                              Đủ tiền
                            </>
                          ) : (
                            <>
                              <LockKeyhole className="w-3 h-3" />
                              {progress}% mục tiêu
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GOALS */}
      {activeView === 'goals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-500" />
                Mục tiêu của hai đứa
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {savingsGoals.length} hũ · đang có {reservedInGoals.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddGoal(true)}
              className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Tạo hũ
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <PiggyBank className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Chưa có hũ tiết kiệm</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Vào “Mua gì?” và chọn một món để biến thành mục tiêu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savingsGoals.map((goal) => {
                const percent = Math.min(
                  100,
                  Math.round((goal.currentAmount / goal.targetAmount) * 100)
                );
                const missing = Math.max(0, goal.targetAmount - goal.currentAmount);
                const weeks = estimateWeeks(missing);

                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-black text-slate-900 text-xs">{goal.title}</h4>
                        {goal.targetDate && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateVN(goal.targetDate)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavingsGoal(goal.id)}
                        className="text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-end justify-between mb-1.5">
                        <span className="text-sm font-black text-amber-600">
                          {goal.currentAmount.toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[10px] text-slate-400">
                          / {goal.targetAmount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-bold text-amber-600">{percent}%</span>
                        {weeks && missing > 0 && (
                          <span className="text-[9px] text-slate-400">
                            ~{weeks} tuần nữa theo nhịp hiện tại
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDepositPayerUid(myUid);
                        setDepositGoalId(goal.id);
                      }}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nạp thêm vào hũ
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {availableAfterGoals < netBalance && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <strong>Gợi ý:</strong> nếu coi số tiền đang nằm trong các hũ là “đã khóa”,
              quỹ linh hoạt còn khoảng <strong>{availableAfterGoals.toLocaleString('vi-VN')}đ</strong>.
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Lịch sử thu / chi
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {filteredTransactions.length} giao dịch
                </p>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-600 outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                {FINANCE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'all' as const, label: 'Tất cả' },
                { id: 'me' as const, label: myName },
                { id: 'partner' as const, label: partnerName },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPayer(item.id)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold truncate ${
                    selectedPayer === item.id
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 italic">
                Chưa có giao dịch nào.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const isPayerMe = tx.paidByUid === myUid;
                  const payerDisplayName = isPayerMe
                    ? myName
                    : tx.paidByName || partnerName;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {tx.type === 'income'
                            ? <TrendingUp className="w-4 h-4" />
                            : <Receipt className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <h5 className="font-bold text-slate-800 text-xs truncate">
                            {tx.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {payerDisplayName} · {formatDateShortVN(tx.date)} · {tx.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`font-black text-xs ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')}đ
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingTx(tx)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
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

          {journalExpensesList.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-700">
                  Chi tiêu trong Nhật ký
                </span>
                <span className="text-rose-600 font-bold">
                  {journalExpensesList
                    .reduce((s, e) => s + e.amount, 0)
                    .toLocaleString('vi-VN')}đ
                </span>
              </div>
              {journalExpensesList.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-[11px] text-slate-600 py-1"
                >
                  <span className="truncate pr-3">
                    {exp.title}{' '}
                    <span className="text-slate-400">
                      ({exp.authorName || partnerName})
                    </span>
                  </span>
                  <span className="font-semibold shrink-0">
                    {exp.amount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD TRANSACTION MODAL */}
      {showAddTransaction && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddTransaction}
            className="bg-white w-full max-w-md rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Ghi thu / chi</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Nhập nhanh một giao dịch mới
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTransaction(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTxType('expense')}
                className={`py-2 rounded-lg text-xs font-bold ${
                  txType === 'expense'
                    ? 'bg-white text-rose-600 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Chi tiêu (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType('income');
                  setTxCategory('Đóng quỹ chung');
                }}
                className={`py-2 rounded-lg text-xs font-bold ${
                  txType === 'income'
                    ? 'bg-white text-emerald-600 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Nạp quỹ (+)
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Số tiền
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                value={txAmount ? Number(txAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setTxAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="200.000"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nội dung
              </label>
              <input
                type="text"
                required
                value={txTitle}
                onChange={(e) => setTxTitle(e.target.value)}
                placeholder={txType === 'income' ? 'Đóng quỹ tháng này...' : 'Ăn tối, xem phim...'}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Người thực hiện
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxPayerUid(myUid)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    txPayerUid === myUid
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <img src={myAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate">{myName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxPayerUid(partnerUid || 'partner')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    txPayerUid !== myUid
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <img src={partnerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  <span className="truncate">{partnerName}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {txType === 'expense' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    {FINANCE_CATEGORIES.filter((c) => c.id !== 'fund').map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={txType === 'income' ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ngày
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingTx || !txTitle.trim() || !txAmount}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black disabled:opacity-50"
            >
              {submittingTx ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </form>
        </div>
      )}

      {/* ADD SAVINGS GOAL MODAL */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSavingsGoal}
            className="bg-white w-full max-w-md rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Tạo hũ tiết kiệm</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Đặt mục tiêu rõ ràng cho món hai đứa muốn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Mục tiêu
              </label>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Đi Đà Lạt, mua Instax..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Số tiền mục tiêu
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={goalTargetAmount ? Number(goalTargetAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setGoalTargetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="5.000.000"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Hạn hoàn thành · tùy chọn
              </label>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingGoal || !goalTitle.trim() || !goalTargetAmount}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black disabled:opacity-50"
            >
              {submittingGoal ? 'Đang tạo...' : 'Tạo hũ'}
            </button>
          </form>
        </div>
      )}

      {/* ADD WISHLIST MODAL */}
      {showAddWishlist && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddWishlist}
            className="bg-white w-full max-w-md rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Thêm vào wishlist</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Hai đứa muốn mua gì trong tương lai?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWishlist(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tên món / trải nghiệm
              </label>
              <input
                type="text"
                required
                value={wishlistTitle}
                onChange={(e) => setWishlistTitle(e.target.value)}
                placeholder="AirPods, Instax, chuyến đi..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Giá dự kiến
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={wishlistPrice ? Number(wishlistPrice.replace(/[^0-9]/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setWishlistPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="2.790.000"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nhóm
              </label>
              <select
                value={wishlistCategory}
                onChange={(e) => setWishlistCategory(e.target.value as PurchaseCategory)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
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

            <button
              type="submit"
              disabled={savingWishlist || !wishlistTitle.trim() || !wishlistPrice}
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black disabled:opacity-50"
            >
              {savingWishlist ? 'Đang thêm...' : 'Thêm wishlist'}
            </button>
          </form>
        </div>
      )}

      {/* DEPOSIT MODAL */}
      {depositGoalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDepositToGoal}
            className="bg-white w-full max-w-sm rounded-3xl p-5 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Nạp tiền vào hũ</h3>
              <button
                type="button"
                onClick={() => setDepositGoalId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepositPayerUid(myUid)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  depositPayerUid === myUid
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <img src={myAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                {myName}
              </button>
              <button
                type="button"
                onClick={() => setDepositPayerUid(partnerUid || 'partner')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  depositPayerUid !== myUid
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <img src={partnerAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                {partnerName}
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Số tiền
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={depositAmount ? Number(depositAmount.replace(/[^0-9]/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="500.000"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={submittingDeposit || !depositAmount}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black disabled:opacity-50"
            >
              {submittingDeposit ? 'Đang nạp...' : 'Xác nhận nạp'}
            </button>
          </form>
        </div>
      )}

      {/* Edit Transaction Modal */}
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
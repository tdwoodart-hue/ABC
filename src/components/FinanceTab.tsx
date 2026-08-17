import React, { useState, useEffect } from 'react';
import { UserProfile, CoupleData, JournalEntry, FinanceTransaction, SavingsGoal, WakeUpLog, FundConfig } from '../types';
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
  Sun
} from 'lucide-react';
import { EditTransactionModal } from './EditTransactionModal';
import { WakeUpChallengeCard } from './WakeUpChallengeCard';
import { FundQRCodeCard } from './FundQRCodeCard';

interface FinanceTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  journals: JournalEntry[];
}

const FINANCE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống' },
  { id: 'dating', name: 'Hẹn hò' },
  { id: 'shopping', name: 'Mua sắm' },
  { id: 'travel', name: 'Du lịch' },
  { id: 'fund', name: 'Đóng quỹ chung' },
  { id: 'wakeup', name: 'Phạt dậy muộn (5.000đ)' },
  { id: 'other', name: 'Khác' },
];

export const FinanceTab: React.FC<FinanceTabProps> = ({ userProfile, coupleData, journals }) => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [wakeUpLogs, setWakeUpLogs] = useState<WakeUpLog[]>([]);
  const [fundConfig, setFundConfig] = useState<FundConfig | null>(null);

  // Form states - Add Transaction
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState(FINANCE_CATEGORIES[0].name);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Filter state
  const [selectedPayer, setSelectedPayer] = useState<'all' | 'me' | 'partner'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);

  // Identify Couple Partners with Gender & Roles
  const currentUserIsUser1 = (coupleData?.user1Uid === userProfile.uid) || (coupleData?.user1Id === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
  const myUid = userProfile.uid;
  const myName = userProfile.displayName || (currentUserIsUser1 ? 'Dương' : 'Chúc Gà');
  const myGender = userProfile.gender || (currentUserIsUser1 ? (coupleData?.user1Gender || 'male') : (coupleData?.user2Gender || 'female'));
  const myRole = userProfile.roleTitle || (currentUserIsUser1 ? (coupleData?.user1Role || 'Anh') : (coupleData?.user2Role || 'Em'));
  const myAvatar = userProfile.avatarUrl || (myGender === 'female' ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female' : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male');

  const partnerUid = coupleData 
    ? (currentUserIsUser1 ? (coupleData.user2Uid || coupleData.user2Id) : (coupleData.user1Uid || coupleData.user1Id)) 
    : null;
  
  let rawPartnerName = coupleData 
    ? (currentUserIsUser1 ? (coupleData.user2Name || 'Chúc Gà') : (coupleData.user1Name || 'Dương')) 
    : (currentUserIsUser1 ? 'Chúc Gà' : 'Dương');
  
  if (rawPartnerName.trim() === myName.trim()) {
    rawPartnerName = currentUserIsUser1 ? 'Chúc Gà' : 'Dương';
  }
  const partnerName = rawPartnerName;
  const partnerGender = coupleData 
    ? (currentUserIsUser1 ? (coupleData.user2Gender || 'female') : (coupleData.user1Gender || 'male'))
    : (currentUserIsUser1 ? 'female' : 'male');
  const partnerRole = coupleData 
    ? (currentUserIsUser1 ? (coupleData.user2Role || 'Em') : (coupleData.user1Role || 'Anh'))
    : (currentUserIsUser1 ? 'Em' : 'Anh');
  const partnerAvatar = coupleData 
    ? (currentUserIsUser1 
        ? (coupleData.user2Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female') 
        : (coupleData.user1Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male')) 
    : (currentUserIsUser1 ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female' : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male');

  // Real-time Firestore sync
  useEffect(() => {
    if (!userProfile.coupleId) return;

    // Transactions listener
    const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
    const txQuery = query(txRef, orderBy('createdAt', 'desc'));
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txs: FinanceTransaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as FinanceTransaction);
      });
      setTransactions(txs);
    }, (err) => {
      console.error('Lỗi tải giao dịch tài chính:', err);
    });

    // Savings Goals listener
    const goalsRef = collection(db, 'couples', userProfile.coupleId, 'savingsGoals');
    const goalsQuery = query(goalsRef, orderBy('createdAt', 'desc'));
    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goals: SavingsGoal[] = [];
      snapshot.forEach((doc) => {
        goals.push({ id: doc.id, ...doc.data() } as SavingsGoal);
      });
      setSavingsGoals(goals);
    }, (err) => {
      console.error('Lỗi tải mục tiêu tiết kiệm:', err);
    });

    // Wake-up Challenge Logs listener
    const wakeUpRef = collection(db, 'couples', userProfile.coupleId, 'wakeUpLogs');
    const wakeUpQuery = query(wakeUpRef, orderBy('createdAt', 'desc'));
    const unsubscribeWakeUp = onSnapshot(wakeUpQuery, (snapshot) => {
      const logs: WakeUpLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as WakeUpLog);
      });
      setWakeUpLogs(logs);
    }, (err) => {
      console.error('Lỗi tải nhật ký dậy sớm:', err);
    });

    // Fund Config listener (QR Code, Bank, Purpose)
    const fundConfigRef = doc(db, 'couples', userProfile.coupleId, 'settings', 'fundConfig');
    const unsubscribeFundConfig = onSnapshot(fundConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        setFundConfig(docSnap.data() as FundConfig);
      } else {
        setFundConfig({
          fundPurpose: 'Tiền quỹ được sử dụng cho mục đích chung của hai đứa: Mua áo đôi, hẹn hò cuối tuần, du lịch, quà kỷ niệm, đồ đôi & sinh hoạt chung...',
          bankName: coupleData?.bankName || '',
          bankAccountNo: coupleData?.bankAccountNo || '',
          accountHolderName: coupleData?.accountHolderName || ''
        });
      }
    }, (err) => {
      console.error('Lỗi tải cấu hình quỹ:', err);
    });

    return () => {
      unsubscribeTx();
      unsubscribeGoals();
      unsubscribeWakeUp();
      unsubscribeFundConfig();
    };
  }, [userProfile.coupleId, coupleData]);

  const handleQuickAddFundContribution = () => {
    setTxType('income');
    setTxCategory('Đóng quỹ chung');
    setTxTitle('Đóng quỹ tình yêu');
    setShowAddTransaction(true);
  };

  // Handle Add Transaction
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
        createdAt: new Date().toISOString()
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

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!userProfile.coupleId) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      try {
        await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'finances', id));
      } catch (err) {
        console.error('Lỗi xóa giao dịch:', err);
      }
    }
  };

  // Handle Add Savings Goal
  const handleAddSavingsGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !goalTitle.trim() || !goalTargetAmount) return;

    const parsedTarget = parseFloat(goalTargetAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedTarget) || parsedTarget <= 0) return;

    setSubmittingGoal(true);
    try {
      const goalsRef = collection(db, 'couples', userProfile.coupleId, 'savingsGoals');
      await addDoc(goalsRef, {
        title: goalTitle.trim(),
        targetAmount: parsedTarget,
        currentAmount: 0,
        targetDate: goalTargetDate || null,
        createdAt: new Date().toISOString()
      });

      setGoalTitle('');
      setGoalTargetAmount('');
      setGoalTargetDate('');
      setShowAddGoal(false);
    } catch (err) {
      console.error('Lỗi thêm hũ tiết kiệm:', err);
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Handle Deposit to Goal
  const handleDepositToGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !depositGoalId || !depositAmount) return;

    const parsedDeposit = parseFloat(depositAmount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedDeposit) || parsedDeposit <= 0) return;

    const targetGoal = savingsGoals.find(g => g.id === depositGoalId);
    if (!targetGoal) return;

    const isMe = depositPayerUid === myUid;
    const payerName = isMe ? myName : partnerName;

    setSubmittingDeposit(true);
    try {
      const goalRef = doc(db, 'couples', userProfile.coupleId, 'savingsGoals', depositGoalId);
      const newAmount = targetGoal.currentAmount + parsedDeposit;
      await updateDoc(goalRef, {
        currentAmount: newAmount
      });

      // Auto log income transaction under 'Đóng quỹ'
      const txRef = collection(db, 'couples', userProfile.coupleId, 'finances');
      await addDoc(txRef, {
        title: `Đóng góp: ${targetGoal.title}`,
        amount: parsedDeposit,
        type: 'income',
        category: 'Đóng quỹ chung',
        paidByUid: depositPayerUid,
        paidByName: payerName,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      setDepositGoalId(null);
      setDepositAmount('');
    } catch (err) {
      console.error('Lỗi đóng góp hũ tiết kiệm:', err);
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Delete Savings Goal
  const handleDeleteSavingsGoal = async (id: string) => {
    if (!userProfile.coupleId) return;
    if (window.confirm('Bạn có chắc muốn xóa hũ tiết kiệm này?')) {
      try {
        await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'savingsGoals', id));
      } catch (err) {
        console.error('Lỗi xóa hũ tiết kiệm:', err);
      }
    }
  };

  // --- STATS COMPUTATION ---
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const myIncome = transactions
    .filter(t => t.type === 'income' && t.paidByUid === myUid)
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerIncome = transactions
    .filter(t => t.type === 'income' && (partnerUid ? t.paidByUid === partnerUid : t.paidByUid !== myUid))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDirectExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const myDirectExpense = transactions
    .filter(t => t.type === 'expense' && t.paidByUid === myUid)
    .reduce((sum, t) => sum + t.amount, 0);

  const partnerDirectExpense = transactions
    .filter(t => t.type === 'expense' && (partnerUid ? t.paidByUid === partnerUid : t.paidByUid !== myUid))
    .reduce((sum, t) => sum + t.amount, 0);

  // Journal linked expenses
  const journalExpensesList = journals.flatMap(j => 
    (j.expenses || []).map(e => ({
      ...e,
      journalTitle: j.title,
      journalDate: j.date,
      authorUid: j.authorUid,
      authorName: j.authorName
    }))
  );

  const myJournalExpense = journalExpensesList
    .filter(e => e.authorUid === myUid)
    .reduce((sum, e) => sum + e.amount, 0);

  const partnerJournalExpense = journalExpensesList
    .filter(e => partnerUid ? e.authorUid === partnerUid : e.authorUid !== myUid)
    .reduce((sum, e) => sum + e.amount, 0);

  const myGrandTotalPaid = myDirectExpense + myJournalExpense;
  const partnerGrandTotalPaid = partnerDirectExpense + partnerJournalExpense;
  const grandTotalExpense = totalDirectExpense + (myJournalExpense + partnerJournalExpense);

  const expenseDiff = myGrandTotalPaid - partnerGrandTotalPaid;
  const netBalance = totalIncome - grandTotalExpense;

  // Filtered transactions list
  const filteredTransactions = transactions.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedPayer === 'me' && t.paidByUid !== myUid) return false;
    if (selectedPayer === 'partner' && (partnerUid ? t.paidByUid !== partnerUid : t.paidByUid === myUid)) return false;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayWakeUpLog = wakeUpLogs.find(l => l.date === todayStr) || null;

  return (
    <div className="space-y-6">
      {/* Clean Header matching other tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tài Chính & Quỹ Chung</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <PiggyBank className="w-4 h-4" />
            + Hũ Tiết Kiệm
          </button>
          <button
            onClick={() => {
              setTxPayerUid(myUid);
              setShowAddTransaction(!showAddTransaction);
            }}
            className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Ghi Thu / Chi
          </button>
        </div>
      </div>

      {/* Early Bird Wake-Up Challenge (Thử thách dậy sớm phạt 5k) */}
      <WakeUpChallengeCard
        userProfile={userProfile}
        coupleData={coupleData}
        todayLog={todayWakeUpLog}
        allLogs={wakeUpLogs}
      />

      {/* Quỹ Chung & Mã QR Chuyển Khoản (Đóng quỹ mua áo đôi, hẹn hò, đi chơi...) */}
      <FundQRCodeCard
        userProfile={userProfile}
        coupleData={coupleData}
        fundConfig={fundConfig}
        onOpenAddIncome={handleQuickAddFundContribution}
      />

      {/* Clean Overview Card: Bạn vs Người ấy */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-rose-500" />
            Đối Soát Tài Chính Hai Người
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Bạn */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={myAvatar} alt="" className="w-7 h-7 rounded-full border border-slate-200 bg-white" />
                <span className="font-bold text-xs text-slate-800">{myName} <span className="text-slate-400 font-normal">(Bạn)</span></span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">Đã nạp quỹ</span>
                <span className="font-bold text-emerald-600">+{myIncome.toLocaleString('vi-VN')} đ</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Đã chi trả</span>
                <span className="font-bold text-rose-600">-{myGrandTotalPaid.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          {/* Người ấy */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={partnerAvatar} alt="" className="w-7 h-7 rounded-full border border-slate-200 bg-white" />
                <span className="font-bold text-xs text-slate-800">{partnerName}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">Đã nạp quỹ</span>
                <span className="font-bold text-emerald-600">+{partnerIncome.toLocaleString('vi-VN')} đ</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Đã chi trả</span>
                <span className="font-bold text-rose-600">-{partnerGrandTotalPaid.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Status */}
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {expenseDiff === 0 ? (
                'Hai bạn đang chi trả chi tiêu cân bằng'
              ) : expenseDiff > 0 ? (
                `Bạn đã chi trả nhiều hơn ${partnerName}: ${Math.abs(expenseDiff).toLocaleString('vi-VN')} đ`
              ) : (
                `${partnerName} đã chi trả nhiều hơn bạn: ${Math.abs(expenseDiff).toLocaleString('vi-VN')} đ`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tổng Quỹ Thu</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {totalIncome.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tổng Đã Chi</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {grandTotalExpense.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Dư Quỹ Hiện Tại</span>
            <Wallet className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {netBalance.toLocaleString('vi-VN')} đ
          </div>
        </div>
      </div>

      {/* Form: Add Transaction */}
      {showAddTransaction && (
        <form onSubmit={handleAddTransaction} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Thêm Giao Dịch Thu / Chi</h3>
            <button
              type="button"
              onClick={() => setShowAddTransaction(false)}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Người thực hiện / chi trả
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxPayerUid(myUid)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  txPayerUid === myUid
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <img src={myAvatar} alt="" className="w-5 h-5 rounded-full object-cover border border-white" />
                <span className="truncate">{myName} (Bạn)</span>
              </button>

              <button
                type="button"
                onClick={() => setTxPayerUid(partnerUid || 'partner')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  txPayerUid !== myUid
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <img src={partnerAvatar} alt="" className="w-5 h-5 rounded-full object-cover border border-white" />
                <span className="truncate">{partnerName} (Nửa kia)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                txType === 'expense' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Khoản Chi Tiêu
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                txType === 'income' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
              }`}
            >
              Nạp Quỹ / Thu Nhập
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên giao dịch *</label>
              <input
                type="text"
                required
                placeholder="VD: Tiền ăn tối, Tiền xem phim..."
                value={txTitle}
                onChange={(e) => setTxTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số tiền (đ) *</label>
              <input
                type="number"
                required
                placeholder="VD: 200000"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {txType === 'expense' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                >
                  {FINANCE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày thực hiện</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddTransaction(false)}
              className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingTx || !txTitle.trim() || !txAmount}
              className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {submittingTx ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </div>
        </form>
      )}

      {/* Form: Add Savings Goal */}
      {showAddGoal && (
        <form onSubmit={handleAddSavingsGoal} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Tạo Hũ Tiết Kiệm Mới</h3>
            <button
              type="button"
              onClick={() => setShowAddGoal(false)}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên hũ tiết kiệm *</label>
              <input
                type="text"
                required
                placeholder="VD: Đi Đà Lạt, Mua nhẫn đôi..."
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Số tiền mục tiêu (đ) *</label>
              <input
                type="number"
                required
                placeholder="VD: 5000000"
                value={goalTargetAmount}
                onChange={(e) => setGoalTargetAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn hoàn thành (Tùy chọn)</label>
            <input
              type="date"
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddGoal(false)}
              className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingGoal || !goalTitle.trim() || !goalTargetAmount}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {submittingGoal ? 'Đang tạo...' : 'Tạo hũ tiết kiệm'}
            </button>
          </div>
        </form>
      )}

      {/* Deposit Modal */}
      {depositGoalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleDepositToGoal} className="bg-white w-full max-w-sm rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Nạp Tiền Vào Hũ</h3>
              <button
                type="button"
                onClick={() => setDepositGoalId(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Người đóng góp</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setDepositPayerUid(myUid)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    depositPayerUid === myUid
                      ? 'bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <img src={myAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  <span className="truncate">{myName} (Bạn)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDepositPayerUid(partnerUid || 'partner')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    depositPayerUid !== myUid
                      ? 'bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <img src={partnerAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  <span className="truncate">{partnerName} (Nửa kia)</span>
                </button>
              </div>

              <label className="block text-xs font-semibold text-slate-600 mb-1">Số tiền (đ)</label>
              <input
                type="number"
                required
                placeholder="VD: 500000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDepositGoalId(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submittingDeposit || !depositAmount}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {submittingDeposit ? 'Đang nạp...' : 'Xác nhận nạp'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Savings Goals */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-500" />
          Hũ Tiết Kiệm Mục Tiêu ({savingsGoals.length})
        </h3>

        {savingsGoals.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
            Chưa có hũ tiết kiệm nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savingsGoals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              return (
                <div key={goal.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{goal.title}</h4>
                      {goal.targetDate && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Hạn: {formatDateVN(goal.targetDate)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSavingsGoal(goal.id)}
                      className="text-slate-300 hover:text-rose-500 transition"
                      title="Xóa hũ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Tiến độ</span>
                      <span className="font-bold text-amber-600">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Đã có: <strong className="text-slate-700">{goal.currentAmount.toLocaleString('vi-VN')} đ</strong></span>
                      <span>Mục tiêu: {goal.targetAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setDepositPayerUid(myUid);
                      setDepositGoalId(goal.id);
                    }}
                    className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nạp thêm vào hũ
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            Lịch Sử Thu / Chi ({filteredTransactions.length})
          </h3>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSelectedPayer('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                  selectedPayer === 'all' ? 'bg-white font-bold text-slate-800' : 'text-slate-500'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedPayer('me')}
                className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                  selectedPayer === 'me' ? 'bg-white font-bold text-slate-800' : 'text-slate-500'
                }`}
              >
                Của Bạn
              </button>
              <button
                onClick={() => setSelectedPayer('partner')}
                className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                  selectedPayer === 'partner' ? 'bg-white font-bold text-slate-800' : 'text-slate-500'
                }`}
              >
                Của {partnerName}
              </button>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:outline-none"
            >
              <option value="all">Tất cả danh mục</option>
              {FINANCE_CATEGORIES.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400 italic">
            Chưa có giao dịch nào trong danh sách.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredTransactions.map((tx) => {
              const isPayerMe = tx.paidByUid === myUid;
              const payerDisplayName = isPayerMe ? 'Bạn' : tx.paidByName || partnerName;

              return (
                <div key={tx.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-slate-800 text-xs truncate">{tx.title}</h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">{payerDisplayName}</span>
                        <span>•</span>
                        <span>{formatDateShortVN(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-bold text-xs ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')} đ
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingTx(tx)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Chỉnh sửa / Đổi người chi trả"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

      {/* Journal Expenses list */}
      {journalExpensesList.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-700">Chi Tiêu Đính Kèm Trong Bài Viết Nhật Ký</span>
            <span className="text-rose-600 font-bold">
              {journalExpensesList.reduce((s, e) => s + e.amount, 0).toLocaleString('vi-VN')} đ
            </span>
          </div>
          {journalExpensesList.map((exp, idx) => (
            <div key={idx} className="flex justify-between items-center text-[11px] text-slate-600 py-1">
              <span>{exp.title} <span className="text-slate-400">({exp.authorName || partnerName})</span></span>
              <span className="font-semibold">{exp.amount.toLocaleString('vi-VN')} đ</span>
            </div>
          ))}
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
            uid: currentUserIsUser1 ? myUid : (partnerUid || 'partner1'),
            name: currentUserIsUser1 ? myName : partnerName
          }}
          partner2={{
            uid: currentUserIsUser1 ? (partnerUid || 'partner2') : myUid,
            name: currentUserIsUser1 ? partnerName : myName
          }}
          onDelete={(id) => handleDeleteTransaction(id)}
        />
      )}
    </div>
  );
};

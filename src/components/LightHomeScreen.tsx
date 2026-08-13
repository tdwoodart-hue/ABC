import React, { useState, useEffect } from 'react';
import { UserProfile, CoupleData, MemoryItem, JournalEntry, JournalComment, JournalExpense } from '../types';
import { FinanceTab } from './FinanceTab';
import { 
  db, 
  doc, 
  onSnapshot, 
  updateDoc, 
  signOut, 
  auth, 
  collection, 
  query, 
  addDoc, 
  deleteDoc, 
  deleteField,
  orderBy 
} from '../lib/firebase';
import { 
  Heart, 
  Calendar, 
  LogOut, 
  Edit3, 
  MessageCircle, 
  Home, 
  Image as ImageIcon, 
  User as UserIcon, 
  Plus, 
  Trash2, 
  Sparkles,
  Camera,
  BookOpen,
  Smile,
  Search,
  Upload,
  X,
  AlertTriangle,
  Check,
  Receipt,
  DollarSign,
  Eye,
  Wallet
} from 'lucide-react';

interface LightHomeScreenProps {
  userProfile: UserProfile;
  onRefreshProfile?: () => void;
}

const MOOD_OPTIONS = [
  '💕 Hạnh phúc',
  '😊 Vui vẻ',
  '🥺 Nhớ nhung',
  '🍕 Đi ăn lẩu',
  '☕ Cà phê',
  '✈️ Đi du lịch',
  '😴 Mệt mỏi',
  '🎉 Kỷ niệm'
];

const compressAndConvertToBase64 = (file: File): Promise<string> => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const LightHomeScreen: React.FC<LightHomeScreenProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'journal' | 'finance' | 'profile'>('home');
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [statusInput, setStatusInput] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Journal state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMood, setJournalMood] = useState(MOOD_OPTIONS[0]);
  const [journalImages, setJournalImages] = useState<string[]>([]);
  const [journalExpenses, setJournalExpenses] = useState<JournalExpense[]>([]);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [addingJournal, setAddingJournal] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Edit Journal State
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editExpenses, setEditExpenses] = useState<JournalExpense[]>([]);
  const [editNewExpenseTitle, setEditNewExpenseTitle] = useState('');
  const [editNewExpenseAmount, setEditNewExpenseAmount] = useState('');
  const [editImageLoading, setEditImageLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Memories state
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [memoryImageUrl, setMemoryImageUrl] = useState('');
  const [addingMemory, setAddingMemory] = useState(false);
  const [journalImageLoading, setJournalImageLoading] = useState(false);
  const [memoryImageLoading, setMemoryImageLoading] = useState(false);

  const handleJournalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setJournalImageLoading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await compressAndConvertToBase64(files[i]);
        newImages.push(base64);
      }
      setJournalImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error('Lỗi đọc file ảnh nhật ký:', err);
    } finally {
      setJournalImageLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveJournalImage = (index: number) => {
    setJournalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExpenseToCreate = () => {
    if (!newExpenseTitle.trim() || !newExpenseAmount) return;
    const numAmount = parseFloat(newExpenseAmount.replace(/[^0-9]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) return;
    const item: JournalExpense = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title: newExpenseTitle.trim(),
      amount: numAmount
    };
    setJournalExpenses(prev => [...prev, item]);
    setNewExpenseTitle('');
    setNewExpenseAmount('');
  };

  const handleRemoveExpenseFromCreate = (id: string) => {
    setJournalExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleMemoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMemoryImageLoading(true);
    try {
      const base64 = await compressAndConvertToBase64(file);
      setMemoryImageUrl(base64);
    } catch (err) {
      console.error('Lỗi đọc file ảnh kỷ niệm:', err);
    } finally {
      setMemoryImageLoading(false);
    }
  };

  // Subscribe to live couple data
  useEffect(() => {
    if (!userProfile.coupleId) return;

    const coupleRef = doc(db, 'couples', userProfile.coupleId);
    const unsubscribeCouple = onSnapshot(coupleRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CoupleData;
        setCoupleData(data);
        setStatusInput(data.statusMessage || '');
        setAnniversaryDate(data.anniversaryDate || new Date().toISOString().split('T')[0]);
      }
    }, (err) => {
      console.warn('Error listening to couple document:', err);
    });

    // Subscribe to journals collection inside couple doc
    const journalsRef = collection(db, 'couples', userProfile.coupleId, 'journals');
    const qJournals = query(journalsRef, orderBy('createdAt', 'desc'));
    const unsubscribeJournals = onSnapshot(qJournals, (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as JournalEntry);
      });
      setJournals(items);
    }, (err) => {
      console.warn('Error listening to journals:', err);
    });

    // Subscribe to memories collection inside couple doc
    const memoriesRef = collection(db, 'couples', userProfile.coupleId, 'memories');
    const qMemories = query(memoriesRef, orderBy('createdAt', 'desc'));
    const unsubscribeMemories = onSnapshot(qMemories, (snapshot) => {
      const items: MemoryItem[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as MemoryItem);
      });
      setMemories(items);
    }, (err) => {
      console.warn('Error listening to memories:', err);
    });

    return () => {
      unsubscribeCouple();
      unsubscribeJournals();
      unsubscribeMemories();
    };
  }, [userProfile.coupleId]);

  // Calculate days together
  const getDaysTogether = (): number => {
    if (!coupleData?.anniversaryDate) return 1;
    const start = new Date(coupleData.anniversaryDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const handleUpdateStatusNote = async () => {
    if (!userProfile.coupleId) return;
    setUpdating(true);
    try {
      const coupleRef = doc(db, 'couples', userProfile.coupleId);
      await updateDoc(coupleRef, {
        statusMessage: statusInput.trim()
      });
      setIsEditingNote(false);
    } catch (err) {
      console.error('Lỗi cập nhật ghi chú:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAnniversaryDate = async (newDate: string) => {
    if (!userProfile.coupleId || !newDate) return;
    setAnniversaryDate(newDate);
    setUpdating(true);
    try {
      const coupleRef = doc(db, 'couples', userProfile.coupleId);
      await updateDoc(coupleRef, {
        anniversaryDate: newDate
      });
      setIsEditingDate(false);
    } catch (err) {
      console.error('Lỗi cập nhật ngày kỷ niệm:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !journalTitle.trim()) return;

    setAddingJournal(true);
    try {
      const journalsRef = collection(db, 'couples', userProfile.coupleId, 'journals');
      const docData: Record<string, any> = {
        title: journalTitle.trim(),
        date: journalDate,
        authorName: userProfile.displayName,
        authorUid: userProfile.uid,
        createdAt: new Date().toISOString(),
        comments: []
      };

      if (journalContent.trim()) {
        docData.content = journalContent.trim();
      }
      if (journalImages.length > 0) {
        docData.images = journalImages;
        docData.imageUrl = journalImages[0];
      }
      if (journalExpenses.length > 0) {
        docData.expenses = journalExpenses;
      }

      await addDoc(journalsRef, docData);
      setJournalTitle('');
      setJournalContent('');
      setJournalImages([]);
      setJournalExpenses([]);
      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setShowAddJournal(false);
    } catch (err) {
      console.error('Lỗi thêm nhật ký:', err);
    } finally {
      setAddingJournal(false);
    }
  };

  const handleAddComment = async (journalId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentText = commentInputs[journalId]?.trim();
    if (!userProfile.coupleId || !commentText) return;

    const newComment: JournalComment = {
      id: Date.now().toString(),
      authorName: userProfile.displayName,
      authorUid: userProfile.uid,
      content: commentText,
      createdAt: new Date().toISOString()
    };

    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      const target = journals.find(j => j.id === journalId);
      const currentComments = target?.comments || [];
      await updateDoc(journalRef, {
        comments: [...currentComments, newComment]
      });
      setCommentInputs(prev => ({ ...prev, [journalId]: '' }));
    } catch (err) {
      console.error('Lỗi thêm bình luận:', err);
    }
  };

  const handleDeleteComment = async (journalId: string, commentId: string) => {
    if (!userProfile.coupleId) return;
    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      const target = journals.find(j => j.id === journalId);
      if (!target || !target.comments) return;

      const updatedComments = target.comments.filter(c => c.id !== commentId);
      await updateDoc(journalRef, {
        comments: updatedComments
      });
    } catch (err) {
      console.error('Lỗi xóa bình luận:', err);
    }
  };

  const handleRequestDeleteJournal = async (item: JournalEntry) => {
    if (!userProfile.coupleId) return;
    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', item.id);
      await updateDoc(journalRef, {
        deleteRequest: {
          requestedByUid: userProfile.uid,
          requestedByName: userProfile.displayName,
          requestedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Lỗi yêu cầu xóa nhật ký:', err);
    }
  };

  const handleCancelDeleteRequest = async (journalId: string) => {
    if (!userProfile.coupleId) return;
    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      await updateDoc(journalRef, {
        deleteRequest: deleteField()
      });
    } catch (err) {
      console.error('Lỗi hủy yêu cầu xóa:', err);
    }
  };

  const handleApproveDeleteJournal = async (journalId: string) => {
    if (!userProfile.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'journals', journalId));
    } catch (err) {
      console.error('Lỗi chấp nhận xóa nhật ký:', err);
    }
  };

  const handleStartEditJournal = (item: JournalEntry) => {
    setEditingJournalId(item.id);
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditDate(item.date || new Date().toISOString().split('T')[0]);
    
    let imgs: string[] = [];
    if (item.images && item.images.length > 0) {
      imgs = [...item.images];
    } else if (item.imageUrl) {
      imgs = [item.imageUrl];
    }
    setEditImages(imgs);
    setEditExpenses(item.expenses ? [...item.expenses] : []);
    setEditNewExpenseTitle('');
    setEditNewExpenseAmount('');
  };

  const handleCancelEditJournal = () => {
    setEditingJournalId(null);
    setEditTitle('');
    setEditContent('');
    setEditDate('');
    setEditImages([]);
    setEditExpenses([]);
    setEditNewExpenseTitle('');
    setEditNewExpenseAmount('');
  };

  const handleEditJournalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setEditImageLoading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await compressAndConvertToBase64(files[i]);
        newImages.push(base64);
      }
      setEditImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error('Lỗi đọc file ảnh khi sửa:', err);
    } finally {
      setEditImageLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExpenseToEdit = () => {
    if (!editNewExpenseTitle.trim() || !editNewExpenseAmount) return;
    const numAmount = parseFloat(editNewExpenseAmount.replace(/[^0-9]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) return;
    const item: JournalExpense = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title: editNewExpenseTitle.trim(),
      amount: numAmount
    };
    setEditExpenses(prev => [...prev, item]);
    setEditNewExpenseTitle('');
    setEditNewExpenseAmount('');
  };

  const handleRemoveExpenseFromEdit = (id: string) => {
    setEditExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleSaveEditJournal = async (journalId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !editTitle.trim()) return;

    setSavingEdit(true);
    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      const updates: Record<string, any> = {
        title: editTitle.trim(),
        date: editDate,
        content: editContent.trim() || deleteField(),
        images: editImages.length > 0 ? editImages : deleteField(),
        imageUrl: editImages.length > 0 ? editImages[0] : deleteField(),
        expenses: editExpenses.length > 0 ? editExpenses : deleteField(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(journalRef, updates);
      setEditingJournalId(null);
    } catch (err) {
      console.error('Lỗi cập nhật bài đăng:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !memoryTitle.trim()) return;

    setAddingMemory(true);
    try {
      const memoriesRef = collection(db, 'couples', userProfile.coupleId, 'memories');
      await addDoc(memoriesRef, {
        title: memoryTitle.trim(),
        date: memoryDate,
        imageUrl: memoryImageUrl.trim() || undefined,
        authorName: userProfile.displayName,
        authorUid: userProfile.uid,
        createdAt: new Date().toISOString()
      });
      setMemoryTitle('');
      setMemoryImageUrl('');
      setShowAddMemory(false);
    } catch (err) {
      console.error('Lỗi thêm kỷ niệm:', err);
    } finally {
      setAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!userProfile.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'memories', id));
    } catch (err) {
      console.error('Lỗi xóa kỷ niệm:', err);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const filteredJournals = journals.filter(j => 
    j.title.toLowerCase().includes(journalSearch.toLowerCase()) ||
    (j.content && j.content.toLowerCase().includes(journalSearch.toLowerCase())) ||
    (j.mood && j.mood.toLowerCase().includes(journalSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24">
      {/* Main Content Areas based on activeTab */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-rose-100/70 via-pink-50 to-orange-50 p-6 sm:p-8 rounded-3xl border border-rose-100/80 shadow-xs text-center relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-rose-200/30 rounded-full blur-2xl pointer-events-none" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Xin chào, {userProfile.displayName}! 💕
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Không gian nhỏ dành riêng cho hai bạn
              </p>
            </div>

            {/* Couple Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
              {/* Partners Avatars & Names */}
              <div className="flex items-center justify-around my-2">
                {/* User 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-rose-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-2">
                    <img
                      src={`https://api.dicebear.com/7.x/micah/svg?seed=${coupleData?.user1Id || 'p1'}`}
                      alt="User 1"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-slate-800 text-sm sm:text-base">
                    {coupleData?.user1Name || 'Người yêu 1'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {coupleData?.user1Id === userProfile.uid ? '(Bạn)' : '(Nửa kia)'}
                  </span>
                </div>

                {/* Heart Divider */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center shadow-inner animate-pulse">
                    <Heart className="w-5 h-5 fill-rose-500 stroke-rose-500" />
                  </div>
                </div>

                {/* User 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-pink-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-2">
                    <img
                      src={`https://api.dicebear.com/7.x/micah/svg?seed=${coupleData?.user2Id || 'p2'}`}
                      alt="User 2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold text-slate-800 text-sm sm:text-base">
                    {coupleData?.user2Name || 'Chờ người yêu vào...'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {coupleData?.user2Id === userProfile.uid ? '(Bạn)' : '(Nửa kia)'}
                  </span>
                </div>
              </div>

              {/* Days Together Counter */}
              <div className="mt-6 bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl p-6 border border-rose-100/80 text-center">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block mb-1">
                  Số Ngày Bên Nhau
                </span>
                <div className="text-5xl font-black text-rose-600 tracking-tight my-2">
                  {getDaysTogether()}{' '}
                  <span className="text-xl font-bold text-rose-400">ngày</span>
                </div>

                {/* Anniversary Date Selector */}
                <div className="mt-4 pt-3 border-t border-rose-100/80 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span>Ngày bắt đầu:</span>
                  {isEditingDate ? (
                    <input
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => handleUpdateAnniversaryDate(e.target.value)}
                      className="bg-white border border-rose-300 rounded-lg px-2 py-1 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  ) : (
                    <span className="font-bold text-slate-700">{coupleData?.anniversaryDate}</span>
                  )}
                  <button
                    onClick={() => setIsEditingDate(!isEditingDate)}
                    className="ml-1 text-rose-500 hover:text-rose-700 font-medium underline text-[11px] cursor-pointer"
                  >
                    {isEditingDate ? 'Đóng' : 'Đổi ngày'}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Note Box */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <MessageCircle className="w-5 h-5 text-rose-500" />
                  <span>Lời Nhắn Hôm Nay</span>
                </div>
                {!isEditingNote && (
                  <button
                    onClick={() => setIsEditingNote(true)}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Sửa lời nhắn
                  </button>
                )}
              </div>

              {isEditingNote ? (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    placeholder="Nhập lời nhắn gửi nửa kia..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleUpdateStatusNote}
                      disabled={updating}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {updating ? 'Đang lưu...' : 'Lưu lời nhắn 💕'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-sm italic relative">
                  "{coupleData?.statusMessage || 'Chưa có lời nhắn nào.'}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: JOURNAL (NHẬT KÝ) */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Nhật Ký Tình Yêu 📖
                </h2>
                <p className="text-xs text-slate-500">
                  Viết nên những dòng nhật ký ngọt ngào mỗi ngày
                </p>
              </div>
              <button
                onClick={() => setShowAddJournal(!showAddJournal)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Viết nhật ký
              </button>
            </div>

            {/* Search Journal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm kiếm nhật ký..."
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-xs"
              />
            </div>

            {/* Add Journal Form */}
            {showAddJournal && (
              <form onSubmit={handleAddJournal} className="bg-white p-6 rounded-3xl border border-rose-200 shadow-md space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  Viết trang nhật ký mới
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Tiêu đề bài viết
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Một ngày mưa ấm áp cùng em, Lần đầu nấu ăn cùng nhau..."
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ngày ghi nhật ký
                    </label>
                    <input
                      type="date"
                      required
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Ảnh đính kèm (Có thể chọn nhiều ảnh)
                    </label>
                    <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-rose-50 border border-dashed border-slate-300 hover:border-rose-300 rounded-xl text-xs text-slate-600 font-medium cursor-pointer transition">
                      <Upload className="w-4 h-4 text-rose-500" />
                      <span>{journalImageLoading ? 'Đang xử lý ảnh...' : 'Tải lên ảnh (1 hoặc nhiều)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleJournalFileChange}
                        className="hidden"
                        disabled={journalImageLoading}
                      />
                    </label>
                  </div>
                </div>

                {/* Attached images preview list */}
                {journalImages.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Đã chọn {journalImages.length} ảnh:</span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {journalImages.map((img, idx) => (
                        <div key={idx} className="relative h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                          <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveJournalImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                            title="Xóa ảnh này"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nội dung nhật ký
                    <span className="text-slate-400 font-normal ml-1">(Không bắt buộc)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Viết suy nghĩ, cảm xúc (có thể bỏ qua nếu chỉ muốn lưu bài & bình luận sau)..."
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                  />
                </div>

                {/* Expenses Section in Create */}
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      Chi tiêu kỷ niệm này (Chỉ xem trong chi tiết, ẩn ngoài bảng tin)
                    </span>
                    <span className="text-[10px] text-amber-700 font-medium">Không hiển thị công khai</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Tên khoản chi (VD: Vé xem phim, Ăn tối...)"
                      value={newExpenseTitle}
                      onChange={(e) => setNewExpenseTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      type="number"
                      placeholder="Số tiền (đ)"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="w-full sm:w-32 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddExpenseToCreate}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer shrink-0"
                    >
                      + Thêm chi tiêu
                    </button>
                  </div>

                  {journalExpenses.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {journalExpenses.map((exp) => (
                        <div key={exp.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-amber-100 text-xs">
                          <span className="font-medium text-slate-700">{exp.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-700">{exp.amount.toLocaleString('vi-VN')} đ</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExpenseFromCreate(exp.id)}
                              className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end pt-1 text-xs font-bold text-amber-900 border-t border-amber-200/60">
                        Tổng cộng: {journalExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddJournal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={addingJournal || !journalTitle.trim()}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {addingJournal ? 'Đang lưu...' : 'Lưu trang nhật ký 📝'}
                  </button>
                </div>
              </form>
            )}

            {/* Journals List */}
            {filteredJournals.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Chưa có trang nhật ký nào</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy bấm nút "Viết nhật ký" ở trên để ghi lại những dòng cảm xúc ngọt ngào của hai bạn.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredJournals.map((item) => (
                  editingJournalId === item.id ? (
                    <form key={item.id} onSubmit={(e) => handleSaveEditJournal(item.id, e)} className="bg-white rounded-3xl p-6 border-2 border-rose-200 shadow-md space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-rose-500" />
                          {item.authorUid === userProfile.uid ? 'Chỉnh sửa bài đăng & Chi tiêu' : 'Chi tiết bài đăng & Chi tiêu'}
                        </h3>
                        <button
                          type="button"
                          onClick={handleCancelEditJournal}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Tiêu đề bài viết
                        </label>
                        <input
                          type="text"
                          required
                          disabled={item.authorUid !== userProfile.uid}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white disabled:bg-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Ngày đăng
                          </label>
                          <input
                            type="date"
                            required
                            disabled={item.authorUid !== userProfile.uid}
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white disabled:bg-slate-100"
                          />
                        </div>

                        {item.authorUid === userProfile.uid && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Thêm ảnh
                            </label>
                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-rose-50 border border-dashed border-slate-300 hover:border-rose-300 rounded-xl text-xs text-slate-600 font-medium cursor-pointer transition">
                              <Upload className="w-4 h-4 text-rose-500" />
                              <span>{editImageLoading ? 'Đang xử lý ảnh...' : 'Tải thêm ảnh'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleEditJournalFileChange}
                                className="hidden"
                                disabled={editImageLoading}
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Display Edit/Detail Images */}
                      {editImages.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-500">Danh sách ảnh ({editImages.length}):</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {editImages.map((img, idx) => (
                              <div key={idx} className="relative h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                <img src={img} alt={`Edit preview ${idx}`} className="w-full h-full object-cover" />
                                {item.authorUid === userProfile.uid && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                                    title="Xóa ảnh này"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Nội dung nhật ký
                        </label>
                        <textarea
                          rows={3}
                          disabled={item.authorUid !== userProfile.uid}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Viết suy nghĩ, cảm xúc..."
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white disabled:bg-slate-100"
                        />
                      </div>

                      {/* Expense Detail Section inside Edit Form */}
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-amber-600" />
                            Danh sách chi tiêu trong kỷ niệm (Chỉ xem ở đây)
                          </span>
                        </div>

                        {/* Add expense input in edit mode */}
                        {item.authorUid === userProfile.uid && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Tên khoản chi..."
                              value={editNewExpenseTitle}
                              onChange={(e) => setEditNewExpenseTitle(e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <input
                              type="number"
                              placeholder="Số tiền (đ)"
                              value={editNewExpenseAmount}
                              onChange={(e) => setEditNewExpenseAmount(e.target.value)}
                              className="w-full sm:w-32 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <button
                              type="button"
                              onClick={handleAddExpenseToEdit}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer shrink-0"
                            >
                              + Thêm
                            </button>
                          </div>
                        )}

                        {editExpenses.length === 0 ? (
                          <p className="text-xs text-amber-700 italic">Không có khoản chi tiêu nào ghi nhận trong kỷ niệm này.</p>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {editExpenses.map((exp) => (
                              <div key={exp.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-amber-100 text-xs">
                                <span className="font-medium text-slate-800">{exp.title}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-amber-700">{exp.amount.toLocaleString('vi-VN')} đ</span>
                                  {item.authorUid === userProfile.uid && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExpenseFromEdit(exp.id)}
                                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 text-xs font-bold text-amber-950 border-t border-amber-200">
                              <span>TỔNG CỘNG CHI TIÊU:</span>
                              <span className="text-sm text-amber-700">{editExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEditJournal}
                          className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                        >
                          {item.authorUid === userProfile.uid ? 'Hủy' : 'Đóng chi tiết'}
                        </button>
                        {item.authorUid === userProfile.uid && (
                          <button
                            type="submit"
                            disabled={savingEdit || !editTitle.trim()}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                          >
                            {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi ✨'}
                          </button>
                        )}
                      </div>
                    </form>
                  ) : (
                    <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3 relative group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-100 border border-white shadow-xs overflow-hidden shrink-0">
                            <img
                              src={`https://api.dicebear.com/7.x/micah/svg?seed=${item.authorUid}`}
                              alt={item.authorName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {item.authorName}
                              </span>
                              {item.authorUid === userProfile.uid ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-semibold border border-rose-100">
                                  Bài của bạn
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                                  Bài đối phương
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3 text-rose-400" />
                              {item.date}
                              {item.updatedAt && (
                                <span className="text-rose-500 font-medium italic text-[10px]">
                                  (Đã chỉnh sửa)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* View detail button for both or Edit for author */}
                          <button
                            onClick={() => handleStartEditJournal(item)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-rose-100"
                            title="Xem chi tiết hoặc chỉnh sửa"
                          >
                            {item.authorUid === userProfile.uid ? (
                              <>
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa chi tiết</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem chi tiết</span>
                              </>
                            )}
                          </button>

                          {!item.deleteRequest && (
                            <button
                              onClick={() => handleRequestDeleteJournal(item)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Yêu cầu xóa nhật ký"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 pt-1">
                        {item.title}
                      </h3>

                      {item.content && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                          {item.content}
                        </p>
                      )}

                      {/* Photos grid display on feed (Multi-image or single image) */}
                      {item.images && item.images.length > 0 ? (
                        <div className={`grid gap-2 mt-2 ${
                          item.images.length === 1 ? 'grid-cols-1' :
                          item.images.length === 2 ? 'grid-cols-2' :
                          'grid-cols-2 sm:grid-cols-3'
                        }`}>
                          {item.images.map((img, idx) => (
                            <div key={idx} className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                              <img
                                src={img}
                                alt={`${item.title} ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : item.imageUrl ? (
                        <div className="w-full max-h-72 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 mt-2">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Partner approval delete banner */}
                      {item.deleteRequest && (
                        <div className="pt-1">
                          {item.deleteRequest.requestedByUid === userProfile.uid ? (
                            <div className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Đã gửi yêu cầu xóa. Đang chờ đối phương chấp nhận...</span>
                              </div>
                              <button
                                onClick={() => handleCancelDeleteRequest(item.id)}
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
                              <p className="text-[11px] text-rose-600">Bài viết chỉ bị xóa vĩnh viễn khi bạn đồng ý.</p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleApproveDeleteJournal(item.id)}
                                  className="flex items-center gap-1 px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Chấp nhận xóa
                                </button>
                                <button
                                  onClick={() => handleCancelDeleteRequest(item.id)}
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

                      {/* Comments / Partner Updates section */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-rose-500" />
                            <span>Cập nhật & Bình luận ({item.comments?.length || 0})</span>
                          </div>
                          {item.authorUid !== userProfile.uid && (
                            <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-medium">
                              Thêm cập nhật của bạn tại đây 💬
                            </span>
                          )}
                        </div>

                        {item.comments && item.comments.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {item.comments.map((comment) => (
                              <div key={comment.id} className="flex items-start justify-between gap-2 text-xs bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 group/cmt">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-rose-100 overflow-hidden shrink-0 mt-0.5">
                                    <img
                                      src={`https://api.dicebear.com/7.x/micah/svg?seed=${comment.authorUid}`}
                                      alt={comment.authorName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-bold text-slate-800 text-[11px] block">{comment.authorName}</span>
                                    <p className="text-slate-600 mt-0.5 leading-snug break-words">{comment.content}</p>
                                  </div>
                                </div>
                                {(comment.authorUid === userProfile.uid || item.authorUid === userProfile.uid) && (
                                  <button
                                    onClick={() => handleDeleteComment(item.id, comment.id)}
                                    className="text-slate-300 hover:text-rose-500 p-1 transition cursor-pointer shrink-0 opacity-80 group-hover/cmt:opacity-100"
                                    title="Xóa bình luận này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <form onSubmit={(e) => handleAddComment(item.id, e)} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={item.authorUid === userProfile.uid ? "Viết bình luận cho bài viết..." : "Thêm cập nhật hoặc bình luận cho bài đăng này..."}
                            value={commentInputs[item.id] || ''}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400 focus:bg-white"
                          />
                          <button
                            type="submit"
                            disabled={!commentInputs[item.id]?.trim()}
                            className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-40 shrink-0"
                          >
                            Gửi 💬
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCE */}
        {activeTab === 'finance' && (
          <FinanceTab userProfile={userProfile} coupleData={coupleData} journals={journals} />
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Tài Khoản & Thông Tin 👤</h2>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/micah/svg?seed=${userProfile.uid}`}
                    alt={userProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{userProfile.displayName}</h3>
                  <p className="text-xs text-slate-400">{userProfile.email}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Tên người yêu 1:</span>
                  <span className="font-bold text-slate-700">{coupleData?.user1Name || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Tên người yêu 2:</span>
                  <span className="font-bold text-slate-700">{coupleData?.user2Name || '---'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Ngày kỷ niệm:</span>
                  <span className="font-bold text-rose-600">{coupleData?.anniversaryDate || '---'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất tài khoản
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-rose-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 sm:px-4 rounded-2xl transition cursor-pointer ${
              activeTab === 'home'
                ? 'text-rose-600 font-bold bg-rose-100/70 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px]">Trang chủ</span>
          </button>

          {/* Tab 2: Journal */}
          <button
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 sm:px-4 rounded-2xl transition cursor-pointer ${
              activeTab === 'journal'
                ? 'text-rose-600 font-bold bg-rose-100/70 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px]">Nhật ký</span>
          </button>

          {/* Tab 3: Finance */}
          <button
            onClick={() => setActiveTab('finance')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 sm:px-4 rounded-2xl transition cursor-pointer ${
              activeTab === 'finance'
                ? 'text-rose-600 font-bold bg-rose-100/70 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[11px]">Tài chính</span>
          </button>

          {/* Tab 4: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 sm:px-4 rounded-2xl transition cursor-pointer ${
              activeTab === 'profile'
                ? 'text-rose-600 font-bold bg-rose-100/70 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[11px]">Tài khoản</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

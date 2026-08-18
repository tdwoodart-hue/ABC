import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  ADMIN_EMAILS,
  OUR_COUPLE_ID,
  repairCoupleSlots,
  updateFinanceTransaction,
  batchReassignFinancePayer
} from '../lib/firebase';
import { UserProfile, CoupleData, DeletedCommentRecord } from '../types';
import { 
  Users, 
  Shield, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Search, 
  Heart, 
  Layers, 
  Check, 
  X, 
  UserMinus, 
  Database,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Lock,
  UserCheck,
  DollarSign,
  Receipt,
  ArrowLeftRight,
  User as UserIcon,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Plus,
  RotateCcw,
  History,
  Archive
} from 'lucide-react';
import { formatDateVN, formatDateShortVN, formatDateTimeVN } from '../utils/formatDate';
import { EditTransactionModal } from './EditTransactionModal';

export interface AdminCommentItem {
  coupleId: string;
  journalId: string;
  journalTitle: string;
  journalDate: string;
  commentId: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

interface AdminTabProps {
  currentUser: UserProfile;
  onRefreshProfile?: () => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({ currentUser, onRefreshProfile }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [couplesList, setCouplesList] = useState<CoupleData[]>([]);
  const [financeList, setFinanceList] = useState<any[]>([]);
  const [commentsList, setCommentsList] = useState<AdminCommentItem[]>([]);
  const [deletedCommentsList, setDeletedCommentsList] = useState<DeletedCommentRecord[]>([]);
  const [commentViewMode, setCommentViewMode] = useState<'active' | 'deleted'>('active');
  const [commentSearchTerm, setCommentSearchTerm] = useState('');
  const [adminJournalsList, setAdminJournalsList] = useState<{ id: string; title: string; date: string; coupleId: string }[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<AdminCommentItem | null>(null);
  const [restoringCommentId, setRestoringCommentId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);

  // Add / Restore comment modal
  const [isAddCommentOpen, setIsAddCommentOpen] = useState(false);
  const [addCommentJournalId, setAddCommentJournalId] = useState('');
  const [addCommentAuthor, setAddCommentAuthor] = useState<'duong' | 'chuc'>('duong');
  const [addCommentContent, setAddCommentContent] = useState('');
  const [addingCommentLoading, setAddingCommentLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [financeSearchTerm, setFinanceSearchTerm] = useState('');
  const [selectedSubTab, setSelectedSubTab] = useState<'users' | 'couples' | 'comments' | 'finances' | 'system'>('users');
  const [editingAdminTx, setEditingAdminTx] = useState<any | null>(null);
  const [processingFinance, setProcessingFinance] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCouples: 0,
    totalJournals: 0,
    totalMeals: 0,
    totalFinance: 0,
    totalComments: 0
  });

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editCoupleId, setEditCoupleId] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Edit Couple Modal
  const [editingCouple, setEditingCouple] = useState<CoupleData | null>(null);
  const [coupleUser1Name, setCoupleUser1Name] = useState('');
  const [coupleUser2Name, setCoupleUser2Name] = useState('');
  const [coupleAnniversary, setCoupleAnniversary] = useState('');
  const [coupleStatusMsg, setCoupleStatusMsg] = useState('');
  const [coupleAddress, setCoupleAddress] = useState('');
  const [savingCouple, setSavingCouple] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'couple'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Users
      const fetchedUsers: UserProfile[] = [];
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach((d) => {
          const u = d.data() as UserProfile;
          fetchedUsers.push({
            ...u,
            uid: d.id,
            email: u.email || '',
            displayName: u.displayName || 'Chưa đặt tên',
            coupleId: u.coupleId || OUR_COUPLE_ID,
            createdAt: u.createdAt || new Date().toISOString()
          });
        });
      } catch (e) {
        console.warn('Lỗi đọc collection users:', e);
      }
      setUsersList(fetchedUsers);

      // 2. Gather All Couple IDs to inspect
      const coupleIdSet = new Set<string>();
      coupleIdSet.add(OUR_COUPLE_ID);
      if (currentUser.coupleId) coupleIdSet.add(currentUser.coupleId);
      fetchedUsers.forEach((u) => {
        if (u.coupleId) coupleIdSet.add(u.coupleId);
      });

      // Fetch root couples collection
      const coupleDocMap = new Map<string, CoupleData>();
      try {
        const couplesSnap = await getDocs(collection(db, 'couples'));
        couplesSnap.forEach((d) => {
          coupleIdSet.add(d.id);
          coupleDocMap.set(d.id, { id: d.id, ...d.data() } as CoupleData);
        });
      } catch (e) {
        console.warn('Lỗi đọc collection couples:', e);
      }

      // 3. For every couple ID, resolve doc & subcollections
      const fetchedCouples: CoupleData[] = [];
      const allFinancesMap = new Map<string, any>();
      const fetchedAllComments: AdminCommentItem[] = [];
      const fetchedDeletedComments: DeletedCommentRecord[] = [];
      const fetchedJournalsForAdmin: { id: string; title: string; date: string; coupleId: string }[] = [];
      let totalJournalsCount = 0;
      let totalMealsCount = 0;

      for (const cid of Array.from(coupleIdSet)) {
        let coupleData = coupleDocMap.get(cid);
        if (!coupleData) {
          try {
            const singleSnap = await getDoc(doc(db, 'couples', cid));
            if (singleSnap.exists()) {
              coupleData = { id: singleSnap.id, ...singleSnap.data() } as CoupleData;
            }
          } catch {
            // ignore
          }
        }

        fetchedCouples.push({
          id: cid,
          user1Id: coupleData?.user1Id || coupleData?.user1Uid || '',
          user1Name: coupleData?.user1Name || 'Người 1',
          user2Id: coupleData?.user2Id || coupleData?.user2Uid || '',
          user2Name: coupleData?.user2Name || 'Người 2',
          user1Uid: coupleData?.user1Uid || '',
          user2Uid: coupleData?.user2Uid || '',
          anniversaryDate: coupleData?.anniversaryDate || new Date().toISOString().split('T')[0],
          statusMessage: coupleData?.statusMessage || '',
          address: coupleData?.address || '',
          user1Avatar: coupleData?.user1Avatar || '',
          user2Avatar: coupleData?.user2Avatar || '',
          createdAt: coupleData?.createdAt || new Date().toISOString()
        });

        // Count journals & collect comments
        try {
          const jSnap = await getDocs(collection(db, 'couples', cid, 'journals'));
          totalJournalsCount += jSnap.size;
          jSnap.forEach((jDoc) => {
            const jData = jDoc.data();
            fetchedJournalsForAdmin.push({
              id: jDoc.id,
              title: jData.title || `Kỷ niệm ngày ${jData.date || ''}`,
              date: jData.date || '',
              coupleId: cid
            });

            if (Array.isArray(jData.comments)) {
              jData.comments.forEach((c: any) => {
                fetchedAllComments.push({
                  coupleId: cid,
                  journalId: jDoc.id,
                  journalTitle: jData.title || `Kỷ niệm ngày ${jData.date || ''}`,
                  journalDate: jData.date || '',
                  commentId: c.id || ('cmt_' + Math.random().toString(36).substring(2, 8)),
                  authorUid: c.authorUid || '',
                  authorName: c.authorName || 'Người dùng',
                  authorAvatar: c.authorAvatar || '',
                  content: c.content || '',
                  createdAt: c.createdAt || new Date().toISOString()
                });
              });
            }
          });
        } catch {
          // ignore
        }

        // Fetch deleted comments from recycle bin
        try {
          const delSnap = await getDocs(collection(db, 'couples', cid, 'deleted_comments'));
          delSnap.forEach((dDoc) => {
            const dData = dDoc.data();
            fetchedDeletedComments.push({
              id: dDoc.id,
              commentId: dData.commentId || dDoc.id,
              coupleId: cid,
              journalId: dData.journalId || '',
              journalTitle: dData.journalTitle || 'Kỷ niệm',
              journalDate: dData.journalDate || '',
              authorUid: dData.authorUid || '',
              authorName: dData.authorName || 'Người dùng',
              authorAvatar: dData.authorAvatar || '',
              content: dData.content || '',
              createdAt: dData.createdAt || '',
              deletedAt: dData.deletedAt || '',
              deletedByUid: dData.deletedByUid || '',
              deletedByName: dData.deletedByName || 'Admin',
              type: dData.type || 'journal_comment',
              imageIndex: dData.imageIndex,
              imageUrl: dData.imageUrl
            });
          });
        } catch {
          // ignore
        }

        // Count meals
        try {
          const mSnap = await getDocs(collection(db, 'couples', cid, 'nutrition_meals'));
          totalMealsCount += mSnap.size;
        } catch {
          // ignore
        }

        // Fetch finances
        try {
          const fSnap = await getDocs(collection(db, 'couples', cid, 'finances'));
          fSnap.forEach((docSnap) => {
            allFinancesMap.set(docSnap.id, {
              id: docSnap.id,
              coupleId: cid,
              ...docSnap.data()
            });
          });
        } catch {
          // ignore
        }
      }

      // Check root finances if any
      try {
        const rootFinSnap = await getDocs(collection(db, 'finances'));
        rootFinSnap.forEach((docSnap) => {
          if (!allFinancesMap.has(docSnap.id)) {
            allFinancesMap.set(docSnap.id, {
              id: docSnap.id,
              ...docSnap.data()
            });
          }
        });
      } catch {
        // ignore
      }

      const allFinances = Array.from(allFinancesMap.values());
      // Sort finances by date desc
      allFinances.sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });

      // Sort comments by createdAt desc
      fetchedAllComments.sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        return dateB.localeCompare(dateA);
      });

      // Sort deleted comments by deletedAt desc
      fetchedDeletedComments.sort((a, b) => {
        const dateA = a.deletedAt || a.createdAt || '';
        const dateB = b.deletedAt || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });

      setCouplesList(fetchedCouples);
      setFinanceList(allFinances);
      setCommentsList(fetchedAllComments);
      setDeletedCommentsList(fetchedDeletedComments);
      setAdminJournalsList(fetchedJournalsForAdmin);

      setStats({
        totalUsers: fetchedUsers.length,
        totalCouples: fetchedCouples.length,
        totalJournals: totalJournalsCount,
        totalMeals: totalMealsCount,
        totalFinance: allFinances.length,
        totalComments: fetchedAllComments.length
      });
    } catch (err: any) {
      console.error('Lỗi nạp dữ liệu admin:', err);
      setActionMsg({ type: 'error', text: 'Không thể nạp toàn bộ dữ liệu quản trị: ' + (err.message || '') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => {
      setActionMsg(null);
    }, 4000);
  };

  // Open Edit User
  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.displayName || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditAddress(user.address || '');
    setEditBirthday(user.birthday || '');
    setEditCoupleId(user.coupleId || OUR_COUPLE_ID);
    setEditIsAdmin(!!user.isAdmin || (user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase().trim()) : false));
  };

  // Save User Edit
  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      const updates: Partial<UserProfile> = {
        displayName: editName.trim() || 'Người dùng',
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        birthday: editBirthday.trim(),
        coupleId: editCoupleId.trim() || OUR_COUPLE_ID,
        isAdmin: editIsAdmin
      };

      await updateDoc(userRef, updates);

      // Sync with couple if user1 or user2
      if (editCoupleId) {
        const coupleRef = doc(db, 'couples', editCoupleId);
        const coupleDoc = couplesList.find(c => c.id === editCoupleId);
        if (coupleDoc) {
          const coupleUpdates: Record<string, any> = {};
          if (coupleDoc.user1Id === editingUser.uid || coupleDoc.user1Uid === editingUser.uid) {
            coupleUpdates.user1Name = editName.trim();
            coupleUpdates.user1Phone = editPhone.trim();
            coupleUpdates.user1Birthday = editBirthday.trim();
          } else if (coupleDoc.user2Id === editingUser.uid || coupleDoc.user2Uid === editingUser.uid) {
            coupleUpdates.user2Name = editName.trim();
            coupleUpdates.user2Phone = editPhone.trim();
            coupleUpdates.user2Birthday = editBirthday.trim();
          }
          if (Object.keys(coupleUpdates).length > 0) {
            await updateDoc(coupleRef, coupleUpdates);
          }
        }
      }

      showNotification('success', `Đã cập nhật thông tin tài khoản ${editName} thành công.`);
      setEditingUser(null);
      await fetchAdminData();
      if (editingUser.uid === currentUser.uid && onRefreshProfile) {
        onRefreshProfile();
      }
    } catch (err: any) {
      showNotification('error', 'Lỗi cập nhật tài khoản: ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  // Open Edit Couple
  const handleOpenEditCouple = (couple: CoupleData) => {
    setEditingCouple(couple);
    setCoupleUser1Name(couple.user1Name || '');
    setCoupleUser2Name(couple.user2Name || '');
    setCoupleAnniversary(couple.anniversaryDate || '');
    setCoupleStatusMsg(couple.statusMessage || '');
    setCoupleAddress(couple.address || '');
  };

  // Save Couple Edit
  const handleSaveCouple = async () => {
    if (!editingCouple) return;
    setSavingCouple(true);
    try {
      const coupleRef = doc(db, 'couples', editingCouple.id);
      await updateDoc(coupleRef, {
        user1Name: coupleUser1Name.trim() || 'Người 1',
        user2Name: coupleUser2Name.trim() || 'Người 2',
        anniversaryDate: coupleAnniversary || new Date().toISOString().split('T')[0],
        statusMessage: coupleStatusMsg.trim(),
        address: coupleAddress.trim()
      });

      showNotification('success', `Đã lưu thông tin phòng cặp đôi ${editingCouple.id}.`);
      setEditingCouple(null);
      await fetchAdminData();
      if (onRefreshProfile) onRefreshProfile();
    } catch (err: any) {
      showNotification('error', 'Lỗi lưu thông tin cặp đôi: ' + err.message);
    } finally {
      setSavingCouple(false);
    }
  };

  // Clear slot in couple
  const handleClearCoupleSlot = async (coupleId: string, slot: 1 | 2) => {
    try {
      const coupleRef = doc(db, 'couples', coupleId);
      if (slot === 1) {
        await updateDoc(coupleRef, {
          user1Id: '',
          user1Uid: '',
          user1Name: 'Chưa có người vào'
        });
      } else {
        await updateDoc(coupleRef, {
          user2Id: '',
          user2Uid: '',
          user2Name: 'Chờ người yêu vào...'
        });
      }
      showNotification('success', `Đã giải phóng vị trí Slot ${slot} của phòng ${coupleId}.`);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi giải phóng slot: ' + err.message);
    }
  };

  // Quick repair: Duong -> Slot 1, Chuc Ga -> Slot 2
  const handleRepairSlots = async () => {
    try {
      const duongUser = usersList.find(u => u.email?.toLowerCase().includes('duong') || u.email?.toLowerCase().includes('tdwoodart'));
      const chucgaUser = usersList.find(u => u.email?.toLowerCase().includes('chucga'));

      await repairCoupleSlots(duongUser?.uid, chucgaUser?.uid);
      showNotification('success', 'Đã khôi phục chuẩn xác: Dương (Slot 1) & Chúc Gà (Slot 2)!');
      await fetchAdminData();
      if (onRefreshProfile) onRefreshProfile();
    } catch (err: any) {
      showNotification('error', 'Lỗi khôi phục tài khoản: ' + err.message);
    }
  };

  // 1-Click Reassign Payer for Single Transaction
  const handleReassignPayerSingle = async (coupleId: string, txId: string, targetUid: string, targetName: string) => {
    setProcessingFinance(true);
    try {
      await updateFinanceTransaction(coupleId, txId, {
        paidByUid: targetUid,
        paidByName: targetName
      });
      showNotification('success', `Đã chuyển người thanh toán giao dịch sang "${targetName}" thành công!`);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi đổi người thanh toán: ' + err.message);
    } finally {
      setProcessingFinance(false);
    }
  };

  // Batch Reassign All Transactions for a Couple
  const handleBatchReassignAll = async (targetUid: string, targetName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển TẤT CẢ các khoản thu chi hiện có sang "${targetName}"?`)) {
      return;
    }
    setProcessingFinance(true);
    try {
      // Find couple ID (default to OUR_COUPLE_ID or currentUser.coupleId)
      const targetCoupleId = currentUser.coupleId || OUR_COUPLE_ID;
      const count = await batchReassignFinancePayer(targetCoupleId, targetUid, targetName);
      showNotification('success', `Đã đồng bộ & chuyển toàn bộ ${count} giao dịch sang "${targetName}"!`);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi chuyển giao dịch hàng loạt: ' + err.message);
    } finally {
      setProcessingFinance(false);
    }
  };

  // Delete Finance Transaction from Admin
  const handleDeleteFinanceTx = async (coupleId: string, txId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    try {
      await deleteDoc(doc(db, 'couples', coupleId, 'finances', txId));
      showNotification('success', 'Đã xóa giao dịch thành công.');
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi xóa giao dịch: ' + err.message);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'user') {
        await deleteDoc(doc(db, 'users', deleteTarget.id));
        showNotification('success', `Đã xóa tài khoản ${deleteTarget.name} khỏi hệ thống.`);
      } else if (deleteTarget.type === 'couple') {
        await deleteDoc(doc(db, 'couples', deleteTarget.id));
        showNotification('success', `Đã xóa phòng đôi ${deleteTarget.id}.`);
      }
      setDeleteTarget(null);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi xóa dữ liệu: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Admin Delete Comment: Open custom confirmation dialog
  const handleAdminDeleteComment = (comment: AdminCommentItem) => {
    setCommentToDelete(comment);
  };

  // Confirm delete comment
  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return;
    setDeletingCommentId(commentToDelete.commentId);
    try {
      const journalRef = doc(db, 'couples', commentToDelete.coupleId, 'journals', commentToDelete.journalId);
      const jSnap = await getDoc(journalRef);
      if (!jSnap.exists()) {
        showNotification('error', 'Không tìm thấy bài viết chứa bình luận này.');
        return;
      }
      const data = jSnap.data();
      const currentComments = data.comments || [];
      const deletedCmt = currentComments.find((c: any) => c.id === commentToDelete.commentId);
      const updated = currentComments.filter((c: any) => c.id !== commentToDelete.commentId);

      // Save into deleted_comments subcollection (Recycle bin)
      const delDocRef = doc(collection(db, 'couples', commentToDelete.coupleId, 'deleted_comments'));
      await setDoc(delDocRef, {
        id: delDocRef.id,
        commentId: commentToDelete.commentId,
        coupleId: commentToDelete.coupleId,
        journalId: commentToDelete.journalId,
        journalTitle: commentToDelete.journalTitle || 'Kỷ niệm',
        journalDate: commentToDelete.journalDate || '',
        authorUid: commentToDelete.authorUid || (deletedCmt?.authorUid || ''),
        authorName: commentToDelete.authorName || (deletedCmt?.authorName || 'Người dùng'),
        authorAvatar: commentToDelete.authorAvatar || (deletedCmt?.authorAvatar || ''),
        content: commentToDelete.content || (deletedCmt?.content || ''),
        createdAt: commentToDelete.createdAt || (deletedCmt?.createdAt || new Date().toISOString()),
        deletedAt: new Date().toISOString(),
        deletedByUid: currentUser.uid,
        deletedByName: currentUser.displayName || 'Admin',
        type: 'journal_comment'
      });

      await updateDoc(journalRef, {
        comments: updated
      });
      showNotification('success', `Đã xóa bình luận của "${commentToDelete.authorName}" và lưu vào Thùng rác. Bạn có thể khôi phục lại bất kỳ lúc nào.`);
      setCommentToDelete(null);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi khi xóa bình luận: ' + err.message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 1-Click Restore Deleted Comment from Recycle Bin
  const handleAdminRestoreDeletedComment = async (item: DeletedCommentRecord) => {
    setRestoringCommentId(item.id);
    try {
      const journalRef = doc(db, 'couples', item.coupleId, 'journals', item.journalId);
      const jSnap = await getDoc(journalRef);
      if (!jSnap.exists()) {
        showNotification('error', 'Không tìm thấy bài viết gốc để khôi phục bình luận.');
        return;
      }
      const data = jSnap.data();

      if (item.type === 'image_comment') {
        const currentImgCmts = data.imageComments || [];
        const restoredImgCmt = {
          id: item.commentId || ('img_cmt_' + Date.now()),
          imageIndex: item.imageIndex ?? 0,
          imageUrl: item.imageUrl,
          authorName: item.authorName,
          authorUid: item.authorUid,
          content: item.content,
          createdAt: item.createdAt || new Date().toISOString()
        };
        await updateDoc(journalRef, {
          imageComments: [...currentImgCmts, restoredImgCmt]
        });
      } else {
        const currentComments = data.comments || [];
        const restoredCommentObj = {
          id: item.commentId || ('cmt_' + Date.now()),
          authorUid: item.authorUid,
          authorName: item.authorName,
          authorAvatar: item.authorAvatar || '',
          content: item.content,
          createdAt: item.createdAt || new Date().toISOString()
        };
        await updateDoc(journalRef, {
          comments: [...currentComments, restoredCommentObj]
        });
      }

      // Remove from deleted_comments subcollection
      await deleteDoc(doc(db, 'couples', item.coupleId, 'deleted_comments', item.id));
      showNotification('success', `Đã khôi phục thành công bình luận của "${item.authorName}" vào bài viết "${item.journalTitle || 'Kỷ niệm'}"! ✨`);
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi khôi phục: ' + err.message);
    } finally {
      setRestoringCommentId(null);
    }
  };

  // Permanent Delete Comment from Recycle Bin
  const handleAdminPermanentDeleteComment = async (item: DeletedCommentRecord) => {
    if (!window.confirm(`Xóa VĨNH VIỄN bình luận này khỏi Thùng rác?\n\n"${item.content}"`)) return;
    setPermanentDeletingId(item.id);
    try {
      await deleteDoc(doc(db, 'couples', item.coupleId, 'deleted_comments', item.id));
      showNotification('success', 'Đã xóa vĩnh viễn bình luận khỏi thùng rác.');
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi khi xóa vĩnh viễn: ' + err.message);
    } finally {
      setPermanentDeletingId(null);
    }
  };

  // Admin Add / Restore Comment
  const handleAdminAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCommentJournalId || !addCommentContent.trim()) return;
    setAddingCommentLoading(true);
    try {
      const targetJournal = adminJournalsList.find(j => j.id === addCommentJournalId);
      if (!targetJournal) {
        showNotification('error', 'Không tìm thấy bài viết đã chọn.');
        return;
      }

      const isD = addCommentAuthor === 'duong';
      const authorName = isD ? 'Dương' : 'Chúc Gà';
      const authorUid = isD ? (usersList.find(u => u.email?.toLowerCase().includes('duong'))?.uid || 'duong_uid') : (usersList.find(u => u.email?.toLowerCase().includes('chucga'))?.uid || 'chuc_uid');

      const newCmt = {
        id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorUid,
        authorName,
        content: addCommentContent.trim(),
        createdAt: new Date().toISOString()
      };

      const journalRef = doc(db, 'couples', targetJournal.coupleId, 'journals', targetJournal.id);
      const jSnap = await getDoc(journalRef);
      if (!jSnap.exists()) {
        showNotification('error', 'Bài viết không tồn tại trong cơ sở dữ liệu.');
        return;
      }
      const currentComments = jSnap.data()?.comments || [];
      await updateDoc(journalRef, {
        comments: [...currentComments, newCmt]
      });

      showNotification('success', `Đã thêm/khôi phục bình luận cho bài viết "${targetJournal.title}".`);
      setIsAddCommentOpen(false);
      setAddCommentContent('');
      await fetchAdminData();
    } catch (err: any) {
      showNotification('error', 'Lỗi thêm bình luận: ' + err.message);
    } finally {
      setAddingCommentLoading(false);
    }
  };

  const filteredComments = commentsList.filter(c => {
    const q = commentSearchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.content.toLowerCase().includes(q) ||
      c.authorName.toLowerCase().includes(q) ||
      c.journalTitle.toLowerCase().includes(q) ||
      c.journalDate.includes(q)
    );
  });

  const filteredDeletedComments = deletedCommentsList.filter(c => {
    const q = commentSearchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      c.content.toLowerCase().includes(q) ||
      c.authorName.toLowerCase().includes(q) ||
      (c.journalTitle && c.journalTitle.toLowerCase().includes(q)) ||
      (c.journalDate && c.journalDate.includes(q))
    );
  });

  const filteredUsers = usersList.filter(u => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.coupleId && u.coupleId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Action Notification */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{actionMsg.text}</span>
          <button 
            type="button" 
            onClick={() => setActionMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Header & Stats */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">Quản trị Hệ thống</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
                  Admin Master
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý toàn diện tài khoản thành viên, phòng cặp đôi và dữ liệu cơ sở dữ liệu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-500' : ''}`} />
              <span>{refreshing ? 'Đang làm mới...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
          <div 
            onClick={() => setSelectedSubTab('users')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition ${
              selectedSubTab === 'users' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <p className="text-xs text-slate-500 font-medium">Tài khoản</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.totalUsers}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Người dùng</p>
          </div>

          <div 
            onClick={() => setSelectedSubTab('couples')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition ${
              selectedSubTab === 'couples' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400' : 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-200/80'
            }`}
          >
            <p className="text-xs text-rose-600 font-medium">Cặp đôi</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{stats.totalCouples}</p>
            <p className="text-[10px] text-rose-400 mt-0.5">Phòng đôi</p>
          </div>

          <div 
            onClick={() => setSelectedSubTab('comments')}
            className={`p-4 rounded-2xl border text-center cursor-pointer transition ${
              selectedSubTab === 'comments' ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-400' : 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-200/80'
            }`}
          >
            <p className="text-xs text-purple-600 font-medium">Bình luận</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{stats.totalComments}</p>
            <p className="text-[10px] text-purple-400 mt-0.5">Toàn hệ thống</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-center">
            <p className="text-xs text-blue-600 font-medium">Nhật ký</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{stats.totalJournals}</p>
            <p className="text-[10px] text-blue-400 mt-0.5">Bài viết</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-center">
            <p className="text-xs text-emerald-600 font-medium">Dinh dưỡng</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.totalMeals}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Bữa ăn</p>
          </div>

          <div 
            onClick={() => setSelectedSubTab('finances')}
            className={`p-4 rounded-2xl border text-center col-span-2 sm:col-span-1 cursor-pointer transition ${
              selectedSubTab === 'finances' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/80'
            }`}
          >
            <p className="text-xs text-amber-600 font-medium">Tài chính</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.totalFinance}</p>
            <p className="text-[10px] text-amber-400 mt-0.5">Giao dịch</p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setSelectedSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            selectedSubTab === 'users'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh sách Tài khoản ({usersList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('couples')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            selectedSubTab === 'couples'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Quản lý Cặp đôi ({couplesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('comments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            selectedSubTab === 'comments'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Quản lý & Xóa Bình luận ({commentsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('finances')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            selectedSubTab === 'finances'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Sửa Thu Chi & Người Trả ({financeList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSubTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            selectedSubTab === 'system'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Hệ thống & Cấu hình</span>
        </button>
      </div>

      {/* SUB-TAB 1: USERS MANAGEMENT */}
      {selectedSubTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                Danh sách Tài khoản người dùng
              </h3>
              <p className="text-xs text-slate-500">Xem, chỉnh sửa quyền hạn và quản lý toàn bộ thành viên</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-rose-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải danh sách tài khoản...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Không tìm thấy tài khoản nào khớp với từ khóa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                    <th className="py-3 px-3">Thành viên</th>
                    <th className="py-3 px-3">Email & UID</th>
                    <th className="py-3 px-3">Liên hệ</th>
                    <th className="py-3 px-3">Phòng Đôi</th>
                    <th className="py-3 px-3">Vai trò</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSuperAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
                    const isAdmin = !!user.isAdmin || isSuperAdmin;
                    const isSelf = user.uid === currentUser.uid;

                    return (
                      <tr key={user.uid} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={user.avatarUrl || user.photoURL || `https://api.dicebear.com/7.x/micah/svg?seed=${user.uid}`}
                              alt={user.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-white"
                            />
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{user.displayName}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Bạn
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Tham gia: {formatDateVN(user.createdAt?.split('T')[0] || '')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-700">{user.email || 'Không có email'}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{user.uid}</p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="text-slate-600">{user.phone || 'Chưa cập nhật'}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.address || 'Chưa có địa chỉ'}</p>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-mono text-[11px] border border-rose-100 font-semibold">
                            {user.coupleId || OUR_COUPLE_ID}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Thành viên
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              title="Chỉnh sửa tài khoản"
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: 'user', id: user.uid, name: user.displayName })}
                                title="Xóa tài khoản"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: COUPLE ROOMS MANAGEMENT */}
      {selectedSubTab === 'couples' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Quản lý Không gian Cặp đôi
              </h3>
              <p className="text-xs text-slate-500">Xem phòng đôi, quản lý vị trí thành viên và giải phóng slot khi cần</p>
            </div>
            <button
              type="button"
              onClick={handleRepairSlots}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
              <span>Đồng bộ chuẩn: Dương (Slot 1) & Chúc Gà (Slot 2)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {couplesList.map((couple) => (
              <div key={couple.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                      Phòng ID: {couple.id}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Kỷ niệm: {formatDateVN(couple.anniversaryDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCouple(couple)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                  </div>
                </div>

                {/* Slots: User 1 and User 2 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Slot 1 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">VỊ TRÍ 1 (User 1)</span>
                      {couple.user1Id && (
                        <button
                          type="button"
                          onClick={() => handleClearCoupleSlot(couple.id, 1)}
                          title="Giải phóng vị trí 1"
                          className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Giải phóng
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">{couple.user1Name || 'Chưa có người'}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">UID: {couple.user1Id || couple.user1Uid || 'Trống'}</p>
                  </div>

                  {/* Slot 2 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">VỊ TRÍ 2 (User 2)</span>
                      {couple.user2Id && (
                        <button
                          type="button"
                          onClick={() => handleClearCoupleSlot(couple.id, 2)}
                          title="Giải phóng vị trí 2"
                          className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Giải phóng
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">{couple.user2Name || 'Chưa có người'}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">UID: {couple.user2Id || couple.user2Uid || 'Trống'}</p>
                  </div>
                </div>

                {/* Status Message */}
                {couple.statusMessage && (
                  <div className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 text-xs text-rose-800 italic">
                    "{couple.statusMessage}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: COMMENTS MANAGEMENT */}
      {selectedSubTab === 'comments' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                Quản lý & Khôi Phục Bình Luận
              </h3>
              <p className="text-xs text-slate-500">
                Xem toàn bộ bình luận đang hiển thị hoặc khôi phục 1-chạm những bình luận đã từng bị xóa từ Thùng rác.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search Comments */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nội dung, tác giả, bài viết..."
                  value={commentSearchTerm}
                  onChange={(e) => setCommentSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-purple-500 transition"
                />
                {commentSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setCommentSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Add Comment Button */}
              <button
                type="button"
                onClick={() => {
                  if (adminJournalsList.length > 0) {
                    setAddCommentJournalId(adminJournalsList[0].id);
                  }
                  setIsAddCommentOpen(true);
                }}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Viết thêm cmt</span>
              </button>
            </div>
          </div>

          {/* Toggle View: Active vs Recycle Bin (Deleted) */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setCommentViewMode('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                commentViewMode === 'active'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Bình luận đang hiển thị ({filteredComments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentViewMode('deleted')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                commentViewMode === 'deleted'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Thùng rác & Đã xóa ({filteredDeletedComments.length})</span>
              {deletedCommentsList.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${commentViewMode === 'deleted' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
                  {deletedCommentsList.length}
                </span>
              )}
            </button>
          </div>

          {/* ACTIVE COMMENTS VIEW */}
          {commentViewMode === 'active' && (
            <div>
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải danh sách bình luận...</span>
                </div>
              ) : filteredComments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p>{commentSearchTerm ? 'Không tìm thấy bình luận nào khớp với từ khóa tìm kiếm.' : 'Chưa có bình luận nào trên toàn hệ thống.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                    <span>Hiển thị <strong>{filteredComments.length}</strong> bình luận đang hoạt động:</span>
                    <span className="text-[11px] text-slate-400">Khi xóa, bình luận sẽ được lưu vào Thùng rác để có thể khôi phục lại</span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {filteredComments.map((comment) => (
                      <div
                        key={comment.commentId}
                        className="p-4 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 mt-0.5 border border-purple-200 overflow-hidden">
                            {comment.authorAvatar ? (
                              <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{comment.authorName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Comment Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs">
                                {comment.authorName}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-100">
                                Bài viết: {comment.journalTitle} ({comment.journalDate})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {comment.createdAt ? formatDateTimeVN(comment.createdAt) : ''}
                              </span>
                            </div>

                            {/* Content text */}
                            <p className="text-xs text-slate-700 mt-1 leading-relaxed break-words bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {comment.content}
                            </p>
                          </div>
                        </div>

                        {/* Action: Delete Button */}
                        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <button
                            type="button"
                            disabled={deletingCommentId === comment.commentId}
                            onClick={() => handleAdminDeleteComment(comment)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-bold rounded-xl text-xs border border-rose-200/80 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Xóa bình luận này (lưu vào Thùng rác)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deletingCommentId === comment.commentId ? 'Đang xóa...' : 'Xóa cmt'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DELETED COMMENTS / RECYCLE BIN VIEW */}
          {commentViewMode === 'deleted' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                <History className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Thùng rác & Lịch sử bình luận đã xóa</p>
                  <p className="text-amber-800 text-[11px]">
                    Toàn bộ bình luận đã từng bị xóa được bảo lưu tại đây. Bạn chỉ cần nhấn nút <strong>"Khôi phục lại bài viết"</strong> để đưa bình luận trở lại đúng bài viết gốc với 1 chạm.
                  </p>
                </div>
              </div>

              {filteredDeletedComments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2 border border-dashed border-slate-200 rounded-2xl">
                  <Archive className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p>{commentSearchTerm ? 'Không tìm thấy bình luận đã xóa nào khớp từ khóa.' : 'Thùng rác hiện đang trống. Chưa có bình luận nào bị xóa gần đây.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                    <span>Có <strong>{filteredDeletedComments.length}</strong> bình luận trong Thùng rác:</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">Bấm nút xanh lá để Khôi phục lập tức</span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {filteredDeletedComments.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 border border-amber-200 overflow-hidden">
                            {item.authorAvatar ? (
                              <img src={item.authorAvatar} alt={item.authorName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{item.authorName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs">
                                {item.authorName}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200">
                                Bài viết: {item.journalTitle || 'Kỷ niệm'} {item.journalDate ? `(${item.journalDate})` : ''}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Đã xóa lúc: {item.deletedAt ? formatDateTimeVN(item.deletedAt) : 'Gần đây'}
                              </span>
                              {item.deletedByName && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  Bởi: {item.deletedByName}
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed break-words bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/70 font-medium">
                              "{item.content}"
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          {/* 1-Click Restore */}
                          <button
                            type="button"
                            disabled={restoringCommentId === item.id}
                            onClick={() => handleAdminRestoreDeletedComment(item)}
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                            title="Khôi phục lại vào bài viết này"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${restoringCommentId === item.id ? 'animate-spin' : ''}`} />
                            <span>{restoringCommentId === item.id ? 'Đang khôi phục...' : 'Khôi phục lại bài viết ✨'}</span>
                          </button>

                          {/* Permanent Delete */}
                          <button
                            type="button"
                            disabled={permanentDeletingId === item.id}
                            onClick={() => handleAdminPermanentDeleteComment(item)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition cursor-pointer"
                            title="Xóa vĩnh viễn khỏi thùng rác"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: FINANCES MANAGEMENT */}
      {selectedSubTab === 'finances' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                Quản lý Thu Chi & Đổi Người Chi Trả (Admin Master)
              </h3>
              <p className="text-xs text-slate-500">
                Sửa người đã thanh toán các giao dịch (Ví dụ: Chúc nhập nhưng bị nhận nhầm thành Dương)
              </p>
            </div>

            {/* Search Tx */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm giao dịch, tên người trả..."
                value={financeSearchTerm}
                onChange={(e) => setFinanceSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-rose-500 transition"
              />
            </div>
          </div>

          {/* Quick Batch Assignment Tools */}
          {(() => {
            const duongUser = usersList.find(u => u.email?.toLowerCase().includes('duong') || u.email?.toLowerCase().includes('tdwoodart')) || { uid: 'duong-uid', displayName: 'Dương' };
            const chucUser = usersList.find(u => u.email?.toLowerCase().includes('chucga')) || { uid: 'chucga-uid', displayName: 'Chúc Gà' };

            return (
              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                  <span>Công cụ Chuyển đổi Hàng loạt Nhanh (Batch Reassignment):</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Nếu trước đó toàn bộ chi tiêu do Chúc nhập bị gán nhầm sang Dương (hoặc ngược lại), dùng nút dưới đây để đổi ngay lập tức:
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={processingFinance}
                    onClick={() => handleBatchReassignAll(chucUser.uid, chucUser.displayName || 'Chúc Gà')}
                    className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Chuyển TẤT CẢ giao dịch sang: {chucUser.displayName || 'Chúc Gà'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={processingFinance}
                    onClick={() => handleBatchReassignAll(duongUser.uid, duongUser.displayName || 'Dương')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Chuyển TẤT CẢ giao dịch sang: {duongUser.displayName || 'Dương'}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Transactions List */}
          {(() => {
            const duongUser = usersList.find(u => u.email?.toLowerCase().includes('duong') || u.email?.toLowerCase().includes('tdwoodart')) || { uid: 'duong-uid', displayName: 'Dương' };
            const chucUser = usersList.find(u => u.email?.toLowerCase().includes('chucga')) || { uid: 'chucga-uid', displayName: 'Chúc Gà' };

            const filteredFinances = financeList.filter(tx => {
              if (!financeSearchTerm.trim()) return true;
              const q = financeSearchTerm.toLowerCase();
              return (
                (tx.title && tx.title.toLowerCase().includes(q)) ||
                (tx.paidByName && tx.paidByName.toLowerCase().includes(q)) ||
                (tx.category && tx.category.toLowerCase().includes(q)) ||
                (tx.amount && tx.amount.toString().includes(q))
              );
            });

            if (filteredFinances.length === 0) {
              return (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  Chưa có giao dịch thu chi nào trong hệ thống.
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2">
                  <span>Tìm thấy {filteredFinances.length} giao dịch:</span>
                  <span className="text-[11px] text-slate-400">Click nút để đổi người trả ngay lập tức</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
                  {filteredFinances.map(tx => {
                    const isPaidByChuc = tx.paidByUid === chucUser.uid || tx.paidByName?.toLowerCase().includes('chúc') || tx.paidByName?.toLowerCase().includes('chuc');
                    const isPaidByDuong = tx.paidByUid === duongUser.uid || tx.paidByName?.toLowerCase().includes('dương') || tx.paidByName?.toLowerCase().includes('duong');

                    return (
                      <div key={tx.id} className="p-3.5 bg-white hover:bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            tx.type === 'income' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}>
                            <Receipt className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{tx.title}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                {tx.category || 'Khác'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {tx.date ? formatDateShortVN(tx.date) : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] mt-1">
                              <span className="text-slate-500">Người chi:</span>
                              <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                isPaidByChuc 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : isPaidByDuong 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-slate-200 text-slate-700'
                              }`}>
                                {tx.paidByName || (isPaidByChuc ? chucUser.displayName : isPaidByDuong ? duongUser.displayName : 'Chưa rõ')}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">({tx.paidByUid ? tx.paidByUid.slice(0, 8) + '...' : 'Không có UID'})</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Admin Actions */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <span className={`font-black text-xs ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {tx.type === 'income' ? '+' : '-'}{(tx.amount || 0).toLocaleString('vi-VN')} đ
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Quick Switch Button 1: Chuc Ga */}
                            <button
                              type="button"
                              disabled={processingFinance || isPaidByChuc}
                              onClick={() => handleReassignPayerSingle(tx.coupleId || OUR_COUPLE_ID, tx.id, chucUser.uid, chucUser.displayName || 'Chúc Gà')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                isPaidByChuc
                                  ? 'bg-rose-50 text-rose-300 border border-rose-100 cursor-default'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                              title="Gán người trả cho Chúc Gà"
                            >
                              Gán: {chucUser.displayName || 'Chúc'}
                            </button>

                            {/* Quick Switch Button 2: Duong */}
                            <button
                              type="button"
                              disabled={processingFinance || isPaidByDuong}
                              onClick={() => handleReassignPayerSingle(tx.coupleId || OUR_COUPLE_ID, tx.id, duongUser.uid, duongUser.displayName || 'Dương')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                isPaidByDuong
                                  ? 'bg-blue-50 text-blue-300 border border-blue-100 cursor-default'
                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              }`}
                              title="Gán người trả cho Dương"
                            >
                              Gán: {duongUser.displayName || 'Dương'}
                            </button>

                            {/* Detailed Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingAdminTx(tx)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                              title="Chỉnh sửa chi tiết"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteFinanceTx(tx.coupleId || OUR_COUPLE_ID, tx.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                              title="Xóa giao dịch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB 3: SYSTEM INFO */}
      {selectedSubTab === 'system' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-rose-500" />
              Thông tin Hệ thống & Quyền Quản trị
            </h3>
            <p className="text-xs text-slate-500">Cấu hình kết nối Firebase Firestore và danh sách Admin Master</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-700">Email Quản trị viên Master (Super Admin):</p>
              <div className="flex items-center gap-2 flex-wrap">
                {ADMIN_EMAILS.map(email => (
                  <span key={email} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
                    {email}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-700">Không gian chung mặc định:</p>
              <p className="text-slate-600 font-mono">ID: {OUR_COUPLE_ID}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-700">Tài khoản đang đăng nhập:</p>
              <p className="text-slate-600">{currentUser.displayName} ({currentUser.email})</p>
              <p className="text-[11px] text-slate-400 font-mono">UID: {currentUser.uid}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Chỉnh sửa tài khoản</h4>
                  <p className="text-[11px] text-slate-400">UID: {editingUser.uid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên hiển thị</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  placeholder="Nhập tên..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                    placeholder="0987..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={editBirthday}
                    onChange={(e) => setEditBirthday(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã Không gian đôi</label>
                  <input
                    type="text"
                    value={editCoupleId}
                    onChange={(e) => setEditCoupleId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition font-mono"
                    placeholder="our_couple"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  placeholder="Địa chỉ cư trú..."
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-400"
                  />
                  <span className="font-bold text-slate-800">Cấp quyền Quản trị viên (Admin) cho tài khoản này</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={savingUser}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingUser ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COUPLE */}
      {editingCouple && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Chỉnh sửa Phòng đôi</h4>
                  <p className="text-[11px] text-slate-400">ID: {editingCouple.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCouple(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tên Người 1</label>
                  <input
                    type="text"
                    value={coupleUser1Name}
                    onChange={(e) => setCoupleUser1Name(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tên Người 2</label>
                  <input
                    type="text"
                    value={coupleUser2Name}
                    onChange={(e) => setCoupleUser2Name(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngày kỷ niệm</label>
                <input
                  type="date"
                  value={coupleAnniversary}
                  onChange={(e) => setCoupleAnniversary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa chỉ chung</label>
                <input
                  type="text"
                  value={coupleAddress}
                  onChange={(e) => setCoupleAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition"
                  placeholder="Địa chỉ nhà chung..."
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lời nhắn trạng thái</label>
                <textarea
                  rows={3}
                  value={coupleStatusMsg}
                  onChange={(e) => setCoupleStatusMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-rose-500 transition resize-none"
                  placeholder="Lời nhắn yêu thương..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCouple(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCouple}
                disabled={savingCouple}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {savingCouple ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800">Xác nhận xóa {deleteTarget.type === 'user' ? 'tài khoản' : 'phòng'}?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa <span className="font-bold text-slate-800">{deleteTarget.name}</span>? Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE COMMENT */}
      {commentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">Xác nhận Xóa Bình Luận</h4>
                <p className="text-xs text-slate-500">Quyền Admin Master hệ thống</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Người viết: <strong className="text-slate-800">{commentToDelete.authorName}</strong></span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200">{commentToDelete.journalDate}</span>
              </div>
              <div className="text-slate-500">
                Bài viết: <strong className="text-slate-800">{commentToDelete.journalTitle}</strong>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 italic leading-relaxed break-words">
                "{commentToDelete.content}"
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
              ⚠️ Bình luận này sẽ bị gỡ bỏ vĩnh viễn khỏi bài viết kỷ niệm. Bạn có chắc chắn muốn xóa không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                disabled={!!deletingCommentId}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteComment}
                disabled={!!deletingCommentId}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingCommentId ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / RESTORE COMMENT */}
      {isAddCommentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-800">Thêm / Khôi phục Bình luận</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCommentOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminAddComment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn bài viết kỷ niệm:
                </label>
                <select
                  value={addCommentJournalId}
                  onChange={(e) => setAddCommentJournalId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-purple-500"
                  required
                >
                  {adminJournalsList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.date || 'Không có ngày'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người đăng bình luận:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddCommentAuthor('duong')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      addCommentAuthor === 'duong'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Dương
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddCommentAuthor('chuc')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      addCommentAuthor === 'chuc'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Chúc Gà
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung bình luận:
                </label>
                <textarea
                  rows={3}
                  value={addCommentContent}
                  onChange={(e) => setAddCommentContent(e.target.value)}
                  placeholder="Nhập nội dung bình luận muốn thêm hoặc khôi phục..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-purple-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCommentOpen(false)}
                  disabled={addingCommentLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addingCommentLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingCommentLoading ? 'Đang lưu...' : 'Lưu bình luận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FINANCE TRANSACTION */}
      {editingAdminTx && (
        <EditTransactionModal
          isOpen={!!editingAdminTx}
          onClose={() => setEditingAdminTx(null)}
          coupleId={editingAdminTx.coupleId || currentUser.coupleId || OUR_COUPLE_ID}
          transaction={editingAdminTx}
          partner1={{
            uid: usersList.find(u => u.email?.toLowerCase().includes('duong'))?.uid || currentUser.uid,
            name: usersList.find(u => u.email?.toLowerCase().includes('duong'))?.displayName || 'Dương'
          }}
          partner2={{
            uid: usersList.find(u => u.email?.toLowerCase().includes('chucga'))?.uid || 'chucga-uid',
            name: usersList.find(u => u.email?.toLowerCase().includes('chucga'))?.displayName || 'Chúc Gà'
          }}
          onDelete={async (txId) => {
            await handleDeleteFinanceTx(editingAdminTx.coupleId || OUR_COUPLE_ID, txId);
            setEditingAdminTx(null);
          }}
        />
      )}
    </div>
  );
};

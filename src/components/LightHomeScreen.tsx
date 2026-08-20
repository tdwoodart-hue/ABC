// LIGHT_HOME_LOCAL_IMPORT_FIX_V3
import React, { useState, useEffect } from 'react';
import { UserProfile, CoupleData, MemoryItem, JournalEntry, JournalComment, JournalExpense, ImageComment, WakeUpLog, Companion, TaggedPerson, DeletedCommentRecord } from '../types';
import { FinanceTab } from './FinanceTab';
import { NutritionTab } from './NutritionTab';
import { AchievementsTab } from './AchievementsTab';
import { AdminTab } from './AdminTab';
import { MapLocationPickerModal, SelectedLocationResult } from './MapLocationPickerModal';
import { ImageLightboxModal } from './ImageLightboxModal';
import { AvatarEditorModal } from './AvatarEditorModal';
import { VisitedPlacesTracker } from './VisitedPlacesTracker';
import { LoveFootprintMap } from './LoveFootprintMap';
import { CameraCaptureModal, CameraLocationMetadata } from './CameraCaptureModal';
import { WakeUpChallengeCard } from './WakeUpChallengeCard';
import { CompanionManagerModal } from './CompanionManagerModal';
import { TagPeopleSelector } from './TagPeopleSelector';
import { DeviceManagerModal } from './DeviceManagerModal';
import { JournalMusicPlayer } from './JournalMusicPlayer';
import { BottomNavigation } from './BottomNavigation';
import { JournalTab } from './JournalTab';
import { HomeTab } from './home/HomeTab';
import { ProfileTab } from './profile/ProfileTab';
import { ProfileEditModal } from './profile/ProfileEditModal';
import { RestoreCommentsModal } from './journal/RestoreCommentsModal';
import { 
  getStoredDeviceOwner, 
  getStoredDeviceName, 
  getOrCreateDeviceId, 
  detectDeviceDetails,
  syncDeviceToFirestore 
} from '../utils/deviceHelper';
import { formatDateVN, formatDateShortVN, formatDateTimeVN } from '../utils/formatDate';
import { sendPartnerNotification } from '../utils/notifications';
import { getDeviceHighAccuracyGPS, reverseGeocodeGPS, formatCoordinates } from '../utils/geolocation';
import {
  isVideoUrl,
  uploadMediaFilesConcurrently,
  uploadDataUrlToFirebaseStorage
} from '../utils/mediaHelper';
import { 
  db, 
  doc, 
  onSnapshot, 
  updateDoc, 
  signOut, 
  auth, 
  updateProfile,
  collection, 
  query, 
  addDoc, 
  setDoc,
  deleteDoc, 
  deleteField,
  getDoc,
  orderBy,
  swapCoupleSlots,
  checkIsAdmin
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
  Wallet,
  MapPin,
  Phone,
  Cake,
  Copy,
  Save,
  Share2,
  ExternalLink,
  Navigation,
  Map,
  Compass,
  Apple,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  ZoomIn,
  MessageSquare,
  ShieldCheck,
  Shield,
  ArrowLeftRight,
  UserCheck,
  Trophy,
  Award,
  Loader2,
  PawPrint,
  Tag,
  Users,
  RotateCcw,
  History,
  Archive,
  ArrowDownUp,
  Music,
  Crosshair,
  Play,
  Video
} from 'lucide-react';

interface LightHomeScreenProps {
  userProfile: UserProfile;
  onRefreshProfile?: () => void;
}

export type TabType = 'home' | 'journal' | 'achievements' | 'nutrition' | 'finance' | 'profile' | 'admin';

const getTabFromUrl = (): TabType => {
  if (typeof window === 'undefined') return 'home';
  const cleanPath = window.location.pathname.toLowerCase().replace(/^\/+/, '').split('/')[0];
  if (cleanPath === 'journal') return 'journal';
  if (cleanPath === 'achievements') return 'achievements';
  if (cleanPath === 'nutrition') return 'nutrition';
  if (cleanPath === 'finance') return 'finance';
  if (cleanPath === 'profile') return 'profile';
  if (cleanPath === 'admin') return 'admin';
  return 'home';
};

const MOOD_OPTIONS = [
  'Hạnh phúc',
  'Vui vẻ',
  'Nhớ nhung',
  'Đi ăn lẩu',
  'Cà phê',
  'Đi du lịch',
  'Mệt mỏi',
  'Kỷ niệm'
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

export const LightHomeScreen: React.FC<LightHomeScreenProps> = ({ userProfile, onRefreshProfile }) => {
  const isAdminUser = checkIsAdmin(userProfile);
  const [activeTab, setActiveTabState] = useState<TabType>(() => getTabFromUrl());

  const handleNavigateTab = (tab: TabType) => {
    setActiveTabState(tab);
    const targetPath = tab === 'home' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(getTabFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
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
  const [journalLocation, setJournalLocation] = useState('');
  const [journalLocationAddress, setJournalLocationAddress] = useState('');
  const [journalLat, setJournalLat] = useState<number | null>(null);
  const [journalLng, setJournalLng] = useState<number | null>(null);
  const [journalAccuracy, setJournalAccuracy] = useState<number | null>(null);
  const [journalLocationTimestamp, setJournalLocationTimestamp] = useState<string | null>(null);
  const [journalPlaceId, setJournalPlaceId] = useState<string | null>(null);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMood, setJournalMood] = useState(MOOD_OPTIONS[0]);
  const [journalImages, setJournalImages] = useState<string[]>([]);
  const [journalVideoThumbnails, setJournalVideoThumbnails] = useState<Record<string, string>>({});
  const [journalMainImageIndex, setJournalMainImageIndex] = useState(0);
  const [journalExpenses, setJournalExpenses] = useState<JournalExpense[]>([]);
  const [journalTaggedPeople, setJournalTaggedPeople] = useState<TaggedPerson[]>([]);
  const [journalMusicUrl, setJournalMusicUrl] = useState('');
  const [journalMusicTitle, setJournalMusicTitle] = useState('');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [addingJournal, setAddingJournal] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [selectedCompanionFilter, setSelectedCompanionFilter] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Companions / Special members (Pets, Friends...) State
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [isCompanionManagerOpen, setIsCompanionManagerOpen] = useState(false);

  // Device Manager & Device Identification State
  const [isDeviceManagerOpen, setIsDeviceManagerOpen] = useState(false);
  const [deviceOwner, setDeviceOwner] = useState<'duong' | 'chuc'>(() => {
    const saved = getStoredDeviceOwner();
    if (saved) return saved;
    const isD = userProfile.email?.toLowerCase().includes('duong');
    return isD ? 'duong' : 'chuc';
  });
  const [activeDeviceName, setActiveDeviceName] = useState<string>(() => {
    const saved = getStoredDeviceName();
    if (saved) return saved;
    const details = detectDeviceDetails();
    const isD = userProfile.email?.toLowerCase().includes('duong');
    return isD ? `Thiết bị của Dương (${details.os})` : `Thiết bị của Chúc (${details.os})`;
  });

  useEffect(() => {
    // Sync current active device on mount
    syncDeviceToFirestore(deviceOwner, activeDeviceName, userProfile.uid);
  }, [deviceOwner, activeDeviceName, userProfile.uid]);

  // Lightbox & Image Comment Modal State
  const [lightboxJournal, setLightboxJournal] = useState<JournalEntry | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Journal View Subtab & Location Picker Modal
  const [journalViewTab, setJournalViewTab] = useState<'feed' | 'love_map' | 'places'>('feed');
  const [isJournalMapPickerOpen, setIsJournalMapPickerOpen] = useState(false);
  const [journalMapTarget, setJournalMapTarget] = useState<'create' | 'edit'>('create');

  // Journal Time & Sort Filter State
  const [journalSortOrder, setJournalSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [journalDateFilterMode, setJournalDateFilterMode] = useState<'all' | 'this_month' | 'last_month' | 'this_year' | 'month' | 'custom'>('all');
  const [journalFilterMonth, setJournalFilterMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [journalFilterStartDate, setJournalFilterStartDate] = useState<string>('');
  const [journalFilterEndDate, setJournalFilterEndDate] = useState<string>('');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  // Camera & Live Geolocation Auto-Tagging
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraModalTarget, setCameraModalTarget] = useState<'journal_create' | 'journal_edit' | 'memory'>('journal_create');
  const [autoLocatingGPS, setAutoLocatingGPS] = useState(false);
  const [gpsToast, setGpsToast] = useState<string | null>(null);

  const [isRestoreCommentOpen, setIsRestoreCommentOpen] = useState(false);
  const [deletedCommentsList, setDeletedCommentsList] = useState<DeletedCommentRecord[]>([]);
  const [restoringDeletedId, setRestoringDeletedId] = useState<string | null>(null);
  const [restoreSelectedJournalId, setRestoreSelectedJournalId] = useState('');
  const [restoreCommentText, setRestoreCommentText] = useState('');
  const [restoreCommentAuthor, setRestoreCommentAuthor] = useState<'duong' | 'chuc'>('duong');
  const [restoreCommentLoading, setRestoreCommentLoading] = useState(false);
  const [showManualRestoreForm, setShowManualRestoreForm] = useState(false);

  // Edit Journal State
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLocationAddress, setEditLocationAddress] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editAccuracy, setEditAccuracy] = useState<number | null>(null);
  const [editLocationTimestamp, setEditLocationTimestamp] = useState<string | null>(null);
  const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editVideoThumbnails, setEditVideoThumbnails] = useState<Record<string, string>>({});
  const [editMainImageIndex, setEditMainImageIndex] = useState(0);
  const [editExpenses, setEditExpenses] = useState<JournalExpense[]>([]);
  const [editTaggedPeople, setEditTaggedPeople] = useState<TaggedPerson[]>([]);
  const [editMusicUrl, setEditMusicUrl] = useState('');
  const [editMusicTitle, setEditMusicTitle] = useState('');
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

  // Early Bird Wake-up Logs state
  const [wakeUpLogs, setWakeUpLogs] = useState<WakeUpLog[]>([]);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editUser1Phone, setEditUser1Phone] = useState('');
  const [editUser2Phone, setEditUser2Phone] = useState('');
  const [editUser1Birthday, setEditUser1Birthday] = useState('');
  const [editUser2Birthday, setEditUser2Birthday] = useState('');
  const [editFavoritePlaces, setEditFavoritePlaces] = useState('');
  const [editLoveStory, setEditLoveStory] = useState('');
  const [editUser1Name, setEditUser1Name] = useState('');
  const [editUser2Name, setEditUser2Name] = useState('');
  const [editUser1Gender, setEditUser1Gender] = useState<'male' | 'female'>('male');
  const [editUser2Gender, setEditUser2Gender] = useState<'male' | 'female'>('female');
  const [editUser1Role, setEditUser1Role] = useState('Anh ♂');
  const [editUser2Role, setEditUser2Role] = useState('Em ♀');
  const [editAnniversaryDateProfile, setEditAnniversaryDateProfile] = useState('');
  const [editStatusMessageProfile, setEditStatusMessageProfile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [swappingSlots, setSwappingSlots] = useState(false);

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalTarget, setMapModalTarget] = useState<'address' | 'favorite'>('address');

  // Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarTarget, setAvatarTarget] = useState<{
    uid: string;
    name: string;
    avatar: string;
    slot?: 'user1' | 'user2';
  } | null>(null);

  const handleOpenAvatarModal = (uid: string, name: string, currentAvatar: string, slot?: 'user1' | 'user2') => {
    setAvatarTarget({ uid, name, avatar: currentAvatar, slot });
    setAvatarModalOpen(true);
  };

  const getAuthorInfo = (authorUid?: string, authorNameFallback?: string, authorAvatarFallback?: string) => {
    const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
    
    // Slot 1 (Dương)
    const s1Uid = coupleData?.user1Id || coupleData?.user1Uid || (isU1 ? userProfile.uid : '');
    const s1Name = coupleData?.user1Name || (isU1 ? userProfile.displayName : 'Dương');
    const s1Avatar = (isU1 ? userProfile.avatarUrl : coupleData?.user1Avatar) || coupleData?.user1Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile';
    
    // Slot 2 (Chúc Gà)
    const s2Uid = coupleData?.user2Id || coupleData?.user2Uid || (!isU1 ? userProfile.uid : '');
    const s2Name = coupleData?.user2Name || (!isU1 ? userProfile.displayName : 'Chúc Gà');
    const s2Avatar = (!isU1 ? userProfile.avatarUrl : coupleData?.user2Avatar) || coupleData?.user2Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile';

    // 1. Direct match with current logged-in user
    if (authorUid && authorUid === userProfile.uid) {
      return {
        name: userProfile.displayName || (isU1 ? s1Name : s2Name),
        avatar: userProfile.avatarUrl || (isU1 ? s1Avatar : s2Avatar),
        isMe: true,
        role: isU1 ? coupleData?.user1Role || 'Anh' : coupleData?.user2Role || 'Em'
      };
    }

    // 2. Direct match with Slot 1
    if (authorUid && authorUid === s1Uid) {
      return {
        name: s1Name,
        avatar: s1Avatar,
        isMe: isU1,
        role: coupleData?.user1Role || 'Anh'
      };
    }

    // 3. Direct match with Slot 2
    if (authorUid && authorUid === s2Uid) {
      return {
        name: s2Name,
        avatar: s2Avatar,
        isMe: !isU1,
        role: coupleData?.user2Role || 'Em'
      };
    }

    // 4. Fallback name heuristics for legacy or unassigned records
    const normalizedName = (authorNameFallback || '').toLowerCase().trim();
    if (normalizedName.includes('dương') || normalizedName.includes('duong') || (isU1 && normalizedName === userProfile.displayName.toLowerCase().trim())) {
      return {
        name: s1Name,
        avatar: s1Avatar,
        isMe: isU1,
        role: coupleData?.user1Role || 'Anh'
      };
    }

    if (normalizedName.includes('chúc') || normalizedName.includes('chuc') || (!isU1 && normalizedName === userProfile.displayName.toLowerCase().trim())) {
      return {
        name: s2Name,
        avatar: s2Avatar,
        isMe: !isU1,
        role: coupleData?.user2Role || 'Em'
      };
    }

    // 5. If author matches userProfile.displayName
    if (authorNameFallback && authorNameFallback === userProfile.displayName) {
      return {
        name: userProfile.displayName,
        avatar: userProfile.avatarUrl || (isU1 ? s1Avatar : s2Avatar),
        isMe: true,
        role: isU1 ? coupleData?.user1Role || 'Anh' : coupleData?.user2Role || 'Em'
      };
    }

    return {
      name: authorNameFallback || 'Thành viên',
      avatar: authorAvatarFallback || (isU1 ? s1Avatar : s2Avatar),
      isMe: false,
      role: ''
    };
  };

  const handleOpenMapPicker = (target: 'address' | 'favorite') => {
    setMapModalTarget(target);
    setMapModalOpen(true);
  };

  const handleSelectMapLocation = (data: { address: string; city: string; fullPlaceName?: string }) => {
    if (mapModalTarget === 'address') {
      setEditAddress(data.address);
      if (data.city) setEditCity(data.city);
    } else {
      setEditFavoritePlaces(data.fullPlaceName || data.address);
    }
  };

  const handleStartEditProfile = () => {
    const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
    if (coupleData) {
      setEditAddress(coupleData.address || '');
      setEditCity(coupleData.city || '');
      setEditUser1Phone(coupleData.user1Phone || (isU1 ? userProfile.phoneNumber || '' : ''));
      setEditUser2Phone(coupleData.user2Phone || (!isU1 ? userProfile.phoneNumber || '' : ''));
      setEditUser1Birthday(coupleData.user1Birthday || '');
      setEditUser2Birthday(coupleData.user2Birthday || '');
      setEditFavoritePlaces(coupleData.favoritePlaces || '');
      setEditLoveStory(coupleData.loveStory || '');
      setEditUser1Name(coupleData.user1Name || (isU1 ? userProfile.displayName : 'Dương'));
      setEditUser2Name(coupleData.user2Name || (!isU1 ? userProfile.displayName : 'Chúc Gà'));
      setEditUser1Gender(coupleData.user1Gender || 'male');
      setEditUser2Gender(coupleData.user2Gender || 'female');
      setEditUser1Role(coupleData.user1Role || (coupleData.user1Gender === 'female' ? 'Em' : 'Anh'));
      setEditUser2Role(coupleData.user2Role || (coupleData.user2Gender === 'male' ? 'Anh' : 'Em'));
      setEditAnniversaryDateProfile(coupleData.anniversaryDate || '');
      setEditStatusMessageProfile(coupleData.statusMessage || '');
    } else {
      setEditUser1Name(isU1 ? userProfile.displayName : 'Dương');
      setEditUser2Name(!isU1 ? userProfile.displayName : 'Chúc Gà');
    }
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId) return;

    setSavingProfile(true);
    try {
      const coupleRef = doc(db, 'couples', userProfile.coupleId);
      await updateDoc(coupleRef, {
        address: editAddress.trim(),
        city: editCity.trim(),
        user1Phone: editUser1Phone.trim(),
        user2Phone: editUser2Phone.trim(),
        user1Birthday: editUser1Birthday,
        user2Birthday: editUser2Birthday,
        favoritePlaces: editFavoritePlaces.trim(),
        loveStory: editLoveStory.trim(),
        user1Name: editUser1Name.trim() || coupleData?.user1Name,
        user2Name: editUser2Name.trim() || coupleData?.user2Name,
        user1Gender: editUser1Gender,
        user2Gender: editUser2Gender,
        user1Role: editUser1Role.trim(),
        user2Role: editUser2Role.trim(),
        anniversaryDate: editAnniversaryDateProfile || coupleData?.anniversaryDate,
        statusMessage: editStatusMessageProfile.trim() || coupleData?.statusMessage,
      });

      // Also update users collection for current user
      const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
      const isU2 = (coupleData?.user2Id === userProfile.uid) || (coupleData?.user2Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('chucga'));
      const myGender = isU1 ? editUser1Gender : (isU2 ? editUser2Gender : userProfile.gender);
      const myRole = isU1 ? editUser1Role : (isU2 ? editUser2Role : userProfile.roleTitle);
      const myName = isU1 ? editUser1Name : (isU2 ? editUser2Name : userProfile.displayName);

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        displayName: myName.trim(),
        gender: myGender,
        roleTitle: myRole.trim()
      });

      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: myName.trim() });
        } catch (e) {
          console.warn('Auth displayName update error:', e);
        }
      }

      if (onRefreshProfile) {
        onRefreshProfile();
      }

      setIsEditingProfile(false);
    } catch (err) {
      console.error('Lỗi lưu thông tin tài khoản:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSwapSlots = async () => {
    setSwappingSlots(true);
    try {
      await swapCoupleSlots();
    } catch (err) {
      console.error('Lỗi đổi vai vế:', err);
    } finally {
      setSwappingSlots(false);
    }
  };

  const handleJournalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setJournalImageLoading(true);

    try {
      const results = await uploadMediaFilesConcurrently(files, 3);

      const newImages = results.map(result => result.url);
      const newThumbs: Record<string, string> = {
        ...journalVideoThumbnails
      };

      results.forEach(result => {
        if (result.thumbnailUrl) {
          newThumbs[result.url] = result.thumbnailUrl;
        }
      });

      setJournalImages(prev => [...prev, ...newImages]);
      setJournalVideoThumbnails(newThumbs);
    } catch (err: any) {
      console.error('Lỗi upload ảnh/video nhật ký lên Firebase Storage:', err);
      alert(
        'Không thể tải tệp lên Firebase Storage: ' +
        (err?.message || 'Vui lòng kiểm tra Firebase Storage Rules hoặc kết nối mạng.')
      );
    } finally {
      setJournalImageLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveJournalImage = (index: number) => {
    setJournalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Camera Live Capture & Automatic GPS Location Tagging (High-Accuracy metadata)
  const handleCameraCaptured = async (
    dataUrl: string,
    autoLocation?: string,
    meta?: CameraLocationMetadata
  ) => {
    const target = cameraModalTarget;

    if (target === 'journal_create') {
      setJournalImageLoading(true);
    } else if (target === 'journal_edit') {
      setEditImageLoading(true);
    } else {
      setMemoryImageLoading(true);
    }

    try {
      const uploadedUrl = await uploadDataUrlToFirebaseStorage(
        dataUrl,
        `camera-${Date.now()}.jpg`
      );

      if (target === 'journal_create') {
        setJournalImages(prev => [...prev, uploadedUrl]);

        if (meta) {
          setJournalLat(meta.lat);
          setJournalLng(meta.lng);
          setJournalAccuracy(meta.accuracy ?? null);
          setJournalLocationTimestamp(meta.locationTimestamp ?? null);

          if (meta.locationName || meta.address) {
            setJournalLocation(meta.locationName || meta.address || '');
            setJournalLocationAddress(meta.address || meta.locationName || '');
          }
        } else if (autoLocation && !journalLocation) {
          setJournalLocation(autoLocation);
          setJournalLocationAddress(autoLocation);
        }

        setGpsToast(
          meta
            ? `Đã upload ảnh & ghi nhận GPS chính xác (±${meta.accuracy ? meta.accuracy.toFixed(0) : 0}m)`
            : autoLocation
              ? `Đã upload ảnh & lưu vị trí: ${autoLocation}`
              : 'Đã upload ảnh Camera lên Firebase Storage!'
        );
      } else if (target === 'journal_edit') {
        setEditImages(prev => [...prev, uploadedUrl]);

        if (meta) {
          setEditLat(meta.lat);
          setEditLng(meta.lng);
          setEditAccuracy(meta.accuracy ?? null);
          setEditLocationTimestamp(meta.locationTimestamp ?? null);

          if (meta.locationName || meta.address) {
            setEditLocation(meta.locationName || meta.address || '');
            setEditLocationAddress(meta.address || meta.locationName || '');
          }
        } else if (autoLocation && !editLocation) {
          setEditLocation(autoLocation);
          setEditLocationAddress(autoLocation);
        }

        setGpsToast('Đã upload ảnh Camera & lưu metadata GPS thành công!');
      } else {
        setMemoryImageUrl(uploadedUrl);
        setGpsToast('Đã upload ảnh kỷ niệm lên Firebase Storage!');
      }

      setTimeout(() => setGpsToast(null), 4000);
    } catch (err: any) {
      console.error('Lỗi upload ảnh Camera lên Firebase Storage:', err);
      alert(
        'Không thể upload ảnh Camera: ' +
        (err?.message || 'Vui lòng kiểm tra Firebase Storage Rules.')
      );
    } finally {
      setJournalImageLoading(false);
      setEditImageLoading(false);
      setMemoryImageLoading(false);
    }
  };

  // One-click GPS auto-detection using High-Accuracy Device GPS as source of truth
  const handleAutoDetectGPS = async (target: 'create' | 'edit') => {
    setAutoLocatingGPS(true);
    try {
      const gps = await getDeviceHighAccuracyGPS();
      const rev = await reverseGeocodeGPS(gps.latitude, gps.longitude);

      if (target === 'create') {
        setJournalLat(gps.latitude);
        setJournalLng(gps.longitude);
        setJournalAccuracy(gps.accuracy);
        setJournalLocationTimestamp(gps.timestamp);
        setJournalLocation(rev.placeName);
        setJournalLocationAddress(rev.formattedAddress);
      } else {
        setEditLat(gps.latitude);
        setEditLng(gps.longitude);
        setEditAccuracy(gps.accuracy);
        setEditLocationTimestamp(gps.timestamp);
        setEditLocation(rev.placeName);
        setEditLocationAddress(rev.formattedAddress);
      }

      setGpsToast(`Đã lấy GPS thiết bị: ${rev.placeName} (độ chính xác ±${gps.accuracy ? gps.accuracy.toFixed(0) : 0}m)`);
      setTimeout(() => setGpsToast(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Không thể lấy vị trí GPS từ thiết bị.');
    } finally {
      setAutoLocatingGPS(false);
    }
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
      const [result] = await uploadMediaFilesConcurrently([file], 1);
      setMemoryImageUrl(result.url);
    } catch (err: any) {
      console.error('Lỗi upload ảnh kỷ niệm lên Firebase Storage:', err);
      alert(
        'Không thể upload ảnh kỷ niệm: ' +
        (err?.message || 'Vui lòng kiểm tra Firebase Storage Rules.')
      );
    } finally {
      setMemoryImageLoading(false);
      e.target.value = '';
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

    // Subscribe to early bird wake up logs
    const wakeUpRef = collection(db, 'couples', userProfile.coupleId, 'wakeUpLogs');
    const qWakeUp = query(wakeUpRef, orderBy('createdAt', 'desc'));
    const unsubscribeWakeUp = onSnapshot(qWakeUp, (snapshot) => {
      const logs: WakeUpLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as WakeUpLog);
      });
      setWakeUpLogs(logs);
    }, (err) => {
      console.warn('Error listening to wake up logs:', err);
    });

    // Subscribe to companions / pets collection
    const compRef = collection(db, 'couples', userProfile.coupleId, 'companions');
    const qComp = query(compRef, orderBy('createdAt', 'desc'));
    const unsubscribeComp = onSnapshot(qComp, (snapshot) => {
      const items: Companion[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Companion);
      });
      setCompanions(items);
    }, (err) => {
      console.warn('Error listening to companions:', err);
    });

    // Subscribe to deleted_comments (Recycle Bin)
    const deletedRef = collection(db, 'couples', userProfile.coupleId, 'deleted_comments');
    const qDeleted = query(deletedRef, orderBy('deletedAt', 'desc'));
    const unsubscribeDeleted = onSnapshot(qDeleted, (snapshot) => {
      const items: DeletedCommentRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as DeletedCommentRecord);
      });
      setDeletedCommentsList(items);
    }, (err) => {
      console.warn('Error listening to deleted comments:', err);
    });

    return () => {
      unsubscribeCouple();
      unsubscribeJournals();
      unsubscribeMemories();
      unsubscribeWakeUp();
      unsubscribeComp();
      unsubscribeDeleted();
    };
  }, [userProfile.coupleId]);

  // Keep lightboxJournal synced with updated journals
  useEffect(() => {
    if (lightboxJournal) {
      const updated = journals.find(j => j.id === lightboxJournal.id);
      if (updated) {
        setLightboxJournal(updated);
      }
    }
  }, [journals]);

  // Lightbox and Image Comment Handlers
  const handleOpenLightbox = (journal: JournalEntry, imageIndex: number = 0) => {
    setLightboxJournal(journal);
    setLightboxIndex(imageIndex);
    setIsLightboxOpen(true);
  };

  const handleSetMainImage = async (journalId: string, imageIndex: number) => {
    if (!userProfile.coupleId) return;
    const target = journals.find(j => j.id === journalId);
    if (!target) return;
    const imgs = target.images && target.images.length > 0 ? target.images : (target.imageUrl ? [target.imageUrl] : []);
    if (imageIndex < 0 || imageIndex >= imgs.length) return;

    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      await updateDoc(journalRef, {
        mainImageIndex: imageIndex,
        imageUrl: imgs[imageIndex],
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Lỗi cập nhật ảnh chính:', err);
    }
  };

  const handleAddImageComment = async (journalId: string, imageIndex: number, imageUrl: string, content: string) => {
    if (!userProfile.coupleId || !content.trim()) return;
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    const newComment: ImageComment = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      imageIndex,
      imageUrl,
      authorName: userProfile.displayName,
      authorUid: userProfile.uid,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      const currentComments = target.imageComments || [];
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);
      await updateDoc(journalRef, {
        imageComments: [...currentComments, newComment]
      });
      void sendPartnerNotification({
        type: 'image_comment',
        title: `💬 ${userProfile.displayName} vừa bình luận ảnh`,
        body: newComment.content.slice(0, 180),
        url: '/journal',
        imageUrl,
        tag: `image-comment-${journalId}-${newComment.id}`
      });
    } catch (err) {
      console.error('Lỗi thêm bình luận cho ảnh:', err);
    }
  };

  const handleDeleteImageComment = async (journalId: string, commentId: string) => {
    if (!userProfile.coupleId) return;
    const target = journals.find(j => j.id === journalId);
    if (!target || !target.imageComments) return;

    try {
      const deletedCmt = target.imageComments.find(c => c.id === commentId);
      const updatedComments = target.imageComments.filter(c => c.id !== commentId);
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', journalId);

      // Save into deleted_comments collection (Recycle Bin)
      if (deletedCmt) {
        const delDocRef = doc(collection(db, 'couples', userProfile.coupleId, 'deleted_comments'));
        await setDoc(delDocRef, {
          id: delDocRef.id,
          commentId: deletedCmt.id,
          coupleId: userProfile.coupleId,
          journalId,
          journalTitle: target.title || 'Kỷ niệm',
          journalDate: target.date || '',
          authorUid: deletedCmt.authorUid,
          authorName: deletedCmt.authorName,
          content: deletedCmt.content,
          imageUrl: deletedCmt.imageUrl,
          imageIndex: deletedCmt.imageIndex,
          createdAt: deletedCmt.createdAt || new Date().toISOString(),
          deletedAt: new Date().toISOString(),
          deletedByUid: userProfile.uid,
          deletedByName: userProfile.displayName,
          type: 'image_comment'
        });
      }

      await updateDoc(journalRef, {
        imageComments: updatedComments
      });
      setGpsToast('Đã xóa bình luận ảnh và lưu vào Thùng rác. Có thể khôi phục lại bất kỳ lúc nào!');
      setTimeout(() => setGpsToast(null), 4000);
    } catch (err) {
      console.error('Lỗi xóa bình luận ảnh:', err);
    }
  };

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
      if (statusInput.trim()) {
        void sendPartnerNotification({
          type: 'status_note',
          title: `💌 ${userProfile.displayName} vừa đổi lời nhắn`,
          body: statusInput.trim().slice(0, 180),
          url: '/',
          tag: `status-${Date.now()}`
        });
      }
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
      if (journalLocation.trim()) {
        docData.location = journalLocation.trim();
      }
      if (journalLocationAddress.trim()) {
        docData.locationAddress = journalLocationAddress.trim();
      }
      if (journalLat !== null && journalLng !== null) {
        docData.lat = journalLat;
        docData.lng = journalLng;
        if (journalAccuracy !== null) docData.accuracy = journalAccuracy;
        if (journalLocationTimestamp) docData.locationTimestamp = journalLocationTimestamp;
        if (journalPlaceId) docData.placeId = journalPlaceId;
      }
      if (journalImages.length > 0) {
        const selectedMainIdx = Math.min(Math.max(0, journalMainImageIndex), journalImages.length - 1);
        docData.images = journalImages;
        docData.mainImageIndex = selectedMainIdx;
        docData.imageUrl = journalImages[selectedMainIdx];
        if (Object.keys(journalVideoThumbnails).length > 0) {
          docData.videoThumbnails = journalVideoThumbnails;
        }
      }
      if (journalExpenses.length > 0) {
        docData.expenses = journalExpenses;
      }
      if (journalTaggedPeople.length > 0) {
        docData.taggedPeople = journalTaggedPeople;
      }
      if (journalMusicUrl.trim()) {
        docData.musicUrl = journalMusicUrl.trim();
      }
      if (journalMusicTitle.trim()) {
        docData.musicTitle = journalMusicTitle.trim();
      }

      const createdJournalRef = await addDoc(journalsRef, docData);
      void sendPartnerNotification({
        type: 'journal_new',
        title: `📸 ${userProfile.displayName} vừa thêm nhật ký mới`,
        body: journalTitle.trim().slice(0, 180),
        url: '/journal',
        imageUrl: journalImages.length > 0 ? journalImages[journalMainImageIndex] || journalImages[0] : undefined,
        tag: `journal-${createdJournalRef.id}`
      });
      setJournalTitle('');
      setJournalContent('');
      setJournalLocation('');
      setJournalLocationAddress('');
      setJournalLat(null);
      setJournalLng(null);
      setJournalAccuracy(null);
      setJournalLocationTimestamp(null);
      setJournalPlaceId(null);
      setJournalImages([]);
      setJournalVideoThumbnails({});
      setJournalMainImageIndex(0);
      setJournalExpenses([]);
      setJournalTaggedPeople([]);
      setJournalMusicUrl('');
      setJournalMusicTitle('');
      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setShowAddJournal(false);
      setGpsToast('Đã lưu bài viết nhật ký thành công! ✨');
      setTimeout(() => setGpsToast(null), 3000);
    } catch (err: any) {
      console.error('Lỗi thêm nhật ký:', err);
      alert('Không thể lưu nhật ký: ' + (err?.message || 'Vui lòng kiểm tra lại ảnh hoặc kết nối mạng.'));
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
      void sendPartnerNotification({
        type: 'journal_comment',
        title: `💬 ${userProfile.displayName} vừa bình luận`,
        body: newComment.content.slice(0, 180),
        url: '/journal',
        tag: `journal-comment-${journalId}-${newComment.id}`
      });
      setCommentInputs(prev => ({ ...prev, [journalId]: '' }));
    } catch (err) {
      console.error('Lỗi thêm bình luận:', err);
    }
  };

  const handleRestoreCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !restoreSelectedJournalId || !restoreCommentText.trim()) return;
    setRestoreCommentLoading(true);
    try {
      const isD = restoreCommentAuthor === 'duong';
      const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
      const s1Avatar = coupleData?.user1Avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      const s2Avatar = coupleData?.user2Avatar || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80';

      const authorName = isD ? (coupleData?.user1Name || 'Dương') : (coupleData?.user2Name || 'Chúc Gà');
      const authorAvatar = isD ? s1Avatar : s2Avatar;
      const authorUid = isD ? (isU1 ? userProfile.uid : 'duong_uid') : (!isU1 ? userProfile.uid : 'chuc_uid');

      const restoredComment: JournalComment = {
        id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        authorUid,
        authorName,
        content: restoreCommentText.trim(),
        createdAt: new Date().toISOString()
      };

      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', restoreSelectedJournalId);
      const target = journals.find(j => j.id === restoreSelectedJournalId);
      const currentComments = target?.comments || [];
      await updateDoc(journalRef, {
        comments: [...currentComments, restoredComment]
      });

      setRestoreCommentText('');
      setIsRestoreCommentOpen(false);
      setGpsToast('Đã khôi phục và thêm lại bình luận thành công!');
      setTimeout(() => setGpsToast(null), 4000);
    } catch (err) {
      console.error('Lỗi khôi phục bình luận:', err);
      alert('Không thể khôi phục bình luận: ' + String(err));
    } finally {
      setRestoreCommentLoading(false);
    }
  };

  // 1-Click Restore Deleted Comment from Recycle Bin
  const handleRestoreDeletedCommentRecord = async (record: DeletedCommentRecord) => {
    if (!userProfile.coupleId) return;
    setRestoringDeletedId(record.id);
    try {
      const journalRef = doc(db, 'couples', userProfile.coupleId, 'journals', record.journalId);
      const jSnap = await getDoc(journalRef);
      if (!jSnap.exists()) {
        alert('Không tìm thấy bài viết gốc để khôi phục bình luận.');
        return;
      }
      const data = jSnap.data();

      if (record.type === 'image_comment') {
        const currentImgCmts = data.imageComments || [];
        const restoredImgCmt = {
          id: record.commentId || ('img_cmt_' + Date.now()),
          imageIndex: record.imageIndex ?? 0,
          imageUrl: record.imageUrl,
          authorName: record.authorName,
          authorUid: record.authorUid,
          content: record.content,
          createdAt: record.createdAt || new Date().toISOString()
        };
        await updateDoc(journalRef, {
          imageComments: [...currentImgCmts, restoredImgCmt]
        });
      } else {
        const currentComments = data.comments || [];
        const restoredCommentObj = {
          id: record.commentId || ('cmt_' + Date.now()),
          authorUid: record.authorUid,
          authorName: record.authorName,
          authorAvatar: record.authorAvatar || '',
          content: record.content,
          createdAt: record.createdAt || new Date().toISOString()
        };
        await updateDoc(journalRef, {
          comments: [...currentComments, restoredCommentObj]
        });
      }

      // Remove from deleted_comments
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'deleted_comments', record.id));
      setGpsToast(`Đã khôi phục thành công bình luận của "${record.authorName}" vào bài viết! ✨`);
      setTimeout(() => setGpsToast(null), 4000);
    } catch (err) {
      console.error('Lỗi khôi phục:', err);
      alert('Không thể khôi phục bình luận: ' + String(err));
    } finally {
      setRestoringDeletedId(null);
    }
  };

  // Permanent Delete Comment from Recycle Bin
  const handlePermanentDeleteRecord = async (record: DeletedCommentRecord) => {
    if (!userProfile.coupleId) return;
    if (!window.confirm(`Bạn có chắc muốn xóa VĨNH VIỄN bình luận này khỏi Thùng rác không?\n\n"${record.content}"`)) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'deleted_comments', record.id));
      setGpsToast('Đã xóa vĩnh viễn bình luận khỏi thùng rác.');
      setTimeout(() => setGpsToast(null), 4000);
    } catch (err) {
      console.error('Lỗi xóa vĩnh viễn:', err);
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
    setEditLocation(item.location || '');
    setEditLocationAddress(item.locationAddress || '');
    setEditLat(item.lat ?? null);
    setEditLng(item.lng ?? null);
    setEditAccuracy(item.accuracy ?? null);
    setEditLocationTimestamp(item.locationTimestamp ?? null);
    setEditPlaceId(item.placeId ?? null);
    setEditDate(item.date || new Date().toISOString().split('T')[0]);
    
    let imgs: string[] = [];
    if (item.images && item.images.length > 0) {
      imgs = [...item.images];
    } else if (item.imageUrl) {
      imgs = [item.imageUrl];
    }
    setEditImages(imgs);
    setEditVideoThumbnails(item.videoThumbnails ? { ...item.videoThumbnails } : {});
    setEditMainImageIndex(item.mainImageIndex || 0);
    setEditExpenses(item.expenses ? [...item.expenses] : []);
    setEditTaggedPeople(item.taggedPeople ? [...item.taggedPeople] : []);
    setEditMusicUrl(item.musicUrl || '');
    setEditMusicTitle(item.musicTitle || '');
    setEditNewExpenseTitle('');
    setEditNewExpenseAmount('');
  };

  const handleCancelEditJournal = () => {
    setEditingJournalId(null);
    setEditTitle('');
    setEditContent('');
    setEditLocation('');
    setEditLocationAddress('');
    setEditLat(null);
    setEditLng(null);
    setEditAccuracy(null);
    setEditLocationTimestamp(null);
    setEditPlaceId(null);
    setEditDate('');
    setEditImages([]);
    setEditVideoThumbnails({});
    setEditMainImageIndex(0);
    setEditExpenses([]);
    setEditTaggedPeople([]);
    setEditMusicUrl('');
    setEditMusicTitle('');
    setEditNewExpenseTitle('');
    setEditNewExpenseAmount('');
  };

  const handleEditJournalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setEditImageLoading(true);

    try {
      const results = await uploadMediaFilesConcurrently(files, 3);

      const newImages = results.map(result => result.url);
      const newThumbs: Record<string, string> = {
        ...editVideoThumbnails
      };

      results.forEach(result => {
        if (result.thumbnailUrl) {
          newThumbs[result.url] = result.thumbnailUrl;
        }
      });

      setEditImages(prev => [...prev, ...newImages]);
      setEditVideoThumbnails(newThumbs);
    } catch (err: any) {
      console.error('Lỗi upload ảnh/video khi sửa lên Firebase Storage:', err);
      alert(
        'Không thể tải tệp lên Firebase Storage: ' +
        (err?.message || 'Vui lòng kiểm tra Firebase Storage Rules hoặc kết nối mạng.')
      );
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
      const selectedMainIdx = editImages.length > 0
        ? Math.min(Math.max(0, editMainImageIndex), editImages.length - 1)
        : 0;

      const updates: Record<string, any> = {
        title: editTitle.trim(),
        date: editDate,
        content: editContent.trim() || deleteField(),
        location: editLocation.trim() || deleteField(),
        locationAddress: editLocationAddress.trim() || deleteField(),
        lat: editLat !== null && !isNaN(editLat) ? editLat : deleteField(),
        lng: editLng !== null && !isNaN(editLng) ? editLng : deleteField(),
        accuracy: editAccuracy !== null ? editAccuracy : deleteField(),
        locationTimestamp: editLocationTimestamp || deleteField(),
        placeId: editPlaceId || deleteField(),
        images: editImages.length > 0 ? editImages : deleteField(),
        mainImageIndex: editImages.length > 0 ? selectedMainIdx : deleteField(),
        imageUrl: editImages.length > 0 ? editImages[selectedMainIdx] : deleteField(),
        videoThumbnails: Object.keys(editVideoThumbnails).length > 0 ? editVideoThumbnails : deleteField(),
        expenses: editExpenses.length > 0 ? editExpenses : deleteField(),
        taggedPeople: editTaggedPeople.length > 0 ? editTaggedPeople : deleteField(),
        musicUrl: editMusicUrl.trim() ? editMusicUrl.trim() : deleteField(),
        musicTitle: editMusicTitle.trim() ? editMusicTitle.trim() : deleteField(),
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
      const memoryData: Record<string, any> = {
        title: memoryTitle.trim(),
        date: memoryDate,
        authorName: userProfile.displayName,
        authorUid: userProfile.uid,
        createdAt: new Date().toISOString()
      };
      if (memoryImageUrl.trim()) memoryData.imageUrl = memoryImageUrl.trim();

      const createdMemoryRef = await addDoc(memoriesRef, memoryData);
      void sendPartnerNotification({
        type: 'memory_new',
        title: `💖 ${userProfile.displayName} vừa thêm một kỷ niệm`,
        body: memoryTitle.trim().slice(0, 180),
        url: '/',
        imageUrl: memoryImageUrl.trim() || undefined,
        tag: `memory-${createdMemoryRef.id}`
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

  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    journals.forEach(j => {
      if (j.date && j.date.length >= 7) {
        monthsSet.add(j.date.substring(0, 7)); // e.g. "2026-08"
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [journals]);

  const filteredJournals = React.useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = String(now.getFullYear());

    const result = journals.filter(j => {
      // 1. Companion filter
      if (selectedCompanionFilter) {
        const hasTagged = j.taggedPeople?.some(p => p.id === selectedCompanionFilter || p.name.toLowerCase() === selectedCompanionFilter.toLowerCase());
        if (!hasTagged) return false;
      }

      // 2. Date Filter
      if (journalDateFilterMode === 'this_month') {
        if (!j.date?.startsWith(currentYearMonth)) return false;
      } else if (journalDateFilterMode === 'last_month') {
        if (!j.date?.startsWith(prevYearMonth)) return false;
      } else if (journalDateFilterMode === 'this_year') {
        if (!j.date?.startsWith(currentYear)) return false;
      } else if (journalDateFilterMode === 'month') {
        if (journalFilterMonth && !j.date?.startsWith(journalFilterMonth)) return false;
      } else if (journalDateFilterMode === 'custom') {
        if (journalFilterStartDate && j.date < journalFilterStartDate) return false;
        if (journalFilterEndDate && j.date > journalFilterEndDate) return false;
      }

      // 3. Search text filter
      if (!journalSearch.trim()) return true;
      const term = journalSearch.toLowerCase();
      return (
        j.title.toLowerCase().includes(term) ||
        (j.content && j.content.toLowerCase().includes(term)) ||
        (j.mood && j.mood.toLowerCase().includes(term)) ||
        (j.location && j.location.toLowerCase().includes(term)) ||
        (j.locationAddress && j.locationAddress.toLowerCase().includes(term)) ||
        (j.taggedPeople && j.taggedPeople.some(p => p.name.toLowerCase().includes(term)))
      );
    });

    // Sort by date / createdAt
    return result.sort((a, b) => {
      const dateA = a.date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
      const dateB = b.date || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '');
      
      if (dateA !== dateB) {
        return journalSortOrder === 'newest' 
          ? dateB.localeCompare(dateA) 
          : dateA.localeCompare(dateB);
      }
      
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return journalSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [
    journals, 
    selectedCompanionFilter, 
    journalDateFilterMode, 
    journalFilterMonth, 
    journalFilterStartDate, 
    journalFilterEndDate, 
    journalSearch,
    journalSortOrder
  ]);

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24"
      style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Main Content Areas based on activeTab */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <HomeTab
            userProfile={userProfile}
            coupleData={coupleData}
            wakeUpLogs={wakeUpLogs}
            onNavigate={handleNavigateTab}
          />
        )}


        {/* TAB 2: JOURNAL (NHẬT KÝ) */}
        {activeTab === 'journal' && (
          <JournalTab
            userProfile={userProfile}
            coupleData={coupleData}
            journals={journals}
            companions={companions}
            journalViewTab={journalViewTab}
            setJournalViewTab={setJournalViewTab}
            showAddJournal={showAddJournal}
            setShowAddJournal={setShowAddJournal}
            addingJournal={addingJournal}
            journalImageLoading={journalImageLoading}
            autoLocatingGPS={autoLocatingGPS}
            createFormData={{
              title: journalTitle,
              content: journalContent,
              date: journalDate,
              location: journalLocation,
              locationAddress: journalLocationAddress,
              lat: journalLat,
              lng: journalLng,
              accuracy: journalAccuracy,
              locationTimestamp: journalLocationTimestamp,
              placeId: journalPlaceId,
              images: journalImages,
              videoThumbnails: journalVideoThumbnails,
              mainImageIndex: journalMainImageIndex,
              expenses: journalExpenses,
              taggedPeople: journalTaggedPeople,
              musicUrl: journalMusicUrl,
              musicTitle: journalMusicTitle,
            }}
            onCreateFormChange={(updated) => {
              if (updated.title !== undefined) setJournalTitle(updated.title);
              if (updated.content !== undefined) setJournalContent(updated.content);
              if (updated.date !== undefined) setJournalDate(updated.date);
              if (updated.location !== undefined) setJournalLocation(updated.location);
              if (updated.locationAddress !== undefined) setJournalLocationAddress(updated.locationAddress);
              if (updated.lat !== undefined) setJournalLat(updated.lat);
              if (updated.lng !== undefined) setJournalLng(updated.lng);
              if (updated.accuracy !== undefined) setJournalAccuracy(updated.accuracy);
              if (updated.locationTimestamp !== undefined) setJournalLocationTimestamp(updated.locationTimestamp);
              if (updated.placeId !== undefined) setJournalPlaceId(updated.placeId);
              if (updated.images !== undefined) setJournalImages(updated.images);
              if (updated.videoThumbnails !== undefined) setJournalVideoThumbnails(updated.videoThumbnails);
              if (updated.mainImageIndex !== undefined) setJournalMainImageIndex(updated.mainImageIndex);
              if (updated.expenses !== undefined) setJournalExpenses(updated.expenses);
              if (updated.taggedPeople !== undefined) setJournalTaggedPeople(updated.taggedPeople);
              if (updated.musicUrl !== undefined) setJournalMusicUrl(updated.musicUrl);
              if (updated.musicTitle !== undefined) setJournalMusicTitle(updated.musicTitle);
            }}
            onAddJournalSubmit={handleAddJournal}
            editingJournalId={editingJournalId}
            savingEdit={savingEdit}
            editImageLoading={editImageLoading}
            editFormData={{
              title: editTitle,
              content: editContent,
              date: editDate,
              location: editLocation,
              locationAddress: editLocationAddress,
              lat: editLat,
              lng: editLng,
              accuracy: editAccuracy,
              locationTimestamp: editLocationTimestamp,
              placeId: editPlaceId,
              images: editImages,
              videoThumbnails: editVideoThumbnails,
              mainImageIndex: editMainImageIndex,
              expenses: editExpenses,
              taggedPeople: editTaggedPeople,
              musicUrl: editMusicUrl,
              musicTitle: editMusicTitle,
            }}
            onEditFormChange={(updated) => {
              if (updated.title !== undefined) setEditTitle(updated.title);
              if (updated.content !== undefined) setEditContent(updated.content);
              if (updated.date !== undefined) setEditDate(updated.date);
              if (updated.location !== undefined) setEditLocation(updated.location);
              if (updated.locationAddress !== undefined) setEditLocationAddress(updated.locationAddress);
              if (updated.lat !== undefined) setEditLat(updated.lat);
              if (updated.lng !== undefined) setEditLng(updated.lng);
              if (updated.accuracy !== undefined) setEditAccuracy(updated.accuracy);
              if (updated.locationTimestamp !== undefined) setEditLocationTimestamp(updated.locationTimestamp);
              if (updated.placeId !== undefined) setEditPlaceId(updated.placeId);
              if (updated.images !== undefined) setEditImages(updated.images);
              if (updated.videoThumbnails !== undefined) setEditVideoThumbnails(updated.videoThumbnails);
              if (updated.mainImageIndex !== undefined) setEditMainImageIndex(updated.mainImageIndex);
              if (updated.expenses !== undefined) setEditExpenses(updated.expenses);
              if (updated.taggedPeople !== undefined) setEditTaggedPeople(updated.taggedPeople);
              if (updated.musicUrl !== undefined) setEditMusicUrl(updated.musicUrl);
              if (updated.musicTitle !== undefined) setEditMusicTitle(updated.musicTitle);
            }}
            onSaveEditJournalSubmit={handleSaveEditJournal}
            onCancelEditJournal={handleCancelEditJournal}
            onStartEditJournal={handleStartEditJournal}
            onRequestDeleteJournal={handleRequestDeleteJournal}
            onApproveDeleteJournal={handleApproveDeleteJournal}
            onCancelDeleteRequest={handleCancelDeleteRequest}
            onOpenLightbox={handleOpenLightbox}
            selectedCompanionFilter={selectedCompanionFilter}
            setSelectedCompanionFilter={setSelectedCompanionFilter}
            journalDateFilterMode={journalDateFilterMode}
            setJournalDateFilterMode={setJournalDateFilterMode}
            journalFilterMonth={journalFilterMonth}
            setJournalFilterMonth={setJournalFilterMonth}
            journalFilterStartDate={journalFilterStartDate}
            setJournalFilterStartDate={setJournalFilterStartDate}
            journalFilterEndDate={journalFilterEndDate}
            setJournalFilterEndDate={setJournalFilterEndDate}
            isCustomDateOpen={isCustomDateOpen}
            setIsCustomDateOpen={setIsCustomDateOpen}
            journalSortOrder={journalSortOrder}
            setJournalSortOrder={setJournalSortOrder}
            journalSearch={journalSearch}
            setJournalSearch={setJournalSearch}
            availableMonths={availableMonths}
            filteredJournals={filteredJournals}
            commentInputs={commentInputs}
            onCommentInputChange={(jId, val) => setCommentInputs(prev => ({ ...prev, [jId]: val }))}
            onAddComment={handleAddComment}
            onOpenCompanionManager={() => setIsCompanionManagerOpen(true)}
            onOpenCreateMapPicker={() => {
              setJournalMapTarget('create');
              setIsJournalMapPickerOpen(true);
            }}
            onAutoDetectCreateGPS={() => handleAutoDetectGPS('create')}
            onOpenCreateCamera={() => {
              setCameraModalTarget('journal_create');
              setIsCameraModalOpen(true);
            }}
            onCreateFilesSelected={handleJournalFileChange}
            onOpenEditMapPicker={() => {
              setJournalMapTarget('edit');
              setIsJournalMapPickerOpen(true);
            }}
            onAutoDetectEditGPS={() => handleAutoDetectGPS('edit')}
            onOpenEditCamera={() => {
              setCameraModalTarget('journal_edit');
              setIsCameraModalOpen(true);
            }}
            onEditFilesSelected={handleEditJournalFileChange}
          />
        )}

        {/* TAB 3: ACHIEVEMENTS (THÀNH TÍCH & CỘT MỐC) */}
        {activeTab === 'achievements' && (
          <AchievementsTab userProfile={userProfile} coupleData={coupleData} journals={journals} />
        )}

        {/* TAB 4: NUTRITION */}
        {activeTab === 'nutrition' && (
          <NutritionTab userProfile={userProfile} coupleData={coupleData} />
        )}

        {/* TAB 5: FINANCE */}
        {activeTab === 'finance' && (
          <FinanceTab userProfile={userProfile} coupleData={coupleData} journals={journals} />
        )}

        {/* TAB 6: PROFILE */}
        {activeTab === 'profile' && (
          <ProfileTab
            userProfile={userProfile}
            coupleData={coupleData}
            companions={companions}
            deviceOwner={deviceOwner}
            activeDeviceName={activeDeviceName}
            onEditProfile={handleStartEditProfile}
            onOpenAvatar={handleOpenAvatarModal}
            onOpenCompanionManager={() => setIsCompanionManagerOpen(true)}
            onOpenDeviceManager={() => setIsDeviceManagerOpen(true)}
            onOpenRestoreComments={() => {
              if (journals.length > 0) {
                setRestoreSelectedJournalId(journals[0].id);
              }
              setIsRestoreCommentOpen(true);
            }}
            onSignOut={handleSignOut}
          />
        )}


        {/* Modal Chỉnh Sửa Thông Tin Profile & Đôi Lứa */}
        <ProfileEditModal
          isOpen={isEditingProfile}
          savingProfile={savingProfile}
          editUser1Name={editUser1Name}
          editUser2Name={editUser2Name}
          editAnniversaryDateProfile={editAnniversaryDateProfile}
          editStatusMessageProfile={editStatusMessageProfile}
          editAddress={editAddress}
          editCity={editCity}
          editFavoritePlaces={editFavoritePlaces}
          editUser1Phone={editUser1Phone}
          editUser2Phone={editUser2Phone}
          editUser1Birthday={editUser1Birthday}
          editUser2Birthday={editUser2Birthday}
          editLoveStory={editLoveStory}
          onUser1NameChange={setEditUser1Name}
          onUser2NameChange={setEditUser2Name}
          onAnniversaryDateChange={setEditAnniversaryDateProfile}
          onStatusMessageChange={setEditStatusMessageProfile}
          onAddressChange={setEditAddress}
          onCityChange={setEditCity}
          onFavoritePlacesChange={setEditFavoritePlaces}
          onUser1PhoneChange={setEditUser1Phone}
          onUser2PhoneChange={setEditUser2Phone}
          onUser1BirthdayChange={setEditUser1Birthday}
          onUser2BirthdayChange={setEditUser2Birthday}
          onLoveStoryChange={setEditLoveStory}
          onOpenMapPicker={handleOpenMapPicker}
          onSubmit={handleSaveProfile}
          onClose={() => setIsEditingProfile(false)}
        />


        {/* TAB 6: ADMIN (Hidden from UI, only accessible via /admin) */}
        {activeTab === 'admin' && (
          isAdminUser ? (
            <AdminTab currentUser={userProfile} onRefreshProfile={onRefreshProfile} />
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Khu vực Quản trị Hệ thống</h3>
              <p className="text-xs text-slate-500">Trang quản trị chỉ dành riêng cho Quản trị viên hệ thống.</p>
              <button
                onClick={() => handleNavigateTab('home')}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Quay về Trang chủ
              </button>
            </div>
          )
        )}
      </main>

      {/* Modern 4-Tab Bottom Navigation Bar with More Menu Sheet */}
      <BottomNavigation
        activeTab={activeTab}
        onNavigate={handleNavigateTab}
      />

      {/* Interactive Google Maps Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelectLocation={handleSelectMapLocation}
        initialAddress={mapModalTarget === 'address' ? editAddress : editFavoritePlaces}
        title={mapModalTarget === 'address' ? 'Chọn Địa Chỉ & Nơi Ở Trên Bản Đồ' : 'Chọn Địa Điểm Hẹn Hò Yêu Thích'}
      />

      {/* Journal Google Maps Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={isJournalMapPickerOpen}
        onClose={() => setIsJournalMapPickerOpen(false)}
        initialCoords={
          journalMapTarget === 'create'
            ? (journalLat && journalLng ? { lat: journalLat, lng: journalLng, accuracy: journalAccuracy || undefined } : undefined)
            : (editLat && editLng ? { lat: editLat, lng: editLng, accuracy: editAccuracy || undefined } : undefined)
        }
        onSelectLocation={(data: SelectedLocationResult) => {
          if (journalMapTarget === 'create') {
            setJournalLat(data.lat);
            setJournalLng(data.lng);
            setJournalAccuracy(data.accuracy || null);
            setJournalLocationTimestamp(data.locationTimestamp || new Date().toISOString());
            setJournalPlaceId(data.placeId || null);
            setJournalLocation(data.locationName);
            setJournalLocationAddress(data.address);
          } else {
            setEditLat(data.lat);
            setEditLng(data.lng);
            setEditAccuracy(data.accuracy || null);
            setEditLocationTimestamp(data.locationTimestamp || new Date().toISOString());
            setEditPlaceId(data.placeId || null);
            setEditLocation(data.locationName);
            setEditLocationAddress(data.address);
          }
          setIsJournalMapPickerOpen(false);
        }}
        initialAddress={
          journalMapTarget === 'create'
            ? (journalLocationAddress || journalLocation)
            : (editLocationAddress || editLocation)
        }
        title="Chọn Vị Trí Kỷ Niệm Trên Bản Đồ"
        subtitle="Tọa độ GPS độ chính xác cao sẽ được lưu làm nguồn dữ liệu chuẩn cho Bản đồ tình yêu."
      />

      {/* Fullscreen Lightbox with Zoom & Photo Comments */}
      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        journal={lightboxJournal}
        initialIndex={lightboxIndex}
        currentUser={userProfile}
        coupleId={userProfile.coupleId}
        coupleData={coupleData}
        onSetMainImage={handleSetMainImage}
        onAddImageComment={handleAddImageComment}
        onDeleteImageComment={handleDeleteImageComment}
      />

      {/* Avatar Editor & Global Synchronization Modal */}
      {avatarTarget && (
        <AvatarEditorModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatar={avatarTarget.avatar}
          userUid={avatarTarget.uid}
          userName={avatarTarget.name}
          coupleId={userProfile.coupleId}
          targetSlot={avatarTarget.slot}
          onAvatarUpdated={() => {
            if (onRefreshProfile) onRefreshProfile();
          }}
        />
      )}

      {/* Live Camera Snapshot & Auto GPS Location Tagging Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCaptured}
      />

      {/* Companion & Pet Manager Modal */}
      <CompanionManagerModal
        isOpen={isCompanionManagerOpen}
        onClose={() => setIsCompanionManagerOpen(false)}
        userProfile={userProfile}
        companions={companions}
      />

      {/* Modal Thùng Rác & Khôi Phục Bình Luận Đã Xóa */}
      <RestoreCommentsModal
        isOpen={isRestoreCommentOpen}
        deletedCommentsList={deletedCommentsList}
        restoringDeletedId={restoringDeletedId}
        journals={journals}
        showManualRestoreForm={showManualRestoreForm}
        restoreSelectedJournalId={restoreSelectedJournalId}
        restoreCommentText={restoreCommentText}
        restoreCommentAuthor={restoreCommentAuthor}
        restoreCommentLoading={restoreCommentLoading}
        onClose={() => setIsRestoreCommentOpen(false)}
        onShowManualRestoreFormChange={setShowManualRestoreForm}
        onRestoreDeletedComment={handleRestoreDeletedCommentRecord}
        onPermanentDeleteRecord={handlePermanentDeleteRecord}
        onSelectedJournalChange={setRestoreSelectedJournalId}
        onCommentTextChange={setRestoreCommentText}
        onCommentAuthorChange={setRestoreCommentAuthor}
        onManualRestoreSubmit={handleRestoreCommentSubmit}
      />


      {/* Device Manager & Identification Modal */}
      <DeviceManagerModal
        isOpen={isDeviceManagerOpen}
        onClose={() => setIsDeviceManagerOpen(false)}
        currentUser={userProfile}
        onDeviceChange={(newOwner, newName) => {
          setDeviceOwner(newOwner);
          setActiveDeviceName(newName);
        }}
      />

      {/* Floating GPS and Photo Notification Toast */}
      {gpsToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-rose-500/40 text-xs font-semibold flex items-center gap-2 animate-bounce max-w-[90vw]">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{gpsToast}</span>
        </div>
      )}
    </div>
  );
};
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
import { 
  getStoredDeviceOwner, 
  getStoredDeviceName, 
  getOrCreateDeviceId, 
  detectDeviceDetails,
  syncDeviceToFirestore 
} from '../utils/deviceHelper';
import { formatDateVN, formatDateShortVN, formatDateTimeVN } from '../utils/formatDate';
import { getDeviceHighAccuracyGPS, reverseGeocodeGPS, formatCoordinates } from '../utils/geolocation';
import { compressImageToDataUrl, isVideoUrl } from '../utils/imageCompression';
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
  Film
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setJournalImageLoading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const base64 = await compressImageToDataUrl(files[i]);
        newImages.push(base64);
      }
      setJournalImages(prev => [...prev, ...newImages]);
    } catch (err: any) {
      console.error('Lỗi đọc file ảnh/video nhật ký:', err);
      alert(err?.message || 'Lỗi đọc tệp tải lên. Vui lòng chọn tệp dung lượng nhẹ hơn hoặc clip ngắn!');
    } finally {
      setJournalImageLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveJournalImage = (index: number) => {
    setJournalImages(prev => prev.filter((_, i) => i !== index));
  };

  // Camera Live Capture & Automatic GPS Location Tagging (High-Accuracy metadata)
  const handleCameraCaptured = (dataUrl: string, autoLocation?: string, meta?: CameraLocationMetadata) => {
    if (cameraModalTarget === 'journal_create') {
      setJournalImages(prev => [...prev, dataUrl]);
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
      setGpsToast(meta ? `Đã chụp ảnh & ghi nhận GPS chính xác (±${meta.accuracy ? meta.accuracy.toFixed(0) : 0}m)` : (autoLocation ? `Đã chụp ảnh & tự động lưu vị trí: ${autoLocation}` : 'Đã chụp ảnh kỷ niệm thành công!'));
      setTimeout(() => setGpsToast(null), 4000);
    } else if (cameraModalTarget === 'journal_edit') {
      setEditImages(prev => [...prev, dataUrl]);
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
      setGpsToast('Đã chụp ảnh & lưu metadata GPS thành công!');
      setTimeout(() => setGpsToast(null), 4000);
    } else if (cameraModalTarget === 'memory') {
      setMemoryImageUrl(dataUrl);
      setGpsToast('Đã chụp ảnh kỷ niệm thành công!');
      setTimeout(() => setGpsToast(null), 4000);
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
      const base64 = await compressImageToDataUrl(file);
      setMemoryImageUrl(base64);
    } catch (err: any) {
      console.error('Lỗi đọc file ảnh/video kỷ niệm:', err);
      alert(err?.message || 'Lỗi đọc tệp kỷ niệm. Vui lòng chọn tệp dung lượng nhẹ hơn.');
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

      await addDoc(journalsRef, docData);
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
    setEditMainImageIndex(0);
    setEditExpenses([]);
    setEditTaggedPeople([]);
    setEditMusicUrl('');
    setEditMusicTitle('');
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
        const base64 = await compressImageToDataUrl(files[i]);
        newImages.push(base64);
      }
      setEditImages(prev => [...prev, ...newImages]);
    } catch (err: any) {
      console.error('Lỗi đọc file ảnh/video khi sửa:', err);
      alert(err?.message || 'Lỗi đọc tệp tải lên. Vui lòng chọn tệp dung lượng nhẹ hơn.');
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

      await addDoc(memoriesRef, memoryData);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24">
      {/* Main Content Areas based on activeTab */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Couple Card */}
            {(() => {
              const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
              const isU2 = (coupleData?.user2Id === userProfile.uid) || (coupleData?.user2Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('chucga'));

              const u1Name = isU1 ? (userProfile.displayName || coupleData?.user1Name || 'Dương') : (coupleData?.user1Name || 'Dương');
              const u2Name = isU2 ? (userProfile.displayName || coupleData?.user2Name || 'Chúc Gà') : (coupleData?.user2Name || 'Chúc Gà');

              const u1Avatar = (isU1 ? userProfile.avatarUrl : coupleData?.user1Avatar) || coupleData?.user1Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile';
              const u2Avatar = (isU2 ? userProfile.avatarUrl : coupleData?.user2Avatar) || coupleData?.user2Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile';

              return (
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isU1
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isU2
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
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
                    <div className="text-5xl font-black text-rose-600 tracking-tight my-2">
                      {getDaysTogether()}{' '}
                      <span className="text-xl font-bold text-rose-400">ngày</span>
                    </div>

                    {/* Anniversary Date Display */}
                    <div className="mt-4 pt-3 border-t border-rose-100/80 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-4 h-4 text-rose-400" />
                      <span>Ngày bắt đầu:</span>
                      <span className="font-bold text-slate-700">{formatDateVN(coupleData?.anniversaryDate)}</span>
                    </div>
                  </div>

                  {/* Achievements Quick Teaser */}
                  <div 
                    onClick={() => handleNavigateTab('achievements')}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-rose-300 transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
                        <Trophy className="w-5 h-5 text-rose-500" />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="text-sm font-bold text-slate-800 block truncate">Thành Tích & Điểm Thưởng</span>
                        <p className="text-xs text-slate-500 truncate">Huy hiệu, cấp độ tình yêu & kỷ niệm</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>

                  {/* Early Bird Wake-Up Challenge Home Card */}
                  <WakeUpChallengeCard
                    compact={true}
                    userProfile={userProfile}
                    coupleData={coupleData}
                    todayLog={wakeUpLogs.find(l => l.date === new Date().toISOString().split('T')[0]) || null}
                    allLogs={wakeUpLogs}
                    onNavigateToFinance={() => handleNavigateTab('finance')}
                  />
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 2: JOURNAL (NHẬT KÝ) */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                Nhật Ký Tình Yêu
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCompanionManagerOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200/80 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Quản lý thú cưng & bạn bè xuất hiện trong kỷ niệm"
                >
                  <PawPrint className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="hidden sm:inline">Thú cưng & Bạn bè</span>
                  <span className="sm:hidden">Thú cưng</span>
                  {companions.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[10px] flex items-center justify-center font-bold">
                      {companions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowAddJournal(!showAddJournal)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Viết nhật ký</span>
                </button>
              </div>
            </div>

            {/* Subtab Toggle & Filters on the same row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setJournalViewTab('feed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  journalViewTab === 'feed'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Nhật ký ({journals.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setJournalViewTab('love_map')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  journalViewTab === 'love_map'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>🗺️ Bản đồ tình yêu ({journals.filter(j => j.location).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setJournalViewTab('places')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  journalViewTab === 'places'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 text-slate-600 border border-slate-200/80'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>63 Tỉnh thành</span>
              </button>

              {/* Quick Filter for Companions & People on the same line */}
              {journalViewTab === 'feed' && companions.length > 0 && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 shrink-0 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setSelectedCompanionFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer whitespace-nowrap ${
                      selectedCompanionFilter === null
                        ? 'bg-slate-800 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Tất cả
                  </button>
                  {companions.map((comp) => {
                    const isSelected = selectedCompanionFilter === comp.id;
                    const count = journals.filter(j => j.taggedPeople?.some(p => p.id === comp.id)).length;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => setSelectedCompanionFilter(isSelected ? null : comp.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{comp.emoji || '🐾'}</span>
                        <span>{comp.name}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded-md ${isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Time Filter, Sorting & Compact Search Toolbar */}
            {journalViewTab === 'feed' && (
              <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Time chips and dropdown */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0 mr-0.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="hidden sm:inline">Thời gian:</span>
                    </div>

                    {/* Quick Filter Chips */}
                    <button
                      type="button"
                      onClick={() => {
                        setJournalDateFilterMode('all');
                        setIsCustomDateOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        journalDateFilterMode === 'all'
                          ? 'bg-rose-500 text-white shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      Tất cả
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setJournalDateFilterMode('this_month');
                        setIsCustomDateOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        journalDateFilterMode === 'this_month'
                          ? 'bg-rose-500 text-white shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      Tháng này
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setJournalDateFilterMode('last_month');
                        setIsCustomDateOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        journalDateFilterMode === 'last_month'
                          ? 'bg-rose-500 text-white shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      Tháng trước
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setJournalDateFilterMode('this_year');
                        setIsCustomDateOpen(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap ${
                        journalDateFilterMode === 'this_year'
                          ? 'bg-rose-500 text-white shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      Năm nay
                    </button>

                    {/* Dropdown Select Month if available */}
                    {availableMonths.length > 0 && (
                      <div className="relative shrink-0">
                        <select
                          value={journalDateFilterMode === 'month' ? journalFilterMonth : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setJournalFilterMonth(e.target.value);
                              setJournalDateFilterMode('month');
                              setIsCustomDateOpen(false);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer appearance-none pr-6 ${
                            journalDateFilterMode === 'month'
                              ? 'bg-rose-500 text-white shadow-2xs font-bold'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                          }`}
                        >
                          <option value="" disabled>Theo tháng...</option>
                          {availableMonths.map(m => {
                            const [y, mon] = m.split('-');
                            const count = journals.filter(j => j.date?.startsWith(m)).length;
                            return (
                              <option key={m} value={m} className="text-slate-800 bg-white">
                                Tháng {mon}/{y} ({count})
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className={`w-3 h-3 absolute right-1.5 top-2 pointer-events-none ${
                          journalDateFilterMode === 'month' ? 'text-white' : 'text-slate-400'
                        }`} />
                      </div>
                    )}

                    {/* Custom Range Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomDateOpen;
                        setIsCustomDateOpen(nextState);
                        if (nextState) {
                          setJournalDateFilterMode('custom');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                        journalDateFilterMode === 'custom' || isCustomDateOpen
                          ? 'bg-rose-500 text-white shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      <span>Tùy chọn ngày</span>
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Right: Sort Order + Compact Search Input + Reset */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Sort Order Toggle (Gần nhất / Cũ nhất) */}
                    <button
                      type="button"
                      onClick={() => setJournalSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                        journalSortOrder === 'oldest'
                          ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                      title={journalSortOrder === 'newest' ? 'Đang sắp xếp: Gần nhất (mới nhất trước)' : 'Đang sắp xếp: Cũ nhất (lâu nhất trước)'}
                    >
                      <ArrowDownUp className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{journalSortOrder === 'newest' ? 'Gần nhất' : 'Cũ nhất'}</span>
                    </button>

                    {/* Compact Search Box on Right Corner */}
                    <div className="relative shrink-0">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={journalSearch}
                        onChange={(e) => setJournalSearch(e.target.value)}
                        className="w-28 sm:w-36 focus:w-44 sm:focus:w-52 transition-all duration-200 pl-7 pr-6 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 shadow-2xs placeholder:text-slate-400"
                      />
                      {journalSearch && (
                        <button
                          type="button"
                          onClick={() => setJournalSearch('')}
                          className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                          title="Xóa tìm kiếm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Reset Button if any filter/search is active */}
                    {(journalDateFilterMode !== 'all' || journalSearch.trim() || selectedCompanionFilter || journalSortOrder !== 'newest') && (
                      <button
                        type="button"
                        onClick={() => {
                          setJournalDateFilterMode('all');
                          setJournalFilterStartDate('');
                          setJournalFilterEndDate('');
                          setIsCustomDateOpen(false);
                          setJournalSearch('');
                          setSelectedCompanionFilter(null);
                          setJournalSortOrder('newest');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition cursor-pointer border border-rose-200/60 shrink-0 shadow-2xs"
                        title="Đặt lại tất cả bộ lọc & tìm kiếm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Đặt lại</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Date Range Picker Accordion */}
                {(journalDateFilterMode === 'custom' || isCustomDateOpen) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-[11px]">Từ ngày:</span>
                      <input
                        type="date"
                        value={journalFilterStartDate}
                        onChange={(e) => {
                          setJournalFilterStartDate(e.target.value);
                          setJournalDateFilterMode('custom');
                        }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-[11px]">Đến ngày:</span>
                      <input
                        type="date"
                        value={journalFilterEndDate}
                        onChange={(e) => {
                          setJournalFilterEndDate(e.target.value);
                          setJournalDateFilterMode('custom');
                        }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                      />
                    </div>

                    {(journalFilterStartDate || journalFilterEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setJournalFilterStartDate('');
                          setJournalFilterEndDate('');
                        }}
                        className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[11px] font-medium cursor-pointer"
                      >
                        Xóa ngày
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

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

                {/* Location Input Field with High-Accuracy GPS Metadata */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      Địa điểm / Nơi hai đứa đã ghé thăm
                      <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAutoDetectGPS('create')}
                        disabled={autoLocatingGPS}
                        className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition"
                        title="Lấy tọa độ GPS thiết bị với độ chính xác cao nhất"
                      >
                        {autoLocatingGPS ? (
                          <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                        ) : (
                          <Navigation className="w-3 h-3 text-sky-600" />
                        )}
                        <span>{autoLocatingGPS ? 'Đang đọc GPS...' : 'GPS của tôi'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setJournalMapTarget('create');
                          setIsJournalMapPickerOpen(true);
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Ghim Bản đồ</span>
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="VD: Yên Tử, Đà Lạt, Hồ Tây, Phố cổ Hội An, Landmark 81..."
                    value={journalLocation}
                    onChange={(e) => setJournalLocation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                  />

                  {/* GPS Metadata Badge if Coordinates Captured */}
                  {journalLat !== null && journalLng !== null && (
                    <div className="p-2 bg-rose-50/60 rounded-xl border border-rose-200/80 flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Crosshair className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-bold">{journalLat.toFixed(6)}, {journalLng.toFixed(6)}</span>
                        {journalAccuracy && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-sans font-bold">
                            ±{journalAccuracy.toFixed(0)}m
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setJournalLat(null);
                          setJournalLng(null);
                          setJournalAccuracy(null);
                          setJournalLocationTimestamp(null);
                          setJournalPlaceId(null);
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Xóa GPS
                      </button>
                    </div>
                  )}
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
                      Thêm ảnh & video kỷ niệm (Chụp hoặc Tải lên)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraModalTarget('journal_create');
                          setIsCameraModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition shadow-2xs"
                      >
                        <Camera className="w-4 h-4 text-rose-600" />
                        <span>Chụp ảnh ngay</span>
                      </button>

                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-700 font-semibold cursor-pointer transition">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>{journalImageLoading ? 'Đang đọc...' : 'Tải ảnh/video'}</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleJournalFileChange}
                          className="hidden"
                          disabled={journalImageLoading}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Hỗ trợ ảnh & clip video ngắn (&lt; 3.5MB). Với video dài, hai bạn có thể dán link video vào bài viết.
                    </p>
                  </div>
                </div>

                {/* Attached media preview list */}
                {journalImages.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">Đã chọn {journalImages.length} tệp:</span>
                      <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Ảnh/video chính: #{journalMainImageIndex + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {journalImages.map((img, idx) => {
                        const isVid = isVideoUrl(img);
                        return (
                          <div 
                            key={idx} 
                            className={`relative h-24 rounded-xl overflow-hidden bg-slate-900 border-2 transition ${
                              journalMainImageIndex === idx ? 'border-amber-400 shadow-sm ring-2 ring-amber-200' : 'border-slate-200'
                            }`}
                          >
                            {isVid ? (
                              <video src={img} className="w-full h-full object-cover" />
                            ) : (
                              <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            )}
                            
                            {isVid && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                                <Play className="w-6 h-6 text-white fill-white/80" />
                              </div>
                            )}

                            {/* Set main image button */}
                            <button
                              type="button"
                              onClick={() => setJournalMainImageIndex(idx)}
                              className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs ${
                                journalMainImageIndex === idx
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-black/60 hover:bg-amber-400 hover:text-slate-950 text-white'
                              }`}
                              title="Chọn làm tệp chính cho kỷ niệm"
                            >
                              <Star className={`w-3 h-3 ${journalMainImageIndex === idx ? 'fill-slate-950 text-slate-950' : 'text-amber-300'}`} />
                              <span>{journalMainImageIndex === idx ? 'Chính' : 'Đặt'}</span>
                            </button>

                            {/* Delete image button */}
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveJournalImage(idx);
                                if (journalMainImageIndex === idx) {
                                  setJournalMainImageIndex(0);
                                } else if (journalMainImageIndex > idx) {
                                  setJournalMainImageIndex(prev => prev - 1);
                                }
                              }}
                              className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                              title="Xóa tệp này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
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

                {/* Tag People / Companions in Create */}
                <TagPeopleSelector
                  userProfile={userProfile}
                  coupleData={coupleData}
                  companions={companions}
                  selectedTags={journalTaggedPeople}
                  onChange={setJournalTaggedPeople}
                  onOpenCompanionManager={() => setIsCompanionManagerOpen(true)}
                />

                {/* Music Attachment Section in Create */}
                <div className="p-3.5 bg-rose-50/40 border border-rose-200/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-rose-500" />
                      <span>Gắn link bài hát kỷ niệm</span>
                      <span className="text-slate-400 font-normal text-[11px]">(Tùy chọn)</span>
                    </label>
                    {journalMusicUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setJournalMusicUrl('');
                          setJournalMusicTitle('');
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Xóa nhạc
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="url"
                      placeholder="Dán link bài hát (YouTube, Spotify, Zing, link .mp3...)"
                      value={journalMusicUrl}
                      onChange={(e) => setJournalMusicUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Tên bài hát (VD: Cơn Mưa Tình Yêu...)"
                      value={journalMusicTitle}
                      onChange={(e) => setJournalMusicTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400"
                    />
                  </div>
                  {journalMusicUrl.trim() && (
                    <div className="pt-1">
                      <JournalMusicPlayer musicUrl={journalMusicUrl.trim()} musicTitle={journalMusicTitle.trim()} />
                    </div>
                  )}
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

            {/* Journals List or Places Visited */}
            {journalViewTab === 'feed' && (
              <>
                {filteredJournals.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {journals.length === 0 ? (
                      <>
                        <p className="text-sm font-semibold text-slate-700">Chưa có trang nhật ký nào</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Hãy bấm nút "Viết nhật ký" ở trên để ghi lại những dòng cảm xúc ngọt ngào của hai bạn.
                        </p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Không tìm thấy bài viết nào</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            Không có nhật ký nào phù hợp với bộ lọc thời gian hoặc từ khóa tìm kiếm hiện tại.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setJournalDateFilterMode('all');
                            setJournalFilterStartDate('');
                            setJournalFilterEndDate('');
                            setIsCustomDateOpen(false);
                            setJournalSearch('');
                            setSelectedCompanionFilter(null);
                            setJournalSortOrder('newest');
                          }}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer border border-rose-200/80 inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Xóa tất cả bộ lọc</span>
                        </button>
                      </div>
                    )}
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

                      {/* Location input field in Edit Form */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            Địa điểm / Nơi hai đứa đã ghé thăm
                          </label>
                          {item.authorUid === userProfile.uid && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAutoDetectGPS('edit')}
                                disabled={autoLocatingGPS}
                                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition"
                              >
                                {autoLocatingGPS ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                                ) : (
                                  <Navigation className="w-3 h-3 text-sky-600" />
                                )}
                                <span>{autoLocatingGPS ? 'Đang đọc GPS...' : 'GPS của tôi'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setJournalMapTarget('edit');
                                  setIsJournalMapPickerOpen(true);
                                }}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition"
                              >
                                <MapPin className="w-3 h-3" />
                                <span>Ghim Bản đồ</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          disabled={item.authorUid !== userProfile.uid}
                          placeholder="VD: Đà Lạt - Thung lũng Tình Yêu, Hồ Tây, Phố cổ Hội An..."
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white disabled:bg-slate-100"
                        />

                        {/* GPS Coordinates Badge in Edit Mode */}
                        {editLat !== null && editLng !== null && (
                          <div className="p-2 bg-rose-50/60 rounded-xl border border-rose-200/80 flex items-center justify-between text-xs text-slate-700">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <Crosshair className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-bold">{editLat.toFixed(6)}, {editLng.toFixed(6)}</span>
                              {editAccuracy && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-sans font-bold">
                                  ±{editAccuracy.toFixed(0)}m
                                </span>
                              )}
                            </div>
                            {item.authorUid === userProfile.uid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditLat(null);
                                  setEditLng(null);
                                  setEditAccuracy(null);
                                  setEditLocationTimestamp(null);
                                  setEditPlaceId(null);
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                              >
                                Xóa GPS
                              </button>
                            )}
                          </div>
                        )}
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
                              Thêm ảnh & video kỷ niệm
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCameraModalTarget('journal_edit');
                                  setIsCameraModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold cursor-pointer transition shadow-2xs"
                              >
                                <Camera className="w-4 h-4 text-rose-600" />
                                <span>Chụp ảnh</span>
                              </button>

                              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-700 font-semibold cursor-pointer transition">
                                <Upload className="w-4 h-4 text-slate-500" />
                                <span>{editImageLoading ? 'Đang đọc...' : 'Tải ảnh/video'}</span>
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  onChange={handleEditJournalFileChange}
                                  className="hidden"
                                  disabled={editImageLoading}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Display Edit/Detail Images */}
                      {editImages.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Danh sách tệp ({editImages.length}):</span>
                            <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Ảnh/video chính: #{editMainImageIndex + 1}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {editImages.map((img, idx) => {
                              const isVid = isVideoUrl(img);
                              return (
                                <div 
                                  key={idx} 
                                  className={`relative h-24 rounded-xl overflow-hidden bg-slate-900 border-2 transition ${
                                    editMainImageIndex === idx ? 'border-amber-400 shadow-sm ring-2 ring-amber-200' : 'border-slate-200'
                                  }`}
                                >
                                  {isVid ? (
                                    <video src={img} className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={img} alt={`Edit preview ${idx}`} className="w-full h-full object-cover" />
                                  )}

                                  {isVid && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                                      <Play className="w-6 h-6 text-white fill-white/80" />
                                    </div>
                                  )}

                                  {item.authorUid === userProfile.uid && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditMainImageIndex(idx)}
                                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs ${
                                          editMainImageIndex === idx
                                            ? 'bg-amber-400 text-slate-950'
                                            : 'bg-black/60 hover:bg-amber-400 hover:text-slate-950 text-white'
                                        }`}
                                        title="Chọn làm tệp chính cho kỷ niệm"
                                      >
                                        <Star className={`w-3 h-3 ${editMainImageIndex === idx ? 'fill-slate-950 text-slate-950' : 'text-amber-300'}`} />
                                        <span>{editMainImageIndex === idx ? 'Chính' : 'Đặt'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleRemoveEditImage(idx);
                                          if (editMainImageIndex === idx) {
                                            setEditMainImageIndex(0);
                                          } else if (editMainImageIndex > idx) {
                                            setEditMainImageIndex(prev => prev - 1);
                                          }
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                                        title="Xóa tệp này"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
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

                      {/* Tag People / Companions in Edit Mode */}
                      <TagPeopleSelector
                        userProfile={userProfile}
                        coupleData={coupleData}
                        companions={companions}
                        selectedTags={editTaggedPeople}
                        onChange={setEditTaggedPeople}
                        onOpenCompanionManager={() => setIsCompanionManagerOpen(true)}
                      />

                      {/* Music Attachment Section in Edit Mode */}
                      <div className="p-3.5 bg-rose-50/40 border border-rose-200/60 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-rose-500" />
                            <span>Gắn link bài hát kỷ niệm</span>
                            <span className="text-slate-400 font-normal text-[11px]">(Tùy chọn)</span>
                          </label>
                          {editMusicUrl && item.authorUid === userProfile.uid && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditMusicUrl('');
                                setEditMusicTitle('');
                              }}
                              className="text-[11px] text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                            >
                              Xóa nhạc
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="url"
                            disabled={item.authorUid !== userProfile.uid}
                            placeholder="Dán link bài hát (YouTube, Spotify, Zing, link .mp3...)"
                            value={editMusicUrl}
                            onChange={(e) => setEditMusicUrl(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400 disabled:bg-slate-100"
                          />
                          <input
                            type="text"
                            disabled={item.authorUid !== userProfile.uid}
                            placeholder="Tên bài hát (VD: Cơn Mưa Tình Yêu...)"
                            value={editMusicTitle}
                            onChange={(e) => setEditMusicTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-rose-400 placeholder:text-slate-400 disabled:bg-slate-100"
                          />
                        </div>
                        {editMusicUrl.trim() && (
                          <div className="pt-1">
                            <JournalMusicPlayer musicUrl={editMusicUrl.trim()} musicTitle={editMusicTitle.trim()} />
                          </div>
                        )}
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
                      <div className="flex items-center justify-between gap-2">
                        {(() => {
                          const author = getAuthorInfo(item.authorUid, item.authorName, item.authorAvatar);
                          return (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-rose-100 border border-white shadow-xs overflow-hidden shrink-0">
                                <img
                                  src={author.avatar}
                                  alt={author.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-nowrap">
                                  <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                                    {author.name}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <Calendar className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span>{formatDateShortVN(item.date)}</span>
                                  {item.updatedAt && (
                                    <span className="text-rose-500 font-medium italic text-[10px] shrink-0">
                                      (đã sửa)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex items-center gap-1 shrink-0">
                          {/* View detail button for both or Edit for author */}
                          <button
                            onClick={() => handleStartEditJournal(item)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-rose-100 whitespace-nowrap"
                            title="Xem chi tiết hoặc chỉnh sửa"
                          >
                            {item.authorUid === userProfile.uid ? (
                              <>
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sửa chi tiết</span>
                                <span className="sm:hidden">Sửa</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Xem chi tiết</span>
                                <span className="sm:hidden">Xem</span>
                              </>
                            )}
                          </button>

                          {!item.deleteRequest && (
                            <button
                              onClick={() => handleRequestDeleteJournal(item)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
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

                      {/* Tagged People / Companions */}
                      {item.taggedPeople && item.taggedPeople.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-rose-500" />
                            Cùng với:
                          </span>
                          {item.taggedPeople.map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (selectedCompanionFilter === p.id) {
                                  setSelectedCompanionFilter(null);
                                } else {
                                  setSelectedCompanionFilter(p.id);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                                selectedCompanionFilter === p.id
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100'
                              }`}
                              title={`Lọc bài viết có ${p.name}`}
                            >
                              <span>{p.emoji || '👤'}</span>
                              <span>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Location Badge on feed card */}
                      {item.location && (
                        <div className="flex items-center justify-between gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200/60 px-3 py-1.5 rounded-xl font-medium my-1 max-w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-bold truncate" title={item.location}>{item.location}</span>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.locationAddress || item.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-rose-600 font-semibold hover:text-rose-800 flex items-center gap-0.5 shrink-0 whitespace-nowrap ml-1.5 hover:underline"
                            title="Mở chỉ đường Google Maps"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="whitespace-nowrap">Bản đồ</span>
                          </a>
                        </div>
                      )}

                      {item.content && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                          {item.content}
                        </p>
                      )}

                      {/* Music Player in feed card */}
                      {item.musicUrl && (
                        <JournalMusicPlayer
                          musicUrl={item.musicUrl}
                          musicTitle={item.musicTitle}
                        />
                      )}

                      {/* Media grid display on feed (Multi-image/video or single) */}
                      {item.images && item.images.length > 0 ? (
                        <div className={`mt-2 ${
                          item.images.length === 1 ? 'w-full' :
                          item.images.length === 2 ? 'grid grid-cols-2 gap-2' :
                          'grid grid-cols-2 sm:grid-cols-3 gap-2'
                        }`}>
                          {item.images.map((img, idx) => {
                            const isSingle = item.images && item.images.length === 1;
                            const isVid = isVideoUrl(img);
                            const imgCommentsCount = (item.imageComments || []).filter(
                              c => c.imageIndex === idx || (c.imageUrl && c.imageUrl === img)
                            ).length;

                            return (
                              <div 
                                key={idx} 
                                onClick={() => handleOpenLightbox(item, idx)}
                                className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 cursor-pointer group shadow-2xs hover:shadow-md transition ${
                                  isSingle ? 'w-full flex items-center justify-center' : 'h-48'
                                }`}
                              >
                                {isVid ? (
                                  <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                                    <video
                                      src={img}
                                      className={`${
                                        isSingle 
                                          ? 'w-full h-auto max-h-[600px] object-contain rounded-2xl' 
                                          : 'w-full h-full object-cover group-hover:scale-105'
                                      } transition-transform duration-300`}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                                      <div className="p-3 rounded-full bg-rose-500/90 text-white shadow-md">
                                        <Play className="w-6 h-6 fill-white" />
                                      </div>
                                    </div>
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                                      <Film className="w-3 h-3 text-rose-400" />
                                      <span>Video</span>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={img}
                                    alt={`${item.title} ${idx + 1}`}
                                    className={`${
                                      isSingle 
                                        ? 'w-full h-auto max-h-[600px] object-contain rounded-2xl' 
                                        : 'w-full h-full object-cover group-hover:scale-105'
                                    } transition-transform duration-300`}
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}

                                {/* Comment Count on Photo */}
                                {imgCommentsCount > 0 && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <MessageSquare className="w-3 h-3 text-rose-400" />
                                    <span>{imgCommentsCount}</span>
                                  </div>
                                )}

                                {/* Hover Zoom Overlay */}
                                {!isVid && (
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="p-2 rounded-full bg-white/30 backdrop-blur-md text-white shadow-sm">
                                      <ZoomIn className="w-5 h-5 drop-shadow" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : item.imageUrl ? (
                        <div 
                          onClick={() => handleOpenLightbox(item, 0)}
                          className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 mt-2 cursor-pointer group relative shadow-2xs hover:shadow-md transition flex items-center justify-center"
                        >
                          {isVideoUrl(item.imageUrl) ? (
                            <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                              <video
                                src={item.imageUrl}
                                className="w-full h-auto max-h-[600px] object-contain rounded-2xl"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                                <div className="p-3 rounded-full bg-rose-500/90 text-white shadow-md">
                                  <Play className="w-6 h-6 fill-white" />
                                </div>
                              </div>
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                                <Film className="w-3 h-3 text-rose-400" />
                                <span>Video</span>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-auto max-h-[600px] object-contain rounded-2xl transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}

                          {/* Comment Count on Photo */}
                          {(item.imageComments && item.imageComments.length > 0) && (
                            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <MessageSquare className="w-3 h-3 text-rose-400" />
                              <span>{item.imageComments.length}</span>
                            </div>
                          )}

                          {/* Hover Zoom Overlay */}
                          {!isVideoUrl(item.imageUrl) && (
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <div className="p-2 rounded-full bg-white/30 backdrop-blur-md text-white shadow-sm">
                                <ZoomIn className="w-5 h-5 drop-shadow" />
                              </div>
                            </div>
                          )}
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
                            {item.comments.map((comment) => {
                              const cAuthor = getAuthorInfo(comment.authorUid, comment.authorName, comment.authorAvatar);
                              return (
                                <div key={comment.id} className="flex items-start justify-between gap-2 text-xs bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 group/cmt">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-rose-100 overflow-hidden shrink-0 mt-0.5">
                                      <img
                                        src={cAuthor.avatar}
                                        alt={cAuthor.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800 text-[11px]">{cAuthor.name}</span>
                                        {cAuthor.isMe && (
                                          <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md font-bold">
                                            Bạn
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-slate-600 mt-0.5 leading-snug break-words">{comment.content}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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
            </>
            )}

            {/* LOVE FOOTPRINT & DATE MAP VIEW */}
            {journalViewTab === 'love_map' && (
              <div className="space-y-5">
                <LoveFootprintMap
                  coupleId={coupleData?.id || userProfile.coupleId || 'our_forever_couple_id'}
                  userProfile={userProfile}
                  coupleData={coupleData}
                  journals={journals}
                  onOpenJournalLightbox={handleOpenLightbox}
                  onNavigateToJournal={() => setJournalViewTab('feed')}
                />
              </div>
            )}

            {/* 63 PROVINCES VISITED VIEW */}
            {journalViewTab === 'places' && (
              <div className="space-y-5">
                {/* 63 Provinces & Specific Places Tracker with Memory Auto-Sync */}
                <VisitedPlacesTracker
                  coupleId={coupleData?.id || userProfile.coupleId || 'our_forever_couple_id'}
                  userProfile={userProfile}
                  coupleData={coupleData}
                  journals={journals}
                  onOpenJournalLightbox={handleOpenLightbox}
                  defaultCollapsed={false}
                />
              </div>
            )}
          </div>
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
        {activeTab === 'profile' && (() => {
          const isU1 = (coupleData?.user1Id === userProfile.uid) || (coupleData?.user1Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('duong'));
          const isU2 = (coupleData?.user2Id === userProfile.uid) || (coupleData?.user2Uid === userProfile.uid) || (userProfile.email?.toLowerCase().includes('chucga'));

          const myPhone = isU1 ? coupleData?.user1Phone : coupleData?.user2Phone;
          const myBirthday = isU1 ? coupleData?.user1Birthday : coupleData?.user2Birthday;
          const myAvatar = userProfile.avatarUrl || (isU1 ? coupleData?.user1Avatar : coupleData?.user2Avatar) || (isU1 ? 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male' : 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female');

          let rawPartnerName = isU1 ? (coupleData?.user2Name || 'Chúc Gà') : (coupleData?.user1Name || 'Dương');
          if (rawPartnerName.trim() === userProfile.displayName.trim() || rawPartnerName.trim() === (isU1 ? 'Dương' : 'Chúc Gà')) {
            rawPartnerName = isU1 ? 'Chúc Gà' : 'Dương';
          }
          const partnerName = rawPartnerName;
          const partnerPhone = isU1 ? coupleData?.user2Phone : coupleData?.user1Phone;
          const partnerBirthday = isU1 ? coupleData?.user2Birthday : coupleData?.user1Birthday;
          const partnerAvatar = isU1 
            ? (coupleData?.user2Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile')
            : (coupleData?.user1Avatar || 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze&eyes=eyes&mouth=smile');

          return (
            <div className="space-y-4 pb-12 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-rose-500 shrink-0" />
                    <span>Tài Khoản & Hồ Sơ Đôi</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartEditProfile}
                    className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa thông tin</span>
                  </button>
                </div>
              </div>

              {/* 2-Column User & Partner Identification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. MY PROFILE CARD */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                      {userProfile.displayName || 'Tài khoản của bạn'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarModal(userProfile.uid, userProfile.displayName, myAvatar, isU1 ? 'user1' : 'user2')}
                      className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(userProfile.uid, userProfile.displayName, myAvatar, isU1 ? 'user1' : 'user2')}
                        className="w-12 h-12 rounded-full border border-rose-200 p-0.5 overflow-hidden block bg-white shadow-2xs cursor-pointer hover:opacity-90 transition"
                        title="Bấm để đổi avatar"
                      >
                        <img src={myAvatar} alt={userProfile.displayName} className="w-full h-full object-cover rounded-full" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(userProfile.uid, userProfile.displayName, myAvatar, isU1 ? 'user1' : 'user2')}
                        className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer transition"
                      >
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">{userProfile.displayName}</h3>
                      <p className="text-[11px] text-slate-400 truncate">{userProfile.email}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" /> SĐT:
                      </span>
                      <span className="font-mono font-medium text-slate-800">{myPhone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Cake className="w-3.5 h-3.5 text-amber-500" /> Sinh nhật:
                      </span>
                      <span className="font-medium text-slate-800">{formatDateVN(myBirthday)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. PARTNER PROFILE CARD */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {partnerName || 'Nửa kia'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarModal(isU1 ? (coupleData?.user2Id || coupleData?.user2Uid || '') : (coupleData?.user1Id || coupleData?.user1Uid || ''), partnerName, partnerAvatar, isU1 ? 'user2' : 'user1')}
                      className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Đổi ảnh</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pt-0.5">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(isU1 ? (coupleData?.user2Id || coupleData?.user2Uid || '') : (coupleData?.user1Id || coupleData?.user1Uid || ''), partnerName, partnerAvatar, isU1 ? 'user2' : 'user1')}
                        className="w-12 h-12 rounded-full border border-slate-200 p-0.5 overflow-hidden block bg-white shadow-2xs cursor-pointer hover:opacity-90 transition"
                        title="Bấm để đổi avatar"
                      >
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover rounded-full" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(isU1 ? (coupleData?.user2Id || coupleData?.user2Uid || '') : (coupleData?.user1Id || coupleData?.user1Uid || ''), partnerName, partnerAvatar, isU1 ? 'user2' : 'user1')}
                        className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-slate-700 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer transition"
                      >
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">{partnerName}</h3>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" /> SĐT:
                      </span>
                      <span className="font-mono font-medium text-slate-800">{partnerPhone || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Cake className="w-3.5 h-3.5 text-amber-500" /> Sinh nhật:
                      </span>
                      <span className="font-medium text-slate-800">{formatDateVN(partnerBirthday)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Couple & Living Information */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>Thông Tin Chung & Hẹn Hò</span>
                </h3>

                <div className="space-y-3 text-xs">
                  {/* Anniversary */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      Ngày kỷ niệm yêu nhau:
                    </span>
                    <span className="font-bold text-rose-600">{formatDateVN(coupleData?.anniversaryDate)}</span>
                  </div>

                  {/* Address */}
                  <div className="py-1.5 border-b border-slate-100 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-sky-500" />
                        Địa chỉ / Nơi ở:
                      </span>
                      <span className="font-medium text-slate-800 text-right">
                        {coupleData?.address ? (
                          <>
                            {coupleData.address}
                            {coupleData.city && <span className="block text-[11px] text-slate-400">{coupleData.city}</span>}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Chưa cập nhật</span>
                        )}
                      </span>
                    </div>

                    {(coupleData?.address || coupleData?.city) && (
                      <div className="pt-1 flex justify-end">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((coupleData.address || '') + ' ' + (coupleData.city || '')).trim())}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-[11px] font-semibold border border-sky-200/60 transition cursor-pointer"
                        >
                          <Map className="w-3 h-3 text-sky-500" />
                          <span>Mở Google Maps / Chỉ đường</span>
                          <ExternalLink className="w-2.5 h-2.5 text-sky-400 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Embedded Google Maps Widget if Address Exists */}
                  {(coupleData?.address || coupleData?.city) && (
                    <div className="my-2 rounded-xl border border-sky-100 overflow-hidden bg-slate-50 shadow-2xs">
                      <iframe
                        title="Google Maps Location"
                        width="100%"
                        height="150"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(((coupleData?.address || '') + ' ' + (coupleData?.city || '')).trim())}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      />
                    </div>
                  )}

                  {/* Favorite Places */}
                  <div className="py-1.5 border-b border-slate-100 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        Địa điểm hẹn hò yêu thích:
                      </span>
                      <span className="font-medium text-slate-800 text-right max-w-xs">
                        {coupleData?.favoritePlaces || <span className="text-slate-400 italic">Chưa cập nhật</span>}
                      </span>
                    </div>
                    {coupleData?.favoritePlaces && (
                      <div className="pt-0.5 flex justify-end">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coupleData.favoritePlaces)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-semibold border border-rose-200/60 transition cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-rose-500" />
                          <span>Tìm địa điểm trên Google Maps</span>
                          <ExternalLink className="w-2.5 h-2.5 text-rose-400 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  <div className="py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 block mb-1">Lời nhắn tình yêu / Slogan:</span>
                    <p className="font-medium text-slate-800 italic bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/60">
                      "{coupleData?.statusMessage || 'Hành trình tình yêu bắt đầu từ những điều nhỏ nhất'}"
                    </p>
                  </div>

                  {/* Love Story / Memory Note */}
                  {coupleData?.loveStory && (
                    <div className="py-1.5">
                      <span className="text-slate-500 block mb-1">Kỷ niệm quen nhau / Ghi chú tình yêu:</span>
                      <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {coupleData.loveStory}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pets & Companions Section */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-slate-800">Thú Cưng & Bạn Bè Đôi Mình</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCompanionManagerOpen(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Quản lý / Thêm</span>
                  </button>
                </div>

                {companions.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <p>Chưa có thú cưng hay bạn bè nào được thêm.</p>
                    <button
                      type="button"
                      onClick={() => setIsCompanionManagerOpen(true)}
                      className="mt-1.5 text-xs text-rose-500 font-semibold hover:underline"
                    >
                      + Thêm mèo cưng / cún cưng ngay
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {companions.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => setIsCompanionManagerOpen(true)}
                        className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 cursor-pointer transition"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-lg overflow-hidden shrink-0">
                          {comp.avatarUrl ? (
                            <img src={comp.avatarUrl} alt={comp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{comp.emoji || '🐾'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 truncate">{comp.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {comp.relationship || (comp.type === 'pet' ? 'Thú cưng' : 'Bạn bè')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device Management & Security Section */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-800">Quản Lý Thiết Bị & Bảo Mật</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeviceManagerOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Chi tiết / Đổi máy ⚙️</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {activeDeviceName}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đang định danh: <span className="font-semibold text-slate-700">{deviceOwner === 'duong' ? 'Dương (Tao)' : 'Chúc (Chúc Gà)'}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeviceManagerOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shrink-0"
                  >
                    Quản lý
                  </button>
                </div>
              </div>

              {/* Recovery & History Protection Tool */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-800">Khôi Phục Bình Luận Đã Mất</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (journals.length > 0) {
                        setRestoreSelectedJournalId(journals[0].id);
                      }
                      setIsRestoreCommentOpen(true);
                    }}
                    className="text-xs px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl border border-amber-200/70 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Khôi phục / Viết lại cmt ✍️</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đã khóa hoàn toàn thao tác xóa bình luận trên toàn hệ thống để không bao giờ bị xóa nhầm nữa. Nếu bạn vừa lỡ bấm xóa bình luận trước đó, hãy bấm nút trên để khôi phục hoặc chèn lại nội dung vào đúng bài viết ngay lập tức.
                </p>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200/60"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất tài khoản
                </button>
              </div>
            </div>
          );
        })()}

        {/* Modal Chỉnh Sửa Thông Tin Profile & Đôi Lứa */}
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <form onSubmit={handleSaveProfile} className="bg-white w-full max-w-lg rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-rose-500" />
                  Chỉnh Sửa Thông Tin Hồ Sơ & Địa Chỉ
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Group 1: Standard Names & Anniversary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">1. Thông tin đôi lứa</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Người yêu 1</label>
                    <input
                      type="text"
                      value={editUser1Name}
                      onChange={(e) => setEditUser1Name(e.target.value)}
                      placeholder="Tên Bạn"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Người yêu 2</label>
                    <input
                      type="text"
                      value={editUser2Name}
                      onChange={(e) => setEditUser2Name(e.target.value)}
                      placeholder="Tên Người ấy"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày kỷ niệm yêu nhau</label>
                    <input
                      type="date"
                      value={editAnniversaryDateProfile}
                      onChange={(e) => setEditAnniversaryDateProfile(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Lời nhắn tình yêu / Status</label>
                    <input
                      type="text"
                      value={editStatusMessageProfile}
                      onChange={(e) => setEditStatusMessageProfile(e.target.value)}
                      placeholder="VD: Cùng nhau đi qua bão giông"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Address & Location */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    2. Địa chỉ & Nơi ở (Google Maps)
                  </h4>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((editAddress + ' ' + editCity).trim() || 'Việt Nam')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Map className="w-3 h-3 text-sky-500" />
                    <span>Tìm trên Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">Địa chỉ chi tiết (Đường, Phường, Quận...)</label>
                    <button
                      type="button"
                      onClick={() => handleOpenMapPicker('address')}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-[11px] font-bold border border-sky-200/80 transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <MapPin className="w-3 h-3 text-sky-500" />
                      <span>Chọn trên Google Maps 📍</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="VD: 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Thành phố / Tỉnh thành</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="VD: TP. Hồ Chí Minh, Hà Nội..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600">Địa điểm hẹn hò yêu thích</label>
                      <button
                        type="button"
                        onClick={() => handleOpenMapPicker('favorite')}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-semibold border border-rose-200/80 transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <MapPin className="w-2.5 h-2.5 text-rose-500" />
                        <span>Chọn trên bản đồ</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editFavoritePlaces}
                      onChange={(e) => setEditFavoritePlaces(e.target.value)}
                      placeholder="VD: Lẩu Haidilao, Phố cổ, Cà phê ngõ..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                </div>

                {/* Google Maps Live Interactive Preview in Edit Modal */}
                {(editAddress.trim() || editCity.trim()) && (
                  <div className="mt-2 rounded-xl border border-sky-200/80 overflow-hidden bg-slate-50 shadow-2xs space-y-0">
                    <div className="p-2 bg-sky-50/80 border-b border-sky-100 flex items-center justify-between text-[11px] font-semibold text-sky-800">
                      <span className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-sky-500" />
                        Bản đồ vị trí Google Maps tương ứng:
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((editAddress + ' ' + editCity).trim())}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:text-sky-800 underline flex items-center gap-0.5"
                      >
                        Chỉ đường trên Google Maps <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <iframe
                      title="Google Maps Location Preview"
                      width="100%"
                      height="160"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent((editAddress + ' ' + editCity).trim())}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                )}
              </div>

              {/* Group 3: Phone & Birthdays */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  3. Liên hệ & Sinh nhật
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại ({editUser1Name || 'Partner 1'})</label>
                    <input
                      type="text"
                      value={editUser1Phone}
                      onChange={(e) => setEditUser1Phone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại ({editUser2Name || 'Partner 2'})</label>
                    <input
                      type="text"
                      value={editUser2Phone}
                      onChange={(e) => setEditUser2Phone(e.target.value)}
                      placeholder="0908765432"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sinh nhật ({editUser1Name || 'Partner 1'})</label>
                    <input
                      type="date"
                      value={editUser1Birthday}
                      onChange={(e) => setEditUser1Birthday(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sinh nhật ({editUser2Name || 'Partner 2'})</label>
                    <input
                      type="date"
                      value={editUser2Birthday}
                      onChange={(e) => setEditUser2Birthday(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Love Story / Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú kỷ niệm quen nhau / Love Story</label>
                <textarea
                  rows={3}
                  value={editLoveStory}
                  onChange={(e) => setEditLoveStory(e.target.value)}
                  placeholder="Lần đầu hai đứa gặp nhau ở đâu, ấn tượng gì..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        )}

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

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-rose-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-1 sm:px-4 py-2 sm:py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-around gap-1">
          {/* Tab 1: Home (/home or /) */}
          <button
            onClick={() => handleNavigateTab('home')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] ${
              activeTab === 'home'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <Home className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Trang chủ</span>
          </button>

          {/* Tab 2: Journal (/journal) */}
          <button
            onClick={() => handleNavigateTab('journal')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] ${
              activeTab === 'journal'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <BookOpen className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Nhật ký</span>
          </button>

          {/* Tab 3: Achievements (/achievements) */}
          <button
            onClick={() => handleNavigateTab('achievements')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] relative ${
              activeTab === 'achievements'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <Trophy className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Thành tích</span>
            <span className="absolute top-1 right-2 sm:right-3 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-white" />
          </button>

          {/* Tab 4: Nutrition (/nutrition) */}
          <button
            onClick={() => handleNavigateTab('nutrition')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] ${
              activeTab === 'nutrition'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <Apple className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Dinh dưỡng</span>
          </button>

          {/* Tab 5: Finance (/finance) */}
          <button
            onClick={() => handleNavigateTab('finance')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] ${
              activeTab === 'finance'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <Wallet className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Tài chính</span>
          </button>

          {/* Tab 6: Profile (/profile) */}
          <button
            onClick={() => handleNavigateTab('profile')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-2xl transition cursor-pointer min-h-[52px] ${
              activeTab === 'profile'
                ? 'text-rose-600 font-bold bg-rose-50 border border-rose-200/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
            }`}
          >
            <UserIcon className="w-5 h-5 sm:w-5 sm:h-5 shrink-0" />
            <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">Tài khoản</span>
          </button>
        </div>
      </nav>

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
      {isRestoreCommentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Thùng Rác & Khôi Phục Bình Luận
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khôi phục lại những bình luận bạn hoặc đối phương đã từng xóa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRestoreCommentOpen(false);
                  setShowManualRestoreForm(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Deleted Comments List (True Restore) */}
              {!showManualRestoreForm ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                    <span>Bình luận đã xóa trong thùng rác ({deletedCommentsList.length}):</span>
                    <button
                      type="button"
                      onClick={() => setShowManualRestoreForm(true)}
                      className="text-purple-600 hover:text-purple-700 text-[11px] font-bold cursor-pointer"
                    >
                      + Nhập tay nếu cần
                    </button>
                  </div>

                  {deletedCommentsList.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs space-y-2.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <Archive className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="font-medium text-slate-600">Thùng rác hiện đang trống</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Khi bạn xóa bất kỳ bình luận nào, bình luận đó sẽ được tự động lưu vào đây để có thể khôi phục lại bất kỳ lúc nào.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {deletedCommentsList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 hover:bg-amber-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-amber-200 overflow-hidden">
                              {item.authorAvatar ? (
                                <img src={item.authorAvatar} alt={item.authorName} className="w-full h-full object-cover" />
                              ) : (
                                <span>{item.authorName?.charAt(0)?.toUpperCase() || 'U'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 text-xs">{item.authorName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {item.journalTitle || 'Kỷ niệm'}
                                </span>
                                {item.deletedAt && (
                                  <span className="text-[10px] text-slate-400">
                                    Đã xóa: {formatDateShortVN(item.deletedAt)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 mt-1 leading-relaxed break-words bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                                "{item.content}"
                              </p>
                            </div>
                          </div>

                          {/* 1-Click Restore & Permanent Delete Actions */}
                          <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <button
                              type="button"
                              disabled={restoringDeletedId === item.id}
                              onClick={() => handleRestoreDeletedCommentRecord(item)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Khôi phục lại vào bài viết"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${restoringDeletedId === item.id ? 'animate-spin' : ''}`} />
                              <span>{restoringDeletedId === item.id ? 'Đang khôi phục...' : 'Khôi phục ✨'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePermanentDeleteRecord(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                              title="Xóa vĩnh viễn khỏi thùng rác"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Manual write/restore form */
                <form onSubmit={handleRestoreCommentSubmit} className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-slate-700">Tạo lại bình luận thủ công:</span>
                    <button
                      type="button"
                      onClick={() => setShowManualRestoreForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                    >
                      ← Quay lại Thùng rác
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Chọn bài viết kỷ niệm:
                    </label>
                    <select
                      value={restoreSelectedJournalId}
                      onChange={(e) => setRestoreSelectedJournalId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      {journals.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title || 'Kỷ niệm ngày ' + j.date} ({j.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Người bình luận:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreCommentAuthor('duong')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          restoreCommentAuthor === 'duong'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>👦 Dương</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestoreCommentAuthor('chuc')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          restoreCommentAuthor === 'chuc'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>👧 Chúc Gà</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nội dung bình luận:
                    </label>
                    <textarea
                      rows={3}
                      value={restoreCommentText}
                      onChange={(e) => setRestoreCommentText(e.target.value)}
                      placeholder="Nhập nội dung bình luận..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowManualRestoreForm(false)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={restoreCommentLoading || !restoreCommentText.trim()}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {restoreCommentLoading ? <span>Đang lưu...</span> : <span>Thêm vào bài viết ✨</span>}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                {deletedCommentsList.length} bình luận đã lưu trữ
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRestoreCommentOpen(false);
                  setShowManualRestoreForm(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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


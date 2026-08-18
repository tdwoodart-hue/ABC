export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coupleId: string;
  createdAt: string;
  phone?: string;
  address?: string;
  birthday?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  roleTitle?: string;
  isAdmin?: boolean;
}

export interface CoupleData {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id?: string;
  user2Name?: string;
  user1Avatar?: string;
  user2Avatar?: string;
  user1Uid?: string;
  user2Uid?: string;
  user1Email?: string;
  user2Email?: string;
  user1Gender?: 'male' | 'female';
  user2Gender?: 'male' | 'female';
  user1Role?: string; // 'Anh ♂', 'Nam', etc.
  user2Role?: string; // 'Em ♀', 'Nữ', etc.
  anniversaryDate: string; // ISO string YYYY-MM-DD
  statusMessage?: string;
  createdAt: string;
  // Additional info
  address?: string;
  city?: string;
  favoritePlaces?: string;
  user1Phone?: string;
  user2Phone?: string;
  user1Birthday?: string;
  user2Birthday?: string;
  loveStory?: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  date: string;
  imageUrl?: string;
  authorName: string;
  authorUid: string;
  createdAt: string;
}

export interface JournalComment {
  id: string;
  authorName: string;
  authorUid: string;
  content: string;
  createdAt: string;
}

export interface JournalDeleteRequest {
  requestedByUid: string;
  requestedByName: string;
  requestedAt: string;
}

export interface FinanceTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  paidByUid: string;
  paidByName: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt: string;
}

export interface WakeUpLog {
  id: string; // Date string: YYYY-MM-DD
  date: string; // YYYY-MM-DD
  winnerUid: string;
  winnerName: string;
  winnerTime: string; // e.g. "06:30" or full time string
  loserUid: string;
  loserName: string;
  loserWokeUpAt?: string; // Optional: when the second person tapped
  fineAmount: number; // 5000 VND
  finePaid: boolean;
  transactionId?: string;
  createdAt: string;
}

export interface ImageComment {
  id: string;
  imageIndex: number;
  imageUrl?: string;
  authorName: string;
  authorUid: string;
  content: string;
  createdAt: string;
}

export interface Companion {
  id: string;
  name: string;
  type: 'pet' | 'friend' | 'family' | 'other';
  avatarUrl?: string;
  emoji?: string; // e.g. '🐱', '🐶', '🐰', '🐾', '🌸'
  relationship?: string; // e.g. 'Con mèo của chúng mình', 'Bạn thân', 'Em gái'
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
}

export interface TaggedPerson {
  id: string;
  name: string;
  type: 'user' | 'pet' | 'friend' | 'family' | 'other';
  avatarUrl?: string;
  emoji?: string;
}

export interface JournalExpense {
  id: string;
  title: string;
  amount: number;
}

export interface JournalEntry {
  id: string;
  title: string;
  content?: string;
  date: string;
  location?: string; // Tên địa điểm/Nơi đã đi
  locationAddress?: string; // Địa chỉ chi tiết nếu có
  mood?: string;
  imageUrl?: string; // Ảnh chính / Bìa
  images?: string[]; // Tất cả ảnh đính kèm
  mainImageIndex?: number; // Vị trí ảnh chính trong mảng images
  expenses?: JournalExpense[];
  taggedPeople?: TaggedPerson[]; // Danh sách người hoặc thú cưng (con mèo, bạn bè...) xuất hiện
  authorName: string;
  authorUid: string;
  createdAt: string;
  updatedAt?: string;
  comments?: JournalComment[];
  imageComments?: ImageComment[]; // Bình luận riêng cho từng ảnh
  deleteRequest?: JournalDeleteRequest;
}

export interface NutritionMeal {
  id: string;
  foodName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  date: string; // YYYY-MM-DD
  imageUrl?: string;
  notes?: string;
  loggedByUid: string;
  loggedByName: string;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  loggedByUid: string;
  loggedByName: string;
  createdAt: string;
}

export interface NutritionRecipe {
  id: string;
  title: string;
  ingredients: string;
  instructions?: string;
  calories?: number;
  imageUrl?: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
}

export interface VisitedPlace {
  id: string;
  name: string;
  province: string;
  region?: 'bac' | 'trung' | 'nam';
  dateVisited?: string;
  note?: string;
  imageUrl?: string;
  rating?: number;
  addedByUid: string;
  addedByName: string;
  createdAt: string;
}

export interface VisitedProvinceRecord {
  id: string;
  provinceName: string;
  region: 'bac' | 'trung' | 'nam';
  visitedAt?: string;
  notes?: string;
  addedByUid?: string;
  addedByName?: string;
  createdAt: string;
}

export interface TierMilestone {
  level: number;
  target: number;
  title: string;
  points: number;
  rewardText?: string;
  unlockedAt?: string;
}

export interface CoupleAchievement {
  id: string;
  key?: string;
  title: string;
  description: string;
  category: 'love' | 'journal' | 'travel' | 'health' | 'finance' | 'custom' | 'action';
  icon: string;
  currentLevel?: number;
  maxLevel?: number;
  points?: number; // points earned or for this achievement
  tiers?: TierMilestone[];
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  customImage?: string;
  note?: string;
  rewardText?: string;
  addedByUid?: string;
  addedByName?: string;
  createdAt?: string;
}

export interface LoveActionRecord {
  id: string;
  title: string;
  points: number;
  category: 'care' | 'food' | 'date' | 'gift' | 'help' | 'sweet' | 'custom';
  icon: string;
  performedByUid: string;
  performedByName: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface FundConfig {
  qrImageUrl?: string;
  bankName?: string;
  bankAccountNo?: string;
  accountHolderName?: string;
  fundPurpose?: string;
  customNote?: string;
  updatedAt?: string;
  updatedByUid?: string;
}

export interface DeviceRecord {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'other';
  os: string;
  browser: string;
  ownerKey: 'duong' | 'chuc';
  ownerName: string;
  ownerUid?: string;
  lastActive: string;
  ipAddress?: string;
  isCurrentDevice?: boolean;
  createdAt: string;
  isTrusted: boolean;
}

export interface DeletedCommentRecord {
  id: string;
  commentId: string;
  coupleId: string;
  journalId: string;
  journalTitle?: string;
  journalDate?: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  deletedAt: string;
  deletedByUid: string;
  deletedByName: string;
  type?: 'journal_comment' | 'image_comment';
  imageIndex?: number;
  imageUrl?: string;
}



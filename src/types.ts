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

export interface ImageComment {
  id: string;
  imageIndex: number;
  imageUrl?: string;
  authorName: string;
  authorUid: string;
  content: string;
  createdAt: string;
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


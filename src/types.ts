export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coupleId: string;
  createdAt: string;
}

export interface CoupleData {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id?: string;
  user2Name?: string;
  anniversaryDate: string; // ISO string YYYY-MM-DD
  statusMessage?: string;
  createdAt: string;
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
  mood?: string;
  imageUrl?: string;
  images?: string[];
  expenses?: JournalExpense[];
  authorName: string;
  authorUid: string;
  createdAt: string;
  updatedAt?: string;
  comments?: JournalComment[];
  deleteRequest?: JournalDeleteRequest;
}

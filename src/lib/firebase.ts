import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  deleteField,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, CoupleData } from '../types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use custom firestore database ID if specified in config, else default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

// Shared single couple document ID for this dedicated app
export const OUR_COUPLE_ID = 'our_couple';

export const ADMIN_EMAILS = ['tdwoodart@gmail.com'];

export function checkIsAdmin(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  if (profile.email && ADMIN_EMAILS.includes(profile.email.toLowerCase().trim())) return true;
  return false;
}

// Fetch or create user document in Firestore and automatically assign to couple space
export async function syncUserProfile(
  user: User, 
  customName?: string, 
  gender?: 'male' | 'female', 
  roleTitle?: string
): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const nameToUse = customName || user.displayName || user.email?.split('@')[0] || 'Người dùng';
  const isAdminUser = ADMIN_EMAILS.includes((user.email || '').toLowerCase().trim());

  // Ensure our_couple document exists
  const coupleRef = doc(db, 'couples', OUR_COUPLE_ID);
  const coupleSnap = await getDoc(coupleRef);

  let initialGender: 'male' | 'female' | undefined = gender;
  let initialRole: string | undefined = roleTitle;

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    if (!initialGender && data.gender) initialGender = data.gender;
    if (!initialRole && data.roleTitle) initialRole = data.roleTitle;
  }

  const defaultAvatar = initialGender === 'female'
    ? `https://api.dicebear.com/7.x/micah/svg?seed=female_${user.uid}`
    : `https://api.dicebear.com/7.x/micah/svg?seed=male_${user.uid}`;

  if (!coupleSnap.exists()) {
    const initialCouple: CoupleData = {
      id: OUR_COUPLE_ID,
      user1Id: user.uid,
      user1Uid: user.uid,
      user1Name: nameToUse,
      user1Gender: initialGender || 'male',
      user1Role: initialRole || (initialGender === 'female' ? 'Em ♀' : 'Anh ♂'),
      user1Avatar: user.photoURL || defaultAvatar,
      user2Id: '',
      user2Uid: '',
      user2Name: 'Người yêu',
      user2Gender: initialGender === 'female' ? 'male' : 'female',
      user2Role: initialGender === 'female' ? 'Anh ♂' : 'Em ♀',
      user2Avatar: `https://api.dicebear.com/7.x/micah/svg?seed=partner_slot2`,
      anniversaryDate: new Date().toISOString().split('T')[0],
      statusMessage: 'Chào mừng hai bạn đến với không gian yêu thương!',
      createdAt: new Date().toISOString()
    };
    await setDoc(coupleRef, initialCouple);
  } else {
    const coupleData = coupleSnap.data() as CoupleData;
    const coupleUpdates: Record<string, any> = {};

    // Auto-assign user to user1 or user2 slot in the couple
    if (coupleData.user1Id === user.uid || coupleData.user1Uid === user.uid) {
      coupleUpdates.user1Id = user.uid;
      coupleUpdates.user1Uid = user.uid;
      if (coupleData.user1Name !== nameToUse && nameToUse !== 'Người dùng') {
        coupleUpdates.user1Name = nameToUse;
      }
      if (initialGender) coupleUpdates.user1Gender = initialGender;
      if (initialRole) coupleUpdates.user1Role = initialRole;
    } else if (coupleData.user2Id === user.uid || coupleData.user2Uid === user.uid) {
      coupleUpdates.user2Id = user.uid;
      coupleUpdates.user2Uid = user.uid;
      if (coupleData.user2Name !== nameToUse && nameToUse !== 'Người dùng') {
        coupleUpdates.user2Name = nameToUse;
      }
      if (initialGender) coupleUpdates.user2Gender = initialGender;
      if (initialRole) coupleUpdates.user2Role = initialRole;
    } else if (!coupleData.user2Id || coupleData.user2Id === '') {
      coupleUpdates.user2Id = user.uid;
      coupleUpdates.user2Uid = user.uid;
      coupleUpdates.user2Name = nameToUse;
      if (initialGender) coupleUpdates.user2Gender = initialGender;
      if (initialRole) coupleUpdates.user2Role = initialRole;
    } else if (!coupleData.user1Id || coupleData.user1Id === '') {
      coupleUpdates.user1Id = user.uid;
      coupleUpdates.user1Uid = user.uid;
      coupleUpdates.user1Name = nameToUse;
      if (initialGender) coupleUpdates.user1Gender = initialGender;
      if (initialRole) coupleUpdates.user1Role = initialRole;
    }

    if (Object.keys(coupleUpdates).length > 0) {
      await updateDoc(coupleRef, coupleUpdates);
    }
  }

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    const userUpdates: Partial<UserProfile> = {};
    if (existing.displayName !== nameToUse && nameToUse !== 'Người dùng') {
      userUpdates.displayName = nameToUse;
    }
    if (existing.coupleId !== OUR_COUPLE_ID) {
      userUpdates.coupleId = OUR_COUPLE_ID;
    }
    if (isAdminUser && !existing.isAdmin) {
      userUpdates.isAdmin = true;
    }

    if (Object.keys(userUpdates).length > 0) {
      await updateDoc(userRef, userUpdates);
      return { ...existing, ...userUpdates };
    }
    return existing;
  } else {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: nameToUse,
      photoURL: user.photoURL || defaultAvatar,
      avatarUrl: defaultAvatar,
      coupleId: OUR_COUPLE_ID,
      createdAt: new Date().toISOString(),
      isAdmin: isAdminUser
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

// Helper to update user's verified gender and role
export async function updateUserGenderAndRole(
  uid: string, 
  gender: 'male' | 'female', 
  roleTitle: string,
  displayName?: string
) {
  const userRef = doc(db, 'users', uid);
  const coupleRef = doc(db, 'couples', OUR_COUPLE_ID);

  const updates: Partial<UserProfile> = {
    gender,
    roleTitle
  };
  if (displayName) updates.displayName = displayName;

  await updateDoc(userRef, updates);

  // Sync with couple
  const coupleSnap = await getDoc(coupleRef);
  if (coupleSnap.exists()) {
    const coupleData = coupleSnap.data() as CoupleData;
    const coupleUpdates: Record<string, any> = {};

    if (coupleData.user1Id === uid || coupleData.user1Uid === uid) {
      coupleUpdates.user1Gender = gender;
      coupleUpdates.user1Role = roleTitle;
      if (displayName) coupleUpdates.user1Name = displayName;
      // Auto suggest partner gender if not set
      if (!coupleData.user2Gender) {
        coupleUpdates.user2Gender = gender === 'male' ? 'female' : 'male';
        coupleUpdates.user2Role = gender === 'male' ? 'Em ♀' : 'Anh ♂';
      }
    } else if (coupleData.user2Id === uid || coupleData.user2Uid === uid) {
      coupleUpdates.user2Gender = gender;
      coupleUpdates.user2Role = roleTitle;
      if (displayName) coupleUpdates.user2Name = displayName;
      // Auto suggest user1 gender if not set
      if (!coupleData.user1Gender) {
        coupleUpdates.user1Gender = gender === 'male' ? 'female' : 'male';
        coupleUpdates.user1Role = gender === 'male' ? 'Em ♀' : 'Anh ♂';
      }
    }

    if (Object.keys(coupleUpdates).length > 0) {
      await updateDoc(coupleRef, coupleUpdates);
    }
  }
}

// Helper to swap user1 and user2 slots in couple document
export async function swapCoupleSlots() {
  const coupleRef = doc(db, 'couples', OUR_COUPLE_ID);
  const snap = await getDoc(coupleRef);
  if (!snap.exists()) return;

  const d = snap.data() as CoupleData;
  await updateDoc(coupleRef, {
    user1Id: d.user2Id || '',
    user1Uid: d.user2Uid || d.user2Id || '',
    user1Name: d.user2Name || 'Người yêu 1',
    user1Gender: d.user2Gender || 'female',
    user1Role: d.user2Role || 'Em ♀',
    user1Avatar: d.user2Avatar || '',
    user1Phone: d.user2Phone || '',
    user1Birthday: d.user2Birthday || '',

    user2Id: d.user1Id || '',
    user2Uid: d.user1Uid || d.user1Id || '',
    user2Name: d.user1Name || 'Người yêu 2',
    user2Gender: d.user1Gender || 'male',
    user2Role: d.user1Role || 'Anh ♂',
    user2Avatar: d.user1Avatar || '',
    user2Phone: d.user1Phone || '',
    user2Birthday: d.user1Birthday || '',
  });
}

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  deleteField,
  orderBy
};

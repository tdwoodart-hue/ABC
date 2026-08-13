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

// Fetch or create user document in Firestore and automatically assign to couple space
export async function syncUserProfile(user: User, customName?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const nameToUse = customName || user.displayName || user.email?.split('@')[0] || 'Người dùng';

  // Ensure our_couple document exists
  const coupleRef = doc(db, 'couples', OUR_COUPLE_ID);
  const coupleSnap = await getDoc(coupleRef);

  if (!coupleSnap.exists()) {
    const initialCouple: CoupleData = {
      id: OUR_COUPLE_ID,
      user1Id: user.uid,
      user1Name: nameToUse,
      user2Id: '',
      user2Name: 'Người yêu',
      anniversaryDate: new Date().toISOString().split('T')[0],
      statusMessage: 'Chào mừng hai bạn đến với không gian yêu thương! 💕',
      createdAt: new Date().toISOString()
    };
    await setDoc(coupleRef, initialCouple);
  } else {
    const coupleData = coupleSnap.data() as CoupleData;
    // Auto-assign user to user1 or user2 slot in the couple
    if (coupleData.user1Id === user.uid) {
      if (coupleData.user1Name !== nameToUse) {
        await updateDoc(coupleRef, { user1Name: nameToUse });
      }
    } else if (coupleData.user2Id === user.uid) {
      if (coupleData.user2Name !== nameToUse) {
        await updateDoc(coupleRef, { user2Name: nameToUse });
      }
    } else if (!coupleData.user2Id || coupleData.user2Id === '') {
      // User 2 joins the couple!
      await updateDoc(coupleRef, {
        user2Id: user.uid,
        user2Name: nameToUse
      });
    } else if (!coupleData.user1Id || coupleData.user1Id === '') {
      await updateDoc(coupleRef, {
        user1Id: user.uid,
        user1Name: nameToUse
      });
    }
  }

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    if (existing.displayName !== nameToUse || existing.coupleId !== OUR_COUPLE_ID) {
      await updateDoc(userRef, {
        displayName: nameToUse,
        coupleId: OUR_COUPLE_ID
      });
      return { ...existing, displayName: nameToUse, coupleId: OUR_COUPLE_ID };
    }
    return existing;
  } else {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: nameToUse,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      coupleId: OUR_COUPLE_ID,
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
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

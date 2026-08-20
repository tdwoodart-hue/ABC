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
  User,
} from 'firebase/auth';

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
  orderBy,
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, CoupleData } from '../types';

/* =========================================================
   Browser / Firestore transient error handling
   ========================================================= */

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;

    const msg =
      typeof reason === 'string'
        ? reason
        : reason?.message ||
          reason?.code ||
          String(reason || '');

    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('database is closing or hidden') ||
      msg.includes('connection is closing')
    ) {
      event.preventDefault();

      console.warn(
        'Ignored transient Firestore closing/hidden event:',
        msg
      );
    }
  });

  window.addEventListener('error', (event) => {
    const msg =
      event?.message ||
      String(event?.error?.message || '');

    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('database is closing or hidden') ||
      msg.includes('connection is closing')
    ) {
      event.preventDefault();

      console.warn(
        'Ignored transient Firestore closing/hidden error:',
        msg
      );
    }
  });
}

/* =========================================================
   Firebase initialization
   ========================================================= */

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export const auth = getAuth(app);

let firestoreInstance;

try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(
        app,
        firebaseConfig.firestoreDatabaseId
      )
    : getFirestore(app);
}

export const db = firestoreInstance;

export const googleProvider =
  new GoogleAuthProvider();

/* =========================================================
   App access control
   ========================================================= */

export const OUR_COUPLE_ID = 'our_couple';

/*
 * IMPORTANT:
 * Keep this list aligned with firestore.rules.
 *
 * No startsWith(), includes(), regex-like matching, etc.
 * Access is granted only to these exact normalized emails.
 */
export const ALLOWED_EMAILS = [
  'tdwoodart@gmail.com',
  'duong@gmail.com',
  'chucga@gmail.com',
] as const;

export const ADMIN_EMAILS = [
  'tdwoodart@gmail.com',
  'duong@gmail.com',
] as const;

function normalizeEmail(email?: string | null): string {
  return (email || '').toLowerCase().trim();
}

export function isAllowedAccount(
  email?: string | null
): boolean {
  const normalized = normalizeEmail(email);

  return ALLOWED_EMAILS.some(
    (allowed) => allowed === normalized
  );
}

export function isDuongAccount(
  email?: string | null
): boolean {
  const normalized = normalizeEmail(email);

  return (
    normalized === 'duong@gmail.com' ||
    normalized === 'tdwoodart@gmail.com'
  );
}

export function isChucGaAccount(
  email?: string | null
): boolean {
  return (
    normalizeEmail(email) ===
    'chucga@gmail.com'
  );
}

/*
 * Admin permission is derived ONLY from the authenticated email.
 *
 * Do not trust profile.isAdmin from Firestore here because all allowed
 * users share the same couple database and a document field must not
 * be able to elevate frontend admin privileges.
 */
export function checkIsAdmin(
  profile?: UserProfile | null
): boolean {
  if (!profile?.email) return false;

  const normalized =
    normalizeEmail(profile.email);

  return ADMIN_EMAILS.some(
    (admin) => admin === normalized
  );
}

/* =========================================================
   User / couple synchronization
   ========================================================= */

export async function syncUserProfile(
  user: User,
  customName?: string,
  gender?: 'male' | 'female',
  roleTitle?: string
): Promise<UserProfile> {
  const userEmail =
    normalizeEmail(user.email);

  /*
   * Stop unauthorized accounts BEFORE any Firestore read/write.
   */
  if (!isAllowedAccount(userEmail)) {
    throw new Error(
      'Tài khoản không được cấp quyền truy cập ứng dụng.'
    );
  }

  const isDuong =
    isDuongAccount(userEmail);

  const isChucGa =
    isChucGaAccount(userEmail);

  const userRef =
    doc(db, 'users', user.uid);

  const snap =
    await getDoc(userRef);

  let defaultDisplayName =
    'Người dùng';

  if (isDuong) {
    defaultDisplayName = 'Dương';
  } else if (isChucGa) {
    defaultDisplayName = 'Chúc Gà';
  } else if (
    user.displayName &&
    !user.displayName.includes('@')
  ) {
    defaultDisplayName =
      user.displayName;
  } else if (user.email) {
    defaultDisplayName =
      user.email.split('@')[0];
  }

  const nameToUse =
    customName ||
    (
      snap.exists() &&
      snap.data()?.displayName
        ? snap.data().displayName
        : defaultDisplayName
    );

  const isAdminUser =
    ADMIN_EMAILS.some(
      (admin) => admin === userEmail
    );

  const coupleRef =
    doc(
      db,
      'couples',
      OUR_COUPLE_ID
    );

  const coupleSnap =
    await getDoc(coupleRef);

  let initialGender:
    | 'male'
    | 'female' =
    gender ||
    (
      isDuong
        ? 'male'
        : isChucGa
          ? 'female'
          : 'male'
    );

  let initialRole =
    roleTitle ||
    (
      isDuong
        ? 'Anh'
        : isChucGa
          ? 'Em'
          : initialGender === 'female'
            ? 'Em'
            : 'Anh'
    );

  if (snap.exists()) {
    const data =
      snap.data() as UserProfile;

    if (data.gender) {
      initialGender =
        data.gender;
    }

    if (data.roleTitle) {
      initialRole =
        data.roleTitle;
    }
  }

  const defaultAvatar =
    isDuong
      ? 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile'
      : isChucGa
        ? 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile'
        : initialGender === 'female'
          ? `https://api.dicebear.com/7.x/micah/svg?seed=female_${user.uid}`
          : `https://api.dicebear.com/7.x/micah/svg?seed=male_${user.uid}`;

  if (!coupleSnap.exists()) {
    const initialCouple:
      CoupleData = {
      id: OUR_COUPLE_ID,

      user1Id:
        isDuong
          ? user.uid
          : '',

      user1Uid:
        isDuong
          ? user.uid
          : '',

      user1Email:
        isDuong
          ? userEmail
          : 'duong@gmail.com',

      user1Name:
        isDuong
          ? nameToUse
          : 'Dương',

      user1Gender: 'male',
      user1Role: 'Anh',

      user1Avatar:
        isDuong
          ? user.photoURL ||
            defaultAvatar
          : 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male',

      user2Id:
        isChucGa
          ? user.uid
          : '',

      user2Uid:
        isChucGa
          ? user.uid
          : '',

      user2Email:
        isChucGa
          ? userEmail
          : 'chucga@gmail.com',

      user2Name:
        isChucGa
          ? nameToUse
          : 'Chúc Gà',

      user2Gender: 'female',
      user2Role: 'Em',

      user2Avatar:
        isChucGa
          ? user.photoURL ||
            defaultAvatar
          : 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female',

      anniversaryDate:
        new Date()
          .toISOString()
          .split('T')[0],

      statusMessage:
        'Chào mừng Dương & Chúc Gà đến với không gian yêu thương!',

      createdAt:
        new Date().toISOString(),
    };

    await setDoc(
      coupleRef,
      initialCouple
    );
  } else {
    const coupleData =
      coupleSnap.data() as CoupleData;

    const coupleUpdates:
      Record<string, any> = {};

    if (isDuong) {
      coupleUpdates.user1Id =
        user.uid;

      coupleUpdates.user1Uid =
        user.uid;

      coupleUpdates.user1Email =
        userEmail;

      coupleUpdates.user1Name =
        nameToUse &&
        nameToUse !== 'Người dùng'
          ? nameToUse
          : 'Dương';

      coupleUpdates.user1Gender =
        'male';

      coupleUpdates.user1Role =
        initialRole || 'Anh';

      if (
        !coupleData.user1Avatar ||
        coupleData.user1Avatar.includes(
          'partner_slot'
        )
      ) {
        coupleUpdates.user1Avatar =
          user.photoURL ||
          defaultAvatar;
      }

      if (
        coupleData.user2Id ===
          user.uid ||
        coupleData.user2Uid ===
          user.uid
      ) {
        coupleUpdates.user2Id = '';
        coupleUpdates.user2Uid = '';
      }

      if (
        coupleData.user2Name ===
          'Dương' ||
        coupleData.user2Name ===
          nameToUse ||
        !coupleData.user2Name
      ) {
        coupleUpdates.user2Name =
          'Chúc Gà';

        coupleUpdates.user2Gender =
          'female';

        coupleUpdates.user2Role =
          'Em';
      }
    } else if (isChucGa) {
      coupleUpdates.user2Id =
        user.uid;

      coupleUpdates.user2Uid =
        user.uid;

      coupleUpdates.user2Email =
        userEmail;

      coupleUpdates.user2Name =
        nameToUse &&
        nameToUse !== 'Người dùng'
          ? nameToUse
          : 'Chúc Gà';

      coupleUpdates.user2Gender =
        'female';

      coupleUpdates.user2Role =
        initialRole || 'Em';

      if (
        !coupleData.user2Avatar ||
        coupleData.user2Avatar.includes(
          'partner_slot'
        )
      ) {
        coupleUpdates.user2Avatar =
          user.photoURL ||
          defaultAvatar;
      }

      if (
        coupleData.user1Id ===
          user.uid ||
        coupleData.user1Uid ===
          user.uid
      ) {
        coupleUpdates.user1Id = '';
        coupleUpdates.user1Uid = '';
      }

      if (
        coupleData.user1Name ===
          'Chúc Gà' ||
        coupleData.user1Name ===
          nameToUse ||
        !coupleData.user1Name
      ) {
        coupleUpdates.user1Name =
          'Dương';

        coupleUpdates.user1Gender =
          'male';

        coupleUpdates.user1Role =
          'Anh';
      }
    }

    const finalU1 =
      coupleUpdates.user1Name ||
      coupleData.user1Name;

    const finalU2 =
      coupleUpdates.user2Name ||
      coupleData.user2Name;

    if (
      finalU1 &&
      finalU2 &&
      finalU1
        .toLowerCase()
        .trim() ===
        finalU2
          .toLowerCase()
          .trim()
    ) {
      coupleUpdates.user1Name =
        'Dương';

      coupleUpdates.user2Name =
        'Chúc Gà';
    }

    if (
      Object.keys(coupleUpdates)
        .length > 0
    ) {
      await updateDoc(
        coupleRef,
        coupleUpdates
      );
    }
  }

  if (snap.exists()) {
    const existing =
      snap.data() as UserProfile;

    const userUpdates:
      Partial<UserProfile> = {};

    if (
      nameToUse &&
      nameToUse !== 'Người dùng' &&
      existing.displayName !==
        nameToUse
    ) {
      userUpdates.displayName =
        nameToUse;
    }

    if (
      existing.coupleId !==
      OUR_COUPLE_ID
    ) {
      userUpdates.coupleId =
        OUR_COUPLE_ID;
    }

    if (
      isAdminUser &&
      !existing.isAdmin
    ) {
      userUpdates.isAdmin = true;
    }

    /*
     * Remove stale admin flag from non-admin allowed accounts.
     */
    if (
      !isAdminUser &&
      existing.isAdmin
    ) {
      userUpdates.isAdmin = false;
    }

    if (
      !existing.gender &&
      initialGender
    ) {
      userUpdates.gender =
        initialGender;
    }

    if (
      !existing.roleTitle &&
      initialRole
    ) {
      userUpdates.roleTitle =
        initialRole;
    }

    if (
      Object.keys(userUpdates)
        .length > 0
    ) {
      await updateDoc(
        userRef,
        userUpdates
      );

      return {
        ...existing,
        ...userUpdates,
      };
    }

    return {
      ...existing,
      isAdmin: isAdminUser,
      email:
        existing.email ||
        userEmail,
    };
  }

  const newProfile:
    UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: nameToUse,

    photoURL:
      user.photoURL ||
      defaultAvatar,

    avatarUrl:
      defaultAvatar,

    coupleId:
      OUR_COUPLE_ID,

    createdAt:
      new Date().toISOString(),

    gender:
      initialGender,

    roleTitle:
      initialRole,

    isAdmin:
      isAdminUser,
  };

  await setDoc(
    userRef,
    newProfile
  );

  return newProfile;
}

/* =========================================================
   Admin / repair helpers
   ========================================================= */

export async function repairCoupleSlots(
  user1Uid?: string,
  user2Uid?: string
): Promise<void> {
  const coupleRef =
    doc(
      db,
      'couples',
      OUR_COUPLE_ID
    );

  const snap =
    await getDoc(coupleRef);

  const updates:
    Partial<CoupleData> = {
    user1Name: 'Dương',
    user1Email:
      'duong@gmail.com',
    user1Gender: 'male',
    user1Role: 'Anh',

    user1Avatar:
      'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile',

    user2Name: 'Chúc Gà',
    user2Email:
      'chucga@gmail.com',
    user2Gender: 'female',
    user2Role: 'Em',

    user2Avatar:
      'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile',
  };

  if (user1Uid) {
    updates.user1Id =
      user1Uid;

    updates.user1Uid =
      user1Uid;
  }

  if (user2Uid) {
    updates.user2Id =
      user2Uid;

    updates.user2Uid =
      user2Uid;
  }

  if (snap.exists()) {
    await updateDoc(
      coupleRef,
      updates
    );

    return;
  }

  await setDoc(coupleRef, {
    id: OUR_COUPLE_ID,

    user1Id:
      user1Uid || '',

    user1Uid:
      user1Uid || '',

    user2Id:
      user2Uid || '',

    user2Uid:
      user2Uid || '',

    anniversaryDate:
      new Date()
        .toISOString()
        .split('T')[0],

    statusMessage:
      'Chào mừng Dương & Chúc Gà đến với không gian yêu thương!',

    createdAt:
      new Date().toISOString(),

    ...updates,
  });
}

export async function updateUserGenderAndRole(
  uid: string,
  gender:
    | 'male'
    | 'female',
  roleTitle: string,
  displayName?: string
) {
  const userRef =
    doc(db, 'users', uid);

  const coupleRef =
    doc(
      db,
      'couples',
      OUR_COUPLE_ID
    );

  const updates:
    Partial<UserProfile> = {
    gender,
    roleTitle,
  };

  if (displayName) {
    updates.displayName =
      displayName;
  }

  await updateDoc(
    userRef,
    updates
  );

  const coupleSnap =
    await getDoc(coupleRef);

  if (!coupleSnap.exists()) {
    return;
  }

  const coupleData =
    coupleSnap.data() as CoupleData;

  const coupleUpdates:
    Record<string, any> = {};

  if (
    coupleData.user1Id === uid ||
    coupleData.user1Uid === uid
  ) {
    coupleUpdates.user1Gender =
      gender;

    coupleUpdates.user1Role =
      roleTitle;

    if (displayName) {
      coupleUpdates.user1Name =
        displayName;
    }

    if (!coupleData.user2Gender) {
      coupleUpdates.user2Gender =
        gender === 'male'
          ? 'female'
          : 'male';

      coupleUpdates.user2Role =
        gender === 'male'
          ? 'Em ♀'
          : 'Anh ♂';
    }
  } else if (
    coupleData.user2Id === uid ||
    coupleData.user2Uid === uid
  ) {
    coupleUpdates.user2Gender =
      gender;

    coupleUpdates.user2Role =
      roleTitle;

    if (displayName) {
      coupleUpdates.user2Name =
        displayName;
    }

    if (!coupleData.user1Gender) {
      coupleUpdates.user1Gender =
        gender === 'male'
          ? 'female'
          : 'male';

      coupleUpdates.user1Role =
        gender === 'male'
          ? 'Em ♀'
          : 'Anh ♂';
    }
  }

  if (
    Object.keys(coupleUpdates)
      .length > 0
  ) {
    await updateDoc(
      coupleRef,
      coupleUpdates
    );
  }
}

export async function updateUserAvatar(
  uid: string,
  avatarUrl: string,
  coupleId:
    string = OUR_COUPLE_ID,
  targetSlot?:
    | 'user1'
    | 'user2'
): Promise<void> {
  if (!avatarUrl) return;

  if (uid) {
    try {
      const userRef =
        doc(db, 'users', uid);

      const userSnap =
        await getDoc(userRef);

      if (userSnap.exists()) {
        await updateDoc(
          userRef,
          {
            avatarUrl,
            photoURL: avatarUrl,
          }
        );
      }
    } catch (error) {
      console.warn(
        'Error updating user document avatar:',
        error
      );
    }

    if (
      auth.currentUser &&
      auth.currentUser.uid === uid
    ) {
      try {
        await updateProfile(
          auth.currentUser,
          {
            photoURL: avatarUrl,
          }
        );
      } catch (error) {
        console.warn(
          'Auth photoURL update warning:',
          error
        );
      }
    }
  }

  try {
    const coupleRef =
      doc(
        db,
        'couples',
        coupleId
      );

    const coupleSnap =
      await getDoc(coupleRef);

    if (!coupleSnap.exists()) {
      return;
    }

    const coupleData =
      coupleSnap.data() as CoupleData;

    const coupleUpdates:
      Partial<CoupleData> = {};

    if (targetSlot === 'user1') {
      coupleUpdates.user1Avatar =
        avatarUrl;
    } else if (
      targetSlot === 'user2'
    ) {
      coupleUpdates.user2Avatar =
        avatarUrl;
    } else {
      const isU1 =
        Boolean(uid) &&
        (
          coupleData.user1Id === uid ||
          coupleData.user1Uid === uid
        );

      const isU2 =
        Boolean(uid) &&
        (
          coupleData.user2Id === uid ||
          coupleData.user2Uid === uid
        );

      if (isU1) {
        coupleUpdates.user1Avatar =
          avatarUrl;
      } else if (isU2) {
        coupleUpdates.user2Avatar =
          avatarUrl;
      } else if (
        !coupleData.user1Avatar
      ) {
        coupleUpdates.user1Avatar =
          avatarUrl;
      } else {
        coupleUpdates.user2Avatar =
          avatarUrl;
      }
    }

    if (
      Object.keys(coupleUpdates)
        .length > 0
    ) {
      await updateDoc(
        coupleRef,
        coupleUpdates
      );
    }
  } catch (error) {
    console.warn(
      'Error updating couple avatar:',
      error
    );
  }
}

/* =========================================================
   Finance helpers
   ========================================================= */

export async function updateFinanceTransaction(
  coupleId: string,
  txId: string,
  updates: {
    title?: string;
    amount?: number;
    type?:
      | 'expense'
      | 'income';
    category?: string;
    paidByUid?: string;
    paidByName?: string;
    date?: string;
  }
): Promise<void> {
  const txRef =
    doc(
      db,
      'couples',
      coupleId,
      'finances',
      txId
    );

  await updateDoc(
    txRef,
    updates
  );
}

export async function batchReassignFinancePayer(
  coupleId: string,
  targetUid: string,
  targetName: string,
  txIds?: string[]
): Promise<number> {
  const financesRef =
    collection(
      db,
      'couples',
      coupleId,
      'finances'
    );

  const snap =
    await getDocs(
      financesRef
    );

  let count = 0;

  for (
    const docSnap of snap.docs
  ) {
    if (
      !txIds ||
      txIds.includes(
        docSnap.id
      )
    ) {
      await updateDoc(
        docSnap.ref,
        {
          paidByUid:
            targetUid,

          paidByName:
            targetName,
        }
      );

      count++;
    }
  }

  return count;
}

export async function swapCoupleSlots() {
  const coupleRef =
    doc(
      db,
      'couples',
      OUR_COUPLE_ID
    );

  const snap =
    await getDoc(coupleRef);

  if (!snap.exists()) {
    return;
  }

  const d =
    snap.data() as CoupleData;

  await updateDoc(
    coupleRef,
    {
      user1Id:
        d.user2Id || '',

      user1Uid:
        d.user2Uid ||
        d.user2Id ||
        '',

      user1Name:
        d.user2Name ||
        'Người yêu 1',

      user1Gender:
        d.user2Gender ||
        'female',

      user1Role:
        d.user2Role ||
        'Em ♀',

      user1Avatar:
        d.user2Avatar ||
        '',

      user1Phone:
        d.user2Phone ||
        '',

      user1Birthday:
        d.user2Birthday ||
        '',

      user2Id:
        d.user1Id || '',

      user2Uid:
        d.user1Uid ||
        d.user1Id ||
        '',

      user2Name:
        d.user1Name ||
        'Người yêu 2',

      user2Gender:
        d.user1Gender ||
        'male',

      user2Role:
        d.user1Role ||
        'Anh ♂',

      user2Avatar:
        d.user1Avatar ||
        '',

      user2Phone:
        d.user1Phone ||
        '',

      user2Birthday:
        d.user1Birthday ||
        '',
    }
  );
}

/* =========================================================
   Re-exports used by the rest of the app
   ========================================================= */

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
  orderBy,
};
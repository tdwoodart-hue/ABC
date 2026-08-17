import { db, doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, getDocs } from '../lib/firebase';
import { DeviceRecord } from '../types';

const DEVICE_ID_KEY = 'couple_app_device_id';
const DEVICE_OWNER_KEY = 'couple_app_device_owner';
const DEVICE_NAME_KEY = 'couple_app_device_name';
const DEVICE_PIN_KEY = 'couple_app_security_pin';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_device';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function detectDeviceDetails(): { os: string; browser: string; deviceType: 'mobile' | 'tablet' | 'desktop' | 'other'; defaultName: string } {
  if (typeof window === 'undefined') {
    return { os: 'Unknown', browser: 'Unknown', deviceType: 'desktop', defaultName: 'Thiết bị Web' };
  }

  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'other' = 'desktop';

  if (/iPad|Tablet|PlayBook/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(ua))) {
    deviceType = 'tablet';
    os = 'iPadOS / Tablet';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    os = 'iPhone (iOS)';
  } else if (/Android/i.test(ua)) {
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS (Mac)';
    deviceType = 'desktop';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows PC';
    deviceType = 'desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux PC';
    deviceType = 'desktop';
  }

  let browser = 'Browser';
  if (/CriOS|Chrome/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Zalo/i.test(ua)) {
    browser = 'Zalo In-App';
  } else if (/FBAN|FBAV/i.test(ua)) {
    browser = 'Facebook In-App';
  }

  const defaultName = `${os} (${browser})`;
  return { os, browser, deviceType, defaultName };
}

export function getStoredDeviceOwner(): 'duong' | 'chuc' | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(DEVICE_OWNER_KEY);
  if (val === 'duong' || val === 'chuc') return val;
  return null;
}

export function setStoredDeviceOwner(owner: 'duong' | 'chuc') {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_OWNER_KEY, owner);
}

export function getStoredDeviceName(): string {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem(DEVICE_NAME_KEY);
  if (custom) return custom;
  const { defaultName } = detectDeviceDetails();
  return defaultName;
}

export function setStoredDeviceName(name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_NAME_KEY, name.trim());
}

export function getSecurityPin(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEVICE_PIN_KEY);
}

export function setSecurityPin(pin: string | null) {
  if (typeof window === 'undefined') return;
  if (!pin) {
    localStorage.removeItem(DEVICE_PIN_KEY);
  } else {
    localStorage.setItem(DEVICE_PIN_KEY, pin.trim());
  }
}

// Sync current device to Firestore under /couples/our_couple/devices/{deviceId}
export async function syncDeviceToFirestore(
  ownerKey: 'duong' | 'chuc',
  customName?: string,
  userUid?: string
): Promise<DeviceRecord> {
  const deviceId = getOrCreateDeviceId();
  const { os, browser, deviceType, defaultName } = detectDeviceDetails();
  const nameToUse = customName || getStoredDeviceName() || (ownerKey === 'duong' ? `Thiết bị của Dương (${os})` : `Thiết bị của Chúc (${os})`);

  setStoredDeviceOwner(ownerKey);
  setStoredDeviceName(nameToUse);

  const deviceData: DeviceRecord = {
    id: deviceId,
    deviceName: nameToUse,
    deviceType,
    os,
    browser,
    ownerKey,
    ownerName: ownerKey === 'duong' ? 'Dương (Tao)' : 'Chúc (Chúc Gà)',
    ownerUid: userUid || (ownerKey === 'duong' ? 'duong_uid' : 'chuc_uid'),
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isTrusted: true
  };

  try {
    const deviceRef = doc(db, 'couples', 'our_couple', 'devices', deviceId);
    await setDoc(deviceRef, deviceData, { merge: true });
  } catch (error) {
    console.warn('Lỗi ghi thông tin thiết bị lên Firestore:', error);
  }

  return deviceData;
}

// Remove a device from registered list
export async function removeDeviceFromFirestore(deviceId: string): Promise<void> {
  try {
    const deviceRef = doc(db, 'couples', 'our_couple', 'devices', deviceId);
    await deleteDoc(deviceRef);
  } catch (error) {
    console.error('Lỗi xoá thiết bị:', error);
    throw error;
  }
}

// Update device name in Firestore
export async function updateDeviceNameInFirestore(deviceId: string, newName: string): Promise<void> {
  try {
    const deviceRef = doc(db, 'couples', 'our_couple', 'devices', deviceId);
    await updateDoc(deviceRef, {
      deviceName: newName.trim(),
      lastActive: new Date().toISOString()
    });
    if (deviceId === getOrCreateDeviceId()) {
      setStoredDeviceName(newName.trim());
    }
  } catch (error) {
    console.error('Lỗi cập nhật tên thiết bị:', error);
    throw error;
  }
}

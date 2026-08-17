import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  googleProvider, 
  signInWithPopup, 
  syncUserProfile,
  signOut,
  isDuongAccount,
  isChucGaAccount
} from '../lib/firebase';
import { 
  Heart, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Sparkles, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { 
  detectDeviceDetails, 
  getOrCreateDeviceId, 
  getStoredDeviceOwner, 
  setStoredDeviceOwner, 
  getStoredDeviceName, 
  setStoredDeviceName,
  syncDeviceToFirestore
} from '../utils/deviceHelper';

interface AuthCardProps {
  onSuccess?: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [selectedOwner, setSelectedOwner] = useState<'duong' | 'chuc'>('duong');
  const [deviceName, setDeviceName] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState<{ os: string; browser: string; defaultName: string }>({
    os: 'Thiết bị',
    browser: 'Web',
    defaultName: 'Thiết bị của bạn'
  });

  useEffect(() => {
    const details = detectDeviceDetails();
    setDeviceDetails(details);

    const savedOwner = getStoredDeviceOwner();
    if (savedOwner) {
      setSelectedOwner(savedOwner);
    }

    const savedName = getStoredDeviceName();
    setDeviceName(savedName || (savedOwner === 'chuc' ? `Thiết bị của Chúc (${details.os})` : `Thiết bị của Dương (${details.os})`));
  }, []);

  const handleOwnerSelect = (owner: 'duong' | 'chuc') => {
    setSelectedOwner(owner);
    setStoredDeviceOwner(owner);
    setError('');
    const autoName = owner === 'chuc' ? `Thiết bị của Chúc (${deviceDetails.os})` : `Thiết bị của Dương (${deviceDetails.os})`;
    setDeviceName(autoName);
    setStoredDeviceName(autoName);
  };

  const executeLogin = async (email: string, pass: string) => {
    setError('');
    setLoading(true);

    try {
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, email, pass);
      } catch (authErr: any) {
        // If account doesn't exist yet with this email, create standard credentials for this strictly whitelisted account
        if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
          const { createUserWithEmailAndPassword, updateProfile } = await import('../lib/firebase');
          userCred = await createUserWithEmailAndPassword(auth, email, pass);
          const initialName = selectedOwner === 'duong' ? 'Dương' : 'Chúc Gà';
          await updateProfile(userCred.user, { displayName: initialName });
        } else {
          throw authErr;
        }
      }

      if (userCred && userCred.user) {
        const uEmail = userCred.user.email || '';
        const isD = isDuongAccount(uEmail);
        const isC = isChucGaAccount(uEmail);

        if (!isD && !isC) {
          await signOut(auth);
          throw new Error('⛔ Tài khoản không được cấp quyền! Ứng dụng này chỉ dành riêng cho Dương & Chúc.');
        }

        // Sync profile
        await syncUserProfile(userCred.user, selectedOwner === 'duong' ? 'Dương' : 'Chúc Gà');
        
        // Sync device to Firestore
        await syncDeviceToFirestore(selectedOwner, deviceName, userCred.user.uid);

        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('Lỗi xác thực:', err);
      let msg = err.message || 'Đăng nhập không thành công.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Mật khẩu không chính xác.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailToUse = selectedOwner === 'duong' ? 'duong@gmail.com' : 'chucga@gmail.com';
    executeLogin(emailToUse, password || '123456');
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const userEmail = (userCred.user.email || '').toLowerCase().trim();
      
      const isD = isDuongAccount(userEmail);
      const isC = isChucGaAccount(userEmail);

      if (!isD && !isC) {
        await signOut(auth);
        setError('⛔ Tài khoản Google (' + userEmail + ') không thuộc danh sách cho phép. Ứng dụng chỉ dành riêng cho Dương & Chúc.');
        setLoading(false);
        return;
      }

      const autoOwner = isD ? 'duong' : 'chuc';
      setSelectedOwner(autoOwner);
      setStoredDeviceOwner(autoOwner);

      await syncUserProfile(userCred.user);
      await syncDeviceToFirestore(autoOwner, deviceName, userCred.user.uid);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError('Đăng nhập Google không thành công hoặc đã bị hủy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 transition-all">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 mb-3 shadow-xs">
          <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
          Không Gian Dương & Chúc 💕
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Bảo mật tuyệt đối • Chỉ 2 người dùng
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Identify Device Owner */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
          1. Đây là thiết bị của ai?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Duong Option */}
          <button
            type="button"
            onClick={() => handleOwnerSelect('duong')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
              selectedOwner === 'duong'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/30 text-blue-900 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">👨🏻‍💻</span>
              {selectedOwner === 'duong' && (
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Dương (Tao)</p>
              <p className="text-xs text-slate-500 font-medium">Anh ♂</p>
            </div>
          </button>

          {/* Chuc Option */}
          <button
            type="button"
            onClick={() => handleOwnerSelect('chuc')}
            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
              selectedOwner === 'chuc'
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30 text-rose-900 shadow-xs'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🌸</span>
              {selectedOwner === 'chuc' && (
                <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Chúc (Chúc Gà)</p>
              <p className="text-xs text-slate-500 font-medium">Em ♀</p>
            </div>
          </button>
        </div>
      </div>

      {/* Device Info Badge & Custom Name */}
      <div className="mb-5 p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            {deviceDetails.os.includes('iPhone') || deviceDetails.os.includes('Android') ? (
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Nhận diện: {deviceDetails.os}</span>
          </div>
          <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Đã gán thiết bị
          </span>
        </div>
        <input
          type="text"
          value={deviceName}
          onChange={(e) => {
            setDeviceName(e.target.value);
            setStoredDeviceName(e.target.value);
          }}
          placeholder="Tên thiết bị (Ví dụ: iPhone 14 của Dương)"
          className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
      </div>

      {/* Step 2: Access Form */}
      <form onSubmit={handleQuickLogin} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            2. Mật khẩu bảo vệ
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu vào web"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white text-sm transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 text-white font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer ${
            selectedOwner === 'duong'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'
              : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-200'
          }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>
                Vào với tư cách {selectedOwner === 'duong' ? 'Dương ♂' : 'Chúc Gà ♀'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          Hoặc đăng nhập Google
        </span>
      </div>

      {/* Google Sign In strictly for Duong and Chuc */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Đăng nhập bằng Google (Chính chủ)</span>
      </button>

      {/* Security Footer Notice */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 font-medium">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Hệ thống đã khóa đăng ký công khai.</span>
      </div>
    </div>
  );
};

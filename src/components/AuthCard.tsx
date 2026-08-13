import React, { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  googleProvider, 
  signInWithPopup, 
  syncUserProfile 
} from '../lib/firebase';
import { Heart, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthCardProps {
  onSuccess?: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(userCred.user);
      } else {
        if (!displayName.trim()) {
          setError('Vui lòng nhập tên hiển thị của bạn');
          setLoading(false);
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: displayName.trim() });
        await syncUserProfile(userCred.user, displayName.trim());
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Thao tác không thành công';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email hoặc mật khẩu không chính xác.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email này đã được sử dụng. Vui lòng đăng nhập.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Mật khẩu cần ít nhất 6 ký tự.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(userCred.user);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError('Đăng nhập với Google thất bại hoặc đã bị hủy.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: 'person1' | 'person2') => {
    setError('');
    setLoading(true);
    const demoEmail = role === 'person1' ? 'demo_partner1@couple.app' : 'demo_partner2@couple.app';
    const demoPass = 'CouplePass123!';
    const demoName = role === 'person1' ? 'Anh Yêu (Partner A)' : 'Em Yêu (Partner B)';

    try {
      const userCred = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      await syncUserProfile(userCred.user, demoName);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // If demo account doesn't exist yet, create it automatically!
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
          await updateProfile(newCred.user, { displayName: demoName });
          await syncUserProfile(newCred.user, demoName);
          if (onSuccess) onSuccess();
        } catch (createErr: any) {
          setError('Không thể tạo tài khoản demo: ' + createErr.message);
        }
      } else {
        setError(err.message || 'Lỗi đăng nhập tài khoản thử nghiệm');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-rose-100 p-8 transition-all">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
          {isLogin ? 'Chào mừng quay trở lại 💕' : 'Tạo tài khoản đôi mới 💕'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isLogin 
            ? 'Đăng nhập vào không gian dành riêng cho hai bạn' 
            : 'Tạo tài khoản để đăng nhập vào không gian chung'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => { setIsLogin(true); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
            isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(false); setError(''); }}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
            !isLogin ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Đăng ký
        </button>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Họ & Tên hiển thị
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ví dụ: Hoàng Nam / Khánh Linh"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white text-sm transition"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="email"
              required
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white text-sm transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white text-sm transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium rounded-xl shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
          hoặc
        </span>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm flex items-center justify-center gap-3 shadow-sm transition-all cursor-pointer mb-6"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        Đăng nhập với Google
      </button>

      {/* Quick Test Demo Options for User & Partner */}
      <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-2">
          <Sparkles className="w-4 h-4 text-rose-500" />
          Đăng nhập thử nghiệm cho 2 người (Nhanh)
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Sử dụng 2 nút bên dưới để thử đăng nhập nhanh 2 tài khoản khác nhau trên 2 tab hoặc thử nghiệm kết nối đôi:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('person1')}
            disabled={loading}
            className="py-2 px-3 bg-white hover:bg-rose-100/50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
            Tài khoản Người 1
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('person2')}
            disabled={loading}
            className="py-2 px-3 bg-white hover:bg-rose-100/50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
            Tài khoản Người 2
          </button>
        </div>
      </div>
    </div>
  );
};

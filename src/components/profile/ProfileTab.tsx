// PROFILE_TAB_IMPORTS_FIXED_V2
import React from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import {
  Bell,
  Calendar,
  Cake,
  Camera,
  Edit3,
  ExternalLink,
  Heart,
  LogOut,
  Map,
  MapPin,
  Navigation,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';

import { Companion, CoupleData, UserProfile } from '../../types';
import { formatDateVN } from '../../utils/formatDate';
import { requestAndShowTestNotification } from '../../utils/notifications';
import { auth } from '../../lib/firebase';
import appPackage from '../../../package.json';

const APP_VERSION = appPackage.version;

interface ProfileTabProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  companions: Companion[];
  deviceOwner: 'duong' | 'chuc';
  activeDeviceName: string;

  onEditProfile: () => void;
  onOpenAvatar: (
    uid: string,
    name: string,
    currentAvatar: string,
    slot?: 'user1' | 'user2'
  ) => void;
  onOpenCompanionManager: () => void;
  onOpenDeviceManager: () => void;
  onOpenRestoreComments: () => void;
  onSignOut: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userProfile,
  coupleData,
  companions,
  deviceOwner,
  activeDeviceName,
  onEditProfile,
  onOpenAvatar,
  onOpenCompanionManager,
  onOpenDeviceManager,
  onOpenRestoreComments,
  onSignOut,
}) => {
  const isU1 =
    coupleData?.user1Id === userProfile.uid ||
    coupleData?.user1Uid === userProfile.uid ||
    userProfile.email?.toLowerCase().includes('duong');

  const myPhone = isU1 ? coupleData?.user1Phone : coupleData?.user2Phone;
  const myBirthday = isU1
    ? coupleData?.user1Birthday
    : coupleData?.user2Birthday;

  const myAvatar =
    userProfile.avatarUrl ||
    (isU1 ? coupleData?.user1Avatar : coupleData?.user2Avatar) ||
    (isU1
      ? 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male'
      : 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female');

  let rawPartnerName = isU1
    ? coupleData?.user2Name || 'Chúc Gà'
    : coupleData?.user1Name || 'Dương';

  if (
    rawPartnerName.trim() === userProfile.displayName.trim() ||
    rawPartnerName.trim() === (isU1 ? 'Dương' : 'Chúc Gà')
  ) {
    rawPartnerName = isU1 ? 'Chúc Gà' : 'Dương';
  }

  const partnerName = rawPartnerName;
  const partnerPhone = isU1
    ? coupleData?.user2Phone
    : coupleData?.user1Phone;
  const partnerBirthday = isU1
    ? coupleData?.user2Birthday
    : coupleData?.user1Birthday;

  const partnerUid = isU1
    ? coupleData?.user2Id || coupleData?.user2Uid || ''
    : coupleData?.user1Id || coupleData?.user1Uid || '';

  const partnerAvatar = isU1
    ? coupleData?.user2Avatar ||
      'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile'
    : coupleData?.user1Avatar ||
      'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze&eyes=eyes&mouth=smile';

  const { appearance, setHeroMode, setCustomImageUrl } = useHomeAppearance(userProfile.uid);
  const homeImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [homeImageUploading, setHomeImageUploading] = React.useState(false);
  const [homeImageProgress, setHomeImageProgress] = React.useState(0);
  const [homeAppearanceStatus, setHomeAppearanceStatus] = React.useState<string | null>(null);

  const [testingNotification, setTestingNotification] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordStatus, setPasswordStatus] = React.useState<string | null>(null);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [notificationStatus, setNotificationStatus] = React.useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = React.useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      return 'unsupported';
    }

    return Notification.permission;
  });

  React.useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(Notification.permission);

    if (Notification.permission === 'granted') {
      setNotificationStatus(
        'Đã bật. Từ giờ Us sẽ tự đăng ký lại thông báo khi mở app.'
      );
    }
  }, []);

  const handleHomeHeroModeChange = async (mode: 'characters' | 'vietnam' | 'custom') => {
    setHomeAppearanceStatus(null);

    if (mode === 'custom' && !appearance.customImageUrl) {
      homeImageInputRef.current?.click();
      return;
    }

    try {
      await setHeroMode(mode);
    } catch (error: any) {
      setHomeAppearanceStatus(error?.message || 'Không thể đổi giao diện Trang chủ.');
    }
  };

  const handleHomeHeroImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setHomeAppearanceStatus('Chỉ chọn file ảnh.');
      return;
    }

    setHomeImageUploading(true);
    setHomeImageProgress(0);
    setHomeAppearanceStatus(null);

    try {
      const url = await uploadHomeAppearanceImage(file, setHomeImageProgress);
      await setCustomImageUrl(url);
      setHomeAppearanceStatus('Đã đổi ảnh Trang chủ.');
    } catch (error: any) {
      setHomeAppearanceStatus(error?.message || 'Không thể tải ảnh lên.');
    } finally {
      setHomeImageUploading(false);
    }
  };

  const handleTestNotification = async () => {
    if (testingNotification) return;

    setTestingNotification(true);
    setNotificationStatus(null);

    try {
      const result = await requestAndShowTestNotification();
      setNotificationStatus(result.message);

      if (
        typeof window !== 'undefined' &&
        'Notification' in window
      ) {
        setNotificationPermission(Notification.permission);
      }
    } catch (error: any) {
      console.error('Notification test failed:', error);
      setNotificationStatus(
        error?.message || 'Không thể thử thông báo trên thiết bị này.'
      );
    } finally {
      setTestingNotification(false);
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    if (newPassword.length < 6) return setPasswordStatus('Mật khẩu mới cần ít nhất 6 ký tự.');
    if (newPassword !== confirmPassword) return setPasswordStatus('Mật khẩu mới nhập lại chưa khớp.');
    setSavingPassword(true);
    setPasswordStatus(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
      await updatePassword(user, newPassword);
      setPasswordStatus('Đổi mật khẩu thành công.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      setPasswordStatus(error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential'
        ? 'Mật khẩu hiện tại không đúng.' : 'Không thể đổi mật khẩu lúc này. Hãy đăng nhập lại rồi thử lại.');
    } finally { setSavingPassword(false); }
  };

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
            onClick={onEditProfile}
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
              onClick={() =>
                onOpenAvatar(
                  userProfile.uid,
                  userProfile.displayName,
                  myAvatar,
                  isU1 ? 'user1' : 'user2'
                )
              }
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
                onClick={() =>
                  onOpenAvatar(
                    userProfile.uid,
                    userProfile.displayName,
                    myAvatar,
                    isU1 ? 'user1' : 'user2'
                  )
                }
                className="w-12 h-12 rounded-full border border-rose-200 p-0.5 overflow-hidden block bg-white shadow-2xs cursor-pointer hover:opacity-90 transition"
                title="Bấm để đổi avatar"
              >
                <img
                  src={myAvatar}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  onOpenAvatar(
                    userProfile.uid,
                    userProfile.displayName,
                    myAvatar,
                    isU1 ? 'user1' : 'user2'
                  )
                }
                className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer transition"
              >
                <Camera className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {userProfile.displayName}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {userProfile.email}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-emerald-500" /> SĐT:
              </span>
              <span className="font-mono font-medium text-slate-800">
                {myPhone || 'Chưa cập nhật'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Cake className="w-3.5 h-3.5 text-amber-500" /> Sinh nhật:
              </span>
              <span className="font-medium text-slate-800">
                {formatDateVN(myBirthday)}
              </span>
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
              onClick={() =>
                onOpenAvatar(
                  partnerUid,
                  partnerName,
                  partnerAvatar,
                  isU1 ? 'user2' : 'user1'
                )
              }
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
                onClick={() =>
                  onOpenAvatar(
                    partnerUid,
                    partnerName,
                    partnerAvatar,
                    isU1 ? 'user2' : 'user1'
                  )
                }
                className="w-12 h-12 rounded-full border border-slate-200 p-0.5 overflow-hidden block bg-white shadow-2xs cursor-pointer hover:opacity-90 transition"
                title="Bấm để đổi avatar"
              >
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-full h-full object-cover rounded-full"
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  onOpenAvatar(
                    partnerUid,
                    partnerName,
                    partnerAvatar,
                    isU1 ? 'user2' : 'user1'
                  )
                }
                className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-slate-700 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer transition"
              >
                <Camera className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {partnerName}
              </h3>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-emerald-500" /> SĐT:
              </span>
              <span className="font-mono font-medium text-slate-800">
                {partnerPhone || 'Chưa cập nhật'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Cake className="w-3.5 h-3.5 text-amber-500" /> Sinh nhật:
              </span>
              <span className="font-medium text-slate-800">
                {formatDateVN(partnerBirthday)}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Home appearance — saved per signed-in account */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Palette className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-bold text-slate-800">Giao diện Trang chủ</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { mode: 'characters' as const, label: 'Nhân vật' },
            { mode: 'vietnam' as const, label: 'Ảnh Việt Nam' },
            { mode: 'custom' as const, label: 'Ảnh của tao' },
          ].map((option) => {
            const active = appearance.heroMode === option.mode;

            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => void handleHomeHeroModeChange(option.mode)}
                className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {appearance.heroMode !== 'characters' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fffaf5]">
            <img
              src={
                appearance.heroMode === 'custom' && appearance.customImageUrl
                  ? appearance.customImageUrl
                  : UI_ASSETS.home.heroVietnam
              }
              alt="Xem trước giao diện Trang chủ"
              className="block h-auto max-h-72 w-full object-contain"
            />
          </div>
        )}

        <input
          ref={homeImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleHomeHeroImageSelected}
          className="hidden"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={homeImageUploading}
            onClick={() => homeImageInputRef.current?.click()}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {homeImageUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{Math.round(homeImageProgress)}%</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{appearance.customImageUrl ? 'Đổi ảnh của tao' : 'Chọn ảnh của tao'}</span>
              </>
            )}
          </button>

          {appearance.customImageUrl && appearance.heroMode !== 'custom' && (
            <button
              type="button"
              onClick={() => void handleHomeHeroModeChange('custom')}
              className="min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Dùng lại ảnh đã lưu
            </button>
          )}
        </div>

        {homeAppearanceStatus && (
          <p className="text-xs font-medium text-slate-500">{homeAppearanceStatus}</p>
        )}
      </div>

      {/* Detailed Couple & Living Information */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Thông Tin Chung & Hẹn Hò</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              Ngày kỷ niệm yêu nhau:
            </span>
            <span className="font-bold text-rose-600">
              {formatDateVN(coupleData?.anniversaryDate)}
            </span>
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
                    {coupleData.city && (
                      <span className="block text-[11px] text-slate-400">
                        {coupleData.city}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 italic">Chưa cập nhật</span>
                )}
              </span>
            </div>

            {(coupleData?.address || coupleData?.city) && (
              <div className="pt-1 flex justify-end">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    (
                      (coupleData.address || '') +
                      ' ' +
                      (coupleData.city || '')
                    ).trim()
                  )}`}
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

          {(coupleData?.address || coupleData?.city) && (
            <div className="my-2 rounded-xl border border-sky-100 overflow-hidden bg-slate-50 shadow-2xs">
              <iframe
                title="Google Maps Location"
                width="100%"
                height="150"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  (
                    (coupleData?.address || '') +
                    ' ' +
                    (coupleData?.city || '')
                  ).trim()
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
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
                {coupleData?.favoritePlaces || (
                  <span className="text-slate-400 italic">Chưa cập nhật</span>
                )}
              </span>
            </div>

            {coupleData?.favoritePlaces && (
              <div className="pt-0.5 flex justify-end">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    coupleData.favoritePlaces
                  )}`}
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
            <span className="text-slate-500 block mb-1">
              Lời nhắn tình yêu / Slogan:
            </span>
            <p className="font-medium text-slate-800 italic bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/60">
              "
              {coupleData?.statusMessage ||
                'Hành trình tình yêu bắt đầu từ những điều nhỏ nhất'}
              "
            </p>
          </div>

          {coupleData?.loveStory && (
            <div className="py-1.5">
              <span className="text-slate-500 block mb-1">
                Kỷ niệm quen nhau / Ghi chú tình yêu:
              </span>
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
            <h3 className="text-sm font-bold text-slate-800">
              Thú Cưng & Bạn Bè Đôi Mình
            </h3>
          </div>

          <button
            type="button"
            onClick={onOpenCompanionManager}
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
              onClick={onOpenCompanionManager}
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
                onClick={onOpenCompanionManager}
                className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 cursor-pointer transition"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-lg overflow-hidden shrink-0">
                  {comp.avatarUrl ? (
                    <img
                      src={comp.avatarUrl}
                      alt={comp.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{comp.emoji || '🐾'}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-800 truncate">
                    {comp.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {comp.relationship ||
                      (comp.type === 'pet' ? 'Thú cưng' : 'Bạn bè')}
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
            <h3 className="text-sm font-bold text-slate-800">
              Quản Lý Thiết Bị & Bảo Mật
            </h3>
          </div>

          <button
            type="button"
            onClick={onOpenDeviceManager}
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
              Đang định danh:{' '}
              <span className="font-semibold text-slate-700">
                {deviceOwner === 'duong'
                  ? 'Dương (Tao)'
                  : 'Chúc (Chúc Gà)'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenDeviceManager}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shrink-0"
          >
            Quản lý
          </button>
        </div>

        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/70 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                Thông báo từ người kia
              </p>
              
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testingNotification}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
            >
              {testingNotification
                ? 'Đang kiểm tra...'
                : notificationPermission === 'granted'
                  ? 'Kiểm tra lại'
                  : 'Bật & thử'}
            </button>
          </div>

          {notificationStatus && (
            <p className="text-[11px] text-indigo-800 bg-white/70 border border-indigo-100 rounded-lg px-2.5 py-2">
              {notificationStatus}
            </p>
          )}
        </div>

        <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/70 flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-slate-800">Mật khẩu tài khoản</p></div>
          <button type="button" onClick={() => { setPasswordStatus(null); setPasswordOpen(true); }} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0">Đổi mật khẩu</button>
        </div>

        <p className="pt-1 text-center text-[10px] font-medium text-slate-400">
          {`Phiên bản ứng dụng v${APP_VERSION}`}
        </p>
      </div>

      {passwordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div><h3 className="font-bold text-slate-800">Đổi mật khẩu</h3><p className="text-xs text-slate-500 mt-1">Mật khẩu mới tối thiểu 6 ký tự.</p></div>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            {passwordStatus && <p className="text-xs text-rose-600">{passwordStatus}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setPasswordOpen(false)} className="px-3 py-2 text-xs text-slate-600">Hủy</button><button type="button" disabled={savingPassword} onClick={handleChangePassword} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold disabled:opacity-50">{savingPassword ? 'Đang đổi...' : 'Xác nhận đổi'}</button></div>
          </div>
        </div>
      )}

      {/* Recovery & History Protection Tool */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Khôi Phục Bình Luận Đã Mất
            </h3>
          </div>

          <button
            type="button"
            onClick={onOpenRestoreComments}
            className="text-xs px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl border border-amber-200/70 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Khôi phục / Viết lại cmt ✍️</span>
          </button>
        </div>

        
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <button
          onClick={onSignOut}
          className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200/60"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất tài khoản
        </button>
      </div>
    </div>
  );
};

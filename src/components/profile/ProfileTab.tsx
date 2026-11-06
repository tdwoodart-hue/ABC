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
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-page-title">Hồ sơ</h2>

        <button
          type="button"
          onClick={onEditProfile}
          className="app-button app-button-primary inline-flex items-center gap-1.5"
        >
          <Edit3 className="h-4 w-4" />
          Sửa
        </button>
      </div>

      <section className="app-card overflow-hidden">
        <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
          {[
            {
              uid: userProfile.uid,
              name: userProfile.displayName,
              avatar: myAvatar,
              slot: (isU1 ? 'user1' : 'user2') as 'user1' | 'user2',
              phone: myPhone,
              birthday: myBirthday,
              email: userProfile.email,
            },
            {
              uid: partnerUid,
              name: partnerName,
              avatar: partnerAvatar,
              slot: (isU1 ? 'user2' : 'user1') as 'user1' | 'user2',
              phone: partnerPhone,
              birthday: partnerBirthday,
              email: '',
            },
          ].map((person, index) => (
            <div
              key={person.uid || person.name}
              className={`flex items-center gap-3 p-4 ${index === 1 ? 'border-t border-slate-100 sm:border-t-0' : ''}`}
            >
              <button
                type="button"
                onClick={() =>
                  onOpenAvatar(
                    person.uid,
                    person.name,
                    person.avatar,
                    person.slot
                  )
                }
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100"
                aria-label={`Đổi ảnh ${person.name}`}
              >
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/75 text-white">
                  <Camera className="h-2.5 w-2.5" />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  {person.name}
                </h3>
                {person.email && (
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    {person.email}
                  </p>
                )}
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {person.phone || 'Chưa có SĐT'} · {formatDateVN(person.birthday)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="app-section-title">Hai đứa</h3>
        </div>

        <div className="divide-y divide-slate-100 px-4">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-xs text-slate-500">Kỷ niệm</span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-slate-800">
              {formatDateVN(coupleData?.anniversaryDate)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Nơi ở</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-800">
                  {(coupleData?.address || coupleData?.city)
                    ? [coupleData?.address, coupleData?.city].filter(Boolean).join(', ')
                    : 'Chưa cập nhật'}
                </p>
              </div>
            </div>

            {(coupleData?.address || coupleData?.city) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  ((coupleData?.address || '') + ' ' + (coupleData?.city || '')).trim()
                )}`}
                target="_blank"
                rel="noreferrer"
                className="app-icon-button h-8 w-8 shrink-0"
                aria-label="Mở bản đồ"
                title="Bản đồ"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="flex items-start justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Địa điểm thích</p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium text-slate-800">
                  {coupleData?.favoritePlaces || 'Chưa cập nhật'}
                </p>
              </div>
            </div>

            {coupleData?.favoritePlaces && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  coupleData.favoritePlaces
                )}`}
                target="_blank"
                rel="noreferrer"
                className="app-icon-button h-8 w-8 shrink-0"
                aria-label="Tìm trên bản đồ"
                title="Bản đồ"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {(coupleData?.statusMessage || coupleData?.loveStory) && (
            <div className="space-y-2 py-3">
              {coupleData?.statusMessage && (
                <p className="text-xs leading-5 text-slate-600">
                  “{coupleData.statusMessage}”
                </p>
              )}
              {coupleData?.loveStory && (
                <p className="line-clamp-3 text-[11px] leading-5 text-slate-500">
                  {coupleData.loveStory}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <button
          type="button"
          onClick={onOpenCompanionManager}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <PawPrint className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">
              Người & thú cưng
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {companions.length} đã lưu
            </p>
          </div>

          <span className="text-xs font-semibold text-rose-600">Quản lý</span>
        </button>

        {companions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 no-scrollbar">
            {companions.slice(0, 6).map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={onOpenCompanionManager}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2"
              >
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white text-sm">
                  {comp.avatarUrl ? (
                    <img
                      src={comp.avatarUrl}
                      alt={comp.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    comp.emoji || '🐾'
                  )}
                </span>
                <span className="max-w-[88px] truncate text-[11px] font-medium text-slate-600">
                  {comp.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="app-card overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="app-section-title">Cài đặt</h3>
        </div>

        <div className="divide-y divide-slate-100 px-4">
          <button
            type="button"
            onClick={onOpenDeviceManager}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">Thiết bị</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {activeDeviceName} · {deviceOwner === 'duong' ? 'Dương' : 'Chúc'}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Mở</span>
          </button>

          <div className="py-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">Thông báo</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {notificationPermission === 'granted'
                    ? 'Đã bật'
                    : notificationPermission === 'unsupported'
                      ? 'Không hỗ trợ'
                      : 'Chưa bật'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testingNotification}
                className="app-button app-button-secondary min-h-9 px-3 py-1.5 disabled:opacity-50"
              >
                {testingNotification
                  ? 'Đang thử'
                  : notificationPermission === 'granted'
                    ? 'Thử'
                    : 'Bật'}
              </button>
            </div>

            {notificationStatus && (
              <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
                {notificationStatus}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setPasswordStatus(null);
              setPasswordOpen(true);
            }}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800">
              Mật khẩu
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Đổi</span>
          </button>

          <button
            type="button"
            onClick={onOpenRestoreComments}
            className="flex w-full items-center gap-3 py-3 text-left"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800">
              Khôi phục bình luận
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Mở</span>
          </button>

          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-xs font-semibold text-slate-800">
              Phiên bản
            </span>
            <span className="text-[11px] text-slate-400">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onSignOut}
        className="app-button app-button-secondary flex w-full items-center justify-center gap-2 text-rose-600"
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </button>

      {passwordOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="app-modal-backdrop"
            onClick={() => setPasswordOpen(false)}
            aria-label="Đóng"
          />

          <div className="app-sheet relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-t-[24px] sm:rounded-[24px]">
            <div className="app-sheet-header">
              <h3 className="app-section-title">Đổi mật khẩu</h3>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="app-icon-button h-9 w-9"
                aria-label="Đóng"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="space-y-2 px-4 py-4">
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Mật khẩu hiện tại"
                className="app-control h-11 w-full px-3 text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mật khẩu mới"
                className="app-control h-11 w-full px-3 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="app-control h-11 w-full px-3 text-sm"
              />

              {passwordStatus && (
                <p className="text-[11px] leading-4 text-rose-600">
                  {passwordStatus}
                </p>
              )}
            </div>

            <div className="app-sheet-footer">
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="app-button app-button-secondary flex-1"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingPassword}
                onClick={handleChangePassword}
                className="app-button app-button-primary flex-[1.2] disabled:opacity-50"
              >
                {savingPassword ? 'Đang đổi' : 'Đổi mật khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

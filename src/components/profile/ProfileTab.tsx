// PROFILE_TAB_IMPORTS_FIXED_V2
import React from 'react';
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
  const [notificationStatus, setNotificationStatus] = React.useState<string | null>(null);

  const handleTestNotification = async () => {
    if (testingNotification) return;

    setTestingNotification(true);
    setNotificationStatus(null);

    try {
      const result = await requestAndShowTestNotification();
      setNotificationStatus(result.message);
    } catch (error: any) {
      console.error('Notification test failed:', error);
      setNotificationStatus(
        error?.message || 'Không thể thử thông báo trên thiết bị này.'
      );
    } finally {
      setTestingNotification(false);
    }
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
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bật thiết bị này để nhận nhật ký, bình luận và kỷ niệm mới từ người kia.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testingNotification}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
            >
              {testingNotification ? 'Đang bật...' : 'Bật & thử'}
            </button>
          </div>

          {notificationStatus && (
            <p className="text-[11px] text-indigo-800 bg-white/70 border border-indigo-100 rounded-lg px-2.5 py-2">
              {notificationStatus}
            </p>
          )}
        </div>
      </div>

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

        <p className="text-xs text-slate-500 leading-relaxed">
          Đã khóa hoàn toàn thao tác xóa bình luận trên toàn hệ thống để không
          bao giờ bị xóa nhầm nữa. Nếu bạn vừa lỡ bấm xóa bình luận trước đó,
          hãy bấm nút trên để khôi phục hoặc chèn lại nội dung vào đúng bài viết
          ngay lập tức.
        </p>
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
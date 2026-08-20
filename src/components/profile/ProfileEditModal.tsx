import React from 'react';
import {
  Edit3,
  ExternalLink,
  Map,
  MapPin,
  Navigation,
  Phone,
  Save,
  X,
} from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  savingProfile: boolean;

  editUser1Name: string;
  editUser2Name: string;
  editAnniversaryDateProfile: string;
  editStatusMessageProfile: string;
  editAddress: string;
  editCity: string;
  editFavoritePlaces: string;
  editUser1Phone: string;
  editUser2Phone: string;
  editUser1Birthday: string;
  editUser2Birthday: string;
  editLoveStory: string;

  onUser1NameChange: (value: string) => void;
  onUser2NameChange: (value: string) => void;
  onAnniversaryDateChange: (value: string) => void;
  onStatusMessageChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onFavoritePlacesChange: (value: string) => void;
  onUser1PhoneChange: (value: string) => void;
  onUser2PhoneChange: (value: string) => void;
  onUser1BirthdayChange: (value: string) => void;
  onUser2BirthdayChange: (value: string) => void;
  onLoveStoryChange: (value: string) => void;

  onOpenMapPicker: (target: 'address' | 'favorite') => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  savingProfile,
  editUser1Name,
  editUser2Name,
  editAnniversaryDateProfile,
  editStatusMessageProfile,
  editAddress,
  editCity,
  editFavoritePlaces,
  editUser1Phone,
  editUser2Phone,
  editUser1Birthday,
  editUser2Birthday,
  editLoveStory,
  onUser1NameChange,
  onUser2NameChange,
  onAnniversaryDateChange,
  onStatusMessageChange,
  onAddressChange,
  onCityChange,
  onFavoritePlacesChange,
  onUser1PhoneChange,
  onUser2PhoneChange,
  onUser1BirthdayChange,
  onUser2BirthdayChange,
  onLoveStoryChange,
  onOpenMapPicker,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white w-full max-w-lg rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-rose-500" />
            Chỉnh Sửa Thông Tin Hồ Sơ & Địa Chỉ
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group 1: Standard Names & Anniversary */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">
            1. Thông tin đôi lứa
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên Người yêu 1
              </label>
              <input
                type="text"
                value={editUser1Name}
                onChange={(e) => onUser1NameChange(e.target.value)}
                placeholder="Tên Bạn"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tên Người yêu 2
              </label>
              <input
                type="text"
                value={editUser2Name}
                onChange={(e) => onUser2NameChange(e.target.value)}
                placeholder="Tên Người ấy"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ngày kỷ niệm yêu nhau
              </label>
              <input
                type="date"
                value={editAnniversaryDateProfile}
                onChange={(e) => onAnniversaryDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Lời nhắn tình yêu / Status
              </label>
              <input
                type="text"
                value={editStatusMessageProfile}
                onChange={(e) => onStatusMessageChange(e.target.value)}
                placeholder="VD: Cùng nhau đi qua bão giông"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Group 2: Address & Location */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              2. Địa chỉ & Nơi ở (Google Maps)
            </h4>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                (editAddress + ' ' + editCity).trim() || 'Việt Nam'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline"
            >
              <Map className="w-3 h-3 text-sky-500" />
              <span>Tìm trên Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                Địa chỉ chi tiết (Đường, Phường, Quận...)
              </label>

              <button
                type="button"
                onClick={() => onOpenMapPicker('address')}
                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-[11px] font-bold border border-sky-200/80 transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <MapPin className="w-3 h-3 text-sky-500" />
                <span>Chọn trên Google Maps 📍</span>
              </button>
            </div>

            <input
              type="text"
              value={editAddress}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="VD: 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Thành phố / Tỉnh thành
              </label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="VD: TP. Hồ Chí Minh, Hà Nội..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Địa điểm hẹn hò yêu thích
                </label>

                <button
                  type="button"
                  onClick={() => onOpenMapPicker('favorite')}
                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-semibold border border-rose-200/80 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <MapPin className="w-2.5 h-2.5 text-rose-500" />
                  <span>Chọn trên bản đồ</span>
                </button>
              </div>

              <input
                type="text"
                value={editFavoritePlaces}
                onChange={(e) => onFavoritePlacesChange(e.target.value)}
                placeholder="VD: Lẩu Haidilao, Phố cổ, Cà phê ngõ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Google Maps Live Interactive Preview in Edit Modal */}
          {(editAddress.trim() || editCity.trim()) && (
            <div className="mt-2 rounded-xl border border-sky-200/80 overflow-hidden bg-slate-50 shadow-2xs space-y-0">
              <div className="p-2 bg-sky-50/80 border-b border-sky-100 flex items-center justify-between text-[11px] font-semibold text-sky-800">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-500" />
                  Bản đồ vị trí Google Maps tương ứng:
                </span>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    (editAddress + ' ' + editCity).trim()
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:text-sky-800 underline flex items-center gap-0.5"
                >
                  Chỉ đường trên Google Maps
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <iframe
                title="Google Maps Location Preview"
                width="100%"
                height="160"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  (editAddress + ' ' + editCity).trim()
                )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          )}
        </div>

        {/* Group 3: Phone & Birthdays */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            3. Liên hệ & Sinh nhật
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại ({editUser1Name || 'Partner 1'})
              </label>
              <input
                type="text"
                value={editUser1Phone}
                onChange={(e) => onUser1PhoneChange(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Số điện thoại ({editUser2Name || 'Partner 2'})
              </label>
              <input
                type="text"
                value={editUser2Phone}
                onChange={(e) => onUser2PhoneChange(e.target.value)}
                placeholder="0908765432"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sinh nhật ({editUser1Name || 'Partner 1'})
              </label>
              <input
                type="date"
                value={editUser1Birthday}
                onChange={(e) => onUser1BirthdayChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sinh nhật ({editUser2Name || 'Partner 2'})
              </label>
              <input
                type="date"
                value={editUser2Birthday}
                onChange={(e) => onUser2BirthdayChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Group 4: Love Story / Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Ghi chú kỷ niệm quen nhau / Love Story
          </label>

          <textarea
            rows={3}
            value={editLoveStory}
            onChange={(e) => onLoveStoryChange(e.target.value)}
            placeholder="Lần đầu hai đứa gặp nhau ở đâu, ấn tượng gì..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </div>
      </form>
    </div>
  );
};

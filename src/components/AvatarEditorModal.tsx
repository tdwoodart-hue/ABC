import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Check, X, Sparkles, Upload, Link2 } from 'lucide-react';
import { compressAndConvertToBase64 } from '../utils/imageCompression';
import { updateUserAvatar } from '../lib/firebase';

interface AvatarEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  userUid?: string;
  userName: string;
  coupleId?: string;
  targetSlot?: 'user1' | 'user2';
  onAvatarUpdated: (newAvatar: string) => void;
}

const PRESET_AVATARS = [
  // Nam / Anh
  { name: 'Dương 1', url: 'https://api.dicebear.com/7.x/micah/svg?seed=duong_male&hair=fonze,full&eyes=eyes&mouth=smile' },
  { name: 'Dương 2', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Felix&hair=fonze,pixie&eyes=eyes&mouth=smile' },
  { name: 'Dương 3', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Liam&hair=full&eyes=round&mouth=smile' },
  { name: 'Dương Cute', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=duong_bot' },
  { name: 'Dương Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=duong_adv' },
  { name: 'Dương Gấu', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=duong_notion' },

  // Nữ / Em / Chúc Gà
  { name: 'Chúc Gà 1', url: 'https://api.dicebear.com/7.x/micah/svg?seed=chucga_female&hair=donna,straight&eyes=eyes&mouth=smile' },
  { name: 'Chúc Gà 2', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Mia&hair=donna&eyes=eyes&mouth=smile' },
  { name: 'Chúc Gà 3', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Chloe&hair=straight&eyes=round&mouth=smile' },
  { name: 'Chúc Gà Cute', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=chucga_bot' },
  { name: 'Chúc Gà Anime', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=chucga_adv' },
  { name: 'Chúc Gà Thỏ', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=chucga_notion' },
];

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  userUid,
  userName,
  coupleId,
  targetSlot,
  onAvatarUpdated
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [customUrl, setCustomUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'presets' | 'upload' | 'url'>('presets');

  // Reset selectedAvatar when currentAvatar changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatar);
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const base64 = await compressAndConvertToBase64(file);
      setSelectedAvatar(base64);
    } catch (err) {
      console.error('Lỗi tải ảnh đại diện:', err);
      alert('Không thể tải ảnh, vui lòng thử lại ảnh khác.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    setSelectedAvatar(customUrl.trim());
    setCustomUrl('');
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) return;
    setSaving(true);
    try {
      await updateUserAvatar(userUid || '', selectedAvatar, coupleId, targetSlot);
      onAvatarUpdated(selectedAvatar);
      onClose();
    } catch (err: any) {
      console.error('Lỗi cập nhật avatar:', err);
      alert('Lỗi cập nhật ảnh đại diện: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Đổi & Đồng Bộ Avatar</h3>
              <p className="text-[11px] text-slate-500">Áp dụng cho {userName} trên toàn ứng dụng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Preview */}
        <div className="flex flex-col items-center justify-center space-y-2 py-2">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-rose-300 p-1 bg-white shadow-md overflow-hidden">
              <img
                src={selectedAvatar || 'https://api.dicebear.com/7.x/micah/svg?seed=default'}
                alt="Avatar preview"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <span className="text-xs font-semibold text-slate-600">Xem trước Avatar</span>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('presets')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'presets' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Có sẵn</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'upload' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh lên</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'url' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link URL</span>
          </button>
        </div>

        {/* Content by Tab */}
        {tab === 'presets' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">Chọn ảnh hoạt hình đôi dễ thương:</p>
            <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
              {PRESET_AVATARS.map((preset, idx) => {
                const isSelected = selectedAvatar === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`relative p-1 rounded-2xl border-2 transition flex flex-col items-center gap-1 cursor-pointer bg-slate-50 hover:bg-rose-50 ${
                      isSelected ? 'border-rose-500 shadow-xs' : 'border-slate-200'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-12 h-12 rounded-full object-cover" />
                    <span className="text-[10px] font-medium text-slate-700 truncate w-full text-center">
                      {preset.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px]">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div className="border-2 border-dashed border-rose-200 bg-rose-50/40 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Tải ảnh chụp từ điện thoại hoặc máy tính</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Tự động nén tối ưu, tải nhanh & sắc nét</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Đang xử lý ảnh...' : 'Chọn ảnh từ thiết bị'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {tab === 'url' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600">Dán đường dẫn ảnh trực tiếp (URL)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition"
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium cursor-pointer transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSaveAvatar}
            disabled={saving || !selectedAvatar}
            className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition"
          >
            {saving ? (
              <span>Đang đồng bộ...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Lưu & Đồng bộ Avatar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

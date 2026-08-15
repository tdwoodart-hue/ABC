import React, { useState } from 'react';
import { Companion, UserProfile } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc } from '../lib/firebase';
import { X, Plus, Trash2, Edit3, Heart, PawPrint, Users, Sparkles, Camera, Upload, Check } from 'lucide-react';

interface CompanionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  companions: Companion[];
  onSelectCompanion?: (companion: Companion) => void;
}

const DEFAULT_EMOJIS = [
  '🐱', '🐶', '🐰', '🐹', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', 
  '🐮', '🐷', '🐸', '🐵', '🐥', '🌸', '⭐', '🐾', '🧑', '👧', '👦'
];

export const CompanionManagerModal: React.FC<CompanionManagerModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  companions,
  onSelectCompanion
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'pet' | 'friend' | 'family' | 'other'>('pet');
  const [emoji, setEmoji] = useState('🐱');
  const [relationship, setRelationship] = useState('Con mèo của chúng mình 🐾');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setName('');
    setType('pet');
    setEmoji('🐱');
    setRelationship('Con mèo cưng của chúng mình 🐾');
    setAvatarUrl('');
    setEditingId(null);
    setIsAdding(true);
  };

  const handleStartEdit = (companion: Companion) => {
    setName(companion.name);
    setType(companion.type || 'pet');
    setEmoji(companion.emoji || '🐱');
    setRelationship(companion.relationship || '');
    setAvatarUrl(companion.avatarUrl || '');
    setEditingId(companion.id);
    setIsAdding(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId || !name.trim() || saving) return;

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const compRef = doc(db, 'couples', userProfile.coupleId, 'companions', editingId);
        await updateDoc(compRef, {
          name: name.trim(),
          type,
          emoji,
          relationship: relationship.trim(),
          avatarUrl: avatarUrl.trim()
        });
      } else {
        // Add new
        const compColl = collection(db, 'couples', userProfile.coupleId, 'companions');
        await addDoc(compColl, {
          name: name.trim(),
          type,
          emoji,
          relationship: relationship.trim(),
          avatarUrl: avatarUrl.trim(),
          createdByUid: userProfile.uid,
          createdByName: userProfile.displayName || 'Thành viên',
          createdAt: new Date().toISOString()
        });
      }

      setIsAdding(false);
      setEditingId(null);
    } catch (err) {
      console.error('Lỗi lưu thông tin thành viên/thú cưng:', err);
      alert('Không thể lưu. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!userProfile.coupleId) return;
    if (!confirm(`Bạn có chắc muốn xóa "${name}" khỏi danh sách?`)) return;

    try {
      const compRef = doc(db, 'couples', userProfile.coupleId, 'companions', id);
      await deleteDoc(compRef);
      if (editingId === id) {
        setIsAdding(false);
        setEditingId(null);
      }
    } catch (err) {
      console.error('Lỗi xóa:', err);
      alert('Không thể xóa. Vui lòng thử lại!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200/80 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <PawPrint className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Bạn Bè & Thú Cưng Đôi Mình
              </h3>
              <p className="text-[11px] text-slate-500">
                Thêm mèo cưng, cún cưng, bạn bè để gắn thẻ khi viết nhật ký
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {isAdding ? (
            <form onSubmit={handleSave} className="bg-slate-50 p-4 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {editingId ? 'Chỉnh sửa thông tin' : 'Thêm thành viên / Thú cưng mới'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Quay lại
                </button>
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Loại thành viên</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'pet', label: 'Thú cưng', defaultEmoji: '🐱' },
                    { id: 'friend', label: 'Bạn bè', defaultEmoji: '🧑' },
                    { id: 'family', label: 'Gia đình', defaultEmoji: '👨‍👩‍👧' },
                    { id: 'other', label: 'Khác', defaultEmoji: '🌸' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setType(t.id as any);
                        if (t.id === 'pet') {
                          setEmoji('🐱');
                          setRelationship('Con mèo của chúng mình 🐾');
                        } else if (t.id === 'friend') {
                          setEmoji('🧑');
                          setRelationship('Bạn thân');
                        }
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                        type === t.id
                          ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tên (VD: Mèo Bơ, Cún Lucky, Linh...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Biểu tượng cảm xúc (Emoji)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 max-h-24 overflow-y-auto">
                  {DEFAULT_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-7 h-7 text-base rounded-lg flex items-center justify-center transition cursor-pointer ${
                        emoji === em
                          ? 'bg-rose-100 ring-2 ring-rose-400 scale-110'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relationship / Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mối quan hệ / Ghi chú (VD: Con mèo cưng, Bạn học...)
                </label>
                <input
                  type="text"
                  placeholder="VD: Con mèo của chúng mình, Em gái..."
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>

              {/* Avatar Photo Upload (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ảnh đại diện (Tùy chọn)</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center text-xl shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{avatarUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:bg-slate-200 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editingId ? 'Lưu cập nhật' : 'Hoàn tất'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Add Button */}
              <button
                type="button"
                onClick={handleStartAdd}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 border border-dashed border-rose-300 text-rose-600 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm thú cưng / bạn bè mới</span>
              </button>

              {/* List of Companions */}
              {companions.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 mx-auto flex items-center justify-center text-xl">
                    🐱
                  </div>
                  <p className="text-xs font-bold text-slate-700">Chưa có thú cưng hoặc bạn bè nào</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Thêm chú mèo cưng, cún yêu hoặc bạn bè thân thiết để cùng xuất hiện trong các kỷ niệm của hai đứa nhé!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {companions.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition group"
                    >
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          if (onSelectCompanion) {
                            onSelectCompanion(comp);
                            onClose();
                          }
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xl shrink-0">
                          {comp.avatarUrl ? (
                            <img src={comp.avatarUrl} alt={comp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{comp.emoji || '🐾'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 truncate">{comp.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full border border-slate-200">
                              {comp.type === 'pet' ? 'Thú cưng' : comp.type === 'friend' ? 'Bạn bè' : comp.type === 'family' ? 'Gia đình' : 'Khác'}
                            </span>
                          </div>
                          {comp.relationship && (
                            <p className="text-[11px] text-slate-400 truncate">{comp.relationship}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(comp.id, comp.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

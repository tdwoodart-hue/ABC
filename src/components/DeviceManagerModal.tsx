import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Laptop, 
  Tablet, 
  ShieldCheck, 
  Check, 
  Trash2, 
  Edit2, 
  Save, 
  RefreshCw, 
  Lock, 
  KeyRound, 
  AlertTriangle,
  Info,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { DeviceRecord, UserProfile } from '../types';
import { 
  getOrCreateDeviceId, 
  getStoredDeviceOwner, 
  setStoredDeviceOwner, 
  getStoredDeviceName, 
  setStoredDeviceName,
  detectDeviceDetails,
  syncDeviceToFirestore,
  removeDeviceFromFirestore,
  updateDeviceNameInFirestore,
  getSecurityPin,
  setSecurityPin
} from '../utils/deviceHelper';
import { db, collection, onSnapshot, doc, getDoc } from '../lib/firebase';
import { formatDateVN } from '../utils/formatDate';

interface DeviceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onDeviceChange?: (owner: 'duong' | 'chuc', deviceName: string) => void;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDeviceChange
}) => {
  const currentDeviceId = getOrCreateDeviceId();
  const [currentOwner, setCurrentOwner] = useState<'duong' | 'chuc'>(getStoredDeviceOwner() || 'duong');
  const [currentName, setCurrentName] = useState<string>(getStoredDeviceName() || 'Thiết bị của bạn');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameVal, setEditingNameVal] = useState('');
  
  const [allDevices, setAllDevices] = useState<DeviceRecord[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'duong' | 'chuc' | 'security'>('all');

  // PIN settings
  const [pinCode, setPinCode] = useState(getSecurityPin() || '');
  const [savedPinSuccess, setSavedPinSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const savedOwner = getStoredDeviceOwner();
    if (savedOwner) setCurrentOwner(savedOwner);
    const savedName = getStoredDeviceName();
    if (savedName) {
      setCurrentName(savedName);
      setEditingNameVal(savedName);
    }

    // Subscribe to all devices in Firestore
    const devicesRef = collection(db, 'couples', 'our_couple', 'devices');
    const unsub = onSnapshot(devicesRef, (snapshot) => {
      const list: DeviceRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      // Sort by lastActive descending
      list.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      setAllDevices(list);
      setLoadingDevices(false);
    }, (err) => {
      console.warn('Lỗi đọc danh sách thiết bị:', err);
      setLoadingDevices(false);
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitchOwner = async (newOwner: 'duong' | 'chuc') => {
    setCurrentOwner(newOwner);
    setStoredDeviceOwner(newOwner);
    
    const details = detectDeviceDetails();
    const defaultOwnerName = newOwner === 'duong' ? `Thiết bị của Dương (${details.os})` : `Thiết bị của Chúc (${details.os})`;
    const nameToSet = currentName.includes('Dương') || currentName.includes('Chúc') ? defaultOwnerName : currentName;
    
    setCurrentName(nameToSet);
    setStoredDeviceName(nameToSet);

    await syncDeviceToFirestore(newOwner, nameToSet, currentUser.uid);
    if (onDeviceChange) onDeviceChange(newOwner, nameToSet);
  };

  const handleSaveName = async () => {
    if (!editingNameVal.trim()) return;
    setCurrentName(editingNameVal.trim());
    setStoredDeviceName(editingNameVal.trim());
    await updateDeviceNameInFirestore(currentDeviceId, editingNameVal.trim());
    setIsEditingName(false);
    if (onDeviceChange) onDeviceChange(currentOwner, editingNameVal.trim());
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      await removeDeviceFromFirestore(id);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error('Lỗi xoá thiết bị:', e);
    }
  };

  const handleSavePin = () => {
    if (pinCode.trim().length === 4 || pinCode.trim().length === 0) {
      setSecurityPin(pinCode.trim() || null);
      setSavedPinSuccess(true);
      setTimeout(() => setSavedPinSuccess(false), 3000);
    }
  };

  const duongDevices = allDevices.filter(d => d.ownerKey === 'duong');
  const chucDevices = allDevices.filter(d => d.ownerKey === 'chuc');

  const filteredDevices = activeTab === 'duong' 
    ? duongDevices 
    : activeTab === 'chuc' 
    ? chucDevices 
    : allDevices;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                Quản lý thiết bị của hai đứa
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  Bảo mật cao
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Xác định rõ ràng đâu là thiết bị của Dương và đâu là của Chúc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Current Device Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-pink-50/50 border border-indigo-100/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Thiết bị hiện tại bạn đang cầm
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700">
                Đang sử dụng
              </span>
            </div>

            {/* Current Device Name edit */}
            <div className="flex items-center justify-between gap-3 mb-4">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingNameVal}
                    onChange={(e) => setEditingNameVal(e.target.value)}
                    className="flex-1 text-sm font-semibold px-3 py-1.5 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    placeholder="Đặt tên cho thiết bị này"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    {currentName}
                  </h4>
                  <button
                    onClick={() => {
                      setEditingNameVal(currentName);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title="Đổi tên thiết bị"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Switch owner selector */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">
                Thiết bị này thuộc quyền sở hữu của:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSwitchOwner('duong')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    currentOwner === 'duong'
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20 text-blue-900 font-bold'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨🏻‍💻</span>
                    <div>
                      <p className="text-xs">Dương (Tao)</p>
                      <p className="text-[10px] text-slate-400 font-normal">Anh ♂</p>
                    </div>
                  </div>
                  {currentOwner === 'duong' && (
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchOwner('chuc')}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                    currentOwner === 'chuc'
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20 text-rose-900 font-bold'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌸</span>
                    <div>
                      <p className="text-xs">Chúc (Chúc Gà)</p>
                      <p className="text-[10px] text-slate-400 font-normal">Em ♀</p>
                    </div>
                  </div>
                  {currentOwner === 'chuc' && (
                    <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({allDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('duong')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'duong'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              👨🏻‍💻 Thiết bị của Dương ({duongDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('chuc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'chuc'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              🌸 Thiết bị của Chúc ({chucDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ml-auto ${
                activeTab === 'security'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🔒 Mã PIN bảo vệ
            </button>
          </div>

          {/* Security Tab (PIN Code settings) */}
          {activeTab === 'security' ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Mã PIN 4 số bảo vệ thiết bị
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đặt mã PIN 4 số trên trình duyệt này để ngăn người ngoài mở xem trộm khi mượn máy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 1234 (để trống nếu muốn tắt)"
                  className="w-48 px-3 py-2 text-sm font-bold tracking-widest text-center rounded-xl bg-white border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Lưu cài đặt PIN
                </button>
              </div>

              {savedPinSuccess && (
                <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Đã cập nhật mã PIN bảo vệ thành công!
                </p>
              )}
            </div>
          ) : (
            /* Device List */
            <div className="space-y-3">
              {loadingDevices ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Đang tải danh sách thiết bị...
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có thiết bị nào trong danh mục này.
                </div>
              ) : (
                filteredDevices.map((dev) => {
                  const isThisDevice = dev.id === currentDeviceId;
                  const isD = dev.ownerKey === 'duong';

                  return (
                    <div
                      key={dev.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isThisDevice
                          ? 'bg-slate-50/90 border-indigo-200 ring-1 ring-indigo-200'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isD
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                          }`}
                        >
                          {dev.os?.includes('iPhone') || dev.os?.includes('Android') ? (
                            <Smartphone className="w-5 h-5" />
                          ) : dev.os?.includes('iPad') || dev.deviceType === 'tablet' ? (
                            <Tablet className="w-5 h-5" />
                          ) : (
                            <Laptop className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-800">
                              {dev.deviceName || (isD ? 'Thiết bị của Dương' : 'Thiết bị của Chúc')}
                            </p>
                            {isThisDevice && (
                              <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                Máy này
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className={isD ? 'text-blue-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {isD ? '👨🏻‍💻 Dương' : '🌸 Chúc'}
                            </span>
                            <span>•</span>
                            <span>{dev.os}</span>
                            <span>•</span>
                            <span>{formatDateVN(dev.lastActive || dev.createdAt)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {deleteConfirmId === dev.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteDevice(dev.id)}
                              className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(dev.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Xóa thiết bị này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mỗi thiết bị được định danh độc lập & an toàn</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UserProfile, CoupleData, FundConfig } from '../types';
import { db, doc, setDoc } from '../lib/firebase';
import { 
  QrCode, 
  Copy, 
  Check, 
  Edit3, 
  Upload, 
  X, 
  Sparkles, 
  Building, 
  CreditCard, 
  User, 
  ExternalLink,
  ZoomIn,
  ShieldCheck,
  HeartHandshake,
  Shirt
} from 'lucide-react';

interface FundQRCodeCardProps {
  userProfile: UserProfile;
  coupleData: CoupleData | null;
  fundConfig: FundConfig | null;
  onOpenAddIncome?: () => void;
}

export const FundQRCodeCard: React.FC<FundQRCodeCardProps> = ({
  userProfile,
  coupleData,
  fundConfig,
  onOpenAddIncome
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Edit form states
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNo, setEditAccountNo] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editCustomNote, setEditCustomNote] = useState('');
  const [editQrImage, setEditQrImage] = useState('');
  const [saving, setSaving] = useState(false);

  const bankName = fundConfig?.bankName || coupleData?.bankName || '';
  const bankAccountNo = fundConfig?.bankAccountNo || coupleData?.bankAccountNo || '';
  const accountHolderName = fundConfig?.accountHolderName || coupleData?.accountHolderName || '';
  const fundPurpose = fundConfig?.fundPurpose || 'Tiền quỹ được sử dụng cho mục đích chung của hai đứa: Mua áo đôi, hẹn hò cuối tuần, du lịch, quà kỷ niệm, đồ đôi & sinh hoạt chung...';
  const customNote = fundConfig?.customNote || '';

  // Auto-generate VietQR URL if custom QR image is not uploaded but Bank & STK exist
  const generatedVietQrUrl = (bankName && bankAccountNo)
    ? `https://img.vietqr.io/image/${encodeURIComponent(bankName)}-${encodeURIComponent(bankAccountNo.replace(/\s+/g, ''))}-compact2.png?amount=50000&addInfo=Dong%20quy%20tinh%20yeu&accountName=${encodeURIComponent(accountHolderName)}`
    : '';

  const activeQrImageUrl = fundConfig?.qrImageUrl || generatedVietQrUrl;

  const handleCopyStk = () => {
    if (!bankAccountNo) return;
    navigator.clipboard.writeText(bankAccountNo.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEdit = () => {
    setEditBankName(bankName);
    setEditAccountNo(bankAccountNo);
    setEditAccountName(accountHolderName);
    setEditPurpose(fundPurpose);
    setEditCustomNote(customNote);
    setEditQrImage(fundConfig?.qrImageUrl || '');
    setIsEditModalOpen(true);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setEditQrImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId) return;

    setSaving(true);
    try {
      const configRef = doc(db, 'couples', userProfile.coupleId, 'settings', 'fundConfig');
      const updatedData: FundConfig = {
        bankName: editBankName.trim(),
        bankAccountNo: editAccountNo.trim(),
        accountHolderName: editAccountName.trim(),
        fundPurpose: editPurpose.trim() || 'Tiền quỹ được sử dụng cho mục đích chung của hai đứa: Mua áo đôi, hẹn hò cuối tuần, du lịch, quà kỷ niệm, đồ đôi & sinh hoạt chung...',
        customNote: editCustomNote.trim(),
        qrImageUrl: editQrImage.trim(),
        updatedAt: new Date().toISOString(),
        updatedByUid: userProfile.uid
      };
      await setDoc(configRef, updatedData, { merge: true });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Lỗi cập nhật cấu hình quỹ:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Quỹ Chung & Mã QR Đóng Quỹ</h3>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Mục đích chung
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Đồng bộ tự động cho cả 2 bạn</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200/60 transition cursor-pointer flex items-center gap-1 shrink-0"
          title="Chỉnh sửa mã QR và thông tin tài khoản quỹ"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cập nhật mã QR</span>
          <span className="sm:hidden">Sửa QR</span>
        </button>
      </div>

      {/* Fund Purpose Quote Box */}
      <div className="bg-rose-50/60 border border-rose-100/90 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-white text-rose-500 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
          <Shirt className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-bold text-rose-900 flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
            Mục đích sử dụng quỹ:
          </p>
          <p className="text-slate-600 leading-relaxed italic">
            "{fundPurpose}"
          </p>
        </div>
      </div>

      {/* QR & Bank Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
        {/* QR Code Container */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {activeQrImageUrl ? (
            <div className="relative group cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
              <img
                src={activeQrImageUrl}
                alt="Mã QR Quỹ Chung"
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-xs group-hover:scale-102 transition duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-semibold gap-1 backdrop-blur-2xs">
                <ZoomIn className="w-4 h-4" />
                <span>Xem lớn</span>
              </div>
            </div>
          ) : (
            <div 
              onClick={handleOpenEdit}
              className="w-40 h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-white text-slate-400 p-4 text-center cursor-pointer hover:border-rose-400 hover:text-rose-600 transition"
            >
              <QrCode className="w-10 h-10 mb-2 opacity-50" />
              <span className="text-xs font-bold">+ Thêm mã QR</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Tải ảnh hoặc nhập STK</span>
            </div>
          )}
          <span className="text-[11px] text-slate-400 mt-2 font-medium">Quét mã QR để chuyển quỹ</span>
        </div>

        {/* Bank & Transfer details */}
        <div className="md:col-span-8 space-y-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
            {/* Bank Name */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-sky-500" /> Ngân hàng:
              </span>
              <span className="font-bold text-slate-800">{bankName || 'Chưa cập nhật'}</span>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Số tài khoản:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-600 text-sm">{bankAccountNo || 'Chưa cập nhật'}</span>
                {bankAccountNo && (
                  <button
                    type="button"
                    onClick={handleCopyStk}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Account Holder */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" /> Chủ tài khoản:
              </span>
              <span className="font-bold text-slate-800 uppercase">{accountHolderName || 'Chưa cập nhật'}</span>
            </div>

            {/* Note / Syntax */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cú pháp chuyển khoản:</span>
              <span className="font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                [Tên] dong quy
              </span>
            </div>
          </div>

          {/* Quick deposit button */}
          {onOpenAddIncome && (
            <button
              type="button"
              onClick={onOpenAddIncome}
              className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>+ Ghi Nhận Khoản Đã Chuyển Vào Quỹ</span>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox QR Code Modal */}
      {isLightboxOpen && activeQrImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Mã QR Quỹ Chung Đôi Mình</h3>
              <button 
                onClick={() => setIsLightboxOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <img 
                src={activeQrImageUrl} 
                alt="QR Code" 
                className="w-full h-auto rounded-xl bg-white p-3 border border-slate-200" 
              />
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">{bankName} - {bankAccountNo}</p>
              <p className="text-slate-500 uppercase font-semibold">{accountHolderName}</p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="w-full py-2 bg-slate-800 text-white font-semibold rounded-xl text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Edit QR & Bank Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-rose-500" />
                Cập Nhật Mã QR & Thông Tin Quỹ
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* Fund Purpose */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mục đích sử dụng quỹ chung:
                </label>
                <textarea
                  rows={2}
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  placeholder="VD: Mua áo đôi, hẹn hò cuối tuần, du lịch, quà kỷ niệm, đồ đôi..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Ngân hàng / Ví điện tử:
                </label>
                <input
                  type="text"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  placeholder="VD: MBBank, Techcombank, Vietcombank, TPBank, MoMo..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                />
              </div>

              {/* Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số tài khoản quỹ:
                  </label>
                  <input
                    type="text"
                    value={editAccountNo}
                    onChange={(e) => setEditAccountNo(e.target.value)}
                    placeholder="VD: 0987654321..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên chủ tài khoản:
                  </label>
                  <input
                    type="text"
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white uppercase"
                  />
                </div>
              </div>

              {/* Upload QR Image */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tải lên ảnh Mã QR riêng (hoặc để trống để tự tạo VietQR):
                </label>
                <div className="flex items-center gap-3">
                  {editQrImage ? (
                    <div className="relative">
                      <img src={editQrImage} alt="QR" className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1" />
                      <button
                        type="button"
                        onClick={() => setEditQrImage('')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-slate-300 hover:border-rose-400 bg-slate-50 hover:bg-rose-50/50 rounded-xl cursor-pointer transition">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-600">Chọn ảnh mã QR từ máy</span>
                    <input type="file" accept="image/*" onChange={handleQrFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

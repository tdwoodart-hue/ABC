import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Calendar, Tag, User, Trash2 } from 'lucide-react';
import { updateFinanceTransaction } from '../lib/firebase';

const FINANCE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống' },
  { id: 'dating', name: 'Hẹn hò' },
  { id: 'shopping', name: 'Mua sắm' },
  { id: 'travel', name: 'Du lịch' },
  { id: 'bills', name: 'Hóa đơn / Tiện ích' },
  { id: 'health', name: 'Sức khỏe & Làm đẹp' },
  { id: 'entertainment', name: 'Giải trí' },
  { id: 'transport', name: 'Di chuyển / Xăng xe' },
  { id: 'gift', name: 'Quà tặng' },
  { id: 'savings', name: 'Tiết kiệm chung' },
  { id: 'salary', name: 'Lương & Thưởng' },
  { id: 'other', name: 'Khoản khác' }
];

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  transaction: {
    id: string;
    title: string;
    amount: number;
    type: 'expense' | 'income';
    category?: string;
    paidByUid?: string;
    paidByName?: string;
    date?: string;
  } | null;
  partner1: { uid: string; name: string };
  partner2: { uid: string; name: string };
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  coupleId,
  transaction,
  partner1,
  partner2,
  onSuccess,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(FINANCE_CATEGORIES[0].name);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidByUid, setPaidByUid] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || '');
      setAmount(transaction.amount ? transaction.amount.toString() : '');
      setType(transaction.type || 'expense');
      setCategory(transaction.category || FINANCE_CATEGORIES[0].name);
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setPaidByUid(transaction.paidByUid || partner1.uid);
    }
  }, [transaction, partner1.uid]);

  if (!isOpen || !transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const payerName = paidByUid === partner1.uid ? partner1.name : (paidByUid === partner2.uid ? partner2.name : partner1.name);

    setSaving(true);
    try {
      await updateFinanceTransaction(coupleId, transaction.id, {
        title: title.trim(),
        amount: parsedAmount,
        type,
        category: type === 'income' ? 'Đóng quỹ chung' : category,
        paidByUid,
        paidByName: payerName,
        date
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi sửa giao dịch:', err);
      alert('Không thể lưu giao dịch: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <form onSubmit={handleSave} className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Chỉnh Sửa Khoản Thu / Chi</h3>
              <p className="text-[11px] text-slate-500">Đổi người chi trả, số tiền hoặc danh mục</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              type === 'expense' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Chi tiêu (-)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              type === 'income' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Đóng quỹ (+)
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tên khoản chi / thu</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Đi siêu thị, Tiền điện, Ăn tối..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Số tiền (VNĐ)</label>
          <input
            type="text"
            required
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setAmount(val ? Number(val).toLocaleString('vi-VN') : '');
            }}
            placeholder="50.000"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 font-mono font-bold"
          />
        </div>

        {/* Payer Selection (CRITICAL for fixing who paid) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-rose-500" />
            <span>Người thanh toán / thực hiện:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaidByUid(partner1.uid)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                paidByUid === partner1.uid
                  ? 'border-rose-500 bg-rose-50/70 text-rose-700 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{partner1.name}</span>
              {paidByUid === partner1.uid && <Check className="w-4 h-4 text-rose-600" />}
            </button>
            <button
              type="button"
              onClick={() => setPaidByUid(partner2.uid)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition ${
                paidByUid === partner2.uid
                  ? 'border-rose-500 bg-rose-50/70 text-rose-700 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{partner2.name}</span>
              {paidByUid === partner2.uid && <Check className="w-4 h-4 text-rose-600" />}
            </button>
          </div>
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
              >
                {FINANCE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className={type === 'income' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày giao dịch</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xóa giao dịch này?')) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              className="px-3 py-2 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

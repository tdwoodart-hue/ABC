import React from 'react';
import {
  Archive,
  History,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { DeletedCommentRecord, JournalEntry } from '../../types';
import { formatDateShortVN } from '../../utils/formatDate';

interface RestoreCommentsModalProps {
  isOpen: boolean;
  deletedCommentsList: DeletedCommentRecord[];
  restoringDeletedId: string | null;
  journals: JournalEntry[];

  showManualRestoreForm: boolean;
  restoreSelectedJournalId: string;
  restoreCommentText: string;
  restoreCommentAuthor: 'duong' | 'chuc';
  restoreCommentLoading: boolean;

  onClose: () => void;
  onShowManualRestoreFormChange: (value: boolean) => void;
  onRestoreDeletedComment: (record: DeletedCommentRecord) => void;
  onPermanentDeleteRecord: (record: DeletedCommentRecord) => void;

  onSelectedJournalChange: (journalId: string) => void;
  onCommentTextChange: (value: string) => void;
  onCommentAuthorChange: (author: 'duong' | 'chuc') => void;
  onManualRestoreSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const RestoreCommentsModal: React.FC<RestoreCommentsModalProps> = ({
  isOpen,
  deletedCommentsList,
  restoringDeletedId,
  journals,
  showManualRestoreForm,
  restoreSelectedJournalId,
  restoreCommentText,
  restoreCommentAuthor,
  restoreCommentLoading,
  onClose,
  onShowManualRestoreFormChange,
  onRestoreDeletedComment,
  onPermanentDeleteRecord,
  onSelectedJournalChange,
  onCommentTextChange,
  onCommentAuthorChange,
  onManualRestoreSubmit,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onShowManualRestoreFormChange(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="app-modal-backdrop" onClick={handleClose} aria-label="Đóng" />
      <div className="app-sheet relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] sm:max-h-[90vh] sm:rounded-[24px]">
        {/* Modal Header */}
        <div className="app-sheet-header shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Thùng Rác & Khôi Phục Bình Luận
              </h3>
              <p className="text-[11px] text-slate-500">
                Khôi phục lại những bình luận bạn hoặc đối phương đã từng xóa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="app-icon-button h-9 w-9"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {!showManualRestoreForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>
                  Bình luận đã xóa trong thùng rác ({deletedCommentsList.length}):
                </span>

                <button
                  type="button"
                  onClick={() => onShowManualRestoreFormChange(true)}
                  className="text-purple-600 hover:text-purple-700 text-[11px] font-bold cursor-pointer"
                >
                  + Nhập tay nếu cần
                </button>
              </div>

              {deletedCommentsList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs space-y-2.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Archive className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                  <p className="font-medium text-slate-600">
                    Thùng rác hiện đang trống
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Khi bạn xóa bất kỳ bình luận nào, bình luận đó sẽ được tự
                    động lưu vào đây để có thể khôi phục lại bất kỳ lúc nào.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {deletedCommentsList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-amber-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-amber-200 overflow-hidden">
                          {item.authorAvatar ? (
                            <img
                              src={item.authorAvatar}
                              alt={item.authorName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {item.authorName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs">
                              {item.authorName}
                            </span>

                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {item.journalTitle || 'Kỷ niệm'}
                            </span>

                            {item.deletedAt && (
                              <span className="text-[10px] text-slate-400">
                                Đã xóa: {formatDateShortVN(item.deletedAt)}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 mt-1 leading-relaxed break-words bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                            "{item.content}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          disabled={restoringDeletedId === item.id}
                          onClick={() => onRestoreDeletedComment(item)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Khôi phục lại vào bài viết"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 ${
                              restoringDeletedId === item.id ? 'animate-spin' : ''
                            }`}
                          />
                          <span>
                            {restoringDeletedId === item.id
                              ? 'Đang khôi phục...'
                              : 'Khôi phục ✨'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onPermanentDeleteRecord(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Xóa vĩnh viễn khỏi thùng rác"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={onManualRestoreSubmit} className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-700">
                  Tạo lại bình luận thủ công:
                </span>

                <button
                  type="button"
                  onClick={() => onShowManualRestoreFormChange(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  ← Quay lại Thùng rác
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chọn bài viết kỷ niệm:
                </label>

                <select
                  value={restoreSelectedJournalId}
                  onChange={(e) => onSelectedJournalChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.title || 'Kỷ niệm ngày ' + journal.date} ({journal.date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Người bình luận:
                </label>

                <div className="app-subtabs app-subtabs-equal">
                  <button
                    type="button"
                    onClick={() => onCommentAuthorChange('duong')}
                    className={`app-subtab ${restoreCommentAuthor === 'duong' ? 'app-subtab-active' : ''}`}
                  >
                    Dương
                  </button>
                  <button
                    type="button"
                    onClick={() => onCommentAuthorChange('chuc')}
                    className={`app-subtab ${restoreCommentAuthor === 'chuc' ? 'app-subtab-active' : ''}`}
                  >
                    Chúc
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nội dung bình luận:
                </label>

                <textarea
                  rows={3}
                  value={restoreCommentText}
                  onChange={(e) => onCommentTextChange(e.target.value)}
                  placeholder="Nhập nội dung bình luận..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onShowManualRestoreFormChange(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={restoreCommentLoading || !restoreCommentText.trim()}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {restoreCommentLoading ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <span>Thêm vào bài viết ✨</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="app-sheet-footer justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {deletedCommentsList.length} bình luận đã lưu trữ
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="app-button app-button-secondary min-h-10 px-4"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
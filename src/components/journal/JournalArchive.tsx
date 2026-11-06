import React from 'react';
import { BookOpen, ChevronRight, Images, MapPin } from 'lucide-react';
import type { JournalEntry } from '../../types';
import { isVideoUrl } from '../../utils/mediaHelper';

export function JournalArchive({ journals, selectedMonth, onChooseMonth, onShowAll, showingAll }: {
  journals: JournalEntry[];
  selectedMonth: string | null;
  onChooseMonth: (month: string) => void;
  onShowAll: () => void;
  showingAll: boolean;
}) {
  const summary = React.useMemo(() => {
    const months = new Map<string, number>();
    const places = new Set<string>();
    let photos = 0;
    for (const journal of journals) {
      const month = journal.date?.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month || '')) months.set(month, (months.get(month) || 0) + 1);
      const media = journal.images?.length ? journal.images : journal.imageUrl ? [journal.imageUrl] : [];
      photos += media.filter(url => !isVideoUrl(url)).length;
      const place = journal.location?.trim().toLocaleLowerCase('vi-VN');
      if (place) places.add(place);
    }
    return { months: [...months].sort(([a], [b]) => b.localeCompare(a)), photos, places: places.size };
  }, [journals]);
  return <aside className="journal-archive" aria-label="Mục lục nhật ký">
    <section className="journal-archive-section"><h2>Đã lưu cùng nhau</h2><dl className="journal-overview">
      <div><dt><BookOpen size={16} />Bài viết</dt><dd>{journals.length.toLocaleString('vi-VN')}</dd></div>
      <div><dt><Images size={16} />Ảnh</dt><dd>{summary.photos.toLocaleString('vi-VN')}</dd></div>
      <div><dt><MapPin size={16} />Địa điểm</dt><dd>{summary.places.toLocaleString('vi-VN')}</dd></div>
    </dl></section>
    <section className="journal-archive-section"><h2>Xem lại theo tháng</h2><nav aria-label="Tháng có nhật ký">
      <button type="button" className={showingAll ? 'is-selected' : ''} onClick={onShowAll} aria-current={showingAll ? 'true' : undefined}><span>Tất cả bài viết</span><span>{journals.length}</span></button>
      {summary.months.map(([month, count]) => <button type="button" key={month} className={selectedMonth === month ? 'is-selected' : ''} aria-current={selectedMonth === month ? 'true' : undefined} onClick={() => onChooseMonth(month)}><span>Tháng {Number(month.slice(5))}, {month.slice(0, 4)}</span><span>{count}<ChevronRight size={14} /></span></button>)}
      {!summary.months.length && <p className="journal-archive-note">Các tháng sẽ hiện ở đây khi mình có bài viết đầu tiên.</p>}
    </nav></section>
  </aside>;
}

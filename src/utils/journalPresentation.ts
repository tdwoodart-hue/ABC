import type { JournalEntry } from '../types';

export function journalDayKey(journal: Pick<JournalEntry, 'date' | 'createdAt'>): string {
  const key = journal.date?.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return key;
  const parsed = new Date(journal.createdAt);
  if (!Number.isFinite(parsed.getTime())) return 'unknown';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

/** Preserve the parent's selected sort order and the original post order within each day. */
export function groupJournalDays(journals: JournalEntry[]) {
  const groups = new Map<string, JournalEntry[]>();
  for (const journal of journals) {
    const key = journalDayKey(journal);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(journal);
  }
  return [...groups].map(([dateKey, items]) => ({ dateKey, items }));
}

/** Cover first; original indices still address the same media in the lightbox and comments. */
export function journalMediaOrder(mediaList: string[], mainImageIndex = 0) {
  const items = mediaList.map((url, index) => ({ url, index }));
  const cover = Number.isInteger(mainImageIndex) && mainImageIndex >= 0 && mainImageIndex < items.length ? mainImageIndex : 0;
  return items.length ? [items[cover], ...items.filter(item => item.index !== cover)] : [];
}

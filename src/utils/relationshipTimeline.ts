const DAY_MS = 86_400_000;

/** Calendar days rather than elapsed hours, so DST and UTC midnight don't shift the count. */
export function getRelationshipTimeline(date: string | undefined, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = Math.round((today - start.getTime()) / DAY_MS);
  if (elapsed < 0) return { days: 0, untilStart: -elapsed, nextMilestone: 100, remaining: 100, progress: 0 };
  const days = elapsed + 1;
  const nextMilestone = Math.ceil(days / 100) * 100;
  return { days, untilStart: 0, nextMilestone, remaining: nextMilestone - days, progress: ((days - 1) % 100 + 1) / 100 };
}

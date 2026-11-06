import assert from 'node:assert/strict';
import test from 'node:test';
import { getRelationshipTimeline } from '../src/utils/relationshipTimeline.ts';

test('relationship count starts at one on the chosen local calendar day', () => {
  assert.equal(getRelationshipTimeline('2026-11-06', new Date(2026, 10, 6, 23, 59)).days, 1);
});
test('missing and impossible dates invite setup instead of inventing a count', () => {
  for (const date of [undefined, '', 'wrong', '2026-02-30', '2026-13-01']) assert.equal(getRelationshipTimeline(date), null);
});
test('a future start is a countdown, never elapsed days', () => {
  const result = getRelationshipTimeline('2026-11-08', new Date(2026, 10, 6, 1));
  assert.equal(result.days, 0);
  assert.equal(result.untilStart, 2);
});
test('calendar-day counting handles leap days and ignores the hour', () => {
  assert.equal(getRelationshipTimeline('2024-02-28', new Date(2024, 2, 1, 0)).days, 3);
  assert.equal(getRelationshipTimeline('2026-03-07', new Date(2026, 2, 9, 0)).days, 3);
  assert.equal(getRelationshipTimeline('2026-03-07', new Date(2026, 2, 9, 23)).days, 3);
});
test('a milestone celebrates today and moves forward on the next day', () => {
  const milestone = getRelationshipTimeline('2026-01-01', new Date(2026, 3, 10));
  assert.equal(milestone.days, 100); assert.equal(milestone.remaining, 0); assert.equal(milestone.progress, 1);
  const next = getRelationshipTimeline('2026-01-01', new Date(2026, 3, 11));
  assert.equal(next.nextMilestone, 200); assert.equal(next.remaining, 99); assert.equal(next.progress, .01);
});

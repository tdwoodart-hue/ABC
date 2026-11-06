import assert from 'node:assert/strict';
import test from 'node:test';
import { journalDayKey, groupJournalDays, journalMediaOrder } from '../src/utils/journalPresentation.ts';

const post = (id, date) => ({id,date,title:id,authorName:'Test',authorUid:'test',createdAt:''});
test('grouping keeps the chosen feed sort and post order, even when same-day items are separated', () => {
  const items=[post('a','2026-11-06'),post('b','2026-10-18'),post('c','2026-11-06')];
  assert.deepEqual(groupJournalDays(items).map(group=>[group.dateKey,group.items.map(item=>item.id)]),[['2026-11-06',['a','c']],['2026-10-18',['b']]]);
  assert.deepEqual(groupJournalDays([...items].reverse()).map(group=>group.items.map(item=>item.id)),[['c','a'],['b']]);
});
test('cover-first media keeps original indices for lightbox navigation and photo comments', () => {
  const media=['first.jpg','cover.mp4','third.jpg'];
  assert.deepEqual(journalMediaOrder(media,1),[{url:'cover.mp4',index:1},{url:'first.jpg',index:0},{url:'third.jpg',index:2}]);
  assert.deepEqual(media,['first.jpg','cover.mp4','third.jpg']);
});
test('invalid covers, empty galleries and duplicate URLs retain a valid stable order', () => {
  for(const index of [-1,99,NaN,1.5]) assert.deepEqual(journalMediaOrder(['a','b'],index).map(item=>item.index),[0,1]);
  assert.deepEqual(journalMediaOrder([],8),[]);
  assert.deepEqual(journalMediaOrder(['same','same'],1).map(item=>item.index),[1,0]);
});
test('missing dates fall back to local creation date, otherwise an explicit unknown group', () => {
  assert.equal(journalDayKey({...post('a',''),createdAt:'2026-11-06T12:00:00'}),'2026-11-06');
  assert.equal(journalDayKey(post('a','')), 'unknown');
  assert.deepEqual(groupJournalDays([]),[]);
});

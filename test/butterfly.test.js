import test from 'node:test';
import assert from 'node:assert/strict';
import { butterflyRows, rowOf } from '../web/lib/study/butterfly.js';

test('a hand sits in the row of what its own cards make', () => {
  const board = 'Ks 9d 4s 7h';
  assert.equal(rowOf('9h9c', board), 7); assert.equal(rowOf('Kh9h', board), 6); assert.equal(rowOf('AhAd', board), 5);
  assert.equal(rowOf('KhQd', board), 4); assert.equal(rowOf('Jh9h', board), 3); assert.equal(rowOf('TdTc', board), 3);
  assert.equal(rowOf('Ah4h', board), 2); assert.equal(rowOf('3d3c', board), 2);
  assert.equal(rowOf('QsJs', board), 1); assert.equal(rowOf('6h5h', board), 1); assert.equal(rowOf('AhQd', board), 0);
});
test('a straight or flush made with the hand is the top row, and there are no draws on the river', () => {
  assert.equal(rowOf('8h6h', 'Ks 9d 4s 7h 5c'), 7); assert.equal(rowOf('As2s', 'Ks 9d 4s 7h 3s'), 7);
  assert.equal(rowOf('QsJs', 'Ks 9d 4s 7h 2c'), 0);
});
test('the rows run strongest first with bars scaled to the widest', () => {
  const hands = { hero: [{ name: 'KhQd', w: 1 }, { name: 'AhQd', w: 3 }], villain: [{ name: 'Jh9h', w: 2 }, { name: 'AcJc', w: 2 }] };
  const rows = butterflyRows(hands, 'Ks 9d 4s 7h');
  assert.deepEqual(rows.map((r) => r.code), ['TP', 'MP', 'Air']);
  assert.equal(rows[2].mine, 100); assert.equal(Math.round(rows[0].mine), 33); assert.equal(Math.round(rows[1].his), 67);
});

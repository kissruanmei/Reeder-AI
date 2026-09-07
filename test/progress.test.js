import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgressPercent } from '../src/services/progress.js';

test('a newly opened multi-chapter book starts at zero percent', () => {
  assert.equal(calculateProgressPercent(0, 16), 0);
});

test('the final chapter reaches one hundred percent', () => {
  assert.equal(calculateProgressPercent(15, 16), 100);
});

test('progress is proportional between the first and last chapter', () => {
  assert.equal(calculateProgressPercent(5, 11), 50);
});

test('invalid and single-chapter books have a safe zero progress', () => {
  assert.equal(calculateProgressPercent(0, 1), 0);
  assert.equal(calculateProgressPercent(Number.NaN, 0), 0);
});

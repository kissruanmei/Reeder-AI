import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAudioTime, getAdjacentTrackIndex, parseTrackName, PLAY_MODES } from '../src/services/musicUtils.js';

test('audio time is formatted safely', () => {
  assert.equal(formatAudioTime(0), '0:00');
  assert.equal(formatAudioTime(65.8), '1:05');
  assert.equal(formatAudioTime(Number.NaN), '0:00');
});

test('track names use artist-title convention when metadata is absent', () => {
  assert.deepEqual(parseTrackName('Lofi Haven - Midnight Thoughts.mp3'), {
    artist: 'Lofi Haven',
    title: 'Midnight Thoughts'
  });
  assert.deepEqual(parseTrackName('quiet-night.flac'), {
    artist: '未知艺术家',
    title: 'quiet-night'
  });
});

test('playlist navigation wraps and shuffle avoids the current track', () => {
  assert.equal(getAdjacentTrackIndex(0, 3, -1, PLAY_MODES.LIST), 2);
  assert.equal(getAdjacentTrackIndex(2, 3, 1, PLAY_MODES.LIST), 0);
  assert.equal(getAdjacentTrackIndex(1, 3, 1, PLAY_MODES.SHUFFLE, 0), 2);
  assert.notEqual(getAdjacentTrackIndex(1, 3, 1, PLAY_MODES.SHUFFLE, 0.9), 1);
});

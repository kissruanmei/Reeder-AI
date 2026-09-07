export const PLAY_MODES = {
  LIST: 'list',
  REPEAT_ONE: 'repeat-one',
  SHUFFLE: 'shuffle'
};

export function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function parseTrackName(fileName = '') {
  const name = fileName.replace(/\.[^.]+$/, '').trim() || '未命名音乐';
  const separator = name.indexOf(' - ');
  if (separator <= 0) return { title: name, artist: '未知艺术家' };
  return {
    artist: name.slice(0, separator).trim() || '未知艺术家',
    title: name.slice(separator + 3).trim() || name
  };
}

export function getAdjacentTrackIndex(currentIndex, length, direction, mode, randomValue = Math.random()) {
  if (length <= 0) return -1;
  if (mode === PLAY_MODES.SHUFFLE && length > 1) {
    const offset = 1 + Math.floor(randomValue * (length - 1));
    return (Math.max(0, currentIndex) + offset) % length;
  }
  const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
  return (safeCurrent + direction + length) % length;
}

export function getFrequencyEnergy(data, analyser, minHz, maxHz) {
  if (!data?.length || !analyser?.context) return 0;
  const nyquist = analyser.context.sampleRate / 2;
  const first = Math.max(0, Math.floor((minHz / nyquist) * data.length));
  const last = Math.min(data.length - 1, Math.ceil((maxHz / nyquist) * data.length));
  let total = 0;
  let count = 0;
  for (let index = first; index <= last; index += 1) {
    total += data[index];
    count += 1;
  }
  return count ? total / count / 255 : 0;
}

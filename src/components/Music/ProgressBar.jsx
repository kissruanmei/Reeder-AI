import React from 'react';
import { formatAudioTime } from '../../services/musicUtils';

export function ProgressBar({ currentTime, duration, onSeek }) {
  return (
    <div className="music-progress-wrap">
      <input
        className="music-progress"
        type="range"
        min="0"
        max={Math.max(duration || 0, 1)}
        step="0.1"
        value={Math.min(currentTime || 0, duration || 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="音乐播放进度"
        style={{ '--music-progress': `${duration ? (currentTime / duration) * 100 : 0}%` }}
      />
      <div className="music-time-row">
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(duration)}</span>
      </div>
    </div>
  );
}

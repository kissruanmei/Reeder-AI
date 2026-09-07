import React from 'react';
import { Music2, Pause, Play } from 'lucide-react';

const DEFAULT_COVER = './music-default-cover.png';

export function MiniPlayer({ track, isPlaying, onTogglePlay, onExpand }) {
  return (
    <div className="music-mini-content">
      <button className="music-mini-cover" onClick={onExpand} title="展开音乐播放器" aria-label="展开音乐播放器">
        {track ? <img src={track.cover || DEFAULT_COVER} alt="" /> : <Music2 size={21} />}
      </button>
      <button className="music-mini-play" onClick={onTogglePlay} disabled={!track} title={isPlaying ? '暂停' : '播放'} aria-label={isPlaying ? '暂停' : '播放'}>
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
    </div>
  );
}

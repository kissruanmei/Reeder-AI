import React from 'react';
import { ListMusic, Pause, Play, Repeat2, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { PLAY_MODES } from '../../services/musicUtils';

export function PlayerControls({
  isPlaying,
  hasTracks,
  volume,
  playMode,
  playlistOpen,
  onTogglePlay,
  onPrevious,
  onNext,
  onVolumeChange,
  onCycleMode,
  onTogglePlaylist
}) {
  const ModeIcon = playMode === PLAY_MODES.SHUFFLE ? Shuffle : playMode === PLAY_MODES.REPEAT_ONE ? Repeat1 : Repeat2;
  const modeLabel = playMode === PLAY_MODES.SHUFFLE ? '随机播放' : playMode === PLAY_MODES.REPEAT_ONE ? '单曲循环' : '列表循环';
  return (
    <div className="music-controls">
      <button className="music-control subtle" onClick={onCycleMode} title={modeLabel} aria-label={modeLabel}>
        <ModeIcon size={15} />
      </button>
      <button className="music-control" onClick={onPrevious} disabled={!hasTracks} title="上一首" aria-label="上一首">
        <SkipBack size={17} fill="currentColor" />
      </button>
      <button className="music-play-button" onClick={onTogglePlay} disabled={!hasTracks} title={isPlaying ? '暂停' : '播放'} aria-label={isPlaying ? '暂停' : '播放'}>
        {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
      </button>
      <button className="music-control" onClick={onNext} disabled={!hasTracks} title="下一首" aria-label="下一首">
        <SkipForward size={17} fill="currentColor" />
      </button>
      <label className="music-volume" title={`音量 ${Math.round(volume * 100)}%`}>
        {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => onVolumeChange(Number(event.target.value))} aria-label="音量" />
      </label>
      <button className={`music-control subtle ${playlistOpen ? 'active' : ''}`} onClick={onTogglePlaylist} title="播放列表" aria-label="播放列表">
        <ListMusic size={16} />
      </button>
    </div>
  );
}

import React from 'react';
import { Music2, Trash2 } from 'lucide-react';
import { formatAudioTime } from '../../services/musicUtils';

const DEFAULT_COVER = './music-default-cover.png';

export function PlaylistPanel({ tracks, currentTrackId, onSelect, onRemove }) {
  return (
    <div className="music-playlist-panel" role="dialog" aria-label="本地播放列表">
      <div className="music-playlist-heading">
        <strong>伴读音乐</strong>
        <span>{tracks.length} 首</span>
      </div>
      {tracks.length ? (
        <div className="music-playlist-scroll">
          {tracks.map((track) => (
            <div className={`music-track-row ${track.id === currentTrackId ? 'active' : ''}`} key={track.id}>
              <button className="music-track-main" onClick={() => onSelect(track.id, true)}>
                <img src={track.cover || DEFAULT_COVER} alt="" />
                <span className="music-track-copy">
                  <strong>{track.title}</strong>
                  <small>{track.artist || '未知艺术家'}</small>
                </span>
                <time>{formatAudioTime(track.duration)}</time>
              </button>
              <button className="music-track-remove" onClick={() => onRemove(track.id)} title={`移除 ${track.title}`} aria-label={`移除 ${track.title}`}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="music-playlist-empty"><Music2 size={20} /><span>导入音乐后会显示在这里</span></div>
      )}
    </div>
  );
}

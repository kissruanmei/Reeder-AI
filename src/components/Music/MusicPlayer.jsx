import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderPlus, GripHorizontal, Radio, Sparkles } from 'lucide-react';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { SystemMediaBridge } from '../../services/systemMediaBridge';
import { AudioVisualizer } from './AudioVisualizer';
import { MiniPlayer } from './MiniPlayer';
import { PlayerControls } from './PlayerControls';
import { PlaylistPanel } from './PlaylistPanel';
import { ProgressBar } from './ProgressBar';

const POSITION_KEY = 'reeder_music_position';
const COLLAPSED_KEY = 'reeder_music_collapsed';
const DEFAULT_COVER = './music-default-cover.png';
const EDGE_GAP = 16;

function readSavedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) return saved;
  } catch {}
  return null;
}

function defaultPosition() {
  return { x: Math.max(EDGE_GAP, window.innerWidth - 370), y: 82 };
}

function clampPosition(position, element) {
  const width = element?.offsetWidth || 338;
  const height = element?.offsetHeight || 196;
  return {
    x: Math.min(Math.max(EDGE_GAP, position.x), Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP)),
    y: Math.min(Math.max(70, position.y), Math.max(70, window.innerHeight - height - EDGE_GAP))
  };
}

export function MusicPlayer() {
  const player = useMusicPlayer();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const positionRef = useRef(null);
  const noticeTimerRef = useRef(0);
  const [position, setPosition] = useState(() => readSavedPosition() || defaultPosition());
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [systemNotice, setSystemNotice] = useState('');

  positionRef.current = position;

  useEffect(() => {
    const handleResize = () => setPosition((current) => clampPosition(current, rootRef.current));
    const handleEscape = (event) => {
      if (event.key === 'Escape') setPlaylistOpen(false);
    };
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setPlaylistOpen(false);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('pointerdown', handleOutside);
      document.body.classList.remove('music-player-dragging');
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPosition((current) => clampPosition(current, rootRef.current)));
    return () => cancelAnimationFrame(frame);
  }, [isCollapsed, playlistOpen]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
    if (isCollapsed) setPlaylistOpen(false);
  }, [isCollapsed]);

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button, input')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add('music-player-dragging');
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPosition({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY
    }, rootRef.current);
    positionRef.current = next;
    setPosition(next);
  };

  const finishDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    document.body.classList.remove('music-player-dragging');
    const finalPosition = clampPosition(positionRef.current || position, rootRef.current);
    positionRef.current = finalPosition;
    setPosition(finalPosition);
    localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition));
  };

  const syncSystemMedia = async () => {
    const result = await SystemMediaBridge.connect();
    setSystemNotice(result.reason || '暂时无法连接系统媒体。');
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSystemNotice(''), 4200);
  };

  if (isCollapsed) {
    return (
      <div
        ref={rootRef}
        className="music-player-shell compact"
        style={{ left: position.x, top: position.y }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <AudioVisualizer analyser={player.analyser} isPlaying={player.isPlaying} compact />
        <MiniPlayer track={player.currentTrack} isPlaying={player.isPlaying} onTogglePlay={player.togglePlay} onExpand={() => setIsCollapsed(false)} />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="music-player-shell" style={{ left: position.x, top: position.y }}>
      <AudioVisualizer analyser={player.analyser} isPlaying={player.isPlaying} />
      <section className={`music-player-card ${player.isPlaying ? 'is-playing' : ''}`} aria-label="伴读音乐播放器">
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".mp3,.wav,.m4a,.flac,.ogg,audio/mpeg,audio/wav,audio/x-m4a,audio/flac,audio/ogg"
          onChange={(event) => {
            if (event.target.files?.length) player.importTracks(event.target.files);
            event.target.value = '';
          }}
        />

        <div
          className="music-player-drag-handle"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          title="拖动播放器"
        >
          <span><GripHorizontal size={15} /> 伴读声场</span>
          <button onClick={() => setIsCollapsed(true)} title="折叠播放器" aria-label="折叠播放器"><ChevronDown size={16} /></button>
        </div>

        <div className="music-now-playing">
          <img src={player.currentTrack?.cover || DEFAULT_COVER} alt="" />
          <div className="music-now-copy">
            <span className="music-source-label"><Sparkles size={11} /> {player.audioSourceType === 'local' ? 'LOCAL MUSIC' : 'SYSTEM MEDIA'}</span>
            <strong title={player.currentTrack?.title}>{player.currentTrack?.title || '给阅读加一点声音'}</strong>
            <small title={player.currentTrack?.artist}>{player.currentTrack?.artist || '导入本地音乐开始播放'}</small>
          </div>
          <button className="music-import-icon" onClick={() => inputRef.current?.click()} title="导入音乐" aria-label="导入音乐"><FolderPlus size={17} /></button>
        </div>

        <ProgressBar currentTime={player.currentTime} duration={player.duration} onSeek={player.seek} />
        <PlayerControls
          isPlaying={player.isPlaying}
          hasTracks={player.playlist.length > 0}
          volume={player.volume}
          playMode={player.playMode}
          playlistOpen={playlistOpen}
          onTogglePlay={player.togglePlay}
          onPrevious={player.previous}
          onNext={player.next}
          onVolumeChange={player.setVolume}
          onCycleMode={player.cyclePlayMode}
          onTogglePlaylist={() => setPlaylistOpen((open) => !open)}
        />

        <div className="music-player-actions">
          <button onClick={() => inputRef.current?.click()} disabled={player.isImporting}><FolderPlus size={14} /> {player.isImporting ? '正在导入…' : '导入音乐'}</button>
          <button onClick={syncSystemMedia} className="system-media-button" title="Windows 系统媒体同步需要原生 GSMTC 桥接"><Radio size={14} /> 同步系统媒体</button>
        </div>

        {(player.error || systemNotice) && <div className="music-player-notice" role="status">{player.error || systemNotice}</div>}
        {playlistOpen && (
          <PlaylistPanel tracks={player.playlist} currentTrackId={player.currentTrackId} onSelect={player.selectTrack} onRemove={player.removeTrack} />
        )}
      </section>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Disc3, Library, ListMusic, Minus, Move, Pause, Play, Settings2, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Artwork, formatTime, IconButton, musicOpacity, TrackList } from './musicControls';

const margin = 8;
const clamp = value => Math.max(0, Math.min(1, value));

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function Range({ value, min = 0, max = 100, className = '', ...props }) {
  return <input type="range" className={`music-range ${className}`} min={min} max={max} value={value}
    style={{ '--range-fill': `${max > min ? (value - min) / (max - min) * 100 : 0}%` }} {...props} />;
}

export function MusicWindow({ queue, playing, loading, elapsed, duration, preview, failure, settings,
  onSettings, onClose, onBrowse, onPlay, onToggle, onSeek }) {
  const [size, setSize] = useState(viewport);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState('queue');
  const drag = useRef(null);
  const closeButton = useRef(null);
  const track = queue.tracks[queue.index];
  const width = Math.min(Math.round(size.width * 0.9), size.width - margin * 2);
  const height = Math.min(Math.round(size.height * 0.9), size.height - margin * 2);
  const freeX = Math.max(0, size.width - width - margin * 2);
  const freeY = Math.max(0, size.height - height - margin * 2);
  const position = draft || settings.position;
  const left = margin + freeX * position.x;
  const top = margin + freeY * position.y;

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    const resize = () => setSize(viewport());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button:not(.music-drag-handle)')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, offsetX: event.clientX - left, offsetY: event.clientY - top, position: null };
  }

  function moveDrag(event) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    active.position = {
      x: freeX ? clamp((event.clientX - active.offsetX - margin) / freeX) : position.x,
      y: freeY ? clamp((event.clientY - active.offsetY - margin) / freeY) : position.y,
    };
    setDraft(active.position);
  }

  function finishDrag(event) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    drag.current = null;
    if (active.position) onSettings({ position: active.position });
    setDraft(null);
  }

  function moveWithKeys(event) {
    const movement = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[event.key];
    if (!movement) return;
    event.preventDefault();
    onSettings({ position: {
      x: freeX ? clamp(position.x + movement[0] / freeX) : position.x,
      y: freeY ? clamp(position.y + movement[1] / freeY) : position.y,
    } });
  }

  return (
    <section className="music-surface music-window" role="dialog" aria-labelledby="music-window-title" id="reeder-music-window"
      style={{ left, top, width, height, '--music-opacity': settings.opacity / 100 }}>
      <header className="music-window-header" onPointerDown={startDrag} onPointerMove={moveDrag}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
        <IconButton label="移动浮窗（方向键）" icon={Move} className="music-drag-handle" onKeyDown={moveWithKeys} />
        <h2 id="music-window-title">阅读音乐</h2>
        <IconButton label="收起播放器" icon={Minus} buttonRef={closeButton} onClick={onClose} />
      </header>
      <div className="music-window-body">
        <nav className="music-window-nav" aria-label="播放器导航">
          <button type="button" aria-pressed={tab === 'queue'} onClick={() => setTab('queue')}><ListMusic size={17} aria-hidden="true" /><span>播放队列</span></button>
          <button type="button" onClick={onBrowse}><Library size={17} aria-hidden="true" /><span>我的歌单</span></button>
          <button type="button" aria-pressed={tab === 'appearance'} onClick={() => setTab('appearance')}><Settings2 size={17} aria-hidden="true" /><span>外观</span></button>
          <div className="music-window-source"><Disc3 size={16} aria-hidden="true" /> 网易云音乐</div>
        </nav>
        <div className="music-window-main">
          <div className="music-window-content" key={tab}>
            {tab === 'appearance' ? (
              <section className="music-appearance" aria-labelledby="music-appearance-title">
                <h3 id="music-appearance-title">外观</h3>
                <label className="music-opacity-setting">
                  <span>浮窗不透明度 <output>{settings.opacity}%</output></span>
                  <Range {...musicOpacity} value={settings.opacity} onChange={event => onSettings({ opacity: Number(event.target.value) })} />
                </label>
                <fieldset>
                  <legend>流体云停靠</legend>
                  {['left', 'right'].map(side => <button key={side} type="button" aria-pressed={side === settings.side} onClick={() => onSettings({ side })}>{side === 'left' ? '左侧' : '右侧'}</button>)}
                </fieldset>
              </section>
            ) : (
              <>
                <div className="music-now-playing">
                  <Artwork src={track.cover} className="music-featured-artwork" />
                  <div>
                    <h3 title={track.title}>{track.title}</h3>
                    <p>{[track.artist, track.album].filter(Boolean).join(' · ') || '未知歌手'}</p>
                    {preview && <span className="music-preview">网易云试听</span>}
                  </div>
                </div>
                <div className="music-queue-heading"><h4 title={queue.playlist.title}>{queue.playlist.title}</h4><span>{queue.tracks.length} 首</span></div>
                <TrackList tracks={queue.tracks} selected={queue.index} onPlay={onPlay} />
              </>
            )}
          </div>
          {failure && <div className="music-playback-error" role="alert">
            <span>{failure.message}</span>
            {failure.code === 'login' && <button type="button" className="music-quiet-button" onClick={onBrowse}>重新登录</button>}
          </div>}
          <footer className="music-transport">
            <div className="music-transport-track"><Artwork src={track.cover} /><span><strong>{track.title}</strong><small>{track.artist || '未知歌手'}</small></span></div>
            <div className="music-transport-center">
              <div className="music-transport-buttons">
                <IconButton label="上一首" icon={SkipBack} onClick={() => onPlay(queue.index - 1)} disabled={queue.index === 0} />
                <IconButton label={playing ? '暂停' : '播放'} icon={playing ? Pause : Play} className="music-play-button" onClick={onToggle} disabled={loading} />
                <IconButton label="下一首" icon={SkipForward} onClick={() => onPlay(queue.index + 1)} disabled={queue.index === queue.tracks.length - 1} />
              </div>
              <div className="music-progress">
                <span>{formatTime(elapsed)}</span>
                <Range value={Math.min(elapsed, duration)} max={duration} step="0.1" aria-label="播放进度" disabled={!duration} onChange={event => onSeek(Number(event.target.value))} />
                <span>{formatTime(duration || track.duration)}</span>
              </div>
            </div>
            <label className="music-volume">
              {settings.volume > 0 ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
              <Range value={settings.volume} aria-label="音量" onChange={event => onSettings({ volume: Number(event.target.value) })} />
            </label>
          </footer>
        </div>
      </div>
    </section>
  );
}

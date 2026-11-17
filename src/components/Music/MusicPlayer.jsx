import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MusicLibrary } from './MusicLibrary';
import { MusicWindow } from './MusicWindow';
import { Artwork, musicOpacity, musicRequest } from './musicControls';
import './music.css';

const defaults = { side: 'right', opacity: 74, volume: 65, position: { x: 0.5, y: 0.5 } };

function readSettings() {
  const numeric = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  try {
    const saved = JSON.parse(localStorage.getItem('reeder_music_settings') || '{}');
    return {
      side: saved.side === 'left' ? 'left' : defaults.side,
      opacity: numeric(saved.opacity, defaults.opacity, musicOpacity.min, musicOpacity.max),
      volume: numeric(saved.volume, defaults.volume, 0, 100),
      position: {
        x: numeric(saved.position?.x, defaults.position.x, 0, 1),
        y: numeric(saved.position?.y, defaults.position.y, 0, 1),
      },
    };
  } catch {
    return defaults;
  }
}

export function MusicPlayer({ pickerOpen, onOpenPicker, onClosePicker, isHome }) {
  const [settings, setSettings] = useState(readSettings);
  const [queue, setQueue] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState(false);
  const [failure, setFailure] = useState(null);
  const audio = useRef(null);
  const cloud = useRef(null);
  const request = useRef(0);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const track = queue?.tracks[queue.index];

  useEffect(() => {
    localStorage.setItem('reeder_music_settings', JSON.stringify(settings));
    audio.current.volume = settings.volume / 100;
  }, [settings]);

  useEffect(() => {
    if (pickerOpen || isHome) setExpanded(false);
  }, [pickerOpen, isHome]);

  useEffect(() => {
    if (!pickerOpen && !expanded) return;
    const escape = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (pickerOpen) onClosePicker();
      else closePlayer();
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [pickerOpen, expanded, onClosePicker]);

  function resetAudio() {
    const media = audio.current;
    media.pause();
    media.removeAttribute('src');
    media.load();
    setPlaying(false);
    setElapsed(0);
    setDuration(0);
    setPreview(false);
  }

  async function start(next) {
    if (!next.tracks[next.index]) return;
    const version = ++request.current;
    const media = audio.current;
    resetAudio();
    setQueue(next);
    setFailure(null);
    setLoading(true);
    try {
      const stream = await musicRequest('stream', next.tracks[next.index].id);
      if (version !== request.current) return;
      setPreview(stream.preview);
      media.src = stream.url;
      await media.play();
    } catch (error) {
      if (version !== request.current) return;
      if (typeof error.code === 'string') setFailure(error);
      else setFailure({ message: error.name === 'NotAllowedError' ? '请点击播放，继续收听。' : '无法加载这首歌，请重试或切换曲目。' });
    } finally {
      if (version === request.current) setLoading(false);
    }
  }

  function select(playlist, tracks, index) {
    onClosePicker();
    setExpanded(false);
    start({ playlist, tracks, index });
    requestAnimationFrame(() => cloud.current?.focus({ preventScroll: true }));
  }

  function closePlayer() {
    setExpanded(false);
    requestAnimationFrame(() => cloud.current?.focus({ preventScroll: true }));
  }

  function logout() {
    request.current++;
    resetAudio();
    setQueue(null);
    setFailure(null);
    setLoading(false);
    setExpanded(false);
  }

  const startRef = useRef(null);
  startRef.current = start;

  const playAt = useCallback((index) => {
    const currentQueue = queueRef.current;
    if (currentQueue) startRef.current({ ...currentQueue, index });
  }, []);

  async function toggle() {
    const media = audio.current;
    if (!media.paused) {
      media.pause();
    } else if (!media.hasAttribute('src') || media.error) {
      playAt(queue.index);
    } else {
      const version = request.current;
      try {
        if (media.ended) media.currentTime = 0;
        await media.play();
        if (version === request.current) setFailure(null);
      } catch (error) {
        if (version === request.current && error.name !== 'AbortError') setFailure({ message: '播放失败，请重试或切换曲目。' });
      }
    }
  }

  function updateDuration(event) {
    const value = event.currentTarget.duration;
    setDuration(Number.isFinite(value) ? value : 0);
  }

  function seek(value) {
    if (!duration) return;
    audio.current.currentTime = value;
    setElapsed(value);
  }

  return (
    <>
      <audio ref={audio} preload="none" onPlay={() => setPlaying(!audio.current.paused)} onPause={() => setPlaying(!audio.current.paused)}
        onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)} onDurationChange={updateDuration} onLoadedMetadata={updateDuration}
        onEnded={event => {
          if (event.currentTarget.ended && queue) {
            setPlaying(false);
            playAt(queue.index + 1);
          }
        }}
        onError={event => {
          if (event.currentTarget.hasAttribute('src') && event.currentTarget.error) {
            setPlaying(false);
            setFailure({ message: '无法加载这首歌，请重试或切换曲目。' });
          }
        }} />
      {track && !expanded && !pickerOpen && (
        <button type="button" ref={cloud} className={`music-cloud music-cloud-${settings.side}`} data-playing={playing}
          aria-label={`展开音乐播放器，${track.title}`} aria-haspopup="dialog" onClick={() => setExpanded(true)}>
          <Artwork src={track.cover} />
          <span className="music-cloud-copy" aria-hidden="true"><strong>{track.title}</strong><small>{loading ? '正在连接…' : failure ? '播放失败' : playing ? track.artist || '正在播放' : '已暂停'}</small></span>
        </button>
      )}
      {track && expanded && !pickerOpen && <MusicWindow queue={queue} playing={playing} loading={loading} elapsed={elapsed} duration={duration}
        preview={preview} failure={failure} settings={settings} onSettings={change => setSettings(current => ({ ...current, ...change }))}
        onClose={closePlayer} onBrowse={onOpenPicker} onPlay={playAt} onToggle={toggle} onSeek={seek} />}
      {pickerOpen && <MusicLibrary onClose={onClosePicker} onPlay={select} onLogout={logout} />}
    </>
  );
}

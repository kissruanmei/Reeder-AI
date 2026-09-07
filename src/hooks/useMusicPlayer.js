import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractTrackMetadata } from '../services/musicMetadata';
import { MusicStorage } from '../services/musicStorage';
import { getAdjacentTrackIndex, PLAY_MODES } from '../services/musicUtils';

const LAST_TRACK_KEY = 'reeder_music_last_track';
const VOLUME_KEY = 'reeder_music_volume';

function createTrackId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `track-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useMusicPlayer() {
  const audioRef = useRef(null);
  const objectUrlRef = useRef('');
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const tracksRef = useRef([]);
  const currentTrackIdRef = useRef('');
  const playModeRef = useRef(PLAY_MODES.LIST);

  const [playlist, setPlaylist] = useState([]);
  const [currentTrackId, setCurrentTrackId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.72;
  });
  const [playMode, setPlayMode] = useState(PLAY_MODES.LIST);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  if (!audioRef.current) audioRef.current = new Audio();

  useEffect(() => { tracksRef.current = playlist; }, [playlist]);
  useEffect(() => { currentTrackIdRef.current = currentTrackId; }, [currentTrackId]);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  const currentTrack = useMemo(
    () => playlist.find((track) => track.id === currentTrackId) || null,
    [playlist, currentTrackId]
  );

  const prepareAnalyser = useCallback(async () => {
    if (!contextRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const source = context.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(context.destination);
      contextRef.current = context;
      sourceRef.current = source;
      analyserRef.current = analyser;
    }
    if (contextRef.current.state === 'suspended') await contextRef.current.resume();
    return analyserRef.current;
  }, []);

  const selectTrack = useCallback((trackId, shouldPlay = false) => {
    const track = tracksRef.current.find((item) => item.id === trackId);
    if (!track) return;
    const audio = audioRef.current;
    audio.pause();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(track.blob);
    audio.src = objectUrlRef.current;
    audio.load();
    setCurrentTrackId(trackId);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setError('');
    localStorage.setItem(LAST_TRACK_KEY, trackId);
    if (shouldPlay) {
      prepareAnalyser()
        .then(() => audio.play())
        .catch(() => setError('无法播放该音频，请确认文件格式受系统支持。'));
    }
  }, [prepareAnalyser]);

  const moveTrack = useCallback((direction, shouldPlay = true) => {
    const tracks = tracksRef.current;
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex((track) => track.id === currentTrackIdRef.current);
    const nextIndex = getAdjacentTrackIndex(currentIndex, tracks.length, direction, playModeRef.current);
    selectTrack(tracks[nextIndex].id, shouldPlay);
  }, [selectTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const markPlaying = () => setIsPlaying(true);
    const markPaused = () => setIsPlaying(false);
    const handleEnded = () => {
      if (playModeRef.current === PLAY_MODES.REPEAT_ONE) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      } else {
        moveTrack(1, true);
      }
    };
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('play', markPlaying);
    audio.addEventListener('pause', markPaused);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('play', markPlaying);
      audio.removeEventListener('pause', markPaused);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [moveTrack]);

  useEffect(() => {
    let active = true;
    MusicStorage.getTracks().then((savedTracks) => {
      if (!active) return;
      setPlaylist(savedTracks);
      tracksRef.current = savedTracks;
      const lastTrackId = localStorage.getItem(LAST_TRACK_KEY);
      const initial = savedTracks.find((track) => track.id === lastTrackId) || savedTracks[0];
      if (initial) selectTrack(initial.id, false);
    });
    return () => { active = false; };
  }, [selectTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => () => {
    const audio = audioRef.current;
    audio.pause();
    audio.removeAttribute('src');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    contextRef.current?.close().catch(() => {});
  }, []);

  const importTracks = useCallback(async (files) => {
    const accepted = [...files].filter((file) => /\.(mp3|wav|m4a|flac|ogg)$/i.test(file.name));
    if (!accepted.length) {
      setError('请选择 MP3、WAV、M4A、FLAC 或 OGG 音频文件。');
      return;
    }
    setIsImporting(true);
    setError('');
    try {
      const imported = [];
      for (const file of accepted) {
        const metadata = await extractTrackMetadata(file);
        const track = {
          id: createTrackId(),
          fileName: file.name,
          mimeType: file.type,
          blob: file,
          addedAt: Date.now() + imported.length,
          ...metadata
        };
        await MusicStorage.saveTrack(track);
        imported.push(track);
      }
      const nextPlaylist = [...tracksRef.current, ...imported];
      setPlaylist(nextPlaylist);
      tracksRef.current = nextPlaylist;
      if (!currentTrackIdRef.current && imported[0]) selectTrack(imported[0].id, false);
    } catch (importError) {
      console.error('Music import failed:', importError);
      setError('音乐导入失败，请确认文件未损坏且仍有可用存储空间。');
    } finally {
      setIsImporting(false);
    }
  }, [selectTrack]);

  const removeTrack = useCallback(async (trackId) => {
    const nextPlaylist = tracksRef.current.filter((track) => track.id !== trackId);
    await MusicStorage.removeTrack(trackId);
    setPlaylist(nextPlaylist);
    tracksRef.current = nextPlaylist;
    if (currentTrackIdRef.current === trackId) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
      setCurrentTrackId('');
      currentTrackIdRef.current = '';
      if (nextPlaylist[0]) selectTrack(nextPlaylist[0].id, false);
    }
  }, [selectTrack]);

  const togglePlay = useCallback(async () => {
    if (!currentTrackIdRef.current && tracksRef.current[0]) selectTrack(tracksRef.current[0].id, false);
    if (!tracksRef.current.length) return;
    const audio = audioRef.current;
    if (!audio.src) return;
    try {
      if (audio.paused) {
        await prepareAnalyser();
        await audio.play();
      } else {
        audio.pause();
      }
      setError('');
    } catch (playError) {
      console.error('Music playback failed:', playError);
      setError('无法播放该音频，请尝试其他格式或文件。');
    }
  }, [prepareAnalyser, selectTrack]);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!Number.isFinite(time)) return;
    audio.currentTime = Math.min(audio.duration || duration || 0, Math.max(0, time));
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const cyclePlayMode = useCallback(() => {
    setPlayMode((current) => {
      if (current === PLAY_MODES.LIST) return PLAY_MODES.REPEAT_ONE;
      if (current === PLAY_MODES.REPEAT_ONE) return PLAY_MODES.SHUFFLE;
      return PLAY_MODES.LIST;
    });
  }, []);

  return {
    playlist,
    currentTrack,
    currentTrackId,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    audioSourceType: 'local',
    analyser: analyserRef.current,
    isImporting,
    error,
    importTracks,
    removeTrack,
    selectTrack,
    togglePlay,
    previous: () => moveTrack(-1, true),
    next: () => moveTrack(1, true),
    seek,
    setVolume,
    cyclePlayMode
  };
}

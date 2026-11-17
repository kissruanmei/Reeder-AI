import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Disc3, LogOut, QrCode, X } from 'lucide-react';
import { Artwork, IconButton, musicRequest, TrackList } from './musicControls';

export function MusicLibrary({ onClose, onPlay, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [busy, setBusy] = useState('library');
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef(0);
  const activeQr = useRef(false);
  const closeButton = useRef(null);

  const loadLibrary = useCallback(async () => {
    const version = ++request.current;
    setBusy('library');
    setError('');
    try {
      const { profile } = await musicRequest('account');
      if (version !== request.current) return;
      setProfile(profile);
      if (!profile) {
        setPlaylists([]);
        return;
      }
      const result = await musicRequest('playlists');
      if (version === request.current) setPlaylists(result.playlists);
    } catch (error) {
      if (version !== request.current) return;
      if (error.code === 'login') setProfile(null);
      setError(error.message);
    } finally {
      if (version === request.current) setBusy('');
    }
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    if (window.reederMusic) loadLibrary();
    return () => {
      request.current++;
      if (activeQr.current) window.reederMusic?.cancelQr().catch(() => {});
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [loadLibrary]);

  const qrAttempt = qr?.attempt;
  useEffect(() => {
    if (qrAttempt == null) return;
    let timer;
    let canceled = false;

    async function poll() {
      try {
        const result = await musicRequest('pollQr', qrAttempt);
        if (canceled) return;
        if (result.status === 'confirmed') {
          activeQr.current = false;
          setQr(null);
          if (!result.remembered) setNotice('本次已登录，下次打开 Reeder 时需重新扫码。');
          loadLibrary();
        } else if (result.status === 'expired' || result.status === 'canceled') {
          activeQr.current = false;
          setQr({ status: 'expired' });
        } else {
          setQr(current => ({ ...current, status: result.status }));
          timer = window.setTimeout(poll, 2000);
        }
      } catch (error) {
        if (canceled) return;
        setQr(null);
        setError(error.message);
        activeQr.current = false;
        window.reederMusic?.cancelQr().catch(() => {});
      }
    }

    timer = window.setTimeout(poll, 2000);
    return () => { canceled = true; window.clearTimeout(timer); };
  }, [qrAttempt, loadLibrary]);

  async function beginLogin() {
    const version = ++request.current;
    activeQr.current = true;
    setError('');
    setQr({ status: 'loading' });
    try {
      const result = await musicRequest('createQr');
      if (version !== request.current) return;
      setQr(result.image ? { ...result, status: 'waiting' } : null);
    } catch (error) {
      if (version !== request.current) return;
      activeQr.current = false;
      setQr(null);
      setError(error.message);
    }
  }

  async function openPlaylist(next) {
    const version = ++request.current;
    setPlaylist(next);
    setTracks([]);
    setError('');
    setBusy('tracks');
    try {
      const result = await musicRequest('tracks', next.id);
      if (version === request.current) setTracks(result.tracks);
    } catch (error) {
      if (version !== request.current) return;
      if (error.code === 'login') {
        setPlaylist(null);
        setProfile(null);
      }
      setError(error.message);
    } finally {
      if (version === request.current) setBusy('');
    }
  }

  function back() {
    request.current++;
    setPlaylist(null);
    setError('');
    setBusy('');
  }

  async function logout() {
    const version = ++request.current;
    setBusy('logout');
    setError('');
    try {
      await musicRequest('logout');
      onLogout();
      if (version !== request.current) return;
      setProfile(null);
      setPlaylists([]);
      setNotice('');
    } catch (error) {
      if (version === request.current) setError(error.message);
    } finally {
      if (version === request.current) setBusy('');
    }
  }

  return (
    <section className="music-surface music-library" aria-labelledby="music-library-title" id="reeder-music-library">
      <header className="music-library-header">
        {playlist ? <IconButton label="返回我的歌单" icon={ArrowLeft} onClick={back} /> : <Disc3 size={21} aria-hidden="true" />}
        <h2 id="music-library-title" title={playlist?.title}>{playlist?.title || '网易云音乐'}</h2>
        <IconButton label="关闭选歌面板" icon={X} buttonRef={closeButton} onClick={onClose} />
      </header>
      <div className="music-library-body" key={playlist?.id || 'library'}>
        {!window.reederMusic ? <p className="music-message">请在 Reeder 桌面版使用网易云音乐。</p> : (
          <>
            {error && <p className="music-message music-error" role="alert">{error}</p>}
            {notice && <p className="music-message" role="status">{notice}</p>}
            {playlist ? (
              busy === 'tracks' ? <p className="music-message" role="status">正在读取曲目…</p> : error ? (
                <button type="button" className="music-action" onClick={() => openPlaylist(playlist)}>重新读取曲目</button>
              ) : tracks.length ? <TrackList tracks={tracks} onPlay={index => onPlay(playlist, tracks, index)} /> : (
                <p className="music-message">这个歌单还没有曲目。</p>
              )
            ) : busy === 'library' ? <p className="music-message" role="status">正在读取我的歌单…</p> : profile ? (
              <>
                <h3 className="music-list-heading">我的歌单</h3>
                {error && <button type="button" className="music-action" onClick={loadLibrary}>重新读取歌单</button>}
                <ul className="music-track-list">
                  {playlists.map(item => (
                    <li key={item.id}>
                      <button type="button" className="music-track" onClick={() => openPlaylist(item)} disabled={busy === 'logout'}>
                        <Artwork src={item.cover} />
                        <span className="music-track-copy"><strong>{item.title}</strong><small>{item.count} 首</small></span>
                        <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                {!error && !playlists.length && <p className="music-message">你的网易云账号还没有歌单。</p>}
              </>
            ) : (
              <div className="music-sign-in">
                {qr?.image ? <img src={qr.image} className="music-qr" alt="网易云音乐登录二维码" /> : <QrCode size={32} strokeWidth={1.5} aria-hidden="true" />}
                <p role="status">{qr?.status === 'loading' ? '正在生成二维码…' : qr?.status === 'scanned' ? '已扫码，请在手机上确认登录。' : qr?.status === 'expired' ? '二维码已过期，请重新生成。' : '用网易云音乐 App 扫码，打开你的歌单。'}</p>
                <button type="button" className="music-action" onClick={beginLogin} disabled={qr?.status === 'loading'}>
                  {qr?.image || qr?.status === 'expired' ? '刷新二维码' : '生成登录二维码'}
                </button>
                {error && !qr && <button type="button" className="music-quiet-button" onClick={loadLibrary}>检查登录状态</button>}
              </div>
            )}
          </>
        )}
      </div>
      {profile && <footer className="music-library-footer"><span title={profile.name}>{profile.name}</span><IconButton label="退出网易云账号" icon={LogOut} onClick={logout} disabled={Boolean(busy)} /></footer>}
    </section>
  );
}

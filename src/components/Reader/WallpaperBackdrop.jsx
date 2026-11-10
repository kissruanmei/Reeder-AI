import React, { useEffect, useRef, useState } from 'react';

export const WallpaperBackdrop = ({ project, shade, isAiSidebarOpen, onError }) => {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;
    let stream;
    let sessionId;
    setReady(false);

    if (project.type === 'scene') {
      const start = async () => {
        try {
          const result = await window.reederWallpaper.startScene(project.id);
          if (!result.ok) throw new Error(result.error);
          sessionId = result.sessionId;
          if (cancelled) {
            await window.reederWallpaper.stopScene(sessionId);
            return;
          }
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: result.sourceId,
                maxFrameRate: 30,
              },
            },
          });
          if (cancelled) {
            stream.getTracks().forEach(track => track.stop());
            await window.reederWallpaper.stopScene(sessionId);
            return;
          }
          stream.getVideoTracks()[0]?.addEventListener('ended', () => {
            if (!cancelled && !document.hidden) {
              setReady(false);
              onError('场景壁纸已停止，请确认 Wallpaper Engine 正在运行。');
              window.reederWallpaper.stopScene(sessionId);
            }
          });
          video.srcObject = stream;
          await video.play();
        } catch (error) {
          if (!cancelled) onError(error.message || '场景壁纸无法显示，请重试。');
          if (stream) stream.getTracks().forEach(track => track.stop());
          if (sessionId) await window.reederWallpaper.stopScene(sessionId);
        }
      };
      start();
    }

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (video) video.srcObject = null;
      if (sessionId) window.reederWallpaper.stopScene(sessionId);
    };
  }, [project.id, project.type, onError]);

  return (
    <div className={`reader-wallpaper${isAiSidebarOpen ? ' reader-wallpaper-with-ai' : ''}`} aria-hidden="true" style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <video
        ref={videoRef}
        className="reader-wallpaper-video"
        src={project.type === 'video' ? project.videoUrl : undefined}
        autoPlay
        muted
        loop={project.type === 'video'}
        playsInline
        onPlaying={() => { setReady(true); onError(''); }}
        onError={() => onError('当前视频的格式或编码无法播放，请选择其他壁纸。')}
      />
      <div className="reader-wallpaper-shade" style={{ opacity: shade / 100 }} />
    </div>
  );
};

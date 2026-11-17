import React, { memo, useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';

export const musicOpacity = { min: 65, max: 95 };

const TRACK_ROW_HEIGHT = 52;
const OVERSCAN_ROWS = 8;
const VIRTUALIZE_THRESHOLD = 40;

export async function musicRequest(method, ...args) {
  const bridge = window.reederMusic;
  if (!bridge) throw new Error('请在 Reeder 桌面版使用网易云音乐。');
  const response = await bridge[method](...args);
  if (!response.ok) throw Object.assign(new Error(response.error), { code: response.code });
  return response;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export const Artwork = memo(function Artwork({ src, className = '' }) {
  return (
    <span className={`music-artwork ${className}`} aria-hidden="true">
      <Music2 size="42%" />
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
});

export function IconButton({ label, icon: Icon, className = '', buttonRef, ...props }) {
  return (
    <button type="button" ref={buttonRef} className={`music-icon ${className}`} title={label} aria-label={label} {...props}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export const TrackList = memo(function TrackList({ tracks, selected = -1, onPlay }) {
  const listRef = useRef(null);
  const [viewportState, setViewportState] = useState({ scrollTop: 0, height: 600, listOffsetTop: 0 });
  const shouldVirtualize = tracks.length > VIRTUALIZE_THRESHOLD;

  useEffect(() => {
    if (!shouldVirtualize) return undefined;
    const listEl = listRef.current;
    if (!listEl) return undefined;

    const scrollParent = listEl.closest('.music-window-content, .music-library-body');
    if (!scrollParent) return undefined;

    let rafId = 0;
    const measure = () => {
      rafId = 0;
      const listRect = listEl.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      const listOffsetTop = Math.max(0, listRect.top - parentRect.top + scrollParent.scrollTop);
      setViewportState({
        scrollTop: scrollParent.scrollTop,
        height: scrollParent.clientHeight || 600,
        listOffsetTop,
      });
    };

    const scheduleMeasure = () => {
      if (!rafId) rafId = requestAnimationFrame(measure);
    };

    measure();
    scrollParent.addEventListener('scroll', scheduleMeasure, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;
    resizeObserver?.observe(scrollParent);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scrollParent.removeEventListener('scroll', scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [shouldVirtualize, tracks.length]);

  let startIndex = 0;
  let endIndex = tracks.length;
  let paddingTop = 0;
  let paddingBottom = 0;

  if (shouldVirtualize) {
    const relativeScrollTop = Math.max(0, viewportState.scrollTop - viewportState.listOffsetTop);
    const visibleCount = Math.ceil(viewportState.height / TRACK_ROW_HEIGHT);
    startIndex = Math.max(0, Math.floor(relativeScrollTop / TRACK_ROW_HEIGHT) - OVERSCAN_ROWS);
    endIndex = Math.min(tracks.length, startIndex + visibleCount + OVERSCAN_ROWS * 2);
    paddingTop = startIndex * TRACK_ROW_HEIGHT;
    paddingBottom = Math.max(0, (tracks.length - endIndex) * TRACK_ROW_HEIGHT);
  }

  const visibleTracks = shouldVirtualize ? tracks.slice(startIndex, endIndex) : tracks;

  return (
    <ul
      ref={listRef}
      className="music-track-list"
      style={shouldVirtualize ? { paddingTop, paddingBottom } : undefined}
    >
      {visibleTracks.map((track, offset) => {
        const index = startIndex + offset;
        return (
          <li key={`${track.id}:${index}`}>
            <button
              type="button"
              className="music-track"
              aria-current={index === selected ? 'true' : undefined}
              onClick={() => onPlay(index)}
            >
              <Artwork src={track.cover} />
              <span className="music-track-copy">
                <strong>{track.title}</strong>
                <small>{track.artist || '未知歌手'}</small>
              </span>
              <span className="music-track-time">{formatTime(track.duration)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
});

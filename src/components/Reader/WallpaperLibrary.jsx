import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Image, RefreshCw, Search, X } from 'lucide-react';
import './wallpaper.css';

export const WallpaperLibrary = ({ items, installed, loading, error, selectedId, onSelect, onRefresh, onChooseInstall, onClose }) => {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const dialogRef = useRef(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? items.filter(item => item.title.toLocaleLowerCase().includes(term)) : items;
  }, [items, query]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    searchRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Tab') {
        const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  return (
    <div className="wallpaper-modal-mask" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="wallpaper-modal" role="dialog" aria-modal="true" aria-labelledby="wallpaper-title">
        <div className="wallpaper-modal-header">
          <div>
            <h2 id="wallpaper-title">选择动态壁纸</h2>
            <p>从已安装的 Wallpaper Engine 壁纸中选择，点击后应用到阅读页。</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭壁纸选择"><X size={20} /></button>
        </div>

        <div className="wallpaper-toolbar">
          <label className="wallpaper-search">
            <Search size={17} aria-hidden="true" />
            <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索壁纸" aria-label="搜索壁纸" />
          </label>
          <button type="button" className="btn-secondary" onClick={onChooseInstall} disabled={loading}>选择安装目录</button>
          <button type="button" className="btn-secondary wallpaper-refresh" onClick={onRefresh} disabled={loading}><RefreshCw size={15} /> 刷新</button>
        </div>

        <div className="wallpaper-library-meta" role="status">
          {loading ? '正在识别本机壁纸…' : error || (!installed ? '未找到 Wallpaper Engine，可手动选择安装目录。' : `共 ${filtered.length} 张壁纸，显示 Scene 和 Video 类型。`)}
        </div>

        <div className="wallpaper-grid-scroll">
          {filtered.length > 0 ? (
            <div className="wallpaper-grid">
              {filtered.map(item => (
                <button type="button" className={`wallpaper-card${item.id === selectedId ? ' is-selected' : ''}`} key={item.id} onClick={() => onSelect(item)} aria-pressed={item.id === selectedId}>
                  <span className="wallpaper-card-image">
                    {item.previewUrl ? <img src={item.previewUrl} alt="" loading="lazy" /> : <Image size={28} aria-hidden="true" />}
                    {item.id === selectedId && <span className="wallpaper-card-check"><Check size={15} /></span>}
                  </span>
                  <span className="wallpaper-card-title" title={item.title}>{item.title}</span>
                  <span className="wallpaper-card-type">{item.type === 'scene' ? '场景' : '视频'}</span>
                </button>
              ))}
            </div>
          ) : !loading && (
            <div className="wallpaper-empty">{query ? '没有找到匹配的壁纸。' : '没有找到可用的场景或视频壁纸。'}</div>
          )}
        </div>
      </section>
    </div>
  );
};

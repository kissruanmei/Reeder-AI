import React, { useEffect, useRef } from 'react';
import { Image as ImageIcon, Trash2, Upload, X } from 'lucide-react';
import './wallpaper.css';

export const WallpaperPopover = ({
  isOpen,
  enabled,
  opacity,
  imageUrl,
  imageName,
  onEnabledChange,
  onOpacityChange,
  onImportImage,
  onClearImage,
  onClose,
}) => {
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (event.target.closest?.('[data-wallpaper-trigger="true"]')) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <section
      ref={panelRef}
      className="glass-panel wallpaper-popover"
      role="dialog"
      aria-label="全局背景壁纸设置"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onImportImage(file);
        }}
      />

      <div className="wallpaper-popover-header">
        <div>
          <h4>全局背景壁纸</h4>
          <p>导入图片铺满整个阅读器窗口</p>
        </div>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="关闭壁纸设置">
          <X size={16} />
        </button>
      </div>

      <div className="wallpaper-preview-box">
        {imageUrl ? (
          <img src={imageUrl} alt={imageName || '当前背景壁纸'} className="wallpaper-preview-thumb" />
        ) : (
          <div className="wallpaper-preview-empty">
            <ImageIcon size={24} />
            <span>尚未导入背景图片</span>
          </div>
        )}
      </div>

      {imageName && (
        <div className="wallpaper-file-name" title={imageName}>
          {imageName}
        </div>
      )}

      <div className="wallpaper-actions-row">
        <button
          type="button"
          className="btn-primary wallpaper-import-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          <span>{imageUrl ? '更换图片' : '导入图片'}</span>
        </button>
        {imageUrl && (
          <button
            type="button"
            className="btn-secondary wallpaper-clear-btn"
            onClick={onClearImage}
            title="清除背景图片"
            aria-label="清除背景图片"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <label className="wallpaper-setting-toggle">
        <span>启用背景覆盖</span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!imageUrl}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
      </label>

      <div className="wallpaper-opacity-control">
        <label className="wallpaper-shade-label" htmlFor="wallpaper-opacity-range">
          <span>图片透明度</span>
          <span>{opacity}%</span>
        </label>
        <input
          id="wallpaper-opacity-range"
          className="wallpaper-shade-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={opacity}
          disabled={!imageUrl || !enabled}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
        />
      </div>
    </section>
  );
};

import React, { useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ImageLightbox = ({ src, alt, onClose }) => {
  const [scale, setScale] = React.useState(1);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'illustration.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
        userSelect: 'none'
      }}
    >
      {/* Top Header Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(30, 30, 30, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          color: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 210
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, marginRight: '4px', opacity: 0.9 }}>
          📷 插图大图预览
        </span>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />

        <button
          onClick={() => setScale(s => Math.min(3, s + 0.25))}
          className="btn-icon"
          style={{ width: '32px', height: '32px', color: '#ffffff' }}
          title="放大"
        >
          <ZoomIn size={16} />
        </button>

        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
          className="btn-icon"
          style={{ width: '32px', height: '32px', color: '#ffffff' }}
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={() => setScale(1)}
          className="btn-icon"
          style={{ width: '32px', height: '32px', color: '#ffffff' }}
          title="还原重置"
        >
          <RotateCcw size={16} />
        </button>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.2)' }} />

        <button
          onClick={handleDownload}
          className="btn-icon"
          style={{ width: '32px', height: '32px', color: '#ffffff' }}
          title="下载图片"
        >
          <Download size={16} />
        </button>

        <button
          onClick={onClose}
          className="btn-icon"
          style={{ width: '32px', height: '32px', color: '#ffffff', background: 'rgba(255,255,255,0.1)' }}
          title="关闭 (ESC)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Image Showcase */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'transform 0.15s ease-out'
        }}
      >
        <img
          src={src}
          alt={alt || '插图'}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            transform: `scale(${scale})`,
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: scale > 1 ? 'grab' : 'default'
          }}
        />
      </div>

      {/* Footer Image Alt Caption */}
      {alt && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '12px',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)'
          }}
        >
          {alt}
        </div>
      )}
    </div>
  );
};

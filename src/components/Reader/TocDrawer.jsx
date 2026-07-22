import React from 'react';
import { BookOpen, X, ChevronRight } from 'lucide-react';

export const TocDrawer = ({ chapters, currentChapterId, onSelectChapter, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '56px',
        left: '16px',
        width: '300px',
        maxHeight: 'calc(100vh - 80px)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header */}
      <div 
        style={{ 
          padding: '14px 16px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} style={{ color: 'var(--accent-color)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>图书目录 (TOC)</h3>
        </div>
        <button onClick={onClose} className="btn-icon" style={{ width: '28px', height: '28px' }}>
          <X size={16} />
        </button>
      </div>

      {/* Chapter List */}
      <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
        {chapters && chapters.length > 0 ? (
          chapters.map((ch, idx) => {
            const isActive = ch.id === currentChapterId;
            return (
              <button
                key={ch.id || idx}
                onClick={() => {
                  onSelectChapter(ch);
                  onClose();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '4px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {ch.title || `第 ${idx + 1} 章`}
                </span>
                <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
              </button>
            );
          })
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            未找到章节目录
          </div>
        )}
      </div>
    </div>
  );
};

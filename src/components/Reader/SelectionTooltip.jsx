import React from 'react';
import { Lightbulb, Languages, FileText, MessageSquare, PenLine } from 'lucide-react';
import { HIGHLIGHT_COLORS } from '../../services/noteService';

export const SelectionTooltip = ({
  position,
  selectedText,
  onAction,
  onQuickHighlight,
  onStartNote
}) => {
  if (!position || !selectedText) return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const clampedLeft = Math.max(210, Math.min(viewportWidth - 210, position.left));
  const showBelow = position.top < 110;
  const top = showBelow ? position.bottom + 10 : Math.max(62, position.top - 52);

  const tooltipStyle = {
    position: 'fixed',
    top: `${top}px`,
    left: `${clampedLeft}px`,
    zIndex: 90,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 8px',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
    animation: 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    userSelect: 'none'
  };

  const keepSelection = (event) => {
    event.preventDefault();
  };

  return (
    <div style={tooltipStyle} className="glass-panel" onMouseDown={keepSelection}>
      {/* 多色一键高亮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 4px' }}>
        {HIGHLIGHT_COLORS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="hl-color-swatch"
            style={{ backgroundColor: item.dot }}
            title={`用${item.label}高亮`}
            aria-label={`用${item.label}高亮`}
            onClick={() => onQuickHighlight?.(item.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onStartNote?.()}
        className="btn-icon"
        title="高亮并写短评"
        style={{ fontSize: '13px', padding: '4px 8px', width: 'auto', gap: '5px', color: 'var(--text-primary)', fontWeight: 500 }}
      >
        <PenLine size={14} style={{ color: 'var(--accent-color)' }} />
        <span>写笔记</span>
      </button>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 3px' }} />

      <button
        type="button"
        onClick={() => onAction('explain', selectedText)}
        className="btn-icon"
        title="解释词汇 / 概念"
        style={{ fontSize: '13px', padding: '4px 7px', width: 'auto', gap: '5px' }}
      >
        <Lightbulb size={14} style={{ color: '#eab308' }} />
        <span>解释</span>
      </button>

      <button
        type="button"
        onClick={() => onAction('translate', selectedText)}
        className="btn-icon"
        title="翻译为中文"
        style={{ fontSize: '13px', padding: '4px 7px', width: 'auto', gap: '5px' }}
      >
        <Languages size={14} style={{ color: '#3b82f6' }} />
        <span>翻译</span>
      </button>

      <button
        type="button"
        onClick={() => onAction('summarize', selectedText)}
        className="btn-icon"
        title="提炼核心摘要"
        style={{ fontSize: '13px', padding: '4px 7px', width: 'auto', gap: '5px' }}
      >
        <FileText size={14} style={{ color: '#10b981' }} />
        <span>摘要</span>
      </button>

      <button
        type="button"
        onClick={() => onAction('ask', selectedText)}
        className="btn-icon"
        title="调出 AI 助手深入提问"
        style={{ fontSize: '13px', padding: '4px 7px', width: 'auto', gap: '5px', color: 'var(--accent-color)', fontWeight: 500 }}
      >
        <MessageSquare size={14} />
        <span>问 AI</span>
      </button>
    </div>
  );
};

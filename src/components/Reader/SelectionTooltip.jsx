import React from 'react';
import { Lightbulb, Languages, FileText, MessageSquare, Highlighter } from 'lucide-react';

export const SelectionTooltip = ({ position, selectedText, onAction, onClose }) => {
  if (!position || !selectedText) return null;

  const tooltipStyle = {
    position: 'fixed',
    top: `${Math.max(10, position.top - 48)}px`,
    left: `${Math.max(20, position.left)}px`,
    zIndex: 90,
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
    animation: 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    userSelect: 'none'
  };

  return (
    <div style={tooltipStyle} className="glass-panel">
      <button
        onClick={() => onAction('explain', selectedText)}
        className="btn-icon"
        title="解释词汇 / 概念"
        style={{ fontSize: '13px', padding: '4px 8px', width: 'auto', gap: '6px' }}
      >
        <Lightbulb size={15} style={{ color: '#eab308' }} />
        <span>解释</span>
      </button>

      <button
        onClick={() => onAction('translate', selectedText)}
        className="btn-icon"
        title="翻译为中文"
        style={{ fontSize: '13px', padding: '4px 8px', width: 'auto', gap: '6px' }}
      >
        <Languages size={15} style={{ color: '#3b82f6' }} />
        <span>翻译</span>
      </button>

      <button
        onClick={() => onAction('summarize', selectedText)}
        className="btn-icon"
        title="提炼核心摘要"
        style={{ fontSize: '13px', padding: '4px 8px', width: 'auto', gap: '6px' }}
      >
        <FileText size={15} style={{ color: '#10b981' }} />
        <span>摘要</span>
      </button>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

      <button
        onClick={() => onAction('ask', selectedText)}
        className="btn-icon"
        title="调出 AI 助手深入提问"
        style={{ fontSize: '13px', padding: '4px 8px', width: 'auto', gap: '6px', color: 'var(--accent-color)', fontWeight: 500 }}
      >
        <MessageSquare size={15} />
        <span>问 AI</span>
      </button>

      <button
        onClick={() => onAction('highlight', selectedText)}
        className="btn-icon"
        title="高亮选段"
        style={{ width: '28px', height: '28px', padding: 0 }}
      >
        <Highlighter size={14} />
      </button>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, Trash2, X } from 'lucide-react';
import { DEFAULT_HIGHLIGHT_COLOR, HIGHLIGHT_COLORS } from '../../services/noteService';

/**
 * 轻量短评浮卡：支持「新建短评」与「查看/编辑已有高亮」两种模式
 */
export const NotePopover = ({
  mode, // 'create' | 'edit'
  position,
  quote,
  initialColor = DEFAULT_HIGHLIGHT_COLOR,
  initialNote = '',
  onSave,
  onColorChange,
  onDelete,
  onAskAi,
  onClose
}) => {
  const [color, setColor] = useState(initialColor);
  const [noteText, setNoteText] = useState(initialNote);
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setColor(initialColor || DEFAULT_HIGHLIGHT_COLOR);
    setNoteText(initialNote || '');
  }, [initialColor, initialNote, quote, mode]);

  useEffect(() => {
    if (mode === 'create') {
      textareaRef.current?.focus();
    }
  }, [mode, quote]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position || !quote) return null;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardWidth = 332;
  const estimatedHeight = 236;

  const left = Math.max(12, Math.min(viewportWidth - cardWidth - 12, position.left - cardWidth / 2));
  const preferBelow = position.bottom + estimatedHeight + 16 < viewportHeight;
  const top = preferBelow
    ? Math.min(viewportHeight - estimatedHeight - 12, position.bottom + 10)
    : Math.max(64, position.top - estimatedHeight - 10);

  const activeColorMeta = HIGHLIGHT_COLORS.find((item) => item.id === color) || HIGHLIGHT_COLORS[0];

  const handleSelectColor = (nextColor) => {
    setColor(nextColor);
    if (mode === 'edit') {
      onColorChange?.(nextColor);
    }
  };

  const handleSubmit = () => {
    onSave?.({ color, note: noteText });
  };

  const handleTextareaKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="glass-panel note-popover"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      {/* 顶部色板与关闭 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {HIGHLIGHT_COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`hl-color-swatch${color === item.id ? ' is-selected' : ''}`}
              style={{ backgroundColor: item.dot }}
              title={item.label}
              aria-label={`选择${item.label}`}
              onClick={() => handleSelectColor(item.id)}
            />
          ))}
        </div>

        <button
          type="button"
          className="btn-icon"
          style={{ width: '26px', height: '26px' }}
          onClick={onClose}
          title="关闭"
          aria-label="关闭笔记卡片"
        >
          <X size={15} />
        </button>
      </div>

      {/* 原文摘录预览 */}
      <div className="note-popover-quote" style={{ borderLeftColor: activeColorMeta.dot }}>
        “{quote}”
      </div>

      {/* 短评输入区 */}
      <textarea
        ref={textareaRef}
        className="note-popover-textarea"
        placeholder="记下此刻的感悟或短评…（Ctrl+Enter 保存）"
        value={noteText}
        onChange={(event) => setNoteText(event.target.value)}
        onKeyDown={handleTextareaKeyDown}
      />

      {/* 底部操作栏 */}
      <div className="note-popover-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {mode === 'edit' && (
            <>
              <button
                type="button"
                className="btn-icon"
                style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px', gap: '4px', color: 'var(--accent-color)' }}
                onClick={() => onAskAi?.({ quote, note: noteText.trim() })}
                title="将原句与短评发给 AI 助手讨论"
              >
                <Sparkles size={14} />
                <span>问 AI</span>
              </button>
              <button
                type="button"
                className="btn-icon"
                style={{ width: '30px', height: '30px', color: '#ef4444' }}
                onClick={onDelete}
                title="删除此高亮与短评"
                aria-label="删除此高亮与短评"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '5px 11px', fontSize: '12px' }}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '5px 12px', fontSize: '12px', gap: '4px' }}
            onClick={handleSubmit}
          >
            <Check size={14} />
            <span>{mode === 'create' ? '保存笔记' : '更新'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

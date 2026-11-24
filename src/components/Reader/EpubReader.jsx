import React, { useRef, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { applyHighlights, getSelectionOffsets, scrollToHighlight } from '../../utils/highlightDom';
import { HIGHLIGHT_COLORS } from '../../services/noteService';
import './notes.css';

function scrollToAnchor(container, rawAnchor) {
  if (!container || !rawAnchor) return false;
  const cleanId = decodeURIComponent(rawAnchor.replace(/^#/, ''));
  if (!cleanId) return false;
  const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(cleanId) : cleanId.replace(/["\\]/g, '\\$&');
  const target = container.querySelector(`#${escaped}`) || container.querySelector(`a[name="${escaped}"]`);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

export const EpubReader = ({
  chapter,
  chapterNotes = [],
  isAiSidebarOpen,
  currentChapterIndex,
  totalChapters,
  fontSize,
  fontFamily,
  lineHeight,
  maxWidth,
  targetAnchor,
  onClearAnchor,
  pendingNoteId,
  onClearPendingNote,
  onNavigateHref,
  onSelectionChange,
  onHighlightClick,
  onImageClick,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext
}) => {
  const contentRef = useRef(null);
  const htmlContainerRef = useRef(null);
  const mainRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const [hoverPreview, setHoverPreview] = useState(null);

  const chapterHtml = useMemo(() => ({ __html: chapter?.content || '' }), [chapter?.id, chapter?.content]);

  const notesById = useMemo(() => {
    const map = new Map();
    chapterNotes.forEach((item) => map.set(item.id, item));
    return map;
  }, [chapterNotes]);

  const clearHoverPreview = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverPreview(null);
  };

  // Reset scroll position or jump to target anchor on chapter/anchor change
  useEffect(() => {
    clearHoverPreview();
    if (pendingNoteId) return;
    if (targetAnchor) {
      scrollToAnchor(contentRef.current, targetAnchor);
      onClearAnchor?.();
      return;
    }
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentChapterIndex, chapter?.id, targetAnchor, pendingNoteId, onClearAnchor]);

  // Apply chapter highlights onto DOM whenever chapter content or notes change
  useEffect(() => {
    if (!htmlContainerRef.current) return;
    applyHighlights(htmlContainerRef.current, chapterNotes);
  }, [chapter?.id, chapter?.content, chapterNotes]);

  // Jump and flash specific highlight when navigating from Notes Drawer
  useEffect(() => {
    if (!pendingNoteId || !htmlContainerRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      scrollToHighlight(htmlContainerRef.current, pendingNoteId);
      onClearPendingNote?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingNoteId, currentChapterIndex, chapterNotes, onClearPendingNote]);

  useEffect(() => () => clearHoverPreview(), []);

  const handleArticleClick = (event) => {
    const selected = window.getSelection()?.toString().trim();

    // 点击已有高亮句：弹出编辑/查看浮卡
    const highlightEl = event.target.closest?.('mark.reeder-highlight');
    if (highlightEl && !selected) {
      const noteId = highlightEl.dataset.noteId;
      const matched = noteId ? notesById.get(noteId) : null;
      if (matched) {
        clearHoverPreview();
        const rect = highlightEl.getBoundingClientRect();
        onHighlightClick?.(matched, {
          top: rect.top,
          left: rect.left + rect.width / 2,
          bottom: rect.bottom
        });
        return;
      }
    }

    const anchor = event.target.closest?.('a');
    if (!anchor) return;

    // 始终阻止阅读器内 <a> 标签触发主窗口页面跳转导致白屏
    event.preventDefault();
    event.stopPropagation();

    if (selected) return;

    const rawHref = (anchor.getAttribute('href') || anchor.getAttribute('xlink:href') || '').trim();
    if (!rawHref || rawHref.startsWith('javascript:')) return;

    if (/^https?:\/\//i.test(rawHref)) {
      if (window.reederApp?.openExternal) {
        window.reederApp.openExternal(rawHref);
      } else {
        window.open(rawHref, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (/^mailto:/i.test(rawHref)) {
      window.open(rawHref, '_blank', 'noopener,noreferrer');
      return;
    }

    if (rawHref.startsWith('#')) {
      scrollToAnchor(contentRef.current, rawHref);
      return;
    }

    onNavigateHref?.(rawHref);
  };

  // 鼠标悬停带短评的高亮句时延迟 220ms 轻量预览短评
  const handleArticleMouseOver = (event) => {
    const highlightEl = event.target.closest?.('mark.reeder-highlight');
    if (!highlightEl) return;

    const noteId = highlightEl.dataset.noteId;
    const matched = noteId ? notesById.get(noteId) : null;
    if (!matched || !(matched.note || '').trim()) return;

    if (hoverPreview?.note?.id === matched.id) return;
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);

    const rect = highlightEl.getBoundingClientRect();
    hoverTimerRef.current = window.setTimeout(() => {
      setHoverPreview({
        note: matched,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left + rect.width / 2
      });
    }, 220);
  };

  const handleArticleMouseOut = (event) => {
    const fromHighlight = event.target.closest?.('mark.reeder-highlight');
    if (!fromHighlight) return;
    const toHighlight = event.relatedTarget?.closest?.('mark.reeder-highlight');
    if (toHighlight && toHighlight.dataset.noteId === fromHighlight.dataset.noteId) {
      return;
    }
    clearHoverPreview();
  };

  // Handle Text Selection inside Reader Canvas
  const handleMouseUp = (e) => {
    // If clicked on an image, ignore text selection and fire image click
    if (e.target.tagName === 'IMG' || e.target.tagName === 'image') {
      const imgSrc = e.target.getAttribute('src') || e.target.getAttribute('href');
      const imgAlt = e.target.getAttribute('alt') || e.target.getAttribute('data-original-src') || '插图';
      if (imgSrc) {
        onImageClick(imgSrc, imgAlt);
        return;
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      onSelectionChange(null, null, null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onSelectionChange(null, null, null);
      return;
    }

    // Get position & chapter offsets of selected bounds
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const meta = getSelectionOffsets(htmlContainerRef.current, range);
        clearHoverPreview();
        onSelectionChange(
          selectedText,
          {
            top: rect.top,
            left: rect.left + rect.width / 2,
            bottom: rect.bottom
          },
          meta
        );
      }
    } catch (err) {
      console.warn('Failed to calculate selection rect:', err);
    }
  };

  // Font family mappings
  const getFontFamilyStyle = () => {
    if (fontFamily === 'serif') return 'var(--font-serif)';
    if (fontFamily === 'mono') return 'var(--font-mono)';
    return 'var(--font-sans)';
  };

  // Progress calculations
  const progressPercent = Math.min(100, Math.round(((currentChapterIndex + 1) / (totalChapters || 1)) * 100));

  const renderHoverPreview = () => {
    if (!hoverPreview?.note) return null;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const clampedLeft = Math.max(150, Math.min(viewportWidth - 150, hoverPreview.left));
    const showBelow = hoverPreview.top < 140;
    const top = showBelow ? hoverPreview.bottom + 8 : hoverPreview.top - 8;
    const colorMeta = HIGHLIGHT_COLORS.find((item) => item.id === hoverPreview.note.color) || HIGHLIGHT_COLORS[0];

    return (
      <div
        className="glass-panel note-hover-preview"
        style={{
          left: `${clampedLeft}px`,
          top: `${top}px`,
          transform: showBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)'
        }}
      >
        <div className="note-hover-preview-header">
          <span className="note-hover-preview-dot" style={{ backgroundColor: colorMeta.dot }} />
          <span>我的短评 · 点击编辑</span>
        </div>
        <div className="note-hover-preview-body">{hoverPreview.note.note}</div>
      </div>
    );
  };

  return (
    <main
      ref={mainRef}
      className={`reader-canvas${isAiSidebarOpen ? ' reader-canvas-with-ai' : ''}`}
      style={{
        flex: 1,
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px 100px 20px',
        transition: 'background-color var(--transition-normal)'
      }}
      onMouseUp={handleMouseUp}
      onScroll={clearHoverPreview}
    >
      {/* Reader Canvas Container */}
      <article
        ref={contentRef}
        onClick={handleArticleClick}
        onMouseOver={handleArticleMouseOver}
        onMouseOut={handleArticleMouseOut}
        style={{
          width: '100%',
          maxWidth: `${maxWidth}px`,
          fontSize: `${fontSize}px`,
          fontFamily: getFontFamilyStyle(),
          lineHeight: lineHeight,
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)'
        }}
        className="reader-content"
      >
        {/* Render HTML content safely */}
        {chapter?.content ? (
          <div ref={htmlContainerRef} dangerouslySetInnerHTML={chapterHtml} />
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            请在上方加载电子书章节
          </div>
        )}
      </article>

      {renderHoverPreview()}

      {/* Redesigned Apple-Style Floating Pagination Footer */}
      <footer
        className="glass-panel"
        style={{
          marginTop: '60px',
          width: '100%',
          maxWidth: `${Math.max(620, maxWidth)}px`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-color)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          gap: '16px'
        }}
      >
        {/* Previous Chapter Button */}
        <button
          onClick={onPrevChapter}
          disabled={!hasPrev}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: hasPrev ? 1 : 0.4,
            flexShrink: 0
          }}
        >
          <ChevronLeft size={15} /> 上一章
        </button>

        {/* Center Progress & Chapter Indicator */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            第 {currentChapterIndex + 1} / {totalChapters || 1} 章 · <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>已读 {progressPercent}%</span>
          </div>

          {/* Thin Progress Bar */}
          <div
            style={{
              width: '60%',
              maxWidth: '240px',
              height: '3px',
              background: 'var(--border-color)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'var(--accent-color)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>
        </div>

        {/* Next Chapter Button */}
        <button
          onClick={onNextChapter}
          disabled={!hasNext}
          className="btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: hasNext ? 1 : 0.4,
            flexShrink: 0
          }}
        >
          下一章 <ChevronRight size={15} />
        </button>
      </footer>
    </main>
  );
};

import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

export const EpubReader = ({
  chapter,
  currentChapterIndex,
  totalChapters,
  fontSize,
  fontFamily,
  lineHeight,
  maxWidth,
  onSelectionChange,
  onImageClick,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext
}) => {
  const contentRef = useRef(null);
  const mainRef = useRef(null);

  // Reset scroll position to top on chapter change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentChapterIndex, chapter?.id]);

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
      onSelectionChange(null, null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      onSelectionChange(null, null);
      return;
    }

    // Get position of selected bounds
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        onSelectionChange(selectedText, {
          top: rect.top,
          left: rect.left + rect.width / 2,
          bottom: rect.bottom
        });
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

  return (
    <main
      ref={mainRef}
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
    >
      {/* Reader Canvas Container */}
      <article
        ref={contentRef}
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
          <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
        ) : (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            请在上方加载电子书章节
          </div>
        )}
      </article>

      {/* Redesigned Apple-Style Floating Pagination Footer */}
      <footer
        className="glass-panel"
        style={{
          marginTop: '60px',
          width: '100%',
          maxWidth: `${Math.max(620, maxWidth)}px`,
          display: 'flex',
          justify: 'space-between',
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
